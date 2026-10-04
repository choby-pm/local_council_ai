import "server-only";

import { cache } from "react";
import { getTableColumns, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { members } from "@/db/schema";
import { getSessionMemberId } from "@/lib/auth";

// 비밀번호 해시는 절대 클라이언트 컴포넌트(MemberProvider·AppHeader 등)로 넘어가지 않도록 조회 단계에서 제외
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const { passwordHash, ...memberColumns } = getTableColumns(members);

export type Member = Omit<typeof members.$inferSelect, "passwordHash">;

/** 한 요청 안에서 레이아웃·페이지가 각각 호출해도 DB 조회는 한 번만 일어나도록 cache 처리 */
export const getCurrentMember = cache(async (): Promise<Member | null> => {
  const memberId = await getSessionMemberId();
  if (!memberId) return null;

  const [member] = await getDb().select(memberColumns).from(members).where(eq(members.id, memberId));
  return member ?? null;
});

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
