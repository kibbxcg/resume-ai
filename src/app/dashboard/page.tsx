"use client";

// ============================================================
// /dashboard — 求职者审核后台
//
// 求职者打开 /dashboard?key=xxx 可以看到：
//   1. 待审核 Q&A（自动记录的）— 收录/编辑/删除
//   2. 已收录 Q&A — 编辑/删除
//   3. 统计数据 + 热门问题
// ============================================================

import { useState, useEffect, useCallback } from "react";

// ============================================================
// 类型（和 API 返回结构一致）
// ============================================================

interface PendingQA {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

interface CuratedQA {
  id: string;
  question: string;
  answer: string;
  source: string;
  createdAt: string;
}

interface HotQuestion {
  question: string;
  count: number;
}

interface DashboardData {
  pending: PendingQA[];
  curated: CuratedQA[];
  stats: {
    totalConversations: number;
    pendingCount: number;
    curatedCount: number;
  };
  hotQuestions: HotQuestion[];
}

// ============================================================
// 组件
// ============================================================

export default function DashboardPage() {
  // ── URL 参数 ──
  const [key, setKey] = useState<string>("");

  // ── 数据状态 ──
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── 编辑弹窗状态 ──
  const [editing, setEditing] = useState<PendingQA | CuratedQA | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  // ── 从 URL 读 key ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // 必须在水合后读 URL 参数（SSR 阶段没有 window），故关闭该 lint 规则
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setKey(params.get("key") || "");
  }, []);

  // ── 刷新数据 ──
  const fetchData = useCallback(async () => {
    if (!key) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?key=${encodeURIComponent(key)}`);
      if (res.status === 401) {
        setError("未授权访问，请检查 URL 中的 key 参数。");
        setData(null);
      } else if (!res.ok) {
        // 读取服务端返回的具体错误（如"未创建 KV 存储"的指引）
        const err = await res.json().catch(() => ({ error: "加载失败，请重试。" }));
        setError(err.error || `加载失败 (${res.status})`);
        setData(null);
      } else {
        setData(await res.json());
      }
    } catch {
      setError("网络错误，请检查连接。");
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    // fetchData 内部是异步 setState，且 key 来自 URL（水合后才有）
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  // ── 操作：收录/编辑/删除 ──
  async function doAction(action: string, body: Record<string, string>) {
    const res = await fetch("/api/dashboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, action, ...body }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "操作失败" }));
      alert(err.error || "操作失败");
    } else {
      fetchData(); // 刷新列表
    }
  }

  function openEditor(item: PendingQA | CuratedQA) {
    setEditing(item);
    setEditQuestion(item.question);
    setEditAnswer(item.answer);
  }

  function closeEditor() {
    setEditing(null);
  }

  async function handleEdit() {
    if (!editing || !editQuestion.trim() || !editAnswer.trim()) return;

    // 待审核的用 delete_pending + 新建（因为收录需重新算向量，走 approve 路径）
    if ("pendingId" in editing || editing.id.startsWith("pending_")) {
      await doAction("delete_pending", { id: editing.id });
      await doAction("approve", {
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
        pendingId: editing.id,
      });
    } else {
      await doAction("edit", {
        id: editing.id,
        question: editQuestion.trim(),
        answer: editAnswer.trim(),
      });
    }
    closeEditor();
  }

  // ============================================================
  // 渲染
  // ============================================================

  // ── 没有 key ──
  if (!key) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh gap-3 px-4 text-center">
        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">需要访问密码</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          请在 URL 后添加{" "}
          <code className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-violet-600 dark:text-violet-300">
            ?key=你的密码
          </code>{" "}
          访问后台。
        </p>
      </div>
    );
  }

  // ── 加载中 ──
  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 h-dvh text-gray-400">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" aria-hidden />
        加载中...
      </div>
    );
  }

  // ── 鉴权失败或错误 ──
  if (error) {
    return (
      <div className="flex items-center justify-center h-dvh px-6">
        <p className="max-w-lg text-center text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900/50 rounded-xl px-5 py-4">
          {error}
        </p>
      </div>
    );
  }

  if (!data) return null;

  // ============================================================
  // 正常显示
  // ============================================================
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      {/* 顶部统计 */}
      <header className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-500
                       dark:from-violet-400 dark:to-indigo-300 bg-clip-text text-transparent">
          ResumeAI Dashboard
        </h1>
        <p className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400 mt-1">
          求职者审核后台 · 知识库自进化
        </p>
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "总对话", value: data.stats.totalConversations },
            { label: "已收录", value: data.stats.curatedCount },
            { label: "待审核", value: data.stats.pendingCount },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-gray-200 dark:border-white/10
                         bg-white/70 dark:bg-white/5 backdrop-blur px-4 py-3"
            >
              <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </header>

      {/* 热门问题 */}
      {data.hotQuestions.length > 0 && (
        <section>
          <h2 className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500
                         mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500" aria-hidden />
            热门问题 Top 10
          </h2>
          <div className="space-y-1">
            {data.hotQuestions.map((q, i) => (
              <div
                key={q.question}
                className="flex justify-between items-center text-sm px-3 py-2 rounded-lg bg-gray-50 dark:bg-white/5"
              >
                <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <span className="text-[10px] text-violet-500 w-5">{String(i + 1).padStart(2, "0")}</span>
                  {q.question}
                </span>
                <span className="text-xs text-gray-400">{q.count} 次</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 待审核 */}
      <section>
        <h2 className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500
                       mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden />
          待审核（{data.stats.pendingCount} 条）
        </h2>
        {data.pending.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 dark:bg-white/5 rounded-xl">
            暂无待审核问答。面试官开始对话后这里会自动出现。
          </p>
        ) : (
          <div className="space-y-3">
            {data.pending.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-amber-200 dark:border-amber-800/50
                           bg-amber-50/70 dark:bg-amber-900/10 p-4"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Q: {item.question}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">A: {item.answer}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() =>
                      doAction("approve", {
                        question: item.question,
                        answer: item.answer,
                        pendingId: item.id,
                      })
                    }
                    className="px-3 py-1 text-xs rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600
                               text-white hover:from-violet-500 hover:to-indigo-500
                               shadow-[0_2px_8px_rgba(139,92,246,0.3)] transition-all active:scale-[0.97]"
                  >
                    收录
                  </button>
                  <button
                    onClick={() => openEditor(item)}
                    className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-white/10
                               text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10
                               transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => doAction("delete_pending", { id: item.id })}
                    className="px-3 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100
                               dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40
                               transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 已收录 */}
      <section>
        <h2 className="text-[11px] uppercase tracking-widest text-gray-400 dark:text-gray-500
                       mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
          已收录（{data.stats.curatedCount} 条）
        </h2>
        {data.curated.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 bg-gray-50 dark:bg-white/5 rounded-xl">
            暂无已收录问答。收录后这里会显示。
          </p>
        ) : (
          <div className="space-y-3">
            {data.curated.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-gray-200 dark:border-white/10
                           bg-white/70 dark:bg-white/5 backdrop-blur p-4"
              >
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">Q: {item.question}</p>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      item.source === "preloaded"
                        ? "bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300"
                        : "bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                    }`}
                  >
                    {item.source === "preloaded" ? "预置" : "审核"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">A: {item.answer}</p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => openEditor(item)}
                    className="px-3 py-1 text-xs rounded-lg border border-gray-200 dark:border-white/10
                               text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10
                               transition-colors"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => doAction("delete_curated", { id: item.id })}
                    className="px-3 py-1 text-xs rounded-lg bg-red-50 text-red-600 hover:bg-red-100
                               dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-900/40
                               transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 编辑弹窗 */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#12121a] rounded-2xl p-6 w-full max-w-lg space-y-4
                          border border-gray-200 dark:border-white/10
                          shadow-[0_8px_40px_rgba(0,0,0,0.2)]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">编辑问答</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">问题</label>
              <input
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-white/10
                           bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100
                           focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">答案</label>
              <textarea
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-white/10
                           bg-white dark:bg-white/5 text-gray-900 dark:text-gray-100 resize-none
                           focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/50"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={closeEditor}
                className="px-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-white/10
                           text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10
                           transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleEdit}
                disabled={!editQuestion.trim() || !editAnswer.trim()}
                className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600
                           text-white hover:from-violet-500 hover:to-indigo-500
                           disabled:opacity-50 transition-all active:scale-[0.98]"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
