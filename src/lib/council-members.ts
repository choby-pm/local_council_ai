import "server-only";

import { asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { councilMembers } from "@/db/schema";
import type { Member } from "@/lib/member";

export type CouncilMember = typeof councilMembers.$inferSelect;

// 의회운영위원회는 다른 상임위와 겸임하므로, 행감 대상 부서를 정할 때는 소관 부서가 있는 상임위를 우선한다
const STEERING_COMMITTEE = "의회운영위원회";

export function primaryCommittee(committees: string[]): string | null {
  return committees.find((c) => c !== STEERING_COMMITTEE) ?? committees[0] ?? null;
}

// 위원회 목록은 명단에서 뽑되, 상임위를 의회운영위원회보다 앞에 둔다
export function committeesOf(roster: CouncilMember[]): string[] {
  const all = [...new Set(roster.flatMap((m) => m.committees))];
  return all.sort((a, b) => Number(a === STEERING_COMMITTEE) - Number(b === STEERING_COMMITTEE) || a.localeCompare(b, "ko"));
}

export async function getCouncilRoster(council: string): Promise<CouncilMember[]> {
  return getDb()
    .select()
    .from(councilMembers)
    .where(eq(councilMembers.council, council))
    .orderBy(asc(councilMembers.name));
}

export async function getLinkedCouncilMember(member: Member): Promise<CouncilMember | null> {
  if (!member.councilMemberId) return null;
  const [row] = await getDb()
    .select()
    .from(councilMembers)
    .where(eq(councilMembers.id, member.councilMemberId));
  return row ?? null;
}
