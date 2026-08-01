"use client";

// ============================================================
// ChatWindow — 面试官看到的对话界面
//
// 职责：
//   1. 展示消息列表（面试官的问题 + AI 的回答）
//   2. 处理用户输入，发送到 /api/chat
//   3. 接收 SSE 流，逐字更新 AI 回复
//   4. 处理加载、错误、空消息等状态
//
// 这是一个 Client Component（"use client"），因为需要
// useState（保存消息）、useEffect（DOM 操作）等浏览器端能力
// ============================================================

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";

// ============================================================
// 类型定义
// ============================================================

interface Message {
  id: string;              // 唯一标识（用于 React key）
  role: "user" | "assistant";  // 谁发的
  content: string;         // 消息内容
}

interface HotQuestion {
  question: string;
  count: number;
  lastAsked: string;
}

// ============================================================
// Props：从服务端组件传入
// ============================================================

interface Props {
  candidateName: string;
  candidateTitle: string;
}

// ============================================================
// 建议问题（面试官不知道该问什么时显示）
// ============================================================

const SUGGESTED_QUESTIONS = [
  "请做一个简单的自我介绍",
  "你最有挑战性的项目是哪个？",
  "你熟悉哪些技术栈？",
  "你为什么离开上一家公司？",
];

// ============================================================
// 组件主体
// ============================================================

