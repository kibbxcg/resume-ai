// ============================================================
// POST /api/chat — SSE 流式代理 + RAG 检索 + KV 自动记录
//
// 面试官的问题发到这里：
//   1. RAG 检索已审核 Q&A
//   2. 命中 → 注入检索结果 → LLM 润色回答
//   3. 未命中 → profile.yaml 全量注入 → LLM 生成回答 → 自动记录到 KV
//   4. 流式推回给浏览器
//   5. 统计热门问题
// ============================================================

import { NextRequest } from "next/server";
import { buildSystemPrompt, type RAGHit } from "@/lib/prompt";
import { streamChat } from "@/lib/llm/provider";
import { loadCuratedQA, searchCuratedQA, type QAItem } from "@/lib/knowledge";
import { savePendingQA, recordAnalytics, loadCuratedQAFromKV } from "@/lib/kv";

// ── 启动时合并加载：curated_qa.yaml（预置） + Vercel KV（审核收录的）──
let curatedQACache: QAItem[] | null = null;

async function getCuratedQA(): Promise<QAItem[]> {
  if (!curatedQACache) {
    // 同时从 YAML 和 KV 加载
    const [yamlItems, kvItems] = await Promise.all([
      loadCuratedQA(),
      loadCuratedQAFromKV(),
    ]);

    // 合并去重（KV 优先，YAML 同名问题被 KV 覆盖）
    const merged = new Map<string, QAItem>();
    for (const item of yamlItems) merged.set(item.id, item);
    for (const item of kvItems) merged.set(item.id, item);

    curatedQACache = Array.from(merged.values());
    console.log(`[RAG] 已加载 ${curatedQACache.length} 条已审核问答（YAML: ${yamlItems.length}, KV: ${kvItems.length}）`);
  }
  return curatedQACache;
}

// ── 刷新缓存（Dashboard 收录/编辑后缓存需要更新）──
export function invalidateCuratedCache() {
  curatedQACache = null;
}

// ============================================================
// 第 1 部分：处理 POST 请求
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // ── 1.1 解析请求 ──
    const body = await request.json().catch(() => null);
    const userMessage: string = body?.message?.trim();
    const history: { role: "user" | "assistant"; content: string }[] =
      Array.isArray(body?.history) ? body.history.slice(-6) : [];

    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "消息不能为空" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (userMessage.length > 2000) {
      return new Response(
        JSON.stringify({ error: "消息过长，请控制在 2000 字以内" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 1.2 热门统计（每次提问都记录，异步不阻塞主流程）──
    recordAnalytics(userMessage).catch((e) =>
      console.warn("[KV] 统计记录失败:", e)
    );

    // ── 1.3 RAG 检索 ──
    const curatedQA = await getCuratedQA();
    const ragResults =
      curatedQA.length > 0
        ? await searchCuratedQA(userMessage, curatedQA)
        : [];

    const ragHits: RAGHit[] = ragResults.map((r) => ({
      question: r.item.question,
      answer: r.item.answer,
      score: r.score,
    }));

    if (ragHits.length > 0) {
      console.log(
        `[RAG] 命中 ${ragHits.length} 条，Top-1: ${ragHits[0].score.toFixed(3)}`
      );
    }

    // ── 1.4 拼 System Prompt + 调 LLM ──
    const systemPrompt = buildSystemPrompt(
      ragHits.length > 0 ? ragHits : undefined
    );
    const llmStream = await streamChat(systemPrompt, userMessage, history);

    // ── 1.5 Tee 流：一份发给面试官，一份收集答案 ──
    const [clientStream, collectorStream] = llmStream.tee();

    // 发给面试官（SSE 转换）
    const sseStream = transformToSSE(clientStream);

    // 后台收集完整答案（不阻塞响应）→ 未命中时写入待审核
    if (ragHits.length === 0) {
      collectAnswerText(collectorStream, userMessage).catch((e) =>
        console.warn("[KV] 自动记录失败:", e)
      );
    } else {
      // 命中了也要消耗 collector 流，否则 tee 会内存泄漏
      collectorStream.cancel().catch(() => {});
    }

    // ── 1.6 返回 SSE ──
    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("/api/chat 错误:", error);
    const message =
      error instanceof Error ? error.message : "服务器内部错误，请稍后重试。";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ============================================================
// 第 2 部分：SSE 转换器（和之前一样）
// ============================================================

function transformToSSE(llmStream: ReadableStream): ReadableStream {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";

  const transform = new TransformStream({
    transform(chunk: Uint8Array, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        if (line.startsWith("data: [DONE]")) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          return;
        }
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json?.choices?.[0]?.delta?.content;
            if (content) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify(content)}\n\n`)
              );
            }
          } catch { /* skip */ }
        }
      }
    },
    flush(controller) {
      if (buffer.trim() && buffer.startsWith("data: [DONE]")) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      }
    },
  });

  return llmStream.pipeThrough(transform);
}

// ============================================================
// 第 3 部分：收集完整答案 → 写入 KV 待审核
// ============================================================

async function collectAnswerText(
  stream: ReadableStream,
  question: string
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim() || line.startsWith("data: [DONE]")) continue;
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.slice(6));
            const content = json?.choices?.[0]?.delta?.content;
            if (content) parts.push(content);
          } catch { /* skip */ }
        }
      }
    }

    const answer = parts.join("").trim();
    if (answer) {
      await savePendingQA(question, answer);
      console.log(`[RAG] 未命中，已自动记录: "${question.slice(0, 50)}..."`);
    }
  } catch {
    // 流被取消（比如面试官点了停止），不写入
  }
}
