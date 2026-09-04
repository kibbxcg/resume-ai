# 📝 变更日志 (CHANGELOG)

> 记录项目的每一次有意义变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased] — 当前开发中

### 2026-09-05 — 安全响应头 + 热门问题归一化统计 + 文档同步

**变更类型**：新增 + 修改

**说明**：三组小改进。① 全站安全响应头：`X-Frame-Options: DENY` 防点击劫持（尤其是带 `?key=` 的 /dashboard）、`Referrer-Policy: strict-origin-when-cross-origin` 跨域只发源、`X-Content-Type-Options: nosniff`，已在 dev server 上验证生效。② 热门问题统计归一化：末尾标点（`你熟悉哪些技术栈？` vs `你熟悉哪些技术栈`）与多余空白不再拆成两条记录，聚合更准。③ 文档对齐现实：REQUIREMENTS 5.2 检索参数表移除旧的"两级检索 / profile 分块"残留描述、补短问题自适应阈值；IMPLEMENTATION_PLAN 进度行更新本次维护加固内容。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `next.config.ts` | 修改 | 全站 headers()：X-Frame-Options / nosniff / Referrer-Policy |
| `src/lib/kv.ts` | 修改 | 新增 `normalizeQuestion()`，统计前归一化 |
| `src/lib/kv.test.ts` | 新增 | 归一化 4 个用例 |
| `docs/REQUIREMENTS.md` | 修改 | 5.2 检索规格对齐单级检索 + 自适应阈值现状 |
| `docs/IMPLEMENTATION_PLAN.md` | 修改 | 进度行补维护加固记录 |

**影响范围**：配置 / 后端 / 文档

---

### 2026-09-05 — /api/chat 按 IP 限流（保护 LLM 额度）+ 清理模板遗留

**变更类型**：新增 + 清理

**说明**：对话接口是公开入口且 LLM 按量计费，此前没有任何限流——一个循环脚本就能刷爆站长的 API 额度。新增 `src/lib/rate-limit.ts`：每 IP 每分钟 20 次（固定窗口计数器，纯内存零依赖），超限返回 429 + 友好提示 + `Retry-After`。serverless 每实例独立计数属"近似"全局限流，对个人部署足够挡脚本滥用（已在代码注释说明取舍）。限流在请求解析之前执行，非法请求同样计入额度。已真实冒烟验证：20 次后第 21 次返回 429。顺带清理 `public/` 里 5 个 Next.js 模板遗留 SVG（无引用），README 中英两版加 CI 状态徽章。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/rate-limit.ts` | 新增 | 固定窗口限流 + IP 提取（可注入时钟，便于单测） |
| `src/lib/rate-limit.test.ts` | 新增 | 8 个用例（窗口/过期/独立性/剩余额度/retryAfter/IP 提取） |
| `src/app/api/chat/route.ts` | 修改 | 入口处按 IP 限流，429 + Retry-After |
| `public/file.svg` 等 5 个 | 删除 | Next.js 模板遗留，无引用 |
| `README.md` / `README.en.md` | 修改 | 加 CI 状态徽章 |

**影响范围**：后端 / 安全 / 文档

---

### 2026-09-05 — RAG 检索体验优化（短问题自适应阈值 + 模型加载瞬时故障自愈）

**变更类型**：修改

**说明**：两项检索健壮性优化。① 落地 TROUBLESHOOTING #25 的建议但一直没实现的策略：短问题（< 5 字，如「技术栈？」）语义信号弱，检索阈值从 0.75 自适应降到 0.6 换取召回，避免短提问永远打不中知识库；阈值逻辑抽成纯函数 `curatedThresholdFor()` 并补单测。② 嵌入模型首次加载若因网络抖动失败，原来会把这个失败永久缓存到进程冷启动（RAG 一直禁用）；现在改为下次请求自动重试，模块级损坏仍由 `transformersBroken` 拦截不受影响。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/knowledge.ts` | 修改 | 新增 `curatedThresholdFor()`，`searchCuratedQA` 默认阈值按问题长度自适应 |
| `src/lib/knowledge.test.ts` | 新增 | 阈值自适应 4 个用例 |
| `src/lib/embedding.ts` | 修改 | `getExtractor()` 失败不再永久缓存，下次请求重试 |
| `CONTRIBUTING.md` | 修改 | 模型下载描述对齐双源回退现状 |

