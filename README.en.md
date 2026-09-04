# 🤖 ResumeAI — Your AI Resume Avatar

> 🌐 [简体中文](./README.md) | English

> **Deploy an AI avatar that talks to interviewers — in 5 minutes.**
>
> No backend, no database, no server. Fork, fill in your config, deploy. Three steps, done.

<p align="center">
  <img src="docs/images/demo.svg" alt="Demo" width="600">
</p>

<p align="center">
  <a href="#-one-click-deploy">
    <img src="https://img.shields.io/badge/Deploy%20to-Vercel-black?style=for-the-badge&logo=vercel" alt="Deploy with Vercel">
  </a>
  <a href="https://github.com/kibbxcg/resume-ai/stargazers">
    <img src="https://img.shields.io/github/stars/kibbxcg/resume-ai?style=for-the-badge" alt="Stars">
  </a>
  <a href="https://github.com/kibbxcg/resume-ai/blob/main/LICENSE">
    <img src="https://img.shields.io/github/license/kibbxcg/resume-ai?style=for-the-badge" alt="License">
  </a>
  <a href="https://github.com/kibbxcg/resume-ai/issues">
    <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen?style=for-the-badge" alt="PRs Welcome">
  </a>
</p>

---

## 🎯 What is this?

You send in your resume. The interviewer glances at it for 30 seconds and moves on.

But what if your resume could **talk**?

ResumeAI turns your personal info into an AI avatar. The interviewer opens a link, types any question — "What exactly were you responsible for in this project?" "Why did you choose this stack?" "What was the hardest part?" — and the AI answers in a streaming response, grounded in your real experience.

**The key point**: from start to finish, the interviewer only ever opens a link. No sign-up, no app to install, nothing to type in. As easy as opening a web page.

---

## ✨ Why this project can land you an interview

When you send your AI avatar link to an interviewer, you're **proving your engineering skills with the product itself**:

| What the interviewer experiences | What they perceive about you |
|--------------------------------|------------------------------|
| Instant page load, smooth streaming replies | **Full-stack engineering** — Next.js + SSE streaming + local-embedding RAG |
| No API keys or secrets visible in DevTools | **Security mindset** — server-side proxy, key isolation |
| Questions outside the resume get polite refusals, not hallucinations | **AI engineering literacy** — prompt engineering, guardrail design |
| Mobile experience as good as desktop | **Product thinking** — responsive design, touch optimization |
| Fast from anywhere on the planet | **DevOps practice** — Vercel global CDN, zero-cost auto-scaling |

> 💡 **Resume bullet suggestion**:
> *"Designed and open-sourced an AI resume avatar (GitHub XXX stars) built on Next.js with a self-improving RAG pipeline (local embedding retrieval + SSE streaming), server-side key isolation, and safety guardrails. The project itself serves as a verifiable portfolio piece for full-stack + AI engineering."*

---

## 🚀 One-click deploy

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/kibbxcg/resume-ai&env=LLM_PROVIDER,LLM_API_KEY,DASHBOARD_SECRET&envDescription=%E9%85%8D%E7%BD%AE%20LLM%20API%20%28%E5%8E%82%E5%95%86%20%2F%20%E5%AF%86%E9%92%A5%20%2F%20%E5%90%8E%E5%8F%B0%E5%AF%86%E7%A0%81%29&envLink=https://github.com/kibbxcg/resume-ai#configuration">
    <img src="https://vercel.com/button" alt="Deploy to Vercel">
  </a>
</p>

### 3 steps to launch your avatar

```
1. Fork this repo
2. Edit profile.yaml (fill in your info)
3. Set environment variables on Vercel, deploy
```

That's it. **From fork to live in 5 minutes.**

<details>
<summary>📖 Detailed steps</summary>

#### 1. Fork this repo

Click the Fork button in the top right.

#### 2. Configure your profile

Copy `profile.example.yaml` to `profile.yaml` and fill in your real information:

```yaml
basic:
  name: "Your name"
  title: "Your role"
  # ... see profile.example.yaml for all fields
```

#### 3. Deploy to Vercel

Click the Deploy button above, or:

```bash
npm i -g vercel
vercel deploy
```

Required environment variables:

```bash
LLM_PROVIDER=deepseek       # see the LLM list below
LLM_API_KEY=sk-xxxxxxxx     # your API key
DASHBOARD_SECRET=your-secret # dashboard password (for /dashboard, pick your own)
LLM_MODEL=                  # optional, defaults apply if empty
LLM_BASE_URL=               # optional, custom proxy endpoint
```

