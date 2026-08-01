# 🚀 部署指南（小白版）

> 从零开始，5 分钟部署前台（面试官对话页）+ 3 分钟开通后台（求职者审核）。
> 所有环境变量改动，**都必须重新部署才生效**。

---

## 一、前台（面试官对话页）约 5 分钟

**目标**：拿到一个面试官能打开的链接。

```
① 打开 GitHub 仓库 README
   → 点顶部 "Deploy to Vercel" 按钮
   （或手动：vercel.com → Add New → Project → 导入 kibbxcg/resume-ai）

② 部署时填 3 个框（一键部署会自动弹出）：
   LLM_PROVIDER    = deepseek
   LLM_API_KEY     = sk-你的真实Key（去 platform.deepseek.com 注册拿）
   DASHBOARD_SECRET = 随便设一串密码（后台用，先设好省得以后补）

③ 等 Vercel 构建完成 → 状态变 Ready
   → 拿到链接：https://xxx.vercel.app   ← 这就是简历 / 发给面试官的网址

④ 预热（必做）：打开链接，自己问一句"请做个自我介绍"
   → 第一次要下载 80MB 嵌入模型，可能等 10-60 秒，之后就快了

⑤ 把链接发给面试官 ✅
```

**支持的模型厂商**（换 `LLM_PROVIDER` 即可）：

| 厂商 | LLM_PROVIDER | 获取 Key |
|------|-------------|---------|
| DeepSeek | `deepseek` | platform.deepseek.com |
| OpenAI | `openai` | platform.openai.com |
| 智谱 GLM | `zhipu` | open.bigmodel.cn |
| 通义千问 | `qwen` | dashscope.aliyun.com |
| Moonshot | `moonshot` | platform.moonshot.cn |

---

## 二、后台（求职者审核问答对）加 3 分钟

**目标**：看到面试官问过的问题，审核收录，让 AI 越用越准。

```
① 创建存储：Vercel 项目 → Storage → Create → KV → Create（免费）
   → Vercel 自动注入 KV_REST_API_URL / KV_REST_API_TOKEN 等变量

② 确认 DASHBOARD_SECRET 已设置：
   Settings → Environment Variables（一键部署填过就不用管）

③ 重新部署（最容易漏的一步！）：
   Deployments → 最新一次 → Redeploy
   ⚠️ 环境变量只在重新构建时注入——连了 KV 不重新部署，照样报错

④ 等 Ready → 打开：
   https://你的域名/dashboard?key=你的DASHBOARD_SECRET

⑤ 日常使用闭环：
   面试官提问 → 自动记录到「待审核」→ 你收录 → 进入知识库 → 下次命中直接复用
```

后台能看到：
- ⏳ **待审核**：面试官问的新问题 + AI 初稿，点「收录」进入知识库
- ✅ **已收录**：已进入 RAG 检索的问答，可编辑 / 删除
- 🔥 **热门问题**：面试官最爱问的前 10 个

---

## 三、三条最容易踩的坑

| 坑 | 现象 | 避免 |
|----|------|------|
| **环境变量改了不重新部署** | 一直报 `Missing required environment variables` | 任何 env 改动（KV/密钥）后必须 **Redeploy** |
| **后台 URL 密码输错** | 报"未授权访问" | URL 的 `?key=` 必须和 Vercel 的 `DASHBOARD_SECRET` **一字不差** |
| **没建 KV 就想看后台** | 报"加载失败" / KV 缺失 | 后台的前提是先 **Storage → Create → KV** |

---

## 四、常见疑问

**需要翻墙吗？**
不需要。嵌入模型自动在官方源和国内镜像间切换，Google Fonts 已替换为系统字体。

**需要数据库吗？**
不需要。前台零配置即可对话；后台需要免费的可选 Vercel KV。

**为什么第一次对话这么慢？**
首次要在服务器下载 80MB 嵌入模型（10-60 秒），之后有缓存就快了。这是正常的。

**部署后想换个大模型？**
改 Vercel 的 `LLM_PROVIDER` + `LLM_API_KEY` → 重新部署。

---

更多开发排障见 [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)。