**影响范围**：后端

---

### 2026-09-05 — 补上缺失的 OG 社交分享卡片

**变更类型**：新增

**说明**：PRD v1.0 的 P0 项「OG 社交分享图片」此前实际缺失（无资产、无 metadata，PRD 标记为已完成）。本次补齐：新增 1200×630 品牌分享卡 `public/og-image.png`（Hermes 暗紫风格，纯品牌文案不含个人姓名，fork 用户不会出现名字错误；源文件 `docs/images/og-card.html` 可改后重新导出），`layout.tsx` 补 OpenGraph + Twitter Card metadata。分享链接到微信 / Twitter / LinkedIn 等平台时将显示卡片预览。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `public/og-image.png` | 新增 | 1200×630 社交分享卡片图 |
| `docs/images/og-card.html` | 新增 | 卡片设计源文件（改后可在浏览器 1200×630 截图重新导出） |
| `src/app/layout.tsx` | 修改 | 补 openGraph + twitter metadata |

**影响范围**：前端 / 文档

---

### 2026-09-05 — 新增单元测试体系（vitest）+ 接入 CI

**变更类型**：新增

**说明**：项目首次引入自动化测试。为纯函数层补 19 个用例：余弦相似度（方向/正交/零向量/维度不匹配）、`sanitizeHistory`（system 注入丢弃/非法条目/超长/截取最近 6 条）、`buildSystemPrompt`（Guardrails 置顶/全量 profile 注入/RAG 段落按需出现且位于 profile 之后）。校验逻辑从 route.ts 抽到 `src/lib/validation.ts` 以便复用；顺手接通 `.env.example` 已承诺但从未使用的 `NEXT_PUBLIC_SITE_NAME`（现在真正作用于站点标题）。CI 流水线在 lint/tsc/build 之间加入 `npm run test`。测试全程不下载嵌入模型，秒级完成。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `vitest.config.ts` | 新增 | vitest 配置（node 环境 + `@/` 别名） |
| `src/lib/embedding.test.ts` | 新增 | 余弦相似度 6 个用例 |
| `src/lib/validation.test.ts` | 新增 | history 清洗 6 个用例（含注入防御） |
| `src/lib/prompt.test.ts` | 新增 | System Prompt 结构 7 个用例 |
| `src/lib/validation.ts` | 新增 | 从 route.ts 抽出的 history 校验模块 |
| `src/app/api/chat/route.ts` | 修改 | 改用 `sanitizeHistory()` |
| `src/app/layout.tsx` | 修改 | 站点标题接通 `NEXT_PUBLIC_SITE_NAME` |
| `package.json` | 修改 | 新增 `test` 脚本 + vitest@2 开发依赖（兼容 Node 20） |
| `.github/workflows/ci.yml` | 修改 | CI 加入单元测试步骤 |
| `Makefile` / `CONTRIBUTING.md` | 修改 | check 入口与验证命令补测试 |

**影响范围**：测试 / CI / 后端

---

### 2026-09-05 — README 中英双语（新增英文版）

**变更类型**：新增

**说明**：落地 v1.0 需求中「README 中英双语」项。新增 `README.en.md` 英文版（完整对齐中文版内容：定位、亮点、部署、后台、技术栈、FAQ），中英两版顶部互相链接。服务推广策略中的英文渠道（Reddit r/webdev / Twitter）。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `README.en.md` | 新增 | 英文版 README，内容与中文版对齐 |
| `README.md` | 修改 | 顶部新增语言切换链接 |

**影响范围**：文档

---

### 2026-09-05 — 代码巡检：修复 RAG 缓存失效缺陷 + 补强输入安全

**变更类型**：修复 + 安全加固

