"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Bell, Calendar, FileWarning, Gavel, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type NotificationType = "agenda" | "report" | "law" | "data";

type Notification = {
  id: string;
  type: NotificationType;
  icon: typeof Gavel;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
  href: string;
};

const typeLabel: Record<NotificationType, string> = {
  agenda: "안건",
  report: "보고서",
  law: "조례",
  data: "데이터",
};

const initialNotifications: Notification[] = [
  {
    id: "n1",
    type: "agenda",
    icon: Gavel,
    title: "본회의 안건 상정 D-2",
    desc: "제315회 임시회 상정 예정 안건 3건 — 「지방보조금 관리 조례 일부개정조례안」 외",
    time: "10분 전",
    unread: true,
    href: "/meetings",
  },
  {
    id: "n2",
    type: "report",
    icon: Calendar,
    title: "의정활동 보고서 마감 D-5",
    desc: "2026년 3분기 보고서 제출 기한이 다가오고 있습니다",
    time: "1시간 전",
    unread: true,
    href: "/reports",
  },
  {
    id: "n3",
    type: "law",
    icon: RefreshCw,
    title: "조례 갱신 안내",
    desc: "「OO시 주민참여 기본 조례」 개정 내용이 반영되었습니다",
    time: "어제",
    unread: false,
    href: "/laws",
  },
  {
    id: "n4",
    type: "data",
    icon: FileWarning,
    title: "데이터 반영 지연 안내",
    desc: "시범의회 회의록 배치가 지연되어 최신 반영일이 갱신되지 않았습니다",
    time: "3일 전",
    unread: false,
    href: "/admin/batches",
  },
];

const filters: { value: "all" | NotificationType; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "agenda", label: "안건" },
  { value: "report", label: "보고서" },
  { value: "law", label: "조례" },
  { value: "data", label: "데이터" },
];

export default function NotificationsPage() {
  const [items, setItems] = useState(initialNotifications);
  const [filter, setFilter] = useState<"all" | NotificationType>("all");

  const filtered = useMemo(
    () => items.filter((n) => filter === "all" || n.type === filter),
    [items, filter]
  );

  function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Bell className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">알림</h1>
          <p className="text-sm text-muted-foreground">안건 마감, 조례 갱신, 데이터 반영 지연 등을 모아봅니다</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
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
      </div>

      <Card>
        <CardContent className="flex flex-col divide-y p-0">
          {filtered.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">해당 유형의 알림이 없습니다</p>
          )}
          {filtered.map((n) => (
            <Link
              key={n.id}
              href={n.href}
              onClick={() => markRead(n.id)}
              className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-muted/50"
            >
              <div
                className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
                  n.unread ? "bg-primary/10" : "bg-muted"
                )}
              >
                <n.icon className={cn("size-4", n.unread ? "text-primary" : "text-muted-foreground")} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  {n.unread && <span className="size-1.5 shrink-0 rounded-full bg-destructive" />}
                  <p className="text-sm font-medium">{n.title}</p>
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {typeLabel[n.type]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.desc}</p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{n.time}</span>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
