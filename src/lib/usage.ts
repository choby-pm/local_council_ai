import "server-only";

import { and, eq, lt, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { dailyQuestionUsage } from "@/db/schema";

function dailyQuestionLimit() {
  const raw = process.env.DAILY_QUESTION_LIMIT;
  const parsed = raw === undefined ? NaN : Number(raw);
  if (!Number.isInteger(parsed)) return 50;
  return parsed > 0 ? parsed : null;
}

export type QuestionUsage = { used: number; limit: number | null };
const todayKst = sql`(now() at time zone 'Asia/Seoul')::date`;

export async function getQuestionUsage(memberId: string): Promise<QuestionUsage> {
  const [row] = await getDb().select({ used: dailyQuestionUsage.used }).from(dailyQuestionUsage)
    .where(and(eq(dailyQuestionUsage.memberId, memberId), eq(dailyQuestionUsage.day, todayKst)));
  return { used: row?.used ?? 0, limit: dailyQuestionLimit() };
}

/** 동시 요청도 한도를 지키도록 사용량을 한 문장으로 예약한다. AI 오류도 접수한 질문으로 계산한다. */
export async function reserveQuestion(memberId: string): Promise<QuestionUsage | null> {
  const limit = dailyQuestionLimit();
  const [row] = await getDb().insert(dailyQuestionUsage).values({ memberId, day: todayKst, used: 1 })
    .onConflictDoUpdate({
      target: [dailyQuestionUsage.memberId, dailyQuestionUsage.day],
      set: { used: sql`${dailyQuestionUsage.used} + 1` },
      setWhere: limit === null ? undefined : lt(dailyQuestionUsage.used, limit),
    }).returning({ used: dailyQuestionUsage.used });
  return row ? { used: row.used, limit } : null;
}