**说明**：全量代码巡检发现并修复 5 个问题。最重要的是 **RAG 缓存永不失效**：chat 与 dashboard 是两个独立 serverless 函数，原 `invalidateCuratedCache()` 既无人调用、跨函数调用也无效，导致后台收录的新问答在 chat 函数冷启动前永远不生效——改为 30 秒 TTL 自动刷新。安全方面：`history` 此前未校验，恶意客户端可注入 `role:"system"` 消息劫持对话，现逐条 zod 校验（role 白名单 + 长度上限）；后台鉴权改常数时间比较防时序攻击；问答文本限长保护 KV。已通过本地 dev server 真实冒烟验证（注入 history 被正确丢弃，KV 不可达时降级路径正常）。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/chat/route.ts` | 修复 | curated QA 缓存改 30s TTL（原跨函数失效机制无效）；history 逐条 zod 校验；非字符串 message 返回 400 而非 500 |
| `src/app/api/dashboard/route.ts` | 安全 | `DASHBOARD_SECRET` 改 SHA-256 + timingSafeEqual 常数时间比较；approve/edit 文本限长（问题 2000 / 答案 5000）；id/pendingId 类型校验 |
| `src/lib/kv.ts` | 修复 | pending/curated ID 从 `Date.now()` 改 `randomUUID()`，消除并发同毫秒撞 ID |

**影响范围**：后端 / 安全

---

### 2026-09-05 — sharp 空壳修复自动化（postinstall + dev/build 前置）

**变更类型**：新增

**说明**：把「sharp 下载失败 → 手动替换空壳」的操作自动化为 `scripts/fix-sharp.js`。脚本逐个检查项目内的 sharp 副本，只在 require 失败时写入空壳（完好或已空壳则跳过），幂等可重复执行。挂载在 `postinstall` 与 `dev`/`build` 前置：普通安装自动运行；国内用户 `npm install --ignore-scripts`（会跳过 postinstall）也能在首次 dev/build 时自动修复。海外环境 sharp 正常时脚本为空操作，不影响 Vercel 构建。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `scripts/fix-sharp.js` | 新增 | 幂等的 sharp 空壳修复脚本（只在加载失败时替换） |
| `package.json` | 修改 | 新增 `postinstall`；`dev`/`build` 前置运行修复脚本 |
| `docs/TROUBLESHOOTING.md` | 修改 | 问题 5 标记已自动化；待解决清单移除该项 |
| `CONTRIBUTING.md` | 修改 | 本地开发补充国内网络装依赖指引 |

**影响范围**：构建配置 / 文档

---

### 2026-08-01 — 提升 AI 回答质量（回答风格 Prompt + 丰富示例问答）

**变更类型**：修改

**说明**：System Prompt 新增「回答风格」段——要求第一人称自然口吻、结合 profile 具体细节举例、简洁不啰嗦，避免 AI 回答空洞套话；`curated_qa.example.yaml` 补充 3 道高频面试题示例（优势/劣势、职业规划、学习方法），提升冷启动回答质量。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/prompt.ts` | 修改 | Persona 段新增「回答风格」指引（自然第一人称 / 具体细节 / 简洁） |
| `curated_qa.example.yaml` | 修改 | 新增优势劣势、职业规划、学习方法 3 条示例问答 |

**影响范围**：后端 / 文档

---

### 2026-08-01 — Markdown 正确渲染 + 代码语法高亮

**变更类型**：修复 + 新增

**说明**：修复 AI 回答中 Markdown 样式不生效的问题——此前 Tailwind 的 `prose` 类在没有 `@tailwindcss/typography` 插件时是空操作。引入 typography 插件 + `rehype-highlight` 代码高亮，并按 Hermes 主题定制了一套 highlight.js 令牌配色（浅色 / 深色各一套），代码块在两种主题下都有可读的语法着色。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 新增依赖：`@tailwindcss/typography`、`rehype-highlight` |
| `src/app/globals.css` | 修改 | prose 排版微调 + 定制 hljs 令牌配色（浅色 / 深色两套） |
| `src/components/ChatWindow.tsx` | 修改 | react-markdown 接入 `rehypeHighlight` 插件 |

**影响范围**：前端

---

### 2026-08-01 — Dashboard 对齐 Hermes 暗紫主题

**变更类型**：修改