export default function ChatWindow({ candidateName, candidateTitle }: Props) {
  // ── 状态 ──
  const [messages, setMessages] = useState<Message[]>([]);     // 消息列表
  const [input, setInput] = useState("");                       // 输入框内容
  const [isLoading, setIsLoading] = useState(false);            // 是否正在等待 AI 回复
  const [error, setError] = useState<string | null>(null);      // 错误信息
  const [hotQuestions, setHotQuestions] = useState<HotQuestion[]>([]); // 热门问题（其他面试官也问了）

  // ── DOM 引用 ──
  const messagesEndRef = useRef<HTMLDivElement>(null);          // 消息列表底部（自动滚动用）
  const inputRef = useRef<HTMLInputElement>(null);             // 输入框引用（发送后自动聚焦）

  // ── 新消息来了自动滚到底部 ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── 页面加载时自动聚焦输入框 ──
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── 挂载时拉取热门问题（KV 未配置时优雅降级为空数组）──
  useEffect(() => {
    let cancelled = false;
    fetch("/api/hot-questions")
      .then((res) => (res.ok ? res.json() : { hotQuestions: [] }))
      .then((data) => {
        if (!cancelled) {
          setHotQuestions(Array.isArray(data?.hotQuestions) ? data.hotQuestions : []);
        }
      })
      .catch(() => {
        if (!cancelled) setHotQuestions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================
  // 发送消息 + 接收 SSE 流
  // ============================================================
  async function handleSend(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || isLoading) return;   // 空消息或正在加载 → 不处理

    // 1. 把用户消息加入列表
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");                      // 清空输入框
    setError(null);
    setIsLoading(true);                // 进入加载状态

    // 2. 创建一个空的 AI 消息占位
    const aiMsgId = (Date.now() + 1).toString();
    const aiMsg: Message = { id: aiMsgId, role: "assistant", content: "" };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      // 3. 调 /api/chat，发 POST 请求（附带历史记录实现上下文记忆）
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          // 把当前对话历史带过去（不含刚刚加的新消息，因为 setState 还没生效）
          // route.ts 会自动取最近 6 条，控制 Token 消耗
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) {
        // HTTP 错误 → 读错误信息
        const err = await response.json().catch(() => ({ error: "请求失败" }));
        throw new Error(err.error || `服务器错误 (${response.status})`);
      }

      // 4. 读 SSE 流，逐段更新 AI 消息
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";   // 缓冲区：处理跨 chunk 的半行

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || line.startsWith("data: [DONE]")) continue;
          if (line.startsWith("data: ")) {
            // SSE 格式：data: "文字" → 提取文字
            const content = JSON.parse(line.slice(6));
            // 追加到 AI 消息的内容后面（关键：函件更新，不是替换）
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === aiMsgId
                  ? { ...msg, content: msg.content + content }
                  : msg
              )
            );
          }
        }
      }
    } catch (err) {
      // 网络错误 / API 错误 → 显示提示
      setError(err instanceof Error ? err.message : "发送失败，请重试");
      // 移除失败的 AI 占位消息
      setMessages((prev) => prev.filter((msg) => msg.id !== aiMsgId));
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();  // 恢复输入框焦点
    }
  }

  // ============================================================
  // 键盘事件：Enter 发送，Shift+Enter 换行
  // ============================================================
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ============================================================
  // 点击建议问题
  // ============================================================
  function handleSuggested(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  // ============================================================
  // 错误重试：移除失败的提问，重新发送
  // ============================================================
  function handleRetry() {
    if (isLoading) return;
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    setMessages((prev) => prev.filter((m) => m.id !== lastUser.id));
    setError(null);
    handleSend(lastUser.content);
  }

  // ============================================================
  // 渲染
  // ============================================================
  return (
    <div className="flex flex-col h-dvh max-w-2xl mx-auto">
      {/* ── 顶部标题栏 ── */}
      <header className="shrink-0 border-b border-gray-200 dark:border-white/10 px-14 py-3 text-center">
        <h1 className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-indigo-500
                       dark:from-violet-400 dark:to-indigo-300 bg-clip-text text-transparent">
          {candidateName} · AI 分身
        </h1>
        <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">{candidateTitle}</p>
      </header>

      {/* ── 消息列表 ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {/* 空状态：还没发过消息 → 显示欢迎语和建议问题 */}
        {messages.length === 0 && (
          <div className="text-center mt-12">
            {/* 发光品牌头像 */}
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600
                            flex items-center justify-center text-white mb-5
                            animate-[glowPulse_3s_ease-in-out_infinite]">
              <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
              </svg>
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              你好，我是 {candidateName} 的 AI 分身
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">
              关于 TA 的职业经历、技术能力、项目经验，随便问。
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-8">
              {SUGGESTED_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggested(q)}
                  className="px-4 py-2 text-sm rounded-full border border-gray-200 dark:border-white/10
                             bg-white/70 dark:bg-white/5 text-gray-700 dark:text-gray-300
                             hover:bg-gray-50 dark:hover:bg-white/10
                             hover:border-violet-400/50 dark:hover:border-violet-400/40
                             hover:shadow-[0_0_12px_rgba(139,92,246,0.25)]
                             transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 消息气泡 */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}
                       animate-[messageIn_0.3s_ease-out]`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === "user"
                  ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-br-md shadow-[0_4px_16px_rgba(139,92,246,0.35)]"
                  : "bg-gray-100 dark:bg-white/5 dark:backdrop-blur border border-transparent dark:border-white/10 text-gray-900 dark:text-gray-100 rounded-bl-md"
                }
                ${msg.role === "assistant" ? "prose prose-sm dark:prose-invert max-w-none" : ""}
              `}
            >
              {/* 用户消息 → 纯文本；AI 消息 → Markdown 渲染 */}
              {msg.role === "assistant" ? (
                msg.content ? (
                  <ReactMarkdown rehypePlugins={[rehypeHighlight]}>{msg.content}</ReactMarkdown>
                ) : (
                  // AI 正在生成，显示闪烁光标
                  <span className="inline-flex items-center gap-1.5 text-gray-400">
                    <span
                      className="w-0.5 h-4 bg-violet-500 animate-pulse rounded-full"
                      aria-hidden
                    />
                    <span className="text-xs">正在思考…</span>
                  </span>
                )
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {/* 错误提示 + 重试 */}
        {error && (
          <div className="text-center space-y-2">
            <p className="inline-block px-4 py-2 text-sm text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/60 rounded-lg">
              {error}
            </p>
            <div>
              <button
                onClick={handleRetry}
                className="inline-block px-4 py-1.5 text-sm rounded-lg
                           border border-gray-300 dark:border-gray-600
                           text-gray-600 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-gray-800
                           transition-colors"
              >
                重新发送
              </button>
            </div>
          </div>
        )}

        {/* 滚动锚点 */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── 其他面试官也问了（从 KV 读真实数据）── */}
      {hotQuestions.length > 0 && (
        <div className="shrink-0 px-4 pt-3 pb-1">
          <p className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500
                         mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" aria-hidden />
            其他面试官也问了
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-thin">
            {hotQuestions.map((q) => (
              <button
                key={q.question}
                onClick={() => handleSuggested(q.question)}
                disabled={isLoading}
                className="shrink-0 px-3 py-1.5 text-xs rounded-full
                           border border-gray-200 dark:border-white/10
                           bg-gray-50 dark:bg-white/5
                           text-gray-600 dark:text-gray-300
                           hover:bg-gray-100 dark:hover:bg-white/10
                           hover:border-violet-400/50 dark:hover:border-violet-400/40
                           hover:shadow-[0_0_10px_rgba(139,92,246,0.2)]
                           transition-all disabled:opacity-50"
              >
                {q.question}
                <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">×{q.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 底部输入区 ── */}
      <div className="shrink-0 border-t border-gray-200 dark:border-white/10 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/10
                       bg-gray-50 dark:bg-white/5 text-gray-900 dark:text-gray-100
                       placeholder-gray-400 dark:placeholder-gray-500
                       focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50
                       focus:shadow-[0_0_20px_rgba(139,92,246,0.2)]
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-5 py-2.5 text-sm font-medium rounded-xl
                       bg-gradient-to-r from-violet-600 to-indigo-600 text-white
                       hover:from-violet-500 hover:to-indigo-500
                       shadow-[0_4px_14px_rgba(139,92,246,0.35)]
                       hover:shadow-[0_4px_20px_rgba(139,92,246,0.5)]
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all active:scale-[0.98]"
          >
            发送
          </button>
        </div>
        <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
          {candidateName} 的 AI 分身 · 回答基于真实简历
        </p>
      </div>
    </div>
  );
}
