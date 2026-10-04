import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { councilMembers } from "@/db/schema";

export type CouncilMember = typeof councilMembers.$inferSelect;

// 의회운영위원회는 다른 상임위와 겸임하는 위원회라 목록에서 상임위 뒤에 둔다
const STEERING_COMMITTEE = "의회운영위원회";

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

/** 선거구가 맡는 동 목록 — 지적사항의 지역구 관련 신호와 비서의 범위 설정에 쓴다 */
export async function getDistrictAreas(council: string, district: string | null): Promise<string[]> {
  if (!district) return [];
  const [row] = await getDb()
    .select({ areas: councilMembers.districtAreas })
    .from(councilMembers)
    .where(and(eq(councilMembers.council, council), eq(councilMembers.district, district)))
    .limit(1);
  return row?.areas ?? [];
}
