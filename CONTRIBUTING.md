# 🤝 贡献指南

欢迎所有形式的贡献！**Star ⭐、提 Issue、修 Bug、加功能、写文档**——都是对项目的支持。

- 🐛 发现 Bug → 提 [Issue](https://github.com/kibbxcg/resume-ai/issues)
- 💡 有想法 → 先开 Issue 讨论，再动手
- ✨ 想写代码 → 看下面的流程

---

## 🚀 本地开发环境

```bash
# 1. 克隆
git clone https://github.com/kibbxcg/resume-ai.git
cd resume-ai

# 2. 安装依赖
npm install

# 3. 配置（编辑这两个文件）
cp .env.example .env.local
cp profile.example.yaml profile.yaml
# .env.local 填你的 LLM_API_KEY；profile.yaml 填你的个人信息

# 4. 启动
npm run dev
# 打开 http://localhost:3000
```

> ⚠️ **注意**：首次使用嵌入模型会从 `hf-mirror.com` 下载约 80MB 权重文件（国内镜像，无需翻墙）。
>
> 🇨🇳 **国内网络装依赖**：如果 `npm install` 因 sharp 下载超时失败，改用 `npm install --ignore-scripts`。脚本会自动把 sharp 替换为空壳（本项目只做文本嵌入，用不到图片处理），首次 `npm run dev` 时自动生效，无需手动处理。

### 验证命令

```bash
npm run lint          # ESLint 代码规范
npx tsc --noEmit      # TypeScript 类型检查
npm run build         # 生产构建
```

PR 合并前这三个必须全部通过（CI 也会自动检查）。

---

## 📁 项目结构速览

```
src/
├── app/
│   ├── page.tsx                 # 对话页（面试官入口）
│   ├── dashboard/page.tsx       # 求职者审核后台
│   └── api/
│       ├── chat/route.ts        # SSE 流式代理 + RAG 检索
│       ├── dashboard/route.ts   # 审核 API
│       └── hot-questions/       # 热门问题接口
├── components/
│   ├── ChatWindow.tsx           # 对话界面
│   └── ThemeToggle.tsx          # 暗色模式切换
└── lib/
    ├── embedding.ts             # 本地嵌入模型 + 检索
    ├── knowledge.ts             # 知识库加载
    ├── kv.ts                    # Vercel KV 封装
    ├── profile.ts               # profile.yaml 解析
    ├── prompt.ts                # System Prompt 构建
    └── llm/provider.ts          # LLM 多厂商适配
```

---

## 📝 提 PR 流程

1. **Fork** 本仓库，克隆到本地
2. 新建分支：`git checkout -b feat/xxx`
3. 修改代码，**跑通全部验证**（lint + tsc + build）
4. 提交（见下方提交规范）
5. Push 到你的 Fork，开 PR 到 `main`
6. 在 PR 描述里说明**改了什么、为什么、怎么验证**

### 提交信息规范

使用 [Conventional Commits](https://www.conventionalcommits.org/zh-hans/) 风格：

```
feat: add hot questions widget
fix: fix hydration mismatch in dark mode
docs: update README
chore: bump dependencies
```

---

## 🧹 代码规范

- **TypeScript `strict: true`**，尽量零 `any`（`@xenova/transformers` 的类型缺失除外，可用 `eslint-disable` 注释说明）
- **样式用 TailwindCSS** 原子类，遵守现有 Hermes 暗紫主题配色（主色 violet/indigo，暗色基底 `#0a0a0f`）
- 修改 `profile` 相关的数据流时，注意 **profile.yaml 始终全量注入，不参与 RAG 分块**
- 新增 KV 操作记得在 `src/lib/kv.ts` 里封装，不要散落
- 每个功能改动在 `CHANGELOG.md` 里加一条记录

---

## 🔍 环境变量

| 变量 | 必填 | 说明 |
|------|------|------|
| `LLM_PROVIDER` | ✅ | `openai` / `deepseek` / `zhipu` / `qwen` / `moonshot` |
| `LLM_API_KEY` | ✅ | 你的 API Key |
| `LLM_MODEL` | — | 覆盖默认模型 |
| `LLM_BASE_URL` | — | 自定义 API 地址（中转站） |
| `DASHBOARD_SECRET` | — | 审核后台访问密码（不设则关闭后台） |

---

再次感谢你的贡献！有任何问题直接在 [Issues](https://github.com/kibbxcg/resume-ai/issues) 里问。
