# 🔌 API 接口文档

> 三个接口的请求 / 响应契约。所有接口同源使用（前端自己调），未启用 CORS。
> 本文描述的行为以代码为准：`src/app/api/*/route.ts`。

---

## POST /api/chat — 面试官对话（SSE 流式）

核心对话接口：RAG 检索 → LLM 生成 → SSE 流式返回。

### 请求

```jsonc
{
  "message": "你熟悉哪些技术栈？",   // 必填，字符串，≤ 2000 字
  "history": [                       // 可选，对话历史（实现多轮记忆）
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**history 约束**（不可信输入，服务端逐条校验）：
- `role` 只接受 `user` / `assistant`——其他值（含 `"system"`）整条丢弃，防止注入劫持对话
- `content` 必须是字符串，≤ 10000 字符
- 超过 6 条只保留最近 6 条（3 轮 Q&A）

### 响应

- 成功：`200`，`Content-Type: text/event-stream`

```
data: "你好"

data: "，我是"

data: [DONE]
```

每个 `data:` 是一段 JSON 编码的回复文本片段，前端按序拼接渲染 Markdown。

### 错误

| 状态码 | 场景 | body |
|--------|------|------|
| 400 | message 为空 / 非字符串 / 超 2000 字 | `{"error": "消息不能为空"}` 等 |
| 429 | 触发限流（每 IP 每分钟 20 次） | `{"error": "提问太频繁啦，请 N 秒后再试。"}`，带 `Retry-After` 头 |
| 500 | LLM / 服务端错误 | `{"error": "..."}` |

### 行为说明

- RAG 命中（≥0.75；短问题 <5 字降至 0.6，Top-3）→ 检索到的已审核问答注入 System Prompt
- 未命中 → `profile.yaml` 全量注入兜底，同时该问答自动写入 KV 待审核队列
- 限流在请求解析**之前**执行：非法请求同样消耗额度（反滥用设计）
- 每次提问都会异步记录热门统计（末尾标点 / 多余空白归一化后聚合）

---

## GET /api/dashboard?key=xxx — 后台数据查询

### 鉴权

`key` 必须与环境变量 `DASHBOARD_SECRET` 一字不差（常数时间比较）。
环境变量未设置 → `503`（后台未启用，返回配置指引）；未创建 Vercel KV → `503`（返回开通指引）。

### 响应

```jsonc
{
  "pending": [ { "id": "pending_uuid", "question": "...", "answer": "...", "createdAt": "..." } ],
  "curated": [ { "id": "curated_uuid", "question": "...", "answer": "...", "source": "approved|edited|preloaded", "createdAt": "..." } ],
  "stats": { "totalConversations": 42, "pendingCount": 3, "curatedCount": 10 },
  "hotQuestions": [ { "question": "...", "count": 8, "lastAsked": "..." } ]
}
```

错误：`401`（key 错误）、`503`（后台未启用 / KV 未配置）、`500`。

---

## POST /api/dashboard — 后台操作

### 请求

```jsonc
{
  "key": "你的 DASHBOARD_SECRET",   // 必填
  "action": "approve | edit | delete_curated | delete_pending",
  // approve:  question (≤2000字), answer (≤5000字), pendingId
  // edit:     id, question, answer
  // delete_*: id
}
```

`approve`：待审核 → 已收录（自动为 question 计算嵌入向量），并删除待审核条目。
`edit`：更新已收录条目并重算向量。删除是物理删除。

### 响应

成功：`{"success": true, "item": {...}}`（delete 仅返回 success）。
错误：`401` / `400`（缺字段或字段超限，返回具体指引）/ `500`。

---

## GET /api/hot-questions?top=N — 热门问题（公开）

面试官对话页的「其他面试官也问了」数据源。

- `top`：返回条数，默认 5，范围 1–20
- 成功：`{"hotQuestions": [{ "question": "...", "count": 8, "lastAsked": "..." }]}`
- KV 未配置 / 出错时**优雅降级**为 `{"hotQuestions": []}`（前端回退到建议问题）
- 缓存：`Cache-Control: public, s-maxage=60, stale-while-revalidate=120`

---

## 相关环境变量

| 变量 | 作用 |
|------|------|
| `LLM_PROVIDER` / `LLM_API_KEY` | LLM 厂商与密钥（必填） |
| `DASHBOARD_SECRET` | 后台鉴权密钥（不设则后台整体关闭） |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Vercel KV 自动注入（待审核 / 已收录 / 统计的存储） |
