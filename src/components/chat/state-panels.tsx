"use client";

import { useState } from "react";
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

export function ErrorState({ onRetry }: { onRetry?: () => void }) {
  const [retrying, setRetrying] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    window.setTimeout(() => {
      setRetrying(false);
      setFailed(true);
      onRetry?.();
    }, 900);
  };

  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 py-8 text-center">
      <WifiOff className="size-6 text-destructive" />
      <p className="text-sm font-medium text-destructive">
        {failed ? "재시도 후 답변이 반영되었습니다" : "일시적인 오류가 발생했습니다"}
      </p>
      {!failed && (
        <>
          <p className="text-xs text-muted-foreground">
            시스템 오류는 자동으로 1회 재시도됩니다. 계속 실패하면 잠시 후 다시 시도해주세요.
          </p>
          <Button size="sm" variant="outline" className="mt-1 gap-1.5" onClick={handleRetry} disabled={retrying}>
            <RotateCw className={retrying ? "size-3.5 animate-spin" : "size-3.5"} />
            {retrying ? "재시도 중..." : "다시 시도"}
          </Button>
        </>
      )}
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