#### 4. Get your link

When the deploy finishes, Vercel gives you a URL (e.g. `https://your-resume-ai.vercel.app`). **Send it to interviewers.**

</details>

> 📖 Full deployment walkthrough (front page + dashboard setup): [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) (Chinese)

---

## 🎛️ Job seeker dashboard (review Q&A pairs)

Questions interviewers ask are recorded automatically. In the dashboard you can **review, approve, edit, and delete** them — the AI gets smarter with every use.

If you set `DASHBOARD_SECRET` during deployment, just open:

```
https://your-domain/dashboard?key=YOUR_DASHBOARD_SECRET
```

The dashboard shows:
- ⏳ **Pending review**: new questions from interviewers + AI draft answers. Click "approve" to add them to the knowledge base
- ✅ **Approved**: Q&A pairs already in RAG retrieval; edit or delete anytime
- 🔥 **Hot questions**: the 10 most-asked questions

<details>
<summary>📖 Didn't set <code>DASHBOARD_SECRET</code> during deploy? (beginner-friendly)</summary>

The dashboard needs 2 things, both free:

**1. Create a Vercel KV store** (where Q&A pairs live)
- Vercel project → **Storage** → **Create** → **KV** → Create
- Vercel injects the KV environment variables automatically
- **Without it, Q&A pairs won't accumulate**

**2. Set the access password `DASHBOARD_SECRET`**
- Vercel project → **Settings** → **Environment Variables**
- Add `DASHBOARD_SECRET` with any password you'll remember
- Skip this if you filled it in during one-click deploy

Then **redeploy**, and open `https://your-domain/dashboard?key=YOUR_PASSWORD`.

</details>

---

## 🔌 Supported LLMs

