"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { notificationReads, notifications } from "@/db/schema";
import { getActiveMember } from "@/lib/member";
import { visibleTo } from "@/lib/notifications";
import { isUuid } from "@/lib/utils";

export async function markNotificationRead(notificationId: string) {
  const member = await getActiveMember();
  if (!member || !isUuid(notificationId)) return;

  const db = getDb();
  // 본인에게 보이는 알림인지 확인 후 기록 — 임의 id로 읽음 행을 만들지 못하게
  const [target] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(and(eq(notifications.id, notificationId), visibleTo(member)));
  if (!target) return;

  await db
    .insert(notificationReads)
    .values({ notificationId, memberId: member.id })
    .onConflictDoNothing();

  // 헤더 알림 배지(레이아웃)까지 갱신
  revalidatePath("/", "layout");
}

export async function markAllNotificationsRead() {
  const member = await getActiveMember();
  if (!member) return;

  const db = getDb();
  const visible = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(visibleTo(member));
  if (visible.length === 0) return;

  await db
    .insert(notificationReads)
    .values(visible.map((n) => ({ notificationId: n.id, memberId: member.id })))
    .onConflictDoNothing();

  revalidatePath("/", "layout");
}
