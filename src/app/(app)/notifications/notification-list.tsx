"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Calendar, Eye, FileText, FileWarning, Gavel, Scale, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  NOTIFICATION_TYPE_LABELS,
  isNotificationType,
  type NotificationType,
} from "@/lib/notification-types";
import { cn } from "@/lib/utils";

import { markAllNotificationsRead, markNotificationRead } from "./actions";

export type NotificationListItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  href: string | null;
  unread: boolean;
  time: string;
};

const typeIcon: Record<NotificationType, LucideIcon> = {
  agenda: Gavel,
  meeting: FileText,
  law: Scale,
  report: Calendar,
  data: FileWarning,
  watch: Eye,
};

const filters: { value: "all" | NotificationType; label: string }[] = [
  { value: "all", label: "전체" },
  ...Object.entries(NOTIFICATION_TYPE_LABELS).map(([value, label]) => ({
    value: value as NotificationType,
    label,
  })),
];

export function NotificationList({ items }: { items: NotificationListItem[] }) {
  const [filter, setFilter] = useState<"all" | NotificationType>("all");
  // 서버 재검증 결과가 오기 전에도 클릭 즉시 읽음으로 보이도록 로컬에 기록
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [allPending, startAll] = useTransition();

  const list = useMemo(
    () =>
      items
        .map((n) => ({ ...n, unread: n.unread && !readIds.has(n.id) }))
        .filter((n) => filter === "all" || n.type === filter),
    [items, readIds, filter]
  );
  const unreadCount = items.filter((n) => n.unread && !readIds.has(n.id)).length;

  function markRead(id: string) {
    setReadIds((prev) => new Set(prev).add(id));
    void markNotificationRead(id);
  }

  function markAll() {
    setReadIds(new Set(items.map((n) => n.id)));
    startAll(() => markAllNotificationsRead());
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {filters.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? "default" : "outline"}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-muted-foreground"
          onClick={markAll}
          disabled={unreadCount === 0 || allPending}
        >
          모두 읽음 처리
        </Button>
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y p-0">
          {list.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {items.length === 0 ? "아직 받은 알림이 없습니다" : "해당 유형의 알림이 없습니다"}
            </p>
          )}
          {list.map((n) => {
            const Icon = isNotificationType(n.type) ? typeIcon[n.type] : Bell;
            const body = (
              <>
                <div
                  className={cn(
                    "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                    n.unread ? "bg-primary/10" : "bg-muted"
                  )}
                >
                  <Icon className={cn("size-4", n.unread ? "text-primary" : "text-muted-foreground")} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {n.unread && <span className="size-1.5 shrink-0 rounded-full bg-destructive" />}
                    <p className="text-sm font-medium">{n.title}</p>
                    {isNotificationType(n.type) && (
                      <Badge variant="outline" className="font-normal text-muted-foreground">
                        {NOTIFICATION_TYPE_LABELS[n.type]}
                      </Badge>
                    )}
                  </div>
                  {n.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
              </>
            );
            const className = "flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50";

            return n.href ? (
              <Link key={n.id} href={n.href} onClick={() => markRead(n.id)} className={className}>
                {body}
              </Link>
            ) : (
              <button key={n.id} type="button" onClick={() => markRead(n.id)} className={className}>
                {body}
              </button>
            );
          })}
        </CardContent>
      </Card>
    </>
  );
}
