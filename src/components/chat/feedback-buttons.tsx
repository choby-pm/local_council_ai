"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DOWN_REASONS = ["정보 오류", "출처 불일치", "관련 없음", "기타"];

export function FeedbackButtons({ messageId }: { messageId?: string }) {
  const [picked, setPicked] = useState<"up" | "down" | null>(null);
  const [reasonSaved, setReasonSaved] = useState(false);

  async function sendFeedback(reaction: "up" | "down", reason?: string) {
    if (!messageId) return;
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, reaction, reason }),
      });
    } catch {
      // 피드백 저장 실패는 조용히 무시 — 답변 열람 자체를 막을 이유는 아님
    }
  }

  function handleUp() {
    const next = picked === "up" ? null : "up";
    setPicked(next);
    setReasonSaved(false);
    if (next === "up") sendFeedback("up");
  }

  function handleDown() {
    const next = picked === "down" ? null : "down";
    setPicked(next);
    setReasonSaved(false);
    if (next === "down" && !messageId) sendFeedback("down");
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(picked === "up" && "text-emerald-600")}
        onClick={handleUp}
      >
        <ThumbsUp className="size-3.5" />
        <span className="sr-only">도움이 됐어요</span>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(picked === "down" && "text-destructive")}
        onClick={handleDown}
      >
        <ThumbsDown className="size-3.5" />
        <span className="sr-only">부정확해요</span>
      </Button>
      {picked === "down" && !reasonSaved && (
        <span className="ml-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          사유:
          {DOWN_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              className="rounded border px-1.5 py-0.5 hover:bg-muted"
              onClick={() => {
                setReasonSaved(true);
                sendFeedback("down", r);
              }}
            >
              {r}
            </button>
          ))}
        </span>
      )}
      {picked === "down" && reasonSaved && (
        <span className="ml-1 text-xs text-muted-foreground">피드백 감사합니다</span>
      )}
    </div>
  );
}
