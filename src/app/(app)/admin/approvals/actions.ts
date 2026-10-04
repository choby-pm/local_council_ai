"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { members } from "@/db/schema";
import { getActiveMember } from "@/lib/member";
import { isUuid } from "@/lib/utils";

type Result = { ok: true } | { ok: false; error: string };

async function requireMaster() {
  const member = await getActiveMember();
  return member?.role === "master" ? member : null;
}

/** 가입 신청 승인 — 관리자가 실제 의원인지 확인한 뒤 누른다 (결정 D-21). 승인 즉시 이용 가능 */
export async function approveMember(memberId: string): Promise<Result> {
  if (!(await requireMaster())) return { ok: false, error: "관리자만 처리할 수 있습니다" };
  if (!isUuid(memberId)) return { ok: false, error: "잘못된 요청입니다" };

  const now = new Date();
  const updated = await getDb()
    .update(members)
    .set({ status: "active", approvedAt: now, onboardedAt: now, rejectedReason: null })
    .where(and(eq(members.id, memberId), eq(members.status, "pending")))
    .returning({ id: members.id });
  if (updated.length === 0) return { ok: false, error: "이미 처리된 신청입니다" };

  revalidatePath("/admin/approvals");
  return { ok: true };
}

export async function rejectMember(memberId: string, reason: string): Promise<Result> {
  if (!(await requireMaster())) return { ok: false, error: "관리자만 처리할 수 있습니다" };
  const trimmed = reason.trim();
  if (!isUuid(memberId) || !trimmed) return { ok: false, error: "거부 사유를 입력해주세요" };
  if (trimmed.length > 300) return { ok: false, error: "거부 사유는 300자 이내로 입력해주세요" };

  const updated = await getDb()
    .update(members)
    .set({ status: "rejected", rejectedReason: trimmed })
    .where(and(eq(members.id, memberId), eq(members.status, "pending")))
    .returning({ id: members.id });
  if (updated.length === 0) return { ok: false, error: "이미 처리된 신청입니다" };

  revalidatePath("/admin/approvals");
  return { ok: true };
}
