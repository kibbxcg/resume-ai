import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, getClientIP } from "./rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    // counters 是模块级 Map，测试间需要隔离——用不同 key 前缀即可
  });

  it("窗口内前 N 次放行，第 N+1 次拒绝", () => {
    const key = "t1";
    expect(checkRateLimit(key, 3, 60_000, 1000).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 60_000, 1001).allowed).toBe(true);
    expect(checkRateLimit(key, 3, 60_000, 1002).allowed).toBe(true);
    const blocked = checkRateLimit(key, 3, 60_000, 1003);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBe(60); // 窗口从 1000 开始，1003 时还剩 59.xxx → 向上取整 60
  });

  it("窗口过期后重新计数", () => {
    const key = "t2";
    checkRateLimit(key, 1, 60_000, 1000);
    expect(checkRateLimit(key, 1, 60_000, 2000).allowed).toBe(false);
    // 61 秒后：新窗口
    const after = checkRateLimit(key, 1, 60_000, 61_500);
    expect(after.allowed).toBe(true);
    expect(after.remaining).toBe(0);
  });

  it("不同 key 互相独立", () => {
    checkRateLimit("a", 1, 60_000, 1000);
    expect(checkRateLimit("b", 1, 60_000, 1000).allowed).toBe(true);
  });

  it("返回剩余额度", () => {
    const key = "t3";
    expect(checkRateLimit(key, 5, 60_000, 1000).remaining).toBe(4);
    expect(checkRateLimit(key, 5, 60_000, 1001).remaining).toBe(3);
  });

  it("retryAfterSec 随时间推进递减", () => {
    const key = "t4";
    checkRateLimit(key, 1, 60_000, 1000);
    const blockedAt = checkRateLimit(key, 1, 60_000, 31_000);
    expect(blockedAt.allowed).toBe(false);
    expect(blockedAt.retryAfterSec).toBe(30); // 窗口 61_000 结束，31_000 时还差 30s
  });
});

describe("getClientIP", () => {
  it("x-forwarded-for 取链上第一个（真实客户端）", () => {
    const headers = new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" });
    expect(getClientIP(headers)).toBe("1.2.3.4");
  });

  it("无 x-forwarded-for 时回退 x-real-ip", () => {
    const headers = new Headers({ "x-real-ip": "5.6.7.8" });
    expect(getClientIP(headers)).toBe("5.6.7.8");
  });

  it("都没有 → unknown", () => {
    expect(getClientIP(new Headers())).toBe("unknown");
  });
});
