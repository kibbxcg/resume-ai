// ============================================================
// /api/dashboard — 求职者审核后台 API
//
// GET  /api/dashboard?key=xxx
//   → 返回待审核 + 已收录 + 统计
//
// POST /api/dashboard
//   → 收录/编辑/删除 Q&A（body 里带 action + key）
// ============================================================

import { createHash, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import {
  getPendingQAs,
  getCuratedQAsFromKV,
  approveQA,
  editCuratedQA,
  deleteCuratedQA,
  deletePendingQA,
  getHotQuestions,
} from "@/lib/kv";

// 问答文本长度上限：保护 KV 存储，也避免异常大的数据进入 RAG 上下文
const MAX_QUESTION_LENGTH = 2000;
const MAX_ANSWER_LENGTH = 5000;

// ============================================================
// 鉴权检查
// ============================================================

function checkAuth(key: string | null): boolean {
  const secret = process.env.DASHBOARD_SECRET;
  // 如果没有设置 DASHBOARD_SECRET，拒绝所有请求
  if (!secret || !key) return false;
  // 双方都先哈希再比较：timingSafeEqual 要求等长输入，
  // 哈希后长度固定，同时让比较耗时与内容无关（防时序攻击逐字符猜密码）
  const keyHash = createHash("sha256").update(key).digest();
  const secretHash = createHash("sha256").update(secret).digest();
  return timingSafeEqual(keyHash, secretHash);
}

function unauthResponse(): Response {
  return new Response(
    JSON.stringify({ error: "未授权访问。请在环境变量中设置 DASHBOARD_SECRET。" }),
    { status: 401, headers: { "Content-Type": "application/json" } }
  );
}

// ============================================================
// GET — 查询
// ============================================================

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key");

  // DASHBOARD_SECRET 未设置 → 后台未启用，给出明确指引（区别于密码错误）
  if (!process.env.DASHBOARD_SECRET) {
    return new Response(
      JSON.stringify({
        error:
          "后台未启用：请在 Vercel 项目 → Settings → Environment Variables 中设置 DASHBOARD_SECRET 后重新部署。",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!checkAuth(key)) return unauthResponse();

  // KV 未配置（未创建 Vercel KV 存储）时，给出明确指引而不是笼统报错
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    return new Response(
      JSON.stringify({
        error:
          "未检测到 KV 环境变量（KV_REST_API_URL / KV_REST_API_TOKEN）。请确认已创建 Vercel KV 存储，并在 Settings → Environment Variables 确认这两个变量存在（勾选 Production），然后重新部署。",
      }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const [pending, curated, hotQuestions] = await Promise.all([
      getPendingQAs(),
      getCuratedQAsFromKV(),
      getHotQuestions(10),
    ]);

    return new Response(
      JSON.stringify({
        pending,
        curated: curated.map((c) => ({
          id: c.id,
          question: c.question,
          answer: c.answer,
          source: c.source,
          createdAt: c.createdAt,
        })),
        // 不返回 embedding 向量（太大数据，Dashboard 不需要）
        stats: {
          totalConversations: hotQuestions.reduce((sum, q) => sum + q.count, 0),
          pendingCount: pending.length,
          curatedCount: curated.length,
        },
        hotQuestions,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Dashboard GET]", error);
    return new Response(
      JSON.stringify({ error: "获取数据失败，请重试。" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ============================================================
// POST — 操作（收录/编辑/删除）
// ============================================================

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || !checkAuth(typeof body.key === "string" ? body.key : null)) {
    return unauthResponse();
  }

  const { action, id, question, answer, pendingId } = body;

  // 问答文本统一钳制：必须是字符串、去首尾空白、限长——保护 KV 与 RAG 上下文
  const clampText = (v: unknown, max: number): string | null => {
    if (typeof v !== "string") return null;
    const t = v.trim();
    return t && t.length <= max ? t : null;
  };

  try {
    switch (action) {
      // ── 收录：待审核 → 已收录 ──
      case "approve": {
        const q = clampText(question, MAX_QUESTION_LENGTH);
        const a = clampText(answer, MAX_ANSWER_LENGTH);
        if (!q || !a || typeof pendingId !== "string" || !pendingId) {
          return new Response(
            JSON.stringify({
              error: `缺少或非法 question（≤${MAX_QUESTION_LENGTH} 字）、answer（≤${MAX_ANSWER_LENGTH} 字）、pendingId`,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        const approved = await approveQA(q, a, pendingId);
        return new Response(
          JSON.stringify({ success: true, item: approved }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // ── 编辑已收录 Q&A ──
      case "edit": {
        const q = clampText(question, MAX_QUESTION_LENGTH);
        const a = clampText(answer, MAX_ANSWER_LENGTH);
        if (!q || !a || typeof id !== "string" || !id) {
          return new Response(
            JSON.stringify({
              error: `缺少或非法 id、question（≤${MAX_QUESTION_LENGTH} 字）、answer（≤${MAX_ANSWER_LENGTH} 字）`,
            }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        const edited = await editCuratedQA(id, q, a);
        return new Response(
          JSON.stringify({ success: true, item: edited }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // ── 删除已收录 Q&A ──
      case "delete_curated": {
        if (typeof id !== "string" || !id) {
          return new Response(
            JSON.stringify({ error: "缺少 id" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        await deleteCuratedQA(id);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // ── 删除待审核 Q&A ──
      case "delete_pending": {
        if (typeof id !== "string" || !id) {
          return new Response(
            JSON.stringify({ error: "缺少 id" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        await deletePendingQA(id);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `未知操作: ${action}` }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失败";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
