"use client";

import { useEffect, useState } from "react";
import { SendHorizonal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerUnavailable } from "@/components/chat/answer-unavailable";
import { AssistantMessage, UserMessage } from "@/components/chat/messages";
import { EmptyResult, ErrorState, LimitReachedNotice } from "@/components/chat/state-panels";
import { renderWithCitations, type CitationSource } from "@/components/chat/render-citations";
import { SourceList } from "@/components/chat/source-list";
import type { TrustLevel } from "@/components/chat/trust-badge";
import { cn } from "@/lib/utils";

export type DbMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  trustLevel: TrustLevel | null;
  kind: "normal" | "unavailable" | "empty" | "error";
  sources: CitationSource[] | null;
};

// "limit"은 DB에 저장하지 않는 화면 전용 안내(일일 질문 한도 초과)
type ThreadMessage = Omit<DbMessage, "kind"> & { kind: DbMessage["kind"] | "limit" };

type QuestionUsage = { used: number; limit: number | null };

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

function MessageView({ message, onRetry }: { message: ThreadMessage; onRetry?: () => void }) {
  if (message.role === "user") {
    return <UserMessage>{message.content}</UserMessage>;
  }
  if (message.kind === "unavailable") {
    return (
      <AssistantMessage trust="low" messageId={message.id}>
        <AnswerUnavailable />
      </AssistantMessage>
    );
  }
  if (message.kind === "empty") {
    return (
      <AssistantMessage className="max-w-full" messageId={message.id}>
        <EmptyResult />
      </AssistantMessage>
    );
  }
  if (message.kind === "error") {
    return (
      <AssistantMessage className="max-w-full" messageId={message.id}>
        <ErrorState description={message.content || undefined} onRetry={onRetry} />
      </AssistantMessage>
    );
  }
  if (message.kind === "limit") {
    return (
      <AssistantMessage className="max-w-full">
        <LimitReachedNotice message={message.content} />
      </AssistantMessage>
    );
  }
  return (
    <AssistantMessage
      trust={message.trustLevel ?? undefined}
      saveable
      messageId={message.id}
      footer={<SourceList sources={message.sources ?? []} />}
    >
      {renderWithCitations(message.content, message.sources ?? [])}
    </AssistantMessage>
  );
}

export function ChatThread({
  menu,
  conversationId,
  initialMessages,
  placeholder,
  onConversationCreated,
  autoSendQuestion,
}: {
  menu: "laws" | "meetings" | "budget";
  conversationId: string | null;
  initialMessages: DbMessage[];
  placeholder: string;
  onConversationCreated?: (conv: { id: string; title: string; updatedAt: string }) => void;
  autoSendQuestion?: string;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<QuestionUsage | null>(null);

  const limitReached = usage?.limit != null && usage.used >= usage.limit;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/chat")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.usage) setUsage(data.usage);
      })
      .catch(() => {
        // 남은 횟수 표시는 부가 정보 — 실패해도 채팅은 그대로 사용 가능
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function appendNotice(kind: "error" | "limit", content: string) {
    setMessages((prev) => [
      ...prev,
      { id: `${kind}-${Date.now()}`, role: "assistant", content, trustLevel: null, kind, sources: null },
    ]);
  }

  async function handleSend(override?: string) {
    const question = (override ?? draft).trim();
    if (!question || loading) return;
    if (!override) setDraft("");
    setMessages((prev) => [
      ...prev,
      { id: `pending-${Date.now()}`, role: "user", content: question, trustLevel: null, kind: "normal", sources: null },
    ]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeConversationId, menu, question }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        if (data?.code === "daily_limit") {
          // 서버에 저장되지 않은 질문이므로 말풍선을 거두고 입력창에 되돌려 둠
          setMessages((prev) => prev.filter((m) => !m.id.startsWith("pending-")));
          setDraft(question);
          if (data.usage) setUsage(data.usage);
          appendNotice("limit", data.error);
        } else {
          appendNotice("error", data?.error ?? "");
        }
        return;
      }

      if (data.usage) setUsage(data.usage);

      if (!activeConversationId) {
        setActiveConversationId(data.conversationId);
        onConversationCreated?.({
          id: data.conversationId,
          title: question.slice(0, 40),
          updatedAt: new Date().toISOString(),
        });
      }

      setMessages((prev) => {
        const withoutPending = prev.filter((m) => !m.id.startsWith("pending-"));
        return [
          ...withoutPending,
          { id: data.userMessage.id, role: "user", content: data.userMessage.content, trustLevel: null, kind: "normal", sources: null },
          {
            id: data.assistantMessage.id,
            role: "assistant",
            content: data.assistantMessage.content,
            trustLevel: data.assistantMessage.trustLevel,
            kind: data.assistantMessage.kind,
            sources: data.assistantMessage.sources,
          },
        ];
      });
    } catch {
      appendNotice("error", "네트워크 연결을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // 마운트 시 1회만 — 대시보드 빠른 질문 등에서 넘어온 질문을 자동으로 전송
    if (autoSendQuestion) queueMicrotask(() => handleSend(autoSendQuestion));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto pr-1 pb-2">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-12 text-center text-muted-foreground">
            <Sparkles className="size-5" />
            <p className="text-sm">새 대화를 시작해보세요</p>
          </div>
        )}
        {messages.map((m, i) => {
          // 마지막 오류 답변에만 재시도 제공 — 직전 사용자 질문을 다시 보냄
          const previous = messages[i - 1];
          const canRetry =
            m.kind === "error" && i === messages.length - 1 && previous?.role === "user" && !limitReached;
          return (
            <MessageView
              key={m.id}
              message={m}
              onRetry={canRetry ? () => handleSend(previous.content) : undefined}
            />
          );
        })}
        {loading && <LoadingBubble />}
      </div>

      <div className="flex flex-col gap-1.5 border-t pt-3">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder={limitReached ? "오늘 사용할 수 있는 질문을 모두 사용했습니다" : placeholder}
            className="h-11"
            disabled={loading || limitReached}
          />
          <Button
            size="icon"
            className="h-11 w-11 shrink-0"
            onClick={() => handleSend()}
            disabled={loading || limitReached}
          >
            <SendHorizonal />
            <span className="sr-only">질문 보내기</span>
          </Button>
        </div>
        {usage?.limit != null && (
          <p className={cn("text-right text-xs text-muted-foreground", limitReached && "text-destructive")}>
            오늘 남은 질문 {Math.max(usage.limit - usage.used, 0)} / {usage.limit}회
          </p>
        )}
      </div>
    </div>
  );
}
