"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, LogOut, Settings, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Member } from "@/lib/member";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { SessionExpiredDialog } from "@/components/layout/session-expired-dialog";
import { cn } from "@/lib/utils";
import { logout } from "@/app/(auth)/actions";

const initialNotifications = [
  { id: "1", title: "본회의 안건 상정 D-2", desc: "제315회 임시회 상정 예정 안건 3건", unread: true },
  { id: "2", title: "의정활동 보고서 마감 D-5", desc: "2026년 3분기 보고서 제출 기한", unread: true },
  { id: "3", title: "조례 갱신 안내", desc: "「OO시 주민참여 기본 조례」 개정 반영", unread: false },
];

const freshnessStates = [
  { label: "최신 반영일 2026-09-15 기준", className: "text-muted-foreground" },
  {
    label: "최신 반영일 2026-08-01 기준 · 반영 지연",
    className: "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400",
  },
  {
    label: "일부 자료 조회 실패 · 이전 결과 표시 중",
    className: "border-destructive/40 bg-destructive/5 text-destructive",
  },
] as const;

export function AppHeader({ member }: { member: Member }) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [freshnessIdx, setFreshnessIdx] = useState(0);
  const unreadCount = notifications.filter((n) => n.unread).length;
  const freshness = freshnessStates[freshnessIdx];

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />

      <button
        type="button"
        onClick={() => setFreshnessIdx((i) => (i + 1) % freshnessStates.length)}
        title="클릭하여 데이터 신뢰도 상태 미리보기"
        className={cn(
          "inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
          freshness.className
        )}
      >
        {freshness.label}
      </button>

      <SessionExpiredDialog />

      <div className="ml-auto flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell />
              {unreadCount > 0 && (
                <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" />
              )}
              <span className="sr-only">알림</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              알림
              <span className="text-xs font-normal text-muted-foreground">
                안읽음 {unreadCount}건
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">새 알림이 없습니다</p>
            ) : (
              notifications.map((n) => (
                <DropdownMenuItem
                  key={n.id}
                  className="flex flex-col items-start gap-0.5 py-2"
                  onSelect={() =>
                    setNotifications((prev) =>
                      prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x))
                    )
                  }
                >
                  <div className="flex w-full items-center gap-1.5">
                    {n.unread && <span className="size-1.5 rounded-full bg-destructive" />}
                    <span className="text-sm font-medium">{n.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{n.desc}</span>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="justify-center text-sm text-muted-foreground">
              <Link href="/notifications">알림 전체 보기</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 px-2">
              <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                <UserRound className="size-4" />
              </div>
              <span className="hidden text-sm font-medium sm:inline">{member.name} 의원</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col">
              <span className="text-sm font-medium">{member.name} 의원</span>
              <span className="text-xs font-normal text-muted-foreground">
                {[member.council, member.district].filter(Boolean).join(" · ")}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/mypage/account">
                <Settings />
                계정·소속 정보
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => logout()}
            >
              <LogOut />
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
