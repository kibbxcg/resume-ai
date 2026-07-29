// ============================================================
// POST /api/chat — SSE 流式代理
//
// 这是面试官浏览器和后端之间的唯一接口。
// 面试官的问题发到这里 → 拼 System Prompt → 调 LLM → 流式推回
// API Key 全程在服务端，浏览器永远看不到。
//
// Next.js 约定：src/app/api/chat/route.ts → 自动映射为 /api/chat
// ============================================================

import { NextRequest } from "next/server";
import { buildSystemPrompt } from "@/lib/prompt";
import { streamChat } from "@/lib/llm/provider";

// ============================================================
// 第 1 部分：处理 POST 请求
// ============================================================

export async function POST(request: NextRequest) {
  try {
    // ── 1.1 从请求体中解出消息和历史 ──
    const body = await request.json().catch(() => null);
    const userMessage: string = body?.message?.trim();
    // 对话历史：前端传来最近 6 条（3 轮 Q&A），实现 AI 上下文记忆
    const history: { role: "user" | "assistant"; content: string }[] =
      Array.isArray(body?.history) ? body.history.slice(-6) : [];

    // 空消息或没传 message → 直接拒绝
    if (!userMessage) {
      return new Response(
        JSON.stringify({ error: "消息不能为空" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 1.2 长度限制：防止恶意滥用（有人发一本小说过来） ──
    if (userMessage.length > 2000) {
      return new Response(
        JSON.stringify({ error: "消息过长，请控制在 2000 字以内" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // ── 1.3 拼 System Prompt + 调 LLM（传入历史记录） ──
    const systemPrompt = buildSystemPrompt();
    const llmStream = await streamChat(systemPrompt, userMessage, history);

    // ── 1.4 把 LLM 原始流转换成前端能消费的 SSE 流 ──
    const sseStream = transformToSSE(llmStream);

    // ── 1.5 返回 SSE 响应 ──
    return new Response(sseStream, {
      headers: {
        "Content-Type": "text/event-stream",   // SSE 标准 MIME 类型
        "Cache-Control": "no-cache",           // 不缓存（流式内容没意义缓存）
        "Connection": "keep-alive",            // 保持长连接
        "X-Content-Type-Options": "nosniff",   // 安全头：防 MIME 嗅探攻击
      },
    });
  } catch (error) {
    // ── 1.6 全局兜底：任何没预料到的错误都返回友好提示 ──
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
// 第 2 部分：SSE 转换器
//
// LLM 返回的原始流是这种格式（OpenAI 兼容的 SSE）：
//   data: {"id":"xxx","choices":[{"delta":{"content":"你"}}]}
//   data: {"id":"xxx","choices":[{"delta":{"content":"好"}}]}
//   data: [DONE]
//
// 我们要把每一行 data: {...} 解析出来，
// 提取 choices[0].delta.content，拼成干净的 data: xxx\n\n
// 直接推给前端渲染。
// ============================================================

function transformToSSE(llmStream: ReadableStream): ReadableStream {
  // 用一个 TransformStream 做"翻译"：
  //   输入：LLM 的原始字节流（含 data: {JSON} 格式）
  //   输出：干净的 SSE 文本流（每行 data: "文字内容"）
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // ↓ 缓冲区：因为一个 chunk 可能被切成半行，需要拼起来再处理
  let buffer = "";

  const transform = new TransformStream({
    transform(chunk: Uint8Array, controller) {
      // 把二进制 chunk 转成文字，追加到缓冲区
      buffer += decoder.decode(chunk, { stream: true });

      // 按换行符拆成一行一行处理
      const lines = buffer.split("\n");
      // 最后一行可能是不完整的（下一个 chunk 才补全），留回缓冲区
      buffer = lines.pop() || "";

      for (const line of lines) {
        // 跳过空行
        if (!line.trim()) continue;

        // LLM 发出的结束信号
        if (line.startsWith("data: [DONE]")) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          return;
        }

        // 解析 data: {json} 格式
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.slice(6)); // 去掉 "data: " 前缀
            // 提取 AI 回复的文本片段
            const content = json?.choices?.[0]?.delta?.content;
            if (content) {
              // 推出一段 SSE 格式的文本：data: "xxx"\n\n
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(content)}\n\n`));
            }
          } catch {
            // JSON 解析失败就跳过（可能是心跳包或其他非数据行）
          }
        }
      }
    },

    flush(controller) {
      // 流结束时处理缓冲区里可能残留的最后一行
      if (buffer.trim()) {
        if (buffer.startsWith("data: [DONE]")) {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        }
      }
    },
  });

  // 把 LLM 的流接到转换器上，吐出干净的 SSE 流
  return llmStream.pipeThrough(transform);
}
