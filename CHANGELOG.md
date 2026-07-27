# 📝 变更日志 (CHANGELOG)

> 记录项目的每一次有意义变更。格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)。

---

## [Unreleased] — 当前开发中

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
