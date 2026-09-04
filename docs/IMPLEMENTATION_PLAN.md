# 📐 实现方案

> 按顺序执行，每完成一个文件就验证一次，确认无误再继续。

---

## Phase 1：RAG 管道核心（3 个新文件 + 升级 2 个老文件）

### 1.1 embedding.ts — 本地嵌入模型

**文件**：`src/lib/embedding.ts`

**做什么**：
- 加载 `Xenova/bge-small-zh-v1.5` 模型（首次下载 23MB，缓存到本地）
- 提供 `embed(text: string): Promise<number[]>` → 文本转 384 维向量
- 提供 `cosineSimilarity(a: number[], b: number[]): number` → 两个向量的余弦相似度
- 提供 `search(query: string, candidates: T[], getEmbedding: (item: T) => number[], topK: number, threshold: number): Promise<T[]>` → 通用检索函数

**验证**：
```bash
npx tsx -e "
import { embed, cosineSimilarity } from './src/lib/embedding'
const v1 = await embed('前端开发')
const v2 = await embed('React TypeScript')
const v3 = await embed('我喜欢吃火锅')
console.log('相关:', cosineSimilarity(v1, v2))  // 应该 > 0.5
console.log('不相关:', cosineSimilarity(v1, v3)) // 应该 < 0.3
"
```

---

### 1.2 knowledge.ts — 知识库加载（只管理 curated Q&A）

**文件**：`src/lib/knowledge.ts`

**做什么**：
- `loadCuratedQA()`：读取 curated_qa.yaml → 每条问答对调 embed() 算向量 → 返回 `QAItem[]`
- 导出类型：`QAItem`（已收录问答结构）
- **注意**：profile.yaml **不参与 RAG**，保持现有全量注入 System Prompt 方式

**分块规则**：
```
只有 curated_qa.yaml 的内容需要向量化，每条问答一个向量
profile.yaml 保持全量注入，不做分块
```

**验证**：
```bash
npx tsx -e "
import { loadProfileChunks, loadCuratedQA } from './src/lib/knowledge'
const chunks = await loadProfileChunks()
const qa = await loadCuratedQA()
console.log('文档块:', chunks.length)
console.log('预设问答:', qa.length)
"
```

---

### 1.3 升级 prompt.ts — 注入 RAG 检索结果

**文件**：`src/lib/prompt.ts`（修改已有文件）

**改什么**：
- 新增 `buildRAGContext(retrievedQA)` → 把检索到的 Q&A 答案拼成一段文字
- 修改 `buildSystemPrompt()` → 接受可选的 `ragContext` 参数
- Prompt 结构变为：Guardrails → Persona → profile.yaml 全量 → **RAG Context** → 对话历史

**原来**：
```
Guardrails → Persona → 全量 profile 文字
```

**改为**：
```
Guardrails → Persona → 全量 profile 文字 → [检索到的 Q&A 答案]
```

**注意**：profile.yaml 保持全量注入，不参与 RAG。RAG 检索到的内容作为**补充信息**追加在后面。

---

### 1.4 升级 route.ts — 集成 RAG 检索

**文件**：`src/app/api/chat/route.ts`（修改已有文件）

**改什么**：
- 收到面试官问题后 → 调 `search()` 检索 curated Q&A
- 命中 → 检索到的答案传给 `buildSystemPrompt(ragContext)`，LLM 基于答案润色
- 未命中 → profile.yaml 全量注入（回退已有逻辑），LLM 基于 profile 生成回答
- 未命中时 → **自动记录这条新 Q&A 到待审核队列**（先在内存里打印日志，Phase 2 再接 KV）

---

## Phase 2：Vercel KV + 求职者 Dashboard（3 个新文件）

### 2.1 开通 Vercel KV

- 在 Vercel 项目 → Storage → KV → Create → 自动注入环境变量
- 本地开发：`npm install @vercel/kv`，用 `vercel link` + `vercel env pull` 拉取环境变量

---

### 2.2 kv.ts — KV 读写封装

**文件**：`src/lib/kv.ts`

**做什么**：
- `savePendingQA(question, answer)` → 写入待审核队列
- `getPendingQAs()` → 获取所有待审核
- `saveCuratedQA(qa)` → 将一条审核通过的 Q&A 写入 KV（含向量）
- `getCuratedQAs()` → 获取所有已审核的 Q&A
- `deleteQA(id)` → 删除一条 Q&A
- `updateQA(id, question, answer)` → 编辑一条 Q&A 并重新计算向量
- `recordAnalytics(question)` → 记录面试官问题（统计热门）
- `getHotQuestions(topN)` → 获取 Top-N 热门问题

---

### 2.3 /api/dashboard/route.ts — 审核 API

**文件**：`src/app/api/dashboard/route.ts`

**做什么**：
- `GET`：返回待审核列表 + 已审核列表 + 简要统计
- `POST`：收录/编辑/删除 Q&A（需验证 `DASHBOARD_SECRET`）

---

### 2.4 /dashboard/page.tsx — 求职者审核后台

**文件**：`src/app/dashboard/page.tsx`

**做什么**：
- 通过 URL 参数 `?key=xxx` 鉴权
- 展示两个列表：待审核 + 已收录
- 每条 Q&A 有 3 个操作按钮：收录 / 编辑 / 删除
- 顶部显示简要统计：总对话数、收录率、热门问题 Top 5

---

## Phase 3：体验优化（升级已有文件）✅ 已完成（2026-08-01）

### 3.1 ChatWindow 升级 — 热门问题 ✅

- [x] 对话页底部显示"其他面试官也问了"（从 KV 读 hot questions）
- [x] 用户点击热门问题直接填入输入框

### 3.2 暗色模式完善 ✅

- [x] `ThemeToggle.tsx`：分段选择器（☀️/🌓/🌙）+ localStorage 记忆 + 跟随系统 + 防闪烁
- [x] 补充：Hermes 暗紫主题整体换装（深空黑基底 + 紫色氛围光 + 渐变主色）

### 3.3 对话页 UI 打磨 ✅

- [x] 消息气泡进场动画
- [x] AI 打字时的闪烁光标效果
- [x] 错误状态更友好的提示样式 + 重试按钮

---

## Phase 4：开源推广

### 4.1 README 完善

- 替换所有 `yourusername` → `kibbxcg`
- 录 Demo GIF（用 ScreenToGif 或 OBS）
- 填入真实的 Vercel Deploy Button 链接

### 4.2 发版

- 更新 CHANGELOG，打 tag `v1.0.0`
- 发布到 V2EX / 掘金 / 知乎

---

# 📊 总览

| Phase | 文件数 | 新建 | 修改 | 核心交付 |
|-------|--------|------|------|---------|
| Phase 1 | 5 | 2 | 3 | RAG 管道可运行 |
| Phase 2 | 3 | 3 | 0 | Dashboard 可审核 |
| Phase 3 | 7 | 2 | 5 | UI 打磨完成 ✅ |
| Phase 4 | 0 | 0 | 0 | 开源推广 |

---

# 🚦 执行规则

1. **一次只做一步**，按 Phase 1 → 4 顺序来
2. **每完成一个文件就验证**，确认无误再继续
3. **遇到不合适的地方暂停**，我们讨论调整方案
4. **每个 Phase 结束做一次 git commit**，不用攒到最后

---

当前进度：Phase 1 ✅ · Phase 2 ✅ · Phase 3 ✅（2026-08-01）。

维护加固 ✅（2026-09-05）：全量代码巡检与安全加固（RAG 缓存 TTL 修复、history 注入防御、后台鉴权常数时间比较、/api/chat 限流）、vitest 单测体系接入 CI、sharp 空壳修复自动化、英文 README、OG 社交卡片、短问题自适应检索阈值。Phase 4 中 Demo GIF 与发版（CHANGELOG 打 tag v1.0.0）仍待办。
