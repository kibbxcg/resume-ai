import { describe, it, expect } from "vitest";
import { cosineSimilarity } from "./embedding";

describe("cosineSimilarity", () => {
  it("相同向量 → 1", () => {
    const v = [0.1, 0.2, 0.3];
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 10);
  });

  it("正交向量 → 0", () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 10);
  });

  it("相反向量 → -1", () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 10);
  });

  it("模长不同但方向相同的向量 → 1（余弦只看方向）", () => {
    expect(cosineSimilarity([1, 1], [2, 2])).toBeCloseTo(1, 10);
  });

  it("零向量 → 0（不抛错，防除零）", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it("维度不匹配 → 抛错", () => {
    expect(() => cosineSimilarity([1, 2], [1, 2, 3])).toThrow(/维度不匹配/);
  });
});
