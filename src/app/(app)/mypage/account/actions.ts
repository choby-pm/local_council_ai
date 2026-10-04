"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { members } from "@/db/schema";
import { committeesFor } from "@/lib/committees";
import { getActiveMember } from "@/lib/member";

/** 소속 상임위를 직접 고른다 (행정사무감사 준비의 감사 대상 부서가 이것으로 정해짐) */
export async function setCommittee(committee: string) {
  const member = await getActiveMember();
  if (!member) return { ok: false as const, error: "이용 권한이 없습니다" };

  // 소속 의회의 위원회만 허용
  if (!committeesFor(member.council).includes(committee)) {
    return { ok: false as const, error: "선택할 수 없는 위원회입니다" };
  }

  await getDb().update(members).set({ committee }).where(eq(members.id, member.id));
  revalidatePath("/", "layout");
  return { ok: true as const };
}