| Provider | Config value | Default model | Get an API key |
|----------|--------------|---------------|----------------|
| OpenAI | `openai` | gpt-4o-mini | [platform.openai.com](https://platform.openai.com) |
| DeepSeek | `deepseek` | deepseek-chat | [platform.deepseek.com](https://platform.deepseek.com) |
| Zhipu GLM | `zhipu` | glm-4-flash | [open.bigmodel.cn](https://open.bigmodel.cn) |
| Alibaba Qwen | `qwen` | qwen-turbo | [dashscope.aliyun.com](https://dashscope.aliyun.com) |
| Moonshot | `moonshot` | moonshot-v1-8k | [platform.moonshot.cn](https://platform.moonshot.cn) |

> 🔧 Custom `LLM_BASE_URL` supported — works with One-API and other OpenAI-compatible proxies.

---

## 🧠 How does it work?

```
Interviewer opens the link
    ↓
Types: "What was the biggest challenge in this project?"
    ↓
Frontend → POST /api/chat
    ↓
Next.js Route Handler (server-side):
    1. Local embedding model vectorizes the question
    2. Semantic search over approved Q&A (RAG) → hit? inject the canonical answer
    3. No hit → inject full profile.yaml as fallback
    4. Call the LLM (API key stays in server-side env vars)
    5. Misses are auto-recorded → awaiting job seeker review
    6. Response streamed back byte by byte
    ↓
Frontend renders Markdown incrementally (code highlighted)
    ↓
Job seeker approves at /dashboard → knowledge base self-improves
```

### Design highlights

- **Self-improving RAG**: local embedding model (bge-small-zh-v1.5) semantically searches approved Q&A; hits use the canonical answer, misses fall back to full `profile.yaml` injection. Every great answer you approve feeds back into the AI — **it gets better with use**.
- **Zero vector database**: no Pinecone/ChromaDB dependency. Local embeddings + in-memory cosine search handle hundreds of Q&A pairs in milliseconds.
- **Key isolation**: the API key exists only in server-side environment variables — never visible in browser network traffic.
- **Safety guardrails**: layered prompt defenses — refuses jailbreaks, refuses to fabricate experience, refuses to reveal system internals.
- **Streaming UX**: SSE token-by-token output + multi-turn context memory, conversation flows like a real person.
- **Privacy-friendly**: interviewer chat history lives only in browser memory (gone on refresh); the knowledge base stores Q&A text only — no identity data collected.

---

## 🏗️ Tech stack

| Layer | Tech | Why |
|-------|------|-----|
| Framework | Next.js 16 (App Router) | RSC + Route Handler in one place |
| Language | TypeScript (strict) | Type safety = fewer runtime bugs |
| Styling | TailwindCSS 4 | Atomic CSS, zero runtime |
| Embeddings | @xenova/transformers + bge-small-zh-v1.5 | Runs locally, zero API cost, accurate Chinese semantics |
| Storage | Vercel KV (optional) | Durable knowledge base, free tier 256MB |
| Deploy | Vercel (Node.js Runtime) | Global CDN, zero ops, auto-scaling at zero cost |
| LLM | OpenAI / DeepSeek / Zhipu / Qwen / Moonshot | Adapter pattern, switching is free |
| Validation | Zod | Runtime schema validation |

---

## 📁 Project structure

```
resume-ai/
├── README.md                ← You are here (Chinese)
├── README.en.md             ← English version
├── profile.example.yaml     ← Sample config (copy to profile.yaml)
├── curated_qa.example.yaml  ← Preset Q&A template (RAG cold start)
├── .env.example             ← Environment variable template
├── src/
│   ├── app/
│   │   ├── page.tsx         ← Interviewer chat page
│   │   ├── layout.tsx       ← Root layout (theme toggle + anti-flash script)
│   │   ├── dashboard/
│   │   │   └── page.tsx     ← Job seeker review dashboard
│   │   └── api/
│   │       ├── chat/route.ts        ← SSE streaming proxy + RAG retrieval
│   │       ├── dashboard/route.ts   ← Review API (approve/edit/delete)
│   │       └── hot-questions/       ← Hot questions endpoint
│   ├── components/
│   │   ├── ChatWindow.tsx   ← Chat window (with hot questions)
│   │   └── ThemeToggle.tsx  ← Dark mode toggle
│   └── lib/
│       ├── embedding.ts     ← Local embedding model + cosine search
│       ├── knowledge.ts     ← Knowledge base loading
│       ├── kv.ts            ← Vercel KV wrapper
│       ├── llm/provider.ts  ← LLM multi-vendor abstraction
│       ├── profile.ts       ← YAML loading + Zod validation
│       └── prompt.ts        ← System prompt building + guardrails
├── docs/
│   ├── REQUIREMENTS.md      ← Requirements doc (Chinese)
│   ├── IMPLEMENTATION_PLAN.md ← Implementation plan
│   ├── DEPLOYMENT.md        ← Deployment guide (Chinese)
│   ├── TROUBLESHOOTING.md   ← Troubleshooting handbook (Chinese)
│   └── images/              ← README images
└── .github/workflows/
    └── ci.yml               ← Auto lint + type-check + build
```

---

## 🖥️ Local development

```bash
# 1. Clone
git clone https://github.com/kibbxcg/resume-ai.git
cd resume-ai

# 2. Install dependencies
npm install

# 3. Configure
cp .env.example .env.local
cp profile.example.yaml profile.yaml
# Edit both files with your info

# 4. Run
npm run dev
# Open http://localhost:3000
```

> Note: the embedding model (~80MB) downloads on first use from huggingface.co, falling back to the hf-mirror.com mirror automatically if unreachable.

---

## ❓ FAQ

**Do I need a VPN?**
Not in mainland China. Embedding model downloads fall back to the `hf-mirror.com` mirror automatically; Google Fonts have been replaced with system fonts.

**Do I need a database?**
No. Zero-config chat works out of the box; optional Vercel KV (free 256MB) enables the self-improving knowledge base.

**How do I switch models?**
Change two environment variables: `LLM_PROVIDER` (vendor) + `LLM_API_KEY` (key).

**Can it answer anything?**
No. The AI only answers from your `profile.yaml` and approved Q&A; questions outside the resume get a polite refusal (built-in guardrails).

**Is the data safe?**
Interviewer chat history lives only in browser memory (gone on refresh); the knowledge base records Q&A text only, with no identity information.

**Commercial use?**
Yes — MIT license, free to use.

---

## 🤝 Contributing

All forms of contribution welcome! Star ⭐, PRs, issues, sharing with friends — it all helps.

Please read [CONTRIBUTING.md](CONTRIBUTING.md) before you start.

### Show & Tell

Deployed your own AI avatar? Share your link in the [Show & Tell discussion](https://github.com/kibbxcg/resume-ai/discussions/1)!

---

## 📊 Star History

<p align="center">
  <a href="https://star-history.com/#kibbxcg/resume-ai&Date">
    <img src="https://api.star-history.com/svg?repos=kibbxcg/resume-ai&type=Date" alt="Star History Chart">
  </a>
</p>

---

## 📜 License

MIT © [kibbxcg](https://github.com/kibbxcg)

---

<p align="center">
  <sub>If this project helps you, a ⭐ star goes a long way.</sub>
</p>
