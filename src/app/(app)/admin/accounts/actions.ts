"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";

import { getDb } from "@/db";
import { members } from "@/db/schema";
import { getActiveMember } from "@/lib/member";
import { isUuid } from "@/lib/utils";

type Result = { ok: true } | { ok: false; error: string };

/**
 * 관리자 계정 관리. 낙선·임기 종료 의원은 기본적으로 비활성화(기록 보존)하고,
 * 필요할 때만 삭제(계정과 대화 기록 영구 삭제)한다.
 * 본인 계정은 건드릴 수 없고, 활성 관리자는 최소 1명 남긴다.
 */
async function guard(targetId: string): Promise<{ error: string } | { actorId: string }> {
  const actor = await getActiveMember();
  if (actor?.role !== "master") return { error: "관리자만 처리할 수 있습니다" };
  if (!isUuid(targetId)) return { error: "잘못된 요청입니다" };
  if (targetId === actor.id) return { error: "본인 계정은 여기서 변경할 수 없습니다" };
  return { actorId: actor.id };
}

// 대상을 제외하고도 활성 관리자가 남는지
async function otherActiveMasterExists(targetId: string) {
  const rows = await getDb()
    .select({ id: members.id })
    .from(members)
    .where(and(eq(members.role, "master"), eq(members.status, "active"), ne(members.id, targetId)))
    .limit(1);
  return rows.length > 0;
}

async function isActiveMaster(targetId: string) {
  const [row] = await getDb()
    .select({ role: members.role, status: members.status })
    .from(members)
    .where(eq(members.id, targetId));
  return row?.role === "master" && row.status === "active";
}

function done(): Result {
  revalidatePath("/admin/accounts");
  return { ok: true };
}

export async function setAccountActive(targetId: string, active: boolean): Promise<Result> {
  const g = await guard(targetId);
  if ("error" in g) return { ok: false, error: g.error };
  if (!active && (await isActiveMaster(targetId)) && !(await otherActiveMasterExists(targetId))) {
    return { ok: false, error: "활성 관리자가 최소 1명은 있어야 합니다" };
  }

  const db = getDb();
  if (active) {
    // 비활성 계정만 재활성화 (승인대기·거부 계정은 가입 승인 화면에서 처리)
    await db
      .update(members)
      .set({ status: "active" })
      .where(and(eq(members.id, targetId), eq(members.status, "disabled")));
  } else {
    await db.update(members).set({ status: "disabled" }).where(eq(members.id, targetId));
  }
  return done();
}

export async function setAccountRole(targetId: string, master: boolean): Promise<Result> {
  const g = await guard(targetId);
  if ("error" in g) return { ok: false, error: g.error };
  if (!master && (await isActiveMaster(targetId)) && !(await otherActiveMasterExists(targetId))) {
    return { ok: false, error: "활성 관리자가 최소 1명은 있어야 합니다" };
  }

  await getDb()
    .update(members)
    .set({ role: master ? "master" : "member" })
    .where(eq(members.id, targetId));
  return done();
}

/** 계정 영구 삭제 — 세션·대화·피드백 등 계정에 딸린 기록도 함께 삭제된다 (외래키 cascade) */
export async function deleteAccount(targetId: string): Promise<Result> {
  const g = await guard(targetId);
  if ("error" in g) return { ok: false, error: g.error };
  if ((await isActiveMaster(targetId)) && !(await otherActiveMasterExists(targetId))) {
    return { ok: false, error: "활성 관리자가 최소 1명은 있어야 합니다" };
  }

  await getDb().delete(members).where(eq(members.id, targetId));
  return done();
}
