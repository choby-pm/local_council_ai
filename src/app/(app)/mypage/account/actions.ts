"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { councilMembers, members } from "@/db/schema";
import { getActiveMember } from "@/lib/member";

/** 소속 상임위를 직접 고른다 (행정사무감사 준비의 감사 대상 부서가 이것으로 정해짐) */
export async function setCommittee(committee: string) {
  const member = await getActiveMember();
  if (!member) return { ok: false as const, error: "이용 권한이 없습니다" };

  const db = getDb();
  // 소속 의회 명단에 실제로 있는 위원회만 허용
  const roster = await db
    .select({ committees: councilMembers.committees })
    .from(councilMembers)
    .where(eq(councilMembers.council, member.council));
  if (!roster.some((m) => m.committees.includes(committee))) {
    return { ok: false as const, error: "선택할 수 없는 위원회입니다" };
  }

  await db.update(members).set({ committee }).where(eq(members.id, member.id));
  revalidatePath("/", "layout");
  return { ok: true as const };
}
