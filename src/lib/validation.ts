// ============================================================
// validation.ts — 不可信输入的运行时校验
//
// 客户端传来的数据（/api/chat 的 history 等）一律视为不可信：
// 在这里用 zod 定义白名单 Schema，服务端逐条校验后再使用。
// 独立成模块是为了让 route.ts 与单元测试共用同一份定义。
// ============================================================

import { z } from "zod";

/**
 * /api/chat 的单条对话历史。
 *
 * role 白名单只允许 user / assistant——防止恶意客户端注入
 * role:"system" 的消息劫持对话。长度上限只防滥用：
 * user 消息本就限 2000 字，assistant 英文回复（max_tokens=2000）
 * 可能到 ~8000 字符，放宽到 10000 防止误伤正常多轮记忆。
 */
export const HistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(10000),
});

export type HistoryMessage = z.infer<typeof HistoryMessageSchema>;

/** 单轮对话携带的历史条数上限（3 轮 Q&A），控制 Token 消耗 */
export const HISTORY_MAX_MESSAGES = 6;

/**
 * 清洗客户端传来的 history 数组：不合格的条目直接丢弃，
 * 只保留最近 HISTORY_MAX_MESSAGES 条。
 */
export function sanitizeHistory(
  input: unknown
): { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((m) => HistoryMessageSchema.safeParse(m))
    .filter((r) => r.success)
    .map((r) => r.data)
    .slice(-HISTORY_MAX_MESSAGES);
}