**说明**：审核后台整体换装与对话页统一的 Hermes 暗紫风格——渐变标题 + 字距 subtitle、玻璃质感统计卡片、色点小节标题、紫色渐变主按钮、来源徽章样式、玻璃弹窗，以及更友好的空状态 / 错误态样式。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/dashboard/page.tsx` | 修改 | 标题 / 统计卡 / 小节标题 / 按钮 / 徽章 / 弹窗 / 空态错误态全面对齐 Hermes 主题 |

**影响范围**：前端

---

### 2026-08-01 — 新增部署指南 + 更新排障手册

**变更类型**：文档

**说明**：新增 `docs/DEPLOYMENT.md` 小白部署流程（前台 + 后台 + 踩坑点）；`TROUBLESHOOTING.md` 从 16 个问题扩到 25 个，补入本次部署踩的坑（onnxruntime 原生库缺失、函数超时、环境变量需重新部署、后台未授权/加载失败、水合告警、主题切换点两下、set-state lint），并理顺编号；README 增加部署指南链接。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `docs/DEPLOYMENT.md` | 新增 | 小白部署流程（前台 + 后台 + 坑位） |
| `docs/TROUBLESHOOTING.md` | 修改 | 16 → 25 个问题，编号理顺 |
| `README.md` | 修改 | 链接部署指南 |

**影响范围**：文档

---

### 2026-08-01 — Dashboard 未配置 KV 时给出明确指引

**变更类型**：修改

**说明**：后台在未创建 Vercel KV 存储时，之前只报笼统的"加载失败，请重试"。现在 API 返回明确指引（去 Storage 创建 KV 后重新部署），前端也会展示具体错误信息。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/dashboard/route.ts` | 修改 | KV 环境变量缺失时返回 503 + 创建 KV 的指引 |
| `src/app/dashboard/page.tsx` | 修改 | 非 2xx 时读取并展示服务端具体错误 |

**影响范围**：后端 / 前端

---

### 2026-08-01 — README 增加求职者后台说明 + 一键部署弹出 DASHBOARD_SECRET

**变更类型**：修改

**说明**：响应小白部署反馈——README 新增"求职者后台（查看问答对）"章节，说明如何创建 Vercel KV、设置 `DASHBOARD_SECRET`、打开后台查看问答；一键部署按钮的 `env` 参数加入 `DASHBOARD_SECRET`，部署时自动弹出第三个框，后台开箱即用。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `README.md` | 修改 | 新增求职者后台章节；部署按钮 env 加入 DASHBOARD_SECRET；环境变量列表补充 |

**影响范围**：文档

---

### 2026-08-01 — 修复 Vercel 部署后 500（onnxruntime 原生库缺失）

**变更类型**：修复

**说明**：部署到 Vercel 后 `/api/chat` 报 500，错误 `libonnxruntime.so.1.14.0: cannot open shared object file`。根因：`@xenova/transformers` 依赖的 `onnxruntime-node` 原生 `.so` 文件在 serverless 打包时被剔除。双重修复：`next.config` 用 `outputFileTracingIncludes` 强制把原生文件打进部署包（恢复 RAG）；`embedding.ts` 改动态加载 + 失败降级，确保即使原生库仍缺失，对话也照常可用（回退 profile 全量注入），绝不 500。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `next.config.ts` | 修改 | `outputFileTracingIncludes` 强制包含 `onnxruntime-node/bin` 原生文件 |
| `src/lib/embedding.ts` | 修改 | `@xenova/transformers` 改动态 import，加载失败禁用 RAG 并降级，不再拖垮整个路由 |

**影响范围**：后端 / 构建配置

---

### 2026-08-01 — 嵌入模型下载源自动回退（一键部署零配置）

**变更类型**：修改

