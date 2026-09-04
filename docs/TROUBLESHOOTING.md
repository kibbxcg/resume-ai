# 🐛 开发问题手册

> 记录开发过程中遇到的每个技术问题和解决方案。避免踩过的坑再踩一遍。

---

## 目录

- [环境与网络](#环境与网络)
- [依赖安装](#依赖安装)
- [TypeScript 类型](#typescript-类型)
- [嵌入模型](#嵌入模型)
- [Vercel 部署与存储](#vercel-部署与存储)
- [前端 / 暗色模式](#前端--暗色模式)
- [运行时](#运行时)
- [调试技巧](#调试技巧)

---

## 环境与网络

### 1. Google Fonts 下载被墙，导致 Next.js 构建失败

**现象**：

```
Error while requesting resource
There was an issue requesting https://fonts.gstatic.com/s/geistmono/...
Turbopack build failed
```

**原因**：Next.js 默认模板使用 Google Fonts (`next/font/google`)，域名 `fonts.gstatic.com` 在国内 GFW 封锁范围内。

**解决**：删除 `layout.tsx` 中的 Google Fonts 引用，改用系统字体栈：

```css
/* globals.css */
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
  "Microsoft YaHei", sans-serif;
--font-mono: "Fira Code", "JetBrains Mono", "Courier New", monospace;
```

**参考文件**：[src/app/layout.tsx](../src/app/layout.tsx)、[src/app/globals.css](../src/app/globals.css)

---

### 2. HTTPS 连接 GitHub 超时，无法 git push

**现象**：

```
fatal: unable to access 'https://github.com/...': Failed to connect to github.com port 443
```

**原因**：GFW 通过 SNI（TLS 握手阶段的明文域名）识别 `github.com` 并阻断 HTTPS 443 端口。

**解决**：切换到 SSH（22 端口），SSH 握手时目标服务器信息是加密的：

```bash
# 1. 添加 SSH 公钥到 GitHub Settings → SSH Keys
cat ~/.ssh/id_rsa.pub

# 2. 切换 remote
git remote set-url origin git@github.com:kibbxcg/resume-ai.git
```

**为什么 SSH 可以？**：SSH 协议没有 SNI 概念，目标服务器信息在加密握手期间不可见。端口 22 承载全球运维流量，GFW 封锁代价太高。

---

### 3. HuggingFace 模型下载超时

**现象**：

```
ConnectTimeoutError: Connect Timeout Error (attempted address: huggingface.co:443)
```

**原因**：`@xenova/transformers` 默认从 `huggingface.co` 下载模型文件，该域名在国内被墙。

**解决**：现在的实现是**双源自动回退**——默认官方源 `huggingface.co`（Vercel 等海外部署零配置），国内网络加载失败会自动切到 `hf-mirror.com`：

```typescript
// embedding.ts
const DEFAULT_HOST = "https://huggingface.co";
const FALLBACK_HOST = "https://hf-mirror.com";
env.remoteHost = process.env.HF_ENDPOINT || DEFAULT_HOST;
// 加载失败时 env.remoteHost = FALLBACK_HOST 重试一次
```

高级用户可用 `HF_ENDPOINT` 环境变量固定下载源。

**参考文件**：[src/lib/embedding.ts](../src/lib/embedding.ts)

---

### 4. Vercel 默认域名在移动网络被墙

**现象**：`resume-ai-xxx.vercel.app` 在桌面 WiFi 能打开，手机流量打不开。

**原因**：`*.vercel.app` 被 GFW 通配符封杀。

**解决**：绑定自定义域名（阿里云/腾讯云 .cn 域名 ¥29/年），或使用 Cloudflare Worker 代理。

**状态**：待解决（Phase 4 处理）

---

## 依赖安装

### 5. sharp 二进制下载失败，npm install 报错

**现象**：

```
npm error sharp: Installation error: Request timed out
npm error sharp: Downloading https://github.com/lovell/sharp-libvips/releases/...
```

**原因**：`@xenova/transformers` 的依赖 `sharp`（图片处理库）需要从 GitHub 下载预编译二进制，国内无法访问 GitHub Releases。

**尝试过的方案**：
- `npm install @xenova/transformers --ignore-scripts` — 跳过编译，但 JS 文件仍然 require sharp
- `set SHARP_DIST_BASE_URL=https://npmmirror.com/mirrors/sharp-libvips; npm rebuild sharp` — 镜像不完整，仍然超时

**最终解决**：替换 sharp 入口文件为空壳——本项目只做文本嵌入，永远用不到图片处理：

```bash
mv node_modules/@xenova/transformers/node_modules/sharp/lib/index.js \
   node_modules/@xenova/transformers/node_modules/sharp/lib/index.js.bak

# 写入空壳：
# module.exports = function() { throw new Error("图片功能不可用，文本嵌入不受影响"); };
```

**已自动化**（`scripts/fix-sharp.js`）：脚本逐个检查项目内的 sharp 副本，**只在 require 失败时**才写入空壳（完好或已空壳则跳过），幂等可重复执行。挂载在 `postinstall` 和 `dev`/`build` 前置——普通安装自动运行；`--ignore-scripts` 会跳过 postinstall，但首次 `npm run dev` / `npm run build` 时会自动补上（也可手动 `npm run postinstall`）。

---

### 6. create-next-app 目录非空报错

**现象**：

```
The directory resume-ai contains files that could conflict: .env.example, .github/, README.md ...
Either try using a new directory name, or remove the files.
```

**原因**：`create-next-app` 不允许在已有文件的目录中初始化。

**解决**：在 `/tmp` 创建临时项目，拷贝脚手架文件回来，再 `npm install`：

```bash
cd /tmp
npx create-next-app@latest resume-temp --typescript --tailwind --eslint --app --src-dir
cp resume-temp/package.json resume-temp/tsconfig.json ... ~/resume-ai/
cd ~/resume-ai && npm install
rm -rf /tmp/resume-temp
```

---

## TypeScript 类型

### 7. @xenova/transformers 的 TypeScript 类型不完整

**现象**：

```
error TS2353: Object literal may only specify known properties, and 'pooling' does not exist
error TS2339: Property 'data' does not exist on type
error TS2322: Type 'true' is not assignable to type
```

**原因**：`@xenova/transformers` v2 的 TypeScript 声明文件与实际运行时 API 不匹配——`pipeline()` 返回的联合类型过于宽泛，部分属性缺失。

**解决**：
1. 声明最小调用接口，用官方 `Tensor` 类型收窄返回（替代散落 `any`，保持 lint 全绿）：

```typescript
import type { Tensor } from "@xenova/transformers";

interface Extractor {
  (text: string): Promise<Tensor>;
}
```

2. 模型输出用 `(output as Float32Array)` 访问 `.data`（`Tensor.data` 类型是宽泛的 `DataArray`）
3. 手工实现均值池化（`pooling: "mean"` 选项运行时也不生效）

**参考文件**：[src/lib/embedding.ts](../src/lib/embedding.ts)

---

## 嵌入模型

### 8. 嵌入模型首次测试结果差

**现象**：

```
"前端开发" vs "React TypeScript" → 0.33（预期 > 0.5）
```

**原因**：BGE 模型是为段落级语义检索训练的，短词（2-4 字）效果远差于完整句子。改用完整问句后结果正常。

**短词 vs 完整句对比**：

| 对比 | 分数 |
|------|------|
| "前端开发" vs "React TypeScript"（短词） | 0.33 ❌ |
| "你做过什么项目" vs "介绍一下你的项目经历"（完整句） | 0.74 ✅ |
| "请做一个自我介绍" vs "简单介绍下你自己"（同义表达） | 0.78 ✅ |

**教训**：测试嵌入模型时要用真实使用场景的文本长度，短词测试没有参考价值。

---

### 9. `@xenova/transformers` 的 pooling 选项实际未生效

**现象**：传入 `pooling: "mean"` 后，输出仍然是 token 级张量 `[1, seq_len, 512]` 而非句子级向量 `[512]`。

**解决**：手工实现均值池化——对 `seq_len` 维度求平均：

```typescript
const data = output.data as Float32Array;
const dims = output.dims as number[]; // [1, seq_len, 512]
const seqLen = dims[1], hiddenSize = dims[2];

const vector = new Array(hiddenSize).fill(0);
for (let t = 0; t < seqLen; t++) {
  for (let h = 0; h < hiddenSize; h++) {
    vector[h] += data[t * hiddenSize + h] / seqLen;
  }
}
// 然后 L2 归一化
```

**参考文件**：[src/lib/embedding.ts](../src/lib/embedding.ts) 第 60-75 行

---

## Vercel 部署与存储

### 10. 误选 Vercel KV Durable（付费方案）

**现象**：Vercel Storage 页面看到最低 $8/月，没有免费选项。

**原因**：选了 **KV Durable**（企业版 HA Redis）而非 **Upstash Redis**（免费层 30MB）。

**解决**：Vercel → Storage → 搜索 **Upstash Redis** → Free plan（10,000 次/天，30MB）。

**免费层是否够用**：30MB ÷ 3KB/条 = 10,000 条 Q&A，量级充裕。

---

### 11. vercel env pull 没有自动拉取 KV 环境变量

**现象**：Upstash Redis 开通后 `npx vercel env pull .env.local` 不包含 `KV_REST_API_URL` 和 `KV_REST_API_TOKEN`。

**解决**：手动从 Upstash 控制台复制 REST API URL 和 Token，直接在 `.env.local` 中写入。

---

### 12. @vercel/kv 自动 JSON 序列化导致 Dashboard 500

**现象**：

```
[Dashboard GET] SyntaxError: "[object Object]" is not valid JSON
    at JSON.parse (kv.ts:186)
```

**原因**：`@vercel/kv` 存取时**自动做 JSON 序列化/反序列化**：
- `kv.set(key, obj)` — 直接传对象，不需要 `JSON.stringify`
- `kv.get(key)` — 返回的已经是对象，不需要 `JSON.parse`

如果手动 `JSON.stringify` 后再 `kv.set`，会导致**双重序列化**。读取时再加一层 `JSON.parse`，会导致 `.toString()` 被调用，产生 `"[object Object]"` 字符串。

**解决**：去掉所有手动 `JSON.stringify` 和 `JSON.parse`，直接传对象。

**参考文件**：[src/lib/kv.ts](../src/lib/kv.ts)

---

### 13. Vercel 部署后 /api/chat 报 500：onnxruntime 原生库缺失

**现象**：

```
Failed to load external module @xenova/transformers:
Error: libonnxruntime.so.1.14.0: cannot open shared object file: No such file or directory
```

**原因**：`@xenova/transformers` 在 Node 依赖 `onnxruntime-node`，其原生 `.so` 文件靠路径动态加载，打包器追踪不到 → 被 Vercel serverless 打包剔除。模块加载失败 → 整个 `/api/chat` 500。

**解决**：`next.config.ts` 用 `outputFileTracingIncludes` 强制把原生文件打进部署包：

```typescript
const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/chat": ["./node_modules/onnxruntime-node/bin/**"],
    "/api/dashboard": ["./node_modules/onnxruntime-node/bin/**"],
  },
};
```

**验证**：构建后检查 `route.js.nft.json` 追踪清单里包含 `linux/x64/libonnxruntime.so.1.14.0`。

**参考文件**：[next.config.ts](../next.config.ts)

---

### 14. Vercel 函数超时（默认 10s）导致冷启动下模型失败

**现象**：部署后提问前端显示"请求失败"（服务器返回非 JSON 错误页）。

**原因**：首次冷启动要下载 80MB 模型 + 加载 onnxruntime，超过 Vercel 默认 10s 超时 → 函数被终止 → Vercel 返回 HTML 错误页 → 前端 `JSON.parse` 失败，兜底显示"请求失败"。

**解决**：`vercel.json` 提升超时到 60s：

```json
{
  "functions": {
    "src/app/api/chat/route.ts": { "maxDuration": 60 },
    "src/app/api/dashboard/route.ts": { "maxDuration": 60 }
  }
}
```

---

### 15. hf-mirror 从 Vercel 美国服务器拉取慢 / 失败

**原因**：`hf-mirror.com` 是国内镜像，Vercel 函数跑在美国，跨洋拉取很慢甚至卡死。

**解决**：双源自动回退（见问题 3）——海外部署自动用官方源，无需配置；国内本地用国内镜像。

---

### 16. 环境变量改动后必须重新部署（KV / 密钥不生效）

**现象**：在 Vercel 创建 KV 后仍报：

```
@vercel/kv: Missing required environment variables KV_REST_API_URL and KV_REST_API_TOKEN
```

**原因**：Vercel 的环境变量**在构建时注入**函数，已运行的旧部署不会自动获得新变量。连接 KV / 改密钥后不重新部署，函数还是旧配置。

**解决**：任何 env 改动 → `Deployments → 最新一次 → Redeploy`。**重新部署是 90% 此类问题的解药。**

---

### 17. Dashboard 报"未授权访问"

**原因**：两种情况——
1. `DASHBOARD_SECRET` 未在 Vercel 设置（后台未启用）
2. 设置了但 URL 的 `?key=` 填错

**解决**：Settings → Environment Variables 设置 `DASHBOARD_SECRET` → 重新部署；URL 的 key 必须和 Vercel 上设置的值**一字不差**（大小写、连字符）。现在代码能区分这两种情况并给出不同提示。

---

### 18. Dashboard 报"加载失败，请重试"

**原因**：Vercel KV 未创建，或创建了但没重新部署。

**解决**：`Storage → Create → KV` → 重新部署。现在代码会提示"未检测到 KV 环境变量，请确认创建 KV 后重新部署"，不再笼统报错。

**参考文件**：[src/app/api/dashboard/route.ts](../src/app/api/dashboard/route.ts)

---

## 前端 / 暗色模式

### 19. 水合告警：A tree hydrated but some attributes... didn't match

**现象**：打开页面后 Console 报：

```
A tree hydrated but some attributes of the server rendered HTML didn't match the client properties.
```

**原因**：暗色模式防闪烁脚本在 React 水合**之前**给 `<html>` 加了 `.dark` 类，React 比对 class 属性时发现服务端/客户端不一致。仅在系统为深色模式时出现。

**解决**：`<html>` 元素加 `suppressHydrationWarning`：

```tsx
<html lang="zh-CN" className="h-full antialiased" suppressHydrationWarning>
```

**参考文件**：[src/app/layout.tsx](../src/app/layout.tsx)

---

### 20. 主题切换要"点两下"才生效

**现象**：从深色切换到浅色需要点两次按钮。

**原因**：三态循环按钮（🌓 跟随系统 → ☀️ 浅色 → 🌙 深色）里，"深色 → 跟随系统"在系统本身是深色时**没有视觉变化**，看起来像没点中。

**解决**：改为**分段选择器**（☀️ / 🌓 / 🌙 三个独立按钮），点哪个直达哪个，无循环歧义。

**参考文件**：[src/components/ThemeToggle.tsx](../src/components/ThemeToggle.tsx)

---

### 21. react-hooks/set-state-in-effect 报错

**现象**：ESLint 报 `Calling setState synchronously within an effect can trigger cascading renders`。

**原因**：React 19 新 lint 规则禁止在 effect 内同步 setState。

**解决**：主题初始化、读 URL 参数这类"必须在水合后读浏览器状态"的场景是合法用途，加注释说明并关闭该规则：

```tsx
useEffect(() => {
  const initial = getInitialMode();
  // 必须在水合后读取 localStorage（SSR 阶段没有 window）
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setMode(initial);
  applyTheme(initial);
}, []);
```

---

## 运行时

### 22. tsx -e 不支持顶层 await（CJS 模式）

**现象**：

```
ERROR: Top-level await is currently not supported with the "cjs" output format
```

**解决**：写成带 `async function main()` + `main()` 的脚本文件，用 `npx tsx file.ts` 执行。

**参考**：`src/lib/embedding.test.ts`、`src/lib/knowledge.test.ts` 等临时测试脚本

---

### 23. Node.js 不自动加载 .env.local

**现象**：`npx tsx script.ts` 运行时读取不到环境变量（如 `KV_REST_API_URL`）。

**原因**：`tsx` 不会自动加载 `.env.*` 文件（不像 Next.js 有自己的加载机制）。

**解决**：使用 Node.js 的 `--env-file` 参数：

```bash
node --env-file=.env.local --import tsx/esm script.ts
```

或者直接用 `npm run dev`（Next.js 会自动加载 `.env.local`）进行调试。

---

## 调试技巧

### 24. 验证嵌入模型是否正常工作的标准方法

使用完整句子而非短词进行测试，相似度阈值参考值：

```
相同语义的表述 → 相似度 > 0.7
不相关的句子   → 相似度 < 0.4
```

测试代码模板：

```typescript
const v1 = await embed("你做过什么项目");
const v2 = await embed("介绍一下你的项目经历");  // 语义相同 → > 0.7
const v3 = await embed("今天天气怎么样");        // 不相关 → < 0.4
```

### 25. RAG 检索阈值调优

当前项目使用的阈值：

| 场景 | 阈值 | 理由 |
|------|------|------|
| curated Q&A 命中 | ≥ 0.75 | 保守，宁愿多漏也不多错 |
| 短问题（< 5 字） | 建议降低到 0.6 | 短文本语义信号弱 |

阈值可在 `searchCuratedQA()` 调用时覆盖。

---

## 待解决问题

| 问题 | 影响 | 计划解决 |
|------|------|---------|
| Vercel 域名被墙 | 手机无法访问 | Phase 4：绑定自定义域名 |
| sharp 空壳每次 install 都要重做 | 本地开发不便 | ✅ 已解决（`scripts/fix-sharp.js` 挂载 postinstall + dev/build 前置，只在 sharp 加载失败时写空壳）|
| Vercel 上嵌入模型冷启动仍偏慢 | 首次对话 10-60 秒 | ✅ 已缓解（60s 超时 + 双源回退 + 原生库打包）；预热后正常 |
| RAG 检索缓存重启丢失 | YAML Q&A 每次重启要重新算向量 | ✅ 已解决（Phase 2 接 KV，重启从 KV 加载）|
