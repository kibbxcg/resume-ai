# 📋 MVP 需求文档 (Requirements)

> **项目定位**：开源 AI 简历分身工具 — 求职者 5 分钟部署，面试官打开链接直接对话。
> **核心目标**：GitHub 高星开源项目 + 求职者简历上的硬核技术证明。
> **北极星指标**：一个开发者从看到 README 到成功部署自己的 AI 分身，不超过 5 分钟。

---

## 1. 项目愿景与成功指标

### 1.1 我们为什么做这个

传统简历是一张纸，面试官看完就完了。ResumeAI 让简历变成"能对话的"——面试官可以追问项目细节、技术选型理由、团队协作方式。

但更重要的：**这个仓库本身就是一份可验证的简历**。面试官打开链接和"你"对话时，他们同时在感受：
- 全栈工程能力（Next.js + RAG 管道 + LLM 集成）
- 安全意识（API Key 服务端隔离、Prompt 注入防护）
- AI 落地能力（向量检索、语义匹配、知识库自进化）
- 产品思维（求职者审核机制、面试官体验优先）

### 1.2 北极星指标

> 一个开发者从 `git clone` 到成功部署自己的 AI 分身，**不超过 5 分钟**。

### 1.3 成功指标

| 维度 | 指标 | 目标值 (上线 60 天) |
|:---|:---|:---|
| 开源影响力 | GitHub Stars | ≥ 500 |
| 开源影响力 | Fork 数 | ≥ 100 |
| 传播力 | README 到部署的成功率 | ≥ 60%（Fork 的人有一半以上部署成功） |
| 使用验证 | 社区中有真实用户分享自己的分身链接 | ≥ 10 人 |
| 体验质量 | 面试官平均对话轮次 | ≥ 5 轮 |
| 求职转化 | 收到"这个项目让我拿到面试"类反馈 | ≥ 3 条 |

---

## 2. 核心用户故事

| 角色 | 用户故事 | 优先级 | 验收标准 |
|:---|:---|:---|:---|
| 求职者 | 作为求职者，我希望 Fork 后填几个环境变量就能部署，不需要读源码。 | P0 | 从 Fork 到首次对话成功 ≤ 5 分钟 |
| 求职者 | 作为求职者，我希望 AI 分身能**从真实问答中学习**，越用越准。 | P0 | 审核收录一条 Q&A 后，同类问题命中检索 |
| 求职者 | 作为求职者，我希望在后台**审核面试官的问答记录**，满意的收录、不满意的自己改写。 | P0 | Dashboard 中可查看、编辑、收录 Q&A |
| 求职者 | 作为求职者，我希望支持多家 LLM 提供商，用自己的 Key 控制成本。 | P0 | 切换 `LLM_PROVIDER` 环境变量即可换模型 |
| 面试官 | 作为面试官，我希望打开链接就能直接对话，无需注册/登录/输入 Key。 | P0 | 首屏加载 < 2s；发送后 1s 内出现首个流式字符 |
| 面试官 | 作为面试官，我希望看到**其他面试官常问的问题**，帮我快速了解候选人。 | P1 | 对话页底部展示热门问题列表 |
| 面试官 | 作为面试官，我希望 AI 严格基于候选人资料回答，不知道的就说不。 | P0 | 询问简历外问题时，收到清晰、专业的边界提示 |
| 面试官 | 作为面试官，我希望在手机上也能流畅对话。 | P0 | 移动端 Lighthouse Performance ≥ 90 |
| 开源贡献者 | 作为开源贡献者，我希望项目结构清晰、有 CONTRIBUTING 指南。 | P1 | 新人按 CONTRIBUTING.md 操作能跑通本地开发环境 |

---

## 3. 功能边界 (MVP Scope)

### ✅ IN SCOPE (v1.0)

