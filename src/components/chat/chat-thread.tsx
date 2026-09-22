"use client";

import { type ReactNode, useState } from "react";
import { SendHorizonal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerUnavailable } from "@/components/chat/answer-unavailable";
import { AssistantMessage, UserMessage } from "@/components/chat/messages";
import { EmptyResult, ErrorState } from "@/components/chat/state-panels";
import type { TrustLevel } from "@/components/chat/trust-badge";

export type ThreadTurn =
  | { role: "user"; content: ReactNode }
  | {
      role: "assistant";
      kind?: "normal";
      trust?: TrustLevel;
      content: ReactNode;
      footer?: ReactNode;
      saveable?: boolean;
    }
  | { role: "assistant"; kind: "unavailable"; relatedLinkLabel?: string }
  | { role: "assistant"; kind: "empty" }
  | { role: "assistant"; kind: "error" };

function LoadingBubble() {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-3.5" />
      </div>
      <div className="flex w-64 flex-col gap-2 rounded-2xl rounded-tl-sm border bg-card px-3.5 py-3">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}

function TurnView({ turn }: { turn: ThreadTurn }) {
  if (turn.role === "user") {
    return <UserMessage>{turn.content}</UserMessage>;
  }
  if (turn.kind === "unavailable") {
    return (
      <AssistantMessage trust="low">
        <AnswerUnavailable relatedLinkLabel={turn.relatedLinkLabel} />
      </AssistantMessage>
    );
  }
  if (turn.kind === "empty") {
    return (
      <AssistantMessage className="max-w-full">
        <EmptyResult />
      </AssistantMessage>
    );
  }
  if (turn.kind === "error") {
    return (
      <AssistantMessage className="max-w-full">
        <ErrorState />
      </AssistantMessage>
    );
  }
  return (
    <AssistantMessage trust={turn.trust} saveable={turn.saveable} footer={turn.footer}>
      {turn.content}
    </AssistantMessage>
  );
}

export function ChatThread({
  seed,
  placeholder,
  onNewQuestion,
}: {
  seed: ThreadTurn[];
  placeholder: string;
  onNewQuestion?: (question: string) => ThreadTurn | ThreadTurn[];
}) {
  const [turns, setTurns] = useState<ThreadTurn[]>(seed);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSend() {
    const text = draft.trim();
    if (!text || loading) return;
    setDraft("");
    setTurns((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      const reply = onNewQuestion?.(text) ?? {
        role: "assistant" as const,
        trust: "medium" as const,
        saveable: true,
        content: (
          <>
            &quot;{text}&quot;에 대한 관련 자료를 종합해 답변을 준비했습니다. (프레임 목업
            단계이므로 실제 검색 결과 대신 예시 답변을 표시합니다.)
          </>
        ),
      };
      setTurns((prev) => [...prev, ...(Array.isArray(reply) ? reply : [reply])]);
    }, 900);
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto pr-1 pb-2">
        {turns.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-12 text-center text-muted-foreground">
            <Sparkles className="size-5" />
            <p className="text-sm">새 대화를 시작해보세요</p>
          </div>
        )}
        {turns.map((turn, i) => (
          <TurnView key={i} turn={turn} />
        ))}
        {loading && <LoadingBubble />}
      </div>

      <div className="flex gap-2 border-t pt-3">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={placeholder}
          className="h-11"
        />
        <Button size="icon" className="h-11 w-11 shrink-0" onClick={handleSend} disabled={loading}>
          <SendHorizonal />
          <span className="sr-only">질문 보내기</span>
        </Button>
      </div>
    </div>
  );
}
