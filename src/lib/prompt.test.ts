import { describe, it, expect } from "vitest";
import { buildSystemPrompt, type RAGHit } from "./prompt";
import { profile } from "./profile";

describe("buildSystemPrompt", () => {
  it("包含 Guardrails（核心规则在最前，优先级最高）", () => {
    const prompt = buildSystemPrompt();
    expect(prompt.startsWith("## 核心规则")).toBe(true);
    expect(prompt).toContain("严禁编造");
  });

  it("包含 Persona 与回答风格", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("## Persona");
    expect(prompt).toContain("## 回答风格");
  });

  it("始终注入全量 profile（姓名等基础信息必须在场）", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain(profile.basic.name);
    expect(prompt).toContain(profile.basic.title);
    expect(prompt).toContain("## 技能");
  });

  it("包含 persona 的自定义指令", () => {
    const prompt = buildSystemPrompt();
    if (profile.persona.extra_instructions) {
      expect(prompt).toContain(profile.persona.extra_instructions);
    }
  });

  it("有 RAG 命中时追加已审核问答段落，含问题和答案", () => {
    const hits: RAGHit[] = [
      { question: "你熟悉哪些技术栈？", answer: "React、TypeScript、Next.js", score: 0.86 },
    ];
    const prompt = buildSystemPrompt(hits);
    expect(prompt).toContain("已审核的高质量回答");
    expect(prompt).toContain("你熟悉哪些技术栈？");
    expect(prompt).toContain("React、TypeScript、Next.js");
    expect(prompt).toContain("0.86");
  });

  it("无 RAG 命中时不出现已审核问答段落", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).not.toContain("已审核的高质量回答");
  });

  it("RAG 段落在 profile 之后（先基线资料，后检索补充）", () => {
    const hits: RAGHit[] = [
      { question: "Q", answer: "A", score: 0.9 },
    ];
    const prompt = buildSystemPrompt(hits);
    expect(prompt.indexOf("## 技能")).toBeLessThan(prompt.indexOf("已审核的高质量回答"));
  });
});
