# 📝 变更日志 (CHANGELOG)

> 记录项目的每一次有意义变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased] — 当前开发中

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