**说明**：嵌入模型下载改为"官方源优先 + 失败自动回退国内镜像"。Vercel 海外部署不再需要配置 `HF_ENDPOINT`，一键部署小白只需填 `LLM_PROVIDER` + `LLM_API_KEY` 即可正常对话。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/embedding.ts` | 修改 | 模型源默认 `huggingface.co`，加载失败自动回退 `hf-mirror.com`；`HF_ENDPOINT` 降级为可选固定源 |
| `.env.example` | 修改 | `HF_ENDPOINT` 说明更新为"一般无需设置" |

**影响范围**：后端

---

### 2026-08-01 — 修复 Vercel 部署后"请求失败"

**变更类型**：修复

**说明**：修复部署到 Vercel 后提问返回"请求失败"的问题。根因是冷启动时下载 80MB 嵌入模型超过 Vercel 函数默认 10s 超时，返回非 JSON 错误页。三项修复：延长函数超时、模型源可配置（海外部署用官方源）、RAG/KV 故障时降级回 profile 全量注入保证对话始终可用。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `vercel.json` | 新增 | chat/dashboard 函数 maxDuration 提升到 60s |
| `src/lib/embedding.ts` | 修改 | 模型下载源改为 `HF_ENDPOINT` 环境变量可配，默认 hf-mirror.com |
| `src/app/api/chat/route.ts` | 修改 | YAML/KV 加载、语义检索加 try/catch，失败时降级 profile-only 不阻断对话 |
| `.env.example` | 修改 | 新增 HF_ENDPOINT 说明 |

**影响范围**：后端 / 配置

---

### 2026-08-01 — README 修正过时内容

**变更类型**：修改

**说明**：修正 README 中遗留的旧版本描述：Edge Runtime → Node.js Runtime、补全自进化 RAG 流程与设计亮点、技术栈表格更新（Next.js 16 / 嵌入模型 / Vercel KV）、项目结构对齐实际文件（删除不存在的 MessageBubble/ChatInput，补充 dashboard、hot-questions、ThemeToggle 等）、FAQ 隐私表述修正。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `README.md` | 修改 | 过时内容全面修正，与实际架构对齐 |

**影响范围**：文档

---

### 2026-08-01 — 热门问题展示 + 暗色模式 + UI 打磨（Phase 3）

**变更类型**：新增 + 修改

**说明**：面试官对话页展示"其他面试官也问了"真实热门问题（从 KV 统计）；新增三态暗色模式切换（跟随系统/浅色/深色），localStorage 记忆 + 首次绘制前防闪烁（FOUC）；打磨对话页消息动画、打字光标与错误重试体验。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/api/hot-questions/route.ts` | 新增 | 公开热门问题接口：GET 从 KV 读 Top-5，KV 未配置时优雅降级为空数组，s-maxage=60 缓存 |
| `src/components/ChatWindow.tsx` | 修改 | 挂载时拉取热门问题展示在输入区上方，点击填入输入框；消息气泡进场动画（messageIn）；AI 思考指示器改闪烁光标；错误提示加重试按钮；header 加右侧留白避让 ThemeToggle |
| `src/components/ThemeToggle.tsx` | 新增 | 三态暗色切换（🌓 跟随系统 / ☀️ 浅色 / 🌙 深色），localStorage 记忆 |
| `src/app/layout.tsx` | 修改 | 挂载 ThemeToggle + body 最前插入内联脚本在首次绘制前应用主题（防闪烁） |
| `src/app/globals.css` | 修改 | `dark:` 变体从 `@media (prefers-color-scheme)` 改为 `.dark` 类驱动（`@custom-variant`）；新增 messageIn 关键帧 |

**影响范围**：前端

---

### 2026-08-01 — Hermes 暗紫主题 + 暗色模式修复

**变更类型**：修改

**说明**：对话页整体换装"Hermes 暗紫主题"——深空黑基底 + 紫色氛围光 + 紫→靛渐变主色 + 玻璃面板气泡。同时修复暗色模式的两处体验问题：水合告警（FOUC 脚本改 `<html>` 类名导致的 hydration mismatch，加 `suppressHydrationWarning` 解决）和主题切换需点两下（三态循环按钮改为分段选择器，点选直达）。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/globals.css` | 修改 | 暗色基底改为深空黑 `#0a0a0f`；新增紫色细滚动条；`glowPulse` 头像呼吸动画 |
| `src/app/page.tsx` | 修改 | 新增紫色氛围光背景（双光晕，浅/深色各保留微弱品牌色） |
| `src/components/ChatWindow.tsx` | 修改 | 渐变标题、紫渐变用户气泡、玻璃面板 AI 气泡、紫色光晕输入框、空状态重设计、热门问题区去 emoji |
| `src/components/ThemeToggle.tsx` | 修改 | 三态循环按钮改为分段选择器（☀️/🌓/🌙），紫色高亮当前项 |
| `src/app/layout.tsx` | 修改 | `<html>` 加 `suppressHydrationWarning`，消除主题脚本引起的水合告警 |
| `src/app/dashboard/page.tsx` | 修改 | 暗色面板对齐新配色（玻璃面板 + 细边框） |

