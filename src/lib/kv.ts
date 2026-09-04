// ============================================================
// kv.ts — Vercel KV（Upstash Redis）读写封装
//
// 注意：@vercel/kv 自动做 JSON 序列化/反序列化
//       所以 kv.set(key, obj) 直接传对象即可，不需要 JSON.stringify
//       kv.get(key) 返回的已经是解析好的对象，不需要 JSON.parse
// ============================================================

import { randomUUID } from "crypto";
import { kv } from "@vercel/kv";
import { embed } from "./embedding";

// ============================================================
// 类型定义
// ============================================================

export interface PendingQA {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}

export interface CuratedQA {
  id: string;
  question: string;
  answer: string;
  embedding: number[];
  createdAt: string;
  source: "preloaded" | "approved" | "edited";
}

export interface HotQuestion {
  question: string;
  count: number;
  lastAsked: string;
}

// ============================================================
// Key 前缀常量
// ============================================================

const PENDING_PREFIX = "qa:pending:";
const CURATED_PREFIX = "qa:curated:";
const ANALYTICS_KEY = "analytics:questions";

// ============================================================
// 第 1 部分：待审核 Q&A
// ============================================================

export async function savePendingQA(
  question: string,
  answer: string
): Promise<void> {
  // randomUUID：Date.now() 在并发下同毫秒会撞 ID，后写覆盖先写
  const id = `pending_${randomUUID()}`;
  const item: PendingQA = {
    id,
    question,
    answer,
    createdAt: new Date().toISOString(),
  };
  await kv.set(`${PENDING_PREFIX}${id}`, item);
}

export async function getPendingQAs(): Promise<PendingQA[]> {
  const keys = await kv.keys(`${PENDING_PREFIX}*`);
  if (keys.length === 0) return [];

  // kv.mget 返回的已经是对象数组，不需要 JSON.parse
  const items = await kv.mget<PendingQA[]>(...keys);
  return (items || []).filter(Boolean).sort(
    (a, b) => b!.createdAt.localeCompare(a!.createdAt)
  ) as PendingQA[];
}

// ============================================================
// 第 2 部分：已收录 Q&A
// ============================================================

export async function approveQA(
  question: string,
  answer: string,
  pendingId: string
): Promise<CuratedQA> {
  const id = `curated_${randomUUID()}`;
  const embedding = await embed(question);

  const item: CuratedQA = {
    id,
    question,
    answer,
    embedding,
    createdAt: new Date().toISOString(),
    source: "approved",
  };

  await kv.set(`${CURATED_PREFIX}${id}`, item);
  await kv.del(`${PENDING_PREFIX}${pendingId}`);

  return item;
}

export async function editCuratedQA(
  id: string,
  question: string,
  answer: string
): Promise<CuratedQA> {
  const embedding = await embed(question);

  const item: CuratedQA = {
    id,
    question,
    answer,
    embedding,
    createdAt: new Date().toISOString(),
    source: "edited",
  };

  await kv.set(`${CURATED_PREFIX}${id}`, item);
  return item;
}

export async function deleteCuratedQA(id: string): Promise<void> {
  await kv.del(`${CURATED_PREFIX}${id}`);
}

export async function deletePendingQA(id: string): Promise<void> {
  await kv.del(`${PENDING_PREFIX}${id}`);
}

export async function getCuratedQAsFromKV(): Promise<CuratedQA[]> {
  const keys = await kv.keys(`${CURATED_PREFIX}*`);
  if (keys.length === 0) return [];

  const items = await kv.mget<CuratedQA[]>(...keys);
  return ((items || []).filter(Boolean) as CuratedQA[]);
}

// ============================================================
// 第 3 部分：热门问题统计
// ============================================================

export async function recordAnalytics(question: string): Promise<void> {
  const normalized = question.trim().slice(0, 100);
  const questions: HotQuestion[] = (await kv.get<HotQuestion[]>(ANALYTICS_KEY)) || [];

  const existing = questions.find((q) => q.question === normalized);
  if (existing) {
    existing.count += 1;
    existing.lastAsked = new Date().toISOString();
  } else {
    questions.push({
      question: normalized,
      count: 1,
      lastAsked: new Date().toISOString(),
    });
  }

  const sorted = questions.sort((a, b) => b.count - a.count).slice(0, 50);
  await kv.set(ANALYTICS_KEY, sorted);
}

export async function getHotQuestions(topN = 10): Promise<HotQuestion[]> {
  const questions = (await kv.get<HotQuestion[]>(ANALYTICS_KEY)) || [];
  return questions.slice(0, topN);
}

// ============================================================
// 第 4 部分：从 KV 加载已收录 Q&A（给 route.ts）
// ============================================================

export async function loadCuratedQAFromKV() {
  const items = await getCuratedQAsFromKV();
  return items.map((item) => ({
    id: item.id,
    question: item.question,
    answer: item.answer,
    embedding: item.embedding,
  }));
}