| 功能 | 说明 | 为什么重要 |
|:---|:---|:---|
| **自进化 RAG 管道** | 检索已收录 Q&A（RAG），未命中回退 profile.yaml 全量注入 + LLM 生成；本地嵌入模型 + 余弦相似度 | 项目核心技术亮点，简历话术核心 |
| **求职者审核后台** | `/dashboard` 展示所有问答，求职者可编辑、收录、删除 | 知识库不断进化，AI 越答越准 |
| **面试官热门问题** | 对话页底部展示"其他面试官也问了"，从真实数据统计 | 提升面试官体验，降低提问门槛 |
| **一键部署** | Vercel Deploy Button + Fork → 填环境变量 → 上线 | 降低部署门槛 = 更多 Star |
| **多 LLM 支持** | OpenAI / DeepSeek / 智谱 GLM / 通义千问 / Moonshot 至少 5 家 | 国内开发者不用翻墙绑卡 |
| **YAML 基础注入** | profile.yaml 始终全量注入 System Prompt，不参与 RAG 分块 | 基础信息始终可用，零检索延迟 |
| **流式对话 + 上下文记忆** | SSE 流式输出 + 多轮对话历史 | 已完成 |
| **安全护栏** | Prompt 注入防护 + 超范围拒答 + API Key 服务端隔离 | 已完成 |
| **移动端适配 + 暗色模式** | 响应式布局 + 触摸优化 + 系统主题跟随 | 基础体验 |
| **预置问答导入** | `curated_qa.yaml` 批量导入，部署时自动向量化写入 KV | 冷启动就有高质量回答，零 Token 浪费 |
| **Vercel KV 存储** | 审核后的 Q&A、待审核记录、热门问题统计 | 免费层 256MB，足够用 |
| **README 即营销** | GIF Demo + Badges + 一键部署按钮 + 技术亮点 + 简历话术 | 开源项目门面 |

### ❌ OUT OF SCOPE (v1.0 明确不做)

| 不做 | 原因 | vNext？ |
|:---|:---|:---|
| 用户注册/登录 | Dashboard 用环境变量 secret key 做密码保护 | 可能永不 |
| 向量数据库 (Pinecone / ChromaDB) | 本地嵌入 + JSON 索引 + 内存相似度，50-100 个块完全够 | v2.0 |
| 上传 PDF 解析 | 先验证"自进化 RAG"这个核心假设 | v1.2 |
| 多套视觉模板 | v1.0 只做一套精品模板 | v1.2 |
| 自定义域名 | 复杂度和收益不成正比 | 随时可加 |
| 多语言 i18n（界面） | 界面英文，README 中英双语 | v1.1 |
| AI 语音对话采集 | 对话收集中需要语音交互 | 永不 |

---

## 4. 技术架构

```
┌──────────────────────────────────────────────────────┐
│                  面试官（浏览器）                       │
│           打开链接 → 输入问题 → 流式回复                │
│           对话页底部：热门问题列表                       │
└────────────────────┬─────────────────────────────────┘
                     │ HTTPS
                     ▼
┌──────────────────────────────────────────────────────┐
│              Vercel（Next.js App Router）             │
│                                                      │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │   / (对话页)  │  │ /api/chat    │  │ /dashboard  │ │
│  │  ChatWindow  │  │ SSE 代理      │  │ 求职者后台   │ │
│  └─────────────┘  └──────┬───────┘  └─────────────┘ │
│                          │                            │
│  ┌──────────────────────┐│  ┌──────────────────────┐ │
│  │    RAG 检索引擎       ││  │   Vercel KV          │ │
│  │  检索已收录 Q&A       │◀┼┼──│  ├ qa:curated:*      │ │
│  │  未命中 → profile 兜底 │││  │  ├ qa:pending:*      │ │
│  │  嵌入模型：all-MiniLM │││  │  └ analytics:*       │ │
│  │  相似度：余弦距离      ││  └──────────────────────┘ │
│  └──────────────────────┘│                            │
└──────────────────┬───────┴────────────────────────────┘
                   │ HTTPS (API Key via env)
                   ▼
┌──────────────────────────────────────────────────────┐
│                  LLM API                             │
│  聊天：DeepSeek / OpenAI / 智谱 / 通义千问 / Moonshot  │
│  嵌入：本地 bge-small-zh-v1.5（512维，23MB）            │
└──────────────────────────────────────────────────────┘
```

### 4.1 关键技术决策

