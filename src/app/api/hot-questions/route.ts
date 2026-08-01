// ============================================================
// GET /api/hot-questions — 公开热门问题接口
//
// 面试官对话页从 KV 读取"其他面试官也问了"的问题列表。
// 不需要鉴权（面试官端是公开入口）。
//
// 注意：KV 未配置 / 读取出错时返回空数组，
//       前端会优雅回退到硬编码的建议问题，不影响主流程。
// ============================================================

import { NextRequest } from "next/server";
import { getHotQuestions } from "@/lib/kv";

export async function GET(request: NextRequest) {
  // 支持 ?top=N 控制数量，默认 5 条
  const topParam = request.nextUrl.searchParams.get("top");
  const top = Math.min(Math.max(parseInt(topParam || "5", 10) || 5, 1), 20);

  try {
    const hotQuestions = await getHotQuestions(top);
    return new Response(
      JSON.stringify({ hotQuestions }),
      {
        headers: {
          "Content-Type": "application/json",
          // 热门问题变化不频繁，缓存 60 秒减少 KV 压力
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (error) {
    console.warn("[HotQuestions] 读取失败，返回空列表:", error);
    return new Response(
      JSON.stringify({ hotQuestions: [] }),
      { headers: { "Content-Type": "application/json" } }
    );
  }
}
