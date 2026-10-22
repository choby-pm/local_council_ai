"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { members, sessions, watchKeywords } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { committeesFor } from "@/lib/committees";
import { getActiveMember } from "@/lib/member";
import { hashPassword, verifyPassword } from "@/lib/password";

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

/** 본인 비밀번호 변경 — 현재 비밀번호를 확인한 뒤 바꾼다 */
export async function changePassword(current: string, next: string) {
  const member = await getActiveMember();
  if (!member) return { ok: false as const, error: "이용 권한이 없습니다" };
  if (next.length < 8 || next.length > 100) {
    return { ok: false as const, error: "새 비밀번호는 8자 이상 100자 이하로 입력해주세요" };
  }

  const db = getDb();
  const [row] = await db.select({ hash: members.passwordHash }).from(members).where(eq(members.id, member.id));
  if (!row?.hash || !(await verifyPassword(current, row.hash))) {
    return { ok: false as const, error: "현재 비밀번호가 올바르지 않습니다" };
  }

  await db.batch([
    db.update(members).set({ passwordHash: await hashPassword(next) }).where(eq(members.id, member.id)),
    db.delete(sessions).where(eq(sessions.memberId, member.id)),
  ]);
  await createSession(member.id);
  return { ok: true as const };
}

const MAX_WATCH_KEYWORDS = 10;

/** 관심 사업(키워드) 등록 — 새 회의록에 나오면 매일 아침 알림 (src/lib/watch.ts) */
export async function addWatchKeyword(raw: string) {
  const member = await getActiveMember();
  if (!member) return { ok: false as const, error: "이용 권한이 없습니다" };
  const keyword = raw.trim().replace(/\s+/g, " ");
  if (keyword.length < 2 || keyword.length > 20) {
    return { ok: false as const, error: "관심 사업은 2~20자로 입력해주세요" };
  }

  const db = getDb();
  const existing = await db.select({ id: watchKeywords.id }).from(watchKeywords).where(eq(watchKeywords.memberId, member.id));
  if (existing.length >= MAX_WATCH_KEYWORDS) {
    return { ok: false as const, error: `관심 사업은 ${MAX_WATCH_KEYWORDS}개까지 등록할 수 있습니다` };
  }

  await db.insert(watchKeywords).values({ memberId: member.id, keyword }).onConflictDoNothing();
  revalidatePath("/mypage/account");
  return { ok: true as const };
}

export async function removeWatchKeyword(id: string) {
  const member = await getActiveMember();
  if (!member) return { ok: false as const, error: "이용 권한이 없습니다" };
  await getDb()
    .delete(watchKeywords)
    .where(and(eq(watchKeywords.id, id), eq(watchKeywords.memberId, member.id)));
  revalidatePath("/mypage/account");
  return { ok: true as const };
}