| 决策 | 选择 | 理由 |
|:---|:---|:---|
| 运行时 | Vercel（Node.js Runtime，API 路由） | 嵌入模型需要 Node.js，不支持 Edge |
| 框架 | Next.js 14+ App Router | RSC + Route Handler 一站式 |
| 语言 | TypeScript `strict: true` | 类型安全 = 运行时少 bug |
| 样式 | TailwindCSS | 原子化 CSS，打包体积小 |
| LLM 聊天 | 抽象 Provider 层，适配器模式 | 切换模型只改环境变量 |
| 嵌入模型 | `@xenova/transformers` + `bge-small-zh-v1.5` | 本地运行，零 API 费用，512维向量 |
| 向量存储 | 内存 + JSON 文件 + Vercel KV 双写 | 查询走内存（毫秒），持久化走 KV |
| RAG 策略 | **单级检索**：已收录 Q&A（RAG）→ 未命中回退 profile.yaml 全量注入 | 越用越准，自进化 |
| 存储 | Vercel KV | 免费层 256MB，键值对足够 |
| 配置 | YAML + Zod Schema | 人类可读 + 运行时校验 |
| 部署 | Vercel Deploy Button | 一键部署 |

### 4.2 RAG 检索流程

```
面试官问题
    │
    ▼
┌─────────────────────┐
│ 1. 问题 → 嵌入向量    │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────────────┐
│ 2. 检索 curated Q&A（RAG）   │  ← Vercel KV 中审核通过的 Q&A
│    余弦相似度匹配 Top-3       │
│    阈值 ≥ 0.75 → 命中        │
└─────────┬───────────────────┘
          │
    ┌─────┴─────┐
    │           │
   命中        未命中
    │           │
    ▼           ▼
┌────────┐  ┌──────────────────────┐
│ LLM 用  │  │ profile.yaml 全量注入 │  ← 始终注入，不分块
│ 检索到  │  │ LLM 基于它生成回答     │
│ 的答案  │  └──────────┬───────────┘
│ 润色    │             │
└────────┘             ▼
              ┌────────────────┐
              │ 自动记录 Q&A 到  │
              │ Vercel KV       │
              │ pending 队列     │  ← 等待求职者审核
              └────────────────┘
```

### 4.3 知识库自进化循环

```
冷启动              运行中              成熟期
profile.yaml   →   自动记录 Q&A   →   大量已审核 Q&A
(全量注入)         求职者审核       已收录 Q&A 变主回答源
                  收录/编辑/删除    profile.yaml 始终作基础
                                    ↑
                                  越用越准
```

### 4.4 目录结构

```
resume-ai/
├── README.md                  # 中英双语，GIF Demo，一键部署按钮
├── LICENSE                    # MIT
├── CONTRIBUTING.md            # 贡献指南
├── profile.example.yaml       # 示例配置
├── profile.yaml               # 求职者个人资料
├── .env.example               # 环境变量模板
├── .github/workflows/
│   └── ci.yml                 # PR 自动检查
├── docs/
│   ├── prd.md                 # 产品需求文档
│   ├── REQUIREMENTS.md        # 本文件
│   └── images/
│       ├── demo.gif
│       └── og-image.png
├── src/
│   ├── app/
│   │   ├── page.tsx           # 对话页面 /（面试官入口）
│   │   ├── layout.tsx         # 根布局
│   │   ├── dashboard/
│   │   │   └── page.tsx       # 求职者审核后台 /dashboard
│   │   ├── setup/
│   │   │   └── page.tsx       # AI 访谈采集页 /setup（v1.1）
│   │   ├── api/
│   │   │   ├── chat/
│   │   │   │   └── route.ts   # POST /api/chat（SSE 流式代理 + RAG 检索）
│   │   │   ├── dashboard/
│   │   │   │   └── route.ts   # /api/dashboard（审核、编辑、删除、统计）
│   │   │   └── setup/
│   │   │       └── route.ts   # POST /api/setup（AI 访谈，v1.1）
│   │   └── globals.css
│   ├── components/
│   │   ├── ChatWindow.tsx     # 对话窗口（含热门问题列表）
│   │   └── ThemeToggle.tsx    # 暗色模式切换
│   └── lib/
│       ├── llm/
│       │   └── provider.ts    # LLM Provider（聊天 API 抽象）
│       ├── embedding.ts       # 本地嵌入模型 + 余弦相似度检索
│       ├── knowledge.ts       # 知识库加载 + 分块 + 向量索引
│       ├── collector.ts       # AI 访谈引擎（v1.1）
│       ├── kv.ts              # Vercel KV 读写封装
│       ├── profile.ts         # YAML 加载 + Zod 校验
│       ├── prompt.ts          # System Prompt 构建 + Guardrails + RAG 结果注入
│       └── types.ts           # 共享类型定义
└── public/
    ├── og-image.png
    └── favicon.ico
```

