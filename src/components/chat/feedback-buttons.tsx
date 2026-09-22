"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FeedbackButtons() {
  const [picked, setPicked] = useState<"up" | "down" | null>(null);

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(picked === "up" && "text-emerald-600")}
        onClick={() => setPicked(picked === "up" ? null : "up")}
      >
        <ThumbsUp className="size-3.5" />
        <span className="sr-only">도움이 됐어요</span>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(picked === "down" && "text-destructive")}
        onClick={() => setPicked(picked === "down" ? null : "down")}
      >
        <ThumbsDown className="size-3.5" />
        <span className="sr-only">부정확해요</span>
      </Button>
      {picked === "down" && (
        <span className="ml-1 text-xs text-muted-foreground">
          사유를 선택해주세요: 정보 오류 · 출처 불일치 · 관련 없음 · 기타
        </span>
      )}
    </div>
  );
}
