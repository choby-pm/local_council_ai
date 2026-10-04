import "server-only";

import { and, count, desc, eq, isNull, or, sql } from "drizzle-orm";

import { getDb } from "@/db";
import { notificationReads, notifications } from "@/db/schema";
import type { Member } from "@/lib/member";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  href: string | null;
  createdAt: Date;
  unread: boolean;
};

/** 회원에게 보이는 알림: 본인 개인 알림 + 전체 공지 + 소속 의회 공지 */
export function visibleTo(member: Pick<Member, "id" | "council">) {
  return or(
    eq(notifications.memberId, member.id),
    and(
      isNull(notifications.memberId),
      or(isNull(notifications.council), eq(notifications.council, member.council))
    )
  );
}

export async function getNotifications(member: Member, limit?: number): Promise<NotificationItem[]> {
  const query = getDb()
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      description: notifications.description,
      href: notifications.href,
      createdAt: notifications.createdAt,
      unread: sql<boolean>`${notificationReads.notificationId} is null`,
    })
    .from(notifications)
    .leftJoin(
      notificationReads,
      and(
        eq(notificationReads.notificationId, notifications.id),
        eq(notificationReads.memberId, member.id)
      )
    )
    .where(visibleTo(member))
    .orderBy(desc(notifications.createdAt), desc(notifications.id));

  return limit ? query.limit(limit) : query;
}

export async function getUnreadNotificationCount(member: Member) {
  const [row] = await getDb()
    .select({ n: count() })
    .from(notifications)
    .leftJoin(
      notificationReads,
      and(
        eq(notificationReads.notificationId, notifications.id),
        eq(notificationReads.memberId, member.id)
      )
    )
    .where(and(visibleTo(member), isNull(notificationReads.notificationId)));

  return row?.n ?? 0;
}
