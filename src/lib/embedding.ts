// ============================================================
// embedding.ts — 本地嵌入模型 + 向量检索
//
// 职责：
//   1. 加载 bge-small-zh-v1.5 中文嵌入模型（本地运行，零 API 费用）
//   2. 提供 embed()：文本 → 512 维向量
//   3. 提供 cosineSimilarity()：两个向量的余弦相似度
//   4. 提供 search()：给一个问题 + 一组候选项，返回最相似的 Top-K
//
// 模型信息：
//   模型：Xenova/bge-small-zh-v1.5（BAAI 出品，中文优化）
//   维度：512
//   大小：~80MB（首次自动下载，后续走缓存）
//   来源：https://huggingface.co/Xenova/bge-small-zh-v1.5
// ============================================================

import type { Tensor } from "@xenova/transformers";

// ============================================================
// 第 1 部分：模型加载
// ============================================================

// 指定模型名（Xenova 转换的 ONNX 版本，可在浏览器/Node.js 中运行）
const MODEL_NAME = "Xenova/bge-small-zh-v1.5";

// 模型下载源：
// - 默认走官方 huggingface.co（全球 CDN，Vercel 等海外部署零配置）
// - 国内网络 huggingface.co 可能被墙：首次加载失败会自动回退到 hf-mirror.com
// - 高级用户可用 HF_ENDPOINT 显式固定下载源
const DEFAULT_HOST = "https://huggingface.co";
const FALLBACK_HOST = "https://hf-mirror.com";

// 动态加载 @xenova/transformers（避免静态 import 在原生库缺失时拖垮整个路由）：
// 它在 Node 环境依赖 onnxruntime-node（编译好的 .so/.dll 原生库），
// 某些部署环境（如 Vercel serverless）打包时可能剔除原生文件，导致模块加载失败。
// 用动态 import + try/catch 包住：加载失败就禁用 RAG，对话照常（回退 profile 全量注入）。
type TransformersModule = typeof import("@xenova/transformers");

let transformersPromise: Promise<TransformersModule> | null = null;
let transformersBroken = false;

async function loadTransformers(): Promise<TransformersModule> {
  if (transformersBroken) {
    throw new Error("嵌入模块不可用（RAG 已禁用）");
  }
  if (!transformersPromise) {
    transformersPromise = import("@xenova/transformers").catch((e) => {
      transformersBroken = true; // 避免每次请求都重复尝试
      transformersPromise = null;
      console.warn("[embedding] @xenova/transformers 加载失败，RAG 已禁用：", e);
      throw e;
    });
  }
  return transformersPromise;
}

// 模型只加载一次（pipeline 内部有单例缓存，多次调用不会重复加载）
// @xenova/transformers 对 feature-extraction 返回的类实例自带调用签名，
// 这里声明一个最小调用接口（仅用到 text 参数），避免散落 any
interface Extractor {
  (text: string): Promise<Tensor>;
}

let extractorPromise: Promise<Extractor> | null = null;

/** 加载模型；官方源失败时自动回退到国内镜像，保证两种网络环境都能用 */
async function loadExtractor(): Promise<Extractor> {
  const { pipeline, env } = await loadTransformers();

  // env 来自动态导入，只能在加载后设置（不能放模块顶层）
  env.remoteHost = process.env.HF_ENDPOINT || DEFAULT_HOST;
  env.allowLocalModels = true; // 先检查本地缓存，没有再远程下载
  env.allowRemoteModels = true; // 允许远程下载（首次需要 ~80MB）

  try {
    return await pipeline("feature-extraction", MODEL_NAME);
  } catch (error) {
    // 官方源失败（典型：国内网络被墙）→ 换 hf-mirror.com 重试一次
    if (env.remoteHost !== FALLBACK_HOST) {
      console.warn("[embedding] 模型下载失败，回退到 hf-mirror.com：", error);
      env.remoteHost = FALLBACK_HOST;
      return await pipeline("feature-extraction", MODEL_NAME);
    }
    throw error;
  }
}

function getExtractor(): Promise<Extractor> {
  if (!extractorPromise) {
    extractorPromise = loadExtractor();
  }
  return extractorPromise;
}

// ============================================================
// 第 2 部分：文本 → 向量
// ============================================================

/**
 * 将一段文本转换为向量（512 维 float 数组）
 *
 * @param text - 待嵌入的文本（中文或英文均可，模型对中文优化）
 * @returns 归一化后的 512 维向量，每个值在 [-1, 1] 之间
 */
export async function embed(text: string): Promise<number[]> {
  const extractor = await getExtractor();

  // feature-extraction pipeline 返回一个 Tensor 对象
  // Tensor 形状：[1, seq_len, 512]
  // 需要手工做均值池化，把每个 token 的向量平均成一个句子级向量
  const output = await extractor(text);
  const data = output.data as Float32Array; // Tensor.data 类型是 DataArray，运行时为 Float32Array
  const dims = output.dims; // [1, seq_len, 512]

  const seqLen = dims[1]; // token 数量
  const hiddenSize = dims[2]; // 512

  // 均值池化：对 seq_len 维度求平均
  const vector = new Array<number>(hiddenSize).fill(0);
  for (let t = 0; t < seqLen; t++) {
    for (let h = 0; h < hiddenSize; h++) {
      vector[h] += data[t * hiddenSize + h] / seqLen;
    }
  }

  // L2 归一化：使向量模长为 1，这样余弦相似度等于点积
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) {
      vector[i] /= norm;
    }
  }

  return vector;
}

// ============================================================
// 第 3 部分：余弦相似度
// ============================================================

/**
 * 计算两个向量的余弦相似度
 *
 * 余弦相似度 = (A·B) / (|A| × |B|)
 *
 * 因为 BGE 模型输出已经归一化了（|A| = |B| = 1），
 * 所以可以直接用点积代替，但在函数里保留了完整计算，
 * 方便以后换模型或使用非归一化向量。
 *
 * @param a - 向量 A
 * @param b - 向量 B
 * @returns 相似度分数，范围 [-1, 1]，1 = 完全一样，0 = 不相关，-1 = 完全相反
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`向量维度不匹配：${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  // 防止除以零
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

// ============================================================
// 第 4 部分：通用检索函数
// ============================================================

/**
 * 检索候选项中与查询最相似的 Top-K 条结果
 *
 * @param query       - 查询文本（面试官的问题）
 * @param candidates  - 候选项数组（curated Q&A 列表等）
 * @param getEmbedding - 从候选项中提取向量的函数
 * @param topK        - 返回前 K 条（默认 3）
 * @param threshold   - 相似度阈值，低于此值的不返回（默认 0.75）
 * @returns 按相似度降序排列的命中结果，每条包含原始候选项 + 相似度分数
 */
export async function search<T>(
  query: string,
  candidates: T[],
  getEmbedding: (item: T) => number[],
  topK = 3,
  threshold = 0.75
): Promise<Array<{ item: T; score: number }>> {
  if (candidates.length === 0) return [];

  // 查询文本 → 向量（只需要算一次）
  const queryVector = await embed(query);

  // 计算每个候选项与查询的相似度
  const scored = candidates.map((item) => ({
    item,
    score: cosineSimilarity(queryVector, getEmbedding(item)),
  }));

  // 按相似度降序排序
  scored.sort((a, b) => b.score - a.score);

  // 过滤低于阈值的，取 Top-K
  return scored.filter((s) => s.score >= threshold).slice(0, topK);
}
