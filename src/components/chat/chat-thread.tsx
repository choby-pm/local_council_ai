"use client";

import { useEffect, useState } from "react";
import { SendHorizonal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AnswerUnavailable } from "@/components/chat/answer-unavailable";
import { AssistantMessage, UserMessage } from "@/components/chat/messages";
import { EmptyResult, ErrorState } from "@/components/chat/state-panels";
import { renderWithCitations, type CitationSource } from "@/components/chat/render-citations";
import { SourceList } from "@/components/chat/source-list";
import type { TrustLevel } from "@/components/chat/trust-badge";

export type DbMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  trustLevel: TrustLevel | null;
  kind: "normal" | "unavailable" | "empty" | "error";
  sources: CitationSource[] | null;
};

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

function MessageView({ message }: { message: DbMessage }) {
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
        <ErrorState />
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
  const [messages, setMessages] = useState<DbMessage[]>(initialMessages);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

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
      if (!res.ok) throw new Error("request failed");
      const data = await res.json();

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
      setMessages((prev) => [
        ...prev,
        { id: `error-${Date.now()}`, role: "assistant", content: "", trustLevel: null, kind: "error", sources: null },
      ]);
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
        {messages.map((m) => (
          <MessageView key={m.id} message={m} />
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
          disabled={loading}
        />
        <Button size="icon" className="h-11 w-11 shrink-0" onClick={() => handleSend()} disabled={loading}>
          <SendHorizonal />
          <span className="sr-only">질문 보내기</span>
        </Button>
      </div>
    </div>
  );
}
