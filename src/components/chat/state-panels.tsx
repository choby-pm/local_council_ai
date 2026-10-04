"use client";

import { Clock, Inbox, RotateCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export function EmptyResult() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-8 text-center">
      <Inbox className="size-6 text-muted-foreground" />
      <p className="text-sm font-medium">검색 결과가 없습니다</p>
      <p className="text-xs text-muted-foreground">
        검색어를 바꾸거나 기간·지역 필터를 넓혀보세요.
      </p>
    </div>
  );
}

export function ErrorState({
  title = "일시적인 오류가 발생했습니다",
  description = "잠시 후 다시 시도해주세요.",
  onRetry,
}: {
  title?: string;
  description?: string;
  /** 없으면 다시 시도 버튼을 숨김 (예: 일일 한도 초과처럼 재시도해도 소용없는 경우) */
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-8 text-center">
      <WifiOff className="size-6 text-destructive" />
      <p className="text-sm font-medium text-destructive">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
      {onRetry && (
        <Button size="sm" variant="outline" className="mt-1 gap-1.5" onClick={onRetry}>
          <RotateCw className="size-3.5" />
          다시 시도
        </Button>
      )}
    </div>
  );
}

export function LimitReachedNotice({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-8 text-center dark:border-amber-900 dark:bg-amber-950">
      <Clock className="size-6 text-amber-600 dark:text-amber-400" />
      <p className="text-sm font-medium text-amber-800 dark:text-amber-300">오늘의 질문 한도에 도달했습니다</p>
      <p className="text-xs text-amber-700 dark:text-amber-400">{message}</p>
    </div>
  );
}

export function RateLimitNotice() {
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-400">
      <Clock className="mt-0.5 size-3.5 shrink-0" />
      일시적으로 최신 자료 조회가 지연되고 있습니다 · 캐시된 이전 결과를 표시합니다
    </div>
  );
}

export function IndexingExcludedNotice() {
  return (
    <p className="text-xs text-muted-foreground">
      ※ 일부 최신 자료는 처리 중이라 이번 결과에서 제외되었습니다
    </p>
  );
}
