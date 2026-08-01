// ============================================================
// /api/dashboard — 求职者审核后台 API
//
// GET  /api/dashboard?key=xxx
//   → 返回待审核 + 已收录 + 统计
//
// POST /api/dashboard
//   → 收录/编辑/删除 Q&A（body 里带 action + key）
// ============================================================

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

// ============================================================
// 鉴权检查
// ============================================================

function checkAuth(key: string | null): boolean {
  const secret = process.env.DASHBOARD_SECRET;
  // 如果没有设置 DASHBOARD_SECRET，拒绝所有请求
  if (!secret) return false;
  return key === secret;
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
  if (!body || !checkAuth(body.key)) return unauthResponse();

  const { action, id, question, answer, pendingId } = body;

  try {
    switch (action) {
      // ── 收录：待审核 → 已收录 ──
      case "approve": {
        if (!question || !answer || !pendingId) {
          return new Response(
            JSON.stringify({ error: "缺少 question、answer 或 pendingId" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        const approved = await approveQA(question, answer, pendingId);
        return new Response(
          JSON.stringify({ success: true, item: approved }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // ── 编辑已收录 Q&A ──
      case "edit": {
        if (!id || !question || !answer) {
          return new Response(
            JSON.stringify({ error: "缺少 id、question 或 answer" }),
            { status: 400, headers: { "Content-Type": "application/json" } }
          );
        }
        const edited = await editCuratedQA(id, question, answer);
        return new Response(
          JSON.stringify({ success: true, item: edited }),
          { headers: { "Content-Type": "application/json" } }
        );
      }

      // ── 删除已收录 Q&A ──
      case "delete_curated": {
        if (!id) {
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
        if (!id) {
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