**影响范围**：前端

---

### 2026-08-01 — 开源准备：CI + 贡献指南 + Demo 占位图（Phase 4.1）

**变更类型**：新增 + 修复

**说明**：补齐 GitHub 仓库门面——新增 CI 自动检查（lint + 类型 + 构建）、重写贡献指南、Demo 占位图、README 加 FAQ；顺手修掉遗留 lint 错误，让 CI 全绿。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `.github/workflows/ci.yml` | 新增 | 每次 push/PR 自动跑 lint + tsc + build |
| `CONTRIBUTING.md` | 重写 | 原本是空文件，补全贡献指南（开发环境 / PR 流程 / 代码规范） |
| `docs/images/demo.svg` | 新增 | Hermes 暗紫风格的 Demo 占位图（真实 GIF 录制后替换） |
| `README.md` | 修改 | Demo 图引用改为 SVG；新增 FAQ 板块 |
| `src/lib/embedding.ts` | 修改 | 用 `Tensor` 类型接口替代散落 `any`，消除 lint 错误 |
| `src/app/dashboard/page.tsx` | 修改 | `set-state-in-effect` 加 eslint-disable 注释说明 |
| `src/app/api/dashboard/route.ts` | 修改 | 移除未使用的类型导入 |

**影响范围**：CI / 文档 / 后端

---

### 2026-07-31 — Vercel KV + Dashboard 审核后台（Phase 2）

**变更类型**：新增

**说明**：实现自进化知识库闭环——自动记录 Q&A → Dashboard 审核 → 收录后加入 RAG 检索。求职者通过 `/dashboard` 管理知识库，AI 分身越用越准。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/kv.ts` | 新增 | Vercel KV 读写封装：待审核/已收录/热门统计三个子模块 |
| `src/app/api/dashboard/route.ts` | 新增 | Dashboard API：GET 查询 + POST 操作（收录/编辑/删除），DASHBOARD_SECRET 鉴权 |
| `src/app/dashboard/page.tsx` | 新增 | 求职者审核页面：待审核列表 + 已收录列表 + 热门问题 + 编辑弹窗 |
| `src/app/api/chat/route.ts` | 修改 | 集成 KV：启动时合并 YAML+KV 加载 curated QA，tee 流收集答案写入 pending |
| `.env.local` | 修改 | 新增 DASHBOARD_SECRET + KV 连接变量 |
| `.env.example` | 修改 | 新增 DASHBOARD_SECRET 模板 |
| `package.json` | 修改 | 新增依赖：`@vercel/kv` |

**技术备注**：
- 存储：Upstash Redis（Vercel Free Plan，30MB），无需数据库
- `@vercel/kv` 自动 JSON 序列化/反序列化，不需要手动 `JSON.stringify`/`JSON.parse`
- 自进化链路：chat 未命中 → tee 收集答案 → `savePendingQA()` → Dashboard 审核 → `approveQA()` 含向量
- curated QA 合并策略：YAML + KV 并行加载，KV 同 ID 覆盖 YAML
- 鉴权：Dashboard 通过 URL `?key=xxx` 与 `DASHBOARD_SECRET` 比对，无需注册登录

---

### 2026-07-30 — RAG 管道核心实现（Phase 1）

**变更类型**：新增

**说明**：实现自进化 RAG 管道——本地嵌入模型 + 余弦相似度检索 + 已审核 Q&A 语义匹配。英文向量模型含金量拉升。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/embedding.ts` | 新增 | 本地嵌入引擎：加载 bge-small-zh-v1.5（512维，80MB），均值池化 + L2 归一化，余弦相似度检索 |
| `src/lib/knowledge.ts` | 新增 | 知识库模块：读取 curated_qa.yaml → 自动向量化 → 语义检索接口 |
| `src/lib/prompt.ts` | 修改 | 新增 `buildRAGContext()`，`buildSystemPrompt()` 支持可选 `ragHits` 参数 |
| `src/app/api/chat/route.ts` | 修改 | 集成 RAG：启动加载 curated QA → 每次请求检索 → 命中注入/未命中回退 profile → 自动记录 |
| `curated_qa.example.yaml` | 新增 | 预置 5 条高质量中文问答模板 |
| `curated_qa.yaml` | 新增 | 用户预置问答文件 |
| `package.json` | 修改 | 新增依赖：`@xenova/transformers` |
| `.gitignore` | 修改 | 移除 `profile.yaml` 忽略规则（Vercel 部署必须包含） |
| `docs/REQUIREMENTS.md` | 修改 | RAG 架构从"两级检索"改为"单级 Q&A 检索 + profile 全量兜底"，中文嵌入模型 |
| `docs/IMPLEMENTATION_PLAN.md` | 新增 | 4 阶段实现方案文档 |

