import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { members } from "@/db/schema";

export type Member = typeof members.$inferSelect;

export async function getCurrentMember(): Promise<Member | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(members)
    .where(eq(members.clerkUserId, userId))
    .limit(1);

  return rows[0] ?? null;
}

/**
 * 승인(active)된 회원만 반환. API 라우트·데이터 접근은 반드시 이 함수를 사용할 것 —
 * (app) 레이아웃의 상태 리다이렉트는 페이지 렌더링만 막을 뿐, API 직접 호출이나
 * 레이아웃과 병렬 렌더링되는 페이지까지 막아주지 않는다.
 */
export async function getActiveMember(): Promise<Member | null> {
  const member = await getCurrentMember();
  if (!member || member.status !== "active") return null;
  return member;
}
