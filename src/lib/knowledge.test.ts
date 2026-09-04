import { describe, it, expect } from "vitest";
import {
  curatedThresholdFor,
  CURATED_THRESHOLD,
  SHORT_QUERY_THRESHOLD,
} from "./knowledge";

describe("curatedThresholdFor", () => {
  it("常规长度问题使用标准阈值 0.75", () => {
    expect(curatedThresholdFor("你做过什么项目？")).toBe(CURATED_THRESHOLD);
    expect(curatedThresholdFor("介绍一下你的项目经历")).toBe(0.75);
  });

  it("短问题（< 5 字）降低到 0.6 换取召回", () => {
    expect(curatedThresholdFor("技术栈？")).toBe(SHORT_QUERY_THRESHOLD);
    expect(curatedThresholdFor("项目")).toBe(0.6);
  });

  it("恰好 5 字不算短问题", () => {
    expect(curatedThresholdFor("你用什么栈")).toBe(CURATED_THRESHOLD);
  });

  it("首尾空白不计入长度", () => {
    expect(curatedThresholdFor("  项目  ")).toBe(SHORT_QUERY_THRESHOLD);
  });
});
