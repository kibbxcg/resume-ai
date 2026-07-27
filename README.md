# 🤖 ResumeAI

> 通过 AI 对话生成个人知识库，一键创建可交互的 AI 简历网站。
> 让面试官不再只看一张纸，而是和你的"AI 分身"对话。

## 💪 这个项目本身就是你的技术名片

当你把分身链接发给面试官时，你不仅在展示经历，更在无声地证明：

- **全栈工程能力**：独立完成 Next.js + Serverless + LLM 集成部署
- **安全意识**：API Key 服务端隔离、Prompt 注入防护、输入校验
- **AI 应用落地**：RAG-lite 架构设计、Token 预算控制、流式响应优化
- **DevOps 实践**：CI/CD 自动校验、Vercel Edge Runtime 适配、零成本运维
- **产品思维**：以面试官体验为中心的设计，而非技术自嗨

> 💡 Tip: 在简历中这样描述本项目：
> "设计并部署个人 AI 面试分身系统（Next.js + Edge Runtime），
>  实现服务端密钥隔离与 RAG-lite 问答，累计接待 XX 位面试官，
>  项目本身作为全栈+AI工程能力的可验证作品。"

## ✨ 功能

- 🗣️ AI 引导式对话，采集你的经历和技能
- 📄 上传 PDF/Word 简历，自动解析
- 🧠 生成个人专属知识库
- 🌐 一键生成可交互的 AI 个人网站
- 💬 面试官通过链接直接和"你"对话

## 🚀 快速开始

> ⚠️ 项目正在开发中，敬请期待

## 🏗️ 技术栈

- Frontend: Next.js + TailwindCSS
- Backend: FastAPI + PostgreSQL
- AI: LangChain + ChromaDB
- Storage: MinIO
- Deploy: Docker

## 📁 项目结构

resume-ai/
├── README.md              ✅ 有内容了
├── LICENSE                ✅ MIT
├── CONTRIBUTING.md        ✅ 骨架
├── CHANGELOG.md           ✅ 骨架
├── docker-compose.yml     ✅ 能 make up 跑通
├── Makefile               ✅ 一键启动
├── .env.example           ✅ 环境变量模板
├── .gitignore             ✅
├── .github/workflows/ci.yml  ✅ PR 自动检查
├── docs/
│   ├── prd.md             ✅ 需求文档
│   └── images/
│       ├── user-flow.png  ✅ 流程图
│       └── architecture.png ✅ 架构图
├── frontend/              ✅ Next.js 能 npm run dev
├── backend/               ✅ FastAPI 能跑 /health
├── agent/                 ✅ 骨架就位
└── scripts/               ✅ 空目录待填

## 📜 License

MIT