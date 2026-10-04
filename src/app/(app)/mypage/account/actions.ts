"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { councilMembers, members } from "@/db/schema";
import { primaryCommittee } from "@/lib/council-members";
import { getActiveMember } from "@/lib/member";
import { isUuid } from "@/lib/utils";

/**
 * 계정을 실제 의원과 연결하고, 그 의원의 위원회·선거구로 소속 정보를 채운다.
 * 지금은 접속자를 모두 실제 의원으로 간주해 본인 확인 없이 연결한다(본인 확인 절차는 이후 추가).
 * councilMemberId가 null이면 연결을 해제한다.
 */
export async function linkCouncilMember(councilMemberId: string | null) {
  const member = await getActiveMember();
  if (!member) return { ok: false as const, error: "이용 권한이 없습니다" };

  const db = getDb();

  if (councilMemberId === null) {
    await db
      .update(members)
      .set({ councilMemberId: null, committee: null, district: null })
      .where(eq(members.id, member.id));
  } else {
    if (!isUuid(councilMemberId)) return { ok: false as const, error: "잘못된 요청입니다" };

    // 소속 의회의 명단에 있는 의원만 연결 가능
    const [target] = await db
      .select()
      .from(councilMembers)
      .where(and(eq(councilMembers.id, councilMemberId), eq(councilMembers.council, member.council)));
    if (!target) return { ok: false as const, error: "의원 명단에서 찾을 수 없습니다" };

    await db
      .update(members)
      .set({
        councilMemberId: target.id,
        committee: primaryCommittee(target.committees),
        district: target.district,
      })
      .where(eq(members.id, member.id));
  }

  // 사이드바의 소속 표시까지 갱신
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** 의원 연결과 별개로 소속 상임위를 직접 고른다 (행정사무감사 준비의 감사 대상 부서가 이것으로 정해짐) */
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
