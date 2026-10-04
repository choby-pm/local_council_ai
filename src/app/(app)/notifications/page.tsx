import { Bell } from "lucide-react";

import { getActiveMember } from "@/lib/member";
import { getNotifications } from "@/lib/notifications";
import { formatRelativeTime } from "@/lib/utils";

import { NotificationList } from "./notification-list";

export default async function NotificationsPage() {
  const member = await getActiveMember();
  const items = member ? await getNotifications(member) : [];
  const now = new Date();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Bell className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">알림</h1>
          <p className="text-sm text-muted-foreground">조례 처리 결과, 회의록 공개 등 새 소식을 모아봅니다</p>
        </div>
      </div>

      <NotificationList
        items={items.map((n) => ({
          id: n.id,
          type: n.type,
          title: n.title,
          description: n.description,
          href: n.href,
          unread: n.unread,
          // 상대 시간은 서버에서 계산해 넘김 — 클라이언트에서 다시 계산하면 하이드레이션 불일치 가능
          time: formatRelativeTime(n.createdAt, now),
        }))}
      />
    </div>
  );
}
