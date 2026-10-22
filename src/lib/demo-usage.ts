import "server-only";
import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { demoQuestionUsage } from "@/db/schema";

export const DEMO_DAILY_LIMIT = 10;
export const DEMO_GLOBAL_LIMIT = 100;
export const DEMO_COOLDOWN_SECONDS = 15;

export const demoRequestSchema = z.object({
  question: z.string().trim().min(1).max(1000),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) })).max(6).default([]),
});

export function demoClientKey(headers: Headers): string | null {
  // Vercel이 덮어쓰는 헤더만 사용한다. 쿠키·요청 본문의 식별자는 한도 계산에 쓰지 않는다.
  const ip = process.env.VERCEL ? headers.get("x-forwarded-for")?.trim() : "127.0.0.1";
  if (!ip || !isIP(ip)) return null;
  return createHash("sha256").update(ip).digest("hex");
}

export async function reserveDemoQuestion(clientKey: string): Promise<number | null> {
  try {
    const result = await getDb().execute(sql`
      with global_budget as (
        insert into ${demoQuestionUsage} (key, day, used, last_requested_at)
        values ('global', (now() at time zone 'Asia/Seoul')::date, 1, now())
        on conflict (key, day) do update set used = ${demoQuestionUsage.used} + 1, last_requested_at = now()
        where ${demoQuestionUsage.used} < ${DEMO_GLOBAL_LIMIT}
        returning key
      ), client_budget as (
        insert into ${demoQuestionUsage} (key, day, used, last_requested_at)
        select ${clientKey}, (now() at time zone 'Asia/Seoul')::date, 1, now() from global_budget
        on conflict (key, day) do update set used = ${demoQuestionUsage.used} + 1, last_requested_at = now()
        where ${demoQuestionUsage.used} < ${DEMO_DAILY_LIMIT}
          and ${demoQuestionUsage.lastRequestedAt} <= now() - make_interval(secs => ${DEMO_COOLDOWN_SECONDS})
        returning used
      )
      select 1 / count(*)::integer as granted, max(used) as used from client_budget
    `);
    return Number(result.rows[0].used);
  } catch (error) {
    // 승인 행이 없으면 0 나눗셈으로 문장 전체를 롤백해 전체 한도도 소모하지 않는다.
    const code = (error as { code?: string; cause?: { code?: string } }).cause?.code ?? (error as { code?: string }).code;
    if (code === "22012") return null;
    throw error;
  }
}
