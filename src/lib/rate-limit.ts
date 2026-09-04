// ============================================================
// rate-limit.ts — /api/chat 的轻量内存限流
//
// 为什么需要：LLM API 按调用量计费，对话接口又是公开入口——
// 没有限流的话，一个脚本就能刷爆站长的 API 额度。
//
// 实现取舍：固定窗口计数器，纯内存、零依赖。在 serverless 环境
// 每个warm实例各自计数，只能做到"近似"全局限流——对个人部署场景
// 足够挡住脚本滥用，不值得为精确性引入外部存储。
// ============================================================

interface WindowCounter {
  windowStart: number;
  count: number;
}

const counters = new Map<string, WindowCounter>();

// 防止恶意伪造海量 IP 把内存打爆：超过阈值先清理过期窗口，
// 仍超限则全部清空（代价只是正常用户可能提前重置额度，可接受）
const MAX_TRACKED_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * 固定窗口限流检查
 *
 * @param key      - 限流对象（如 `chat:1.2.3.4`）
 * @param limit    - 窗口内允许的最大次数
 * @param windowMs - 窗口长度（毫秒）
 * @param now      - 当前时间（可注入以便单测）
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  if (counters.size >= MAX_TRACKED_KEYS) {
    for (const [k, v] of counters) {
      if (now - v.windowStart >= windowMs) counters.delete(k);
    }
    if (counters.size >= MAX_TRACKED_KEYS) counters.clear();
  }

  const counter = counters.get(key);
  if (!counter || now - counter.windowStart >= windowMs) {
    counters.set(key, { windowStart: now, count: 1 });
    return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (counter.count < limit) {
    counter.count += 1;
    return { allowed: true, remaining: limit - counter.count, retryAfterSec: 0 };
  }

  const retryAfterSec = Math.ceil((counter.windowStart + windowMs - now) / 1000);
  return { allowed: false, remaining: 0, retryAfterSec };
}

/**
 * 从请求头提取客户端 IP。
 * Vercel 会注入 x-forwarded-for（可能是逗号分隔链，第一个是真实客户端）；
 * 本地开发没有这些头，统一落到 "unknown"（限流同样生效，不影响调试）。
 */
export function getClientIP(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}