---

## 5. 功能详细规格

### 5.1 LLM Provider 抽象层

```
LLM_PROVIDER=openai|deepseek|zhipu|qwen|moonshot
LLM_API_KEY=sk-xxx
LLM_MODEL=(可选)
LLM_BASE_URL=(可选)
```

### 5.2 RAG 检索引擎规格

**嵌入模型**：
- 模型：`Xenova/bge-small-zh-v1.5`（通过 `@xenova/transformers` 加载）
- 维度：384 维
- 大小：23MB（首次加载缓存到 `node_modules/.cache`）
- 运行位置：API Route（Node.js Runtime，非 Edge）

**分块策略**：
```
profile.yaml → 按段拆分：
  - basic + summary      → 1 块（概览块）
  - experience[0..n]     → 每段经历 1 块
  - projects[0..n]       → 每个项目 1 块
  - education             → 1 块
  - skills                → 1 块
```

**检索参数**：
| 参数 | 值 | 说明 |
|:---|:---|:---|
| curated_qa 相似度阈值 | ≥ 0.75 | 低于此值回退到 profile 检索 |
| profile chunk 相似度阈值 | ≥ 0.6 | 低于此值礼貌拒答 |
| curated_qa Top-K | 3 | 最多取 3 条最相似的已审核 Q&A |
| profile chunk Top-K | 3 | 最多取 3 个最相似文档块 |

### 5.3 求职者审核后台 (/dashboard)

```
访问方式：https://xxx.vercel.app/dashboard?key={DASHBOARD_SECRET}

功能：
  ┌─────────────────────────────────────────┐
  │  已收录 Q&A（n 条）                       │
  │  ├ Q: "你做过什么项目？"                   │
  │  │ A: "我一共做过 3 个项目..."   [编辑][删除] │
  │  ├ Q: "你的技术栈？"                       │
  │  │ A: "我擅长 React..."        [编辑][删除] │
  │  └ ...                                   │
  │                                          │
  │  待审核（m 条）                            │
  │  ├ Q: "你加班吗？"                         │
  │  │ A: "我会根据项目需要..."   [收录][编辑][删除]│
  │  └ ...                                   │
  │                                          │
  │  统计                                    │
  │  ├ 总对话轮次：xxx                          │
  │  ├ 热门问题 Top 10                         │
  │  └ 审核覆盖率：xx%                         │
  └─────────────────────────────────────────┘
```

### 5.4 环境变量完整列表

```bash
# ── 必填 ──
LLM_PROVIDER=deepseek          # LLM 厂商
LLM_API_KEY=sk-xxx             # API Key

# ── 可选 ──
LLM_MODEL=                     # 覆盖默认模型
LLM_BASE_URL=                  # 自定义 API 地址（中转站）
DASHBOARD_SECRET=              # Dashboard 访问密码（不设则关闭后台）
NEXT_PUBLIC_SITE_NAME=ResumeAI # 站点名称

# ── Vercel 自动注入（不需要手动设置）──
# KV_URL / KV_REST_API_URL / KV_REST_API_TOKEN
```

### 5.5 System Prompt 构建策略（升级后）

