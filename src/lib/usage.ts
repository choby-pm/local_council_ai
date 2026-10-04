import "server-only";

import { and, count, eq, gte } from "drizzle-orm";

import { getDb } from "@/db";
import { conversations, messages } from "@/db/schema";

// 회원 1명이 하루에 보낼 수 있는 AI 질문 수. LLM API 월 예산을 회원 한두 명이 소진하지 않도록 막는다.
// 0 이하로 설정하면 제한 없음.
const DEFAULT_DAILY_QUESTION_LIMIT = 50;

function dailyQuestionLimit() {
  const raw = process.env.DAILY_QUESTION_LIMIT;
  const parsed = raw === undefined ? NaN : Number(raw);
  return Number.isInteger(parsed) ? parsed : DEFAULT_DAILY_QUESTION_LIMIT;
}

/** 오늘(KST) 0시 — 일일 한도는 한국 시간 자정에 초기화 */
function startOfTodayKst(now = new Date()) {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
  return new Date(`${ymd}T00:00:00+09:00`);
}

export type QuestionUsage = { used: number; limit: number | null };

export async function getQuestionUsage(memberId: string): Promise<QuestionUsage> {
  const limit = dailyQuestionLimit();

  const [row] = await getDb()
    .select({ n: count() })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(conversations.memberId, memberId),
        eq(messages.role, "user"),
        gte(messages.createdAt, startOfTodayKst())
      )
    );

  return { used: row?.n ?? 0, limit: limit > 0 ? limit : null };
}

export function isOverLimit(usage: QuestionUsage) {
  return usage.limit !== null && usage.used >= usage.limit;
}
