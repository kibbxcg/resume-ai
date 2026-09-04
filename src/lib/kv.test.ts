import { describe, it, expect } from "vitest";
import { normalizeQuestion } from "./kv";

describe("normalizeQuestion", () => {
  it("末尾标点不影响聚合", () => {
    expect(normalizeQuestion("你熟悉哪些技术栈？")).toBe("你熟悉哪些技术栈");
    expect(normalizeQuestion("你熟悉哪些技术栈??")).toBe("你熟悉哪些技术栈");
    expect(normalizeQuestion("你熟悉哪些技术栈。")).toBe("你熟悉哪些技术栈");
  });

  it("首尾空白与内部连续空白被压缩", () => {
    expect(normalizeQuestion("  你的  项目 经历  ")).toBe("你的 项目 经历");
  });

  it("超过 100 字截断", () => {
    expect(normalizeQuestion("问".repeat(120))).toHaveLength(100);
  });

  it("纯标点问题清空后为空串", () => {
    expect(normalizeQuestion("？？？")).toBe("");
  });
});