```
┌─────────────────────────────────┐
│ 1. Guardrails（不可绕过规则）     │
│    - 禁止编造、禁止越狱            │
├─────────────────────────────────┤
│ 2. Persona（人设）                │
│    - 语气、语言                   │
├─────────────────────────────────┤
│ 3. RAG Context（动态检索结果）     │  ← 升级点
│    - 命中 curated_qa → 注入答案   │
│    - 命中 profile chunks → 注入块 │
│    - 都未命中 → 礼貌拒答           │
├─────────────────────────────────┤
│ 4. 对话历史（最近 3 轮）           │
└─────────────────────────────────┘
```

---

## 6. 开源增长策略（内建于产品）

### 6.1 README 驱动增长

| 要素 | 说明 |
|:---|:---|
| **顶部 GIF Demo** | 展示面试官对话效果，≤ 5 秒循环 |
| **Live Demo 链接** | 作者本人的 AI 分身 |
| **一键部署按钮** | Vercel Deploy Button |
| **Badges** | Stars / License / PRs Welcome / TypeScript |
| **技术亮点模块** | RAG 管道架构 + 自进化知识库 + 简历话术 |
| **FAQ** | 常见问题 |
| **Star History 图** | 项目增长曲线 |

### 6.2 目标社区

| 优先级 | 渠道 | 策略 |
|:---|:---|:---|
| P0 | GitHub Trending | 首周集中 Star + README 质量驱动 |
| P0 | V2EX / 掘金 / 知乎 | 技术文章：**"我设计了一个会自我进化的 AI 简历"** |
| P1 | Twitter / Reddit (r/webdev) | 英文推广 |
| P1 | 小红书 / B 站 | "AI 替我去面试"话题传播 |

---

## 7. 非功能性需求

| 类别 | 要求 | 验证方式 |
|:---|:---|:---|
| 性能 | Lighthouse Performance ≥ 90, FCP < 1.5s | Chrome DevTools |
| 性能 | 向量检索延迟 < 50ms（50 个块级） | 本地测试 |
| 性能 | 嵌入模型首次加载 < 3s，后续缓存 < 50ms | 本地测试 |
| 安全 | API Key / DASHBOARD_SECRET 不出现在客户端 | DevTools Network |
| 安全 | Prompt 注入防御覆盖 6 类常见攻击 | 手动测试 |
| 类型安全 | TypeScript `strict: true`，0 个 `any` | `tsc --noEmit` |
| 隐私 | 面试官对话存 Vercel KV，不存身份信息 | 审查代码 |
| 浏览器兼容 | Chrome/Safari/Firefox/Edge 最新两个大版本 | 手动测试 |

---

## 8. 实现阶段

| 阶段 | 内容 | 预计 |
|:---|:---|:---|
| **Phase 1（当前）** | RAG 管道：embedding.ts + knowledge.ts + prompt.ts 升级 | 2-3 天 |
| **Phase 2** | Vercel KV 集成 + Dashboard 页面 + 审核 API | 2-3 天 |
| **Phase 3** | 热门问题展示 + UI 美化 + 暗色模式完善 | 1-2 天 |
| **Phase 4** | README 完善 + Demo GIF + 开源推广 | 1 天 |
| **v1.1** | AI 访谈采集（collector.ts + /setup） | 未来 |

---

## 9. 术语表

| 术语 | 定义 |
|:---|:---|
| **RAG** | Retrieval-Augmented Generation，检索增强生成。本项目采用两级检索：已收录 Q&A → profile 分块 |
| **curated_qa** | 求职者审核通过的问答对，是 RAG 的**优先级 1**数据源 |
| **冷启动** | 部署后尚未积累任何 Q&A 的阶段，完全依赖 profile.yaml 分块回答 |
| **自进化** | 通过"自动记录 → 求职者审核 → 收录"的闭环，知识库持续优化 |
| **嵌入模型** | 将文字转成向量的模型，本项目使用本地 bge-small-zh-v1.5（512维） |
| **余弦相似度** | 两个向量之间的夹角余弦值，用于衡量语义相似程度 |
| **Vercel KV** | Vercel 自带的键值存储服务，免费层 256MB |
| **Guardrails** | 安全护栏，限制 AI 输出范围的 Prompt 工程策略 |
| **SSE** | Server-Sent Events，用于实现 LLM 流式输出的轻量级协议 |