**架构备注**：
- RAG 策略：已审核 Q&A（语义检索）→ profile.yaml 全量注入（兜底），profile 不分块不参与检索
- 嵌入模型：`Xenova/bge-small-zh-v1.5`，中文语义匹配精准（"你熟悉哪些技术" ↔ "你熟悉哪些技术栈" = 0.86）
- 均值池化：手工实现（`@xenova/transformers` 的 `pooling` 选项不生效），对 token 维度求平均
- 模型下载走 `hf-mirror.com` 国内镜像，规避 HuggingFace 被墙
- sharp 问题：用空壳替换 `node_modules/.../sharp/lib/index.js`，文本嵌入不需要图片处理
- 检索缓存：curated QA 在启动时一次性加载 + 向量化，后续请求复用

---

### 2026-07-28 — 对话上下文记忆

**变更类型**：新增

**说明**：AI 分身现在能记住面试官前面问了什么，支持多轮追问。历史记录存在浏览器端，不加数据库。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/llm/provider.ts` | 修改 | `streamChat()` 新增 `history` 参数，对话历史注入 `messages[]` |
| `src/app/api/chat/route.ts` | 修改 | 从请求体提取 `history`，`slice(-6)` 控制 Token 消耗 |
| `src/components/ChatWindow.tsx` | 修改 | 发送请求时附带完整 `messages` 数组 |

**技术备注**：
- 历史记录存浏览器 `useState`，刷新即焚，无需数据库
- `route.ts` 自动截取最近 6 条（3 轮 Q&A），保障 Token 预算
- `history` 参数默认空数组，向后兼容（第一条消息自动适配）

---

### 2026-07-28 — MVP 核心功能实现

**变更类型**：新增

**说明**：实现了完整的"面试官发送问题 → AI 流式回复"链路，包含 5 个核心文件和 1 个客户端组件。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/lib/profile.ts` | 新增 | 读取 profile.yaml + Zod Schema 校验，导出一个类型安全的 `profile` 对象 |
| `src/lib/prompt.ts` | 新增 | 三段式 System Prompt 拼装：Guardrails → Persona → Profile Context |
| `src/lib/llm/provider.ts` | 新增 | LLM 抽象层，支持 5 家厂商（DeepSeek/OpenAI/智谱/通义/Moonshot），OpenAI 兼容协议 |
| `src/app/api/chat/route.ts` | 新增 | POST /api/chat SSE 流式代理，解析 LLM 原始流 → 干净 SSE 返回前端 |
| `src/app/page.tsx` | 重写 | 从 Next.js 默认模板改为对话页面入口（Server Component） |
| `src/components/ChatWindow.tsx` | 新增 | 聊天窗口组件（Client Component）：消息气泡、SSE 流式渲染、Markdown、错误处理、建议问题 |
| `.env.local` | 新增 | 本地开发环境变量（不上传 Git） |
| `package.json` | 修改 | 新增依赖：zod、yaml、react-markdown、tsx |
| `src/lib/llm/test.ts` | 已删除 | 临时测试脚本，验证通过后移除 |
| `profile.yaml` | 新增 | 测试用个人信息文件（不上传 Git） |

