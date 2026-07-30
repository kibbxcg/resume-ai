// ============================================================
// knowledge.ts — 知识库加载
//
// 职责：
//   1. 读取 curated_qa.yaml（预置高质量问答），每条计算向量
//   2. 提供 loadCuratedQA() 供 route.ts 调用
//   3. 提供 searchCuratedQA() 对已收录 Q&A 做语义检索
//
// 注意：profile.yaml 不参与 RAG，保持全量注入 System Prompt。
//       这个文件只管 curated Q&A。
// ============================================================

import { readFileSync, existsSync } from "fs";
import { parse as parseYaml } from "yaml";
import path from "path";
import { embed, search } from "./embedding";

// ============================================================
// 类型定义
// ============================================================

/** 一条已审核的问答对 */
export interface QAItem {
  id: string;          // 唯一标识（文件名 + 索引）
  question: string;    // 面试官问的问题
  answer: string;      // 求职者审核过的答案
  embedding: number[]; // 问题的 512 维向量（用于检索）
}

// ============================================================
// YAML Schema（运行时校验）
// ============================================================

interface RawQA {
  question: string;
  answer: string;
}

// ============================================================
// 读取 + 向量化
// ============================================================

/**
 * 从 curated_qa.yaml 加载预置问答，并为每条问题计算嵌入向量
 *
 * 用法：
 *   const qaList = await loadCuratedQA();
 *   // qaList[0].embedding → 512 维向量，可直接用于余弦相似度检索
 */
export async function loadCuratedQA(): Promise<QAItem[]> {
  const yamlPath = path.join(process.cwd(), "curated_qa.yaml");

  // 文件不存在 → 返回空数组（允许用户不提供预置问答）
  if (!existsSync(yamlPath)) {
    console.warn("curated_qa.yaml 未找到，已审核问答集为空。");
    return [];
  }

  const raw = readFileSync(yamlPath, "utf-8");
  const parsed = parseYaml(raw) as RawQA[];

  // YAML 格式校验
  if (!Array.isArray(parsed)) {
    throw new Error("curated_qa.yaml 格式错误：应该是一个问答列表（数组）");
  }

  const items: QAItem[] = [];

  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];

    // 跳过空条目或格式不对的条目
    if (!item?.question || !item?.answer) {
      console.warn(`curated_qa.yaml 第 ${i + 1} 条缺少 question 或 answer，已跳过`);
      continue;
    }

    // 为问题文本计算向量（不是答案——检索时匹配的是问题）
    const embedding = await embed(item.question);

    items.push({
      id: `curated_${i}`,
      question: item.question,
      answer: item.answer,
      embedding,
    });
  }

  return items;
}

// ============================================================
// 检索
// ============================================================

/**
 * 在已审核 Q&A 中搜索与查询最匹配的条目
 *
 * @param query     - 面试官当前的问题
 * @param qaList    - 已审核问答列表（来自 loadCuratedQA 或 KV）
 * @param topK      - 返回前 K 条
 * @param threshold - 相似度阈值（默认 0.75）
 */
export async function searchCuratedQA(
  query: string,
  qaList: QAItem[],
  topK = 3,
  threshold = 0.75
): Promise<Array<{ item: QAItem; score: number }>> {
  return search(query, qaList, (qa) => qa.embedding, topK, threshold);
}