**架构备注**：
- 全线 TypeScript `strict: true`，零 `any` 类型
- API Key 全程服务端隔离，浏览器不可见
- 最低 Token 消耗：561 tokens（远低于 4K 上限）
- 支离 Google Fonts（被墙），改用系统字体栈（含中文回退）
- LLM 响应中的 `deepseek-chat` 被 DeepSeek 服务端解析为 `deepseek-v4-flash`（内部代号），行为正确

---

### 2026-07-27 — Next.js 项目初始化

**变更类型**：新增

**操作**：用 `create-next-app` 生成脚手架，修复 GFW 导致的 Google Fonts 加载失败。

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 新增 | Next.js 16 + React 19 + TailwindCSS 4 + TypeScript |
| `package-lock.json` | 新增 | 依赖锁定文件 |
| `tsconfig.json` | 新增 | TypeScript strict 配置 |
| `next.config.ts` | 新增 | Next.js 配置 |
| `postcss.config.mjs` | 新增 | PostCSS + TailwindCSS 配置 |
| `eslint.config.mjs` | 新增 | ESLint 配置 |
| `.gitignore` | 修改 | 合并 Next.js 模板的 gitignore + 已有的 Python/Docker 条目 |
| `src/app/layout.tsx` | 新增+修改 | 删除 Google Fonts 引用，改用系统字体（`fonts.gstatic.com` 被墙） |
| `src/app/globals.css` | 新增+修改 | 字体栈改为系统字体（含中文字体回退） |
| `src/app/page.tsx` | 新增 | Next.js 默认页面（后续替换为对话页） |
| `public/` | 新增 | 静态资源目录 |
| `frontend/` | **删除** | 旧的空骨架目录 |

**技术备注**：在 `fonts.gstatic.com` 不可达的环境下，Next.js 默认的 Google Fonts 会导致 Turbopack 构建失败。改用系统字体栈，同时支持中英文渲染。

---

### 2026-07-27 — 项目方向确定：方案 B（轻量级 MVP）

**决策**：放弃全栈微服务架构（FastAPI + PostgreSQL + ChromaDB + Redis + MinIO），采用纯 Next.js 轻量方案。

**理由**：
- 项目目标是 GitHub 高星开源项目 + 简历技术证明，不是 SaaS 创业
- "5 分钟可部署"是核心竞争力，加后端违背这个原则
- 方案 B 的代码在方案 A 中 100% 可复用，没有沉没成本

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `docs/REQUIREMENTS.md` | 重写 | 从方案 A 全栈规格改为方案 B 轻量规格；新增开源增长策略、多 LLM 支持、OG 图片、暗色模式等需求 |
| `docs/prd.md` | 重写 | 简化核心流程为 Fork→配置→部署；砍掉注册登录、AI 对话采集、PDF 上传、向量数据库等 |
| `README.md` | 重写 | 定位从"项目介绍"改为"开源 Landing Page"；新增 Demo GIF 位、一键部署按钮、技术名片模块、简历话术、Star History 位 |
| `profile.example.yaml` | 新建 | 完整的用户配置模板（基本信息/经历/项目/教育/技能/人设） |
| `.env.example` | 重写 | 新增 5 家 LLM Provider 配置项和说明 |
| `Makefile` | 重写 | 从 Docker 命令改为 Next.js 命令（dev/build/lint/type-check/deploy） |
| `docker-compose.yml` | 降级 | 全栈微服务配置 → 占位注释（v2.0 再用） |
| `backend/` 目录 | **删除** | 方案 A 的 FastAPI 空骨架 |
| `agent/` 目录 | **删除** | 方案 A 的 Agent Engine 空骨架 |
| `scripts/` 目录 | **删除** | 方案 A 的空目录 |

---

## [0.0.0] — 2026-07-27 之前

- 项目骨架搭建（README / LICENSE / CONTRIBUTING / 目录结构）
- 无业务代码

---

## 变更记录格式模板

每次代码变更按以下格式记录：

```markdown
### YYYY-MM-DD — 简短标题

**变更类型**：新增 | 修改 | 删除 | 修复

**变更文件**：

| 文件 | 操作 | 说明 |
|------|------|------|
| `path/to/file` | 新增/修改/删除 | 改了什么的简要描述 |

**影响范围**：前端 / 后端 / 配置 / 文档 / CI

**关联 Issue / PR**：（如果有）
```
