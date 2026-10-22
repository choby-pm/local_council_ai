"use client";

import { useEffect, useState } from "react";
import { SendHorizonal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  // 답변을 만든 모델 ID (assistant 메시지만)
  model?: string | null;
};

export type ChatModelOption = { id: string; label: string; note: string };

const MODEL_STORAGE_KEY = "chat-model";

// 브라우저에 기억한 모델 — 저장소가 막혀 있어도 기본 모델로 동작
function loadSavedModel(options: ChatModelOption[]): string {
  const fallback = options.find((m) => m.note === "기본")?.id ?? options[0]?.id ?? "";
  try {
    const saved = window.localStorage.getItem(MODEL_STORAGE_KEY);
    return saved && options.some((m) => m.id === saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}

// "limit"은 DB에 저장하지 않는 화면 전용 안내(일일 질문 한도 초과)
// fallbackFrom: 고른 모델이 한도 초과라 다른 모델로 자동 전환된 경우 원래 고른 모델 (방금 받은 답변만)
type ThreadMessage = Omit<DbMessage, "kind"> & { kind: DbMessage["kind"] | "limit"; fallbackFrom?: string | null };

type StreamEvent =
  | {
      type: "meta";
      conversationId: string;
      userMessage: { id: string; content: string };
      usage?: QuestionUsage;
    }
  | { type: "progress"; label: string }
  | {
      type: "done";
      assistantMessage: {
        id: string;
        content: string;
        trustLevel: TrustLevel | null;
        kind: DbMessage["kind"];
        sources: CitationSource[] | null;
        model: string | null;
        fallbackFrom: string | null;
      };
    };

type QuestionUsage = { used: number; limit: number | null };

function LoadingBubble({ label }: { label: string | null }) {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Sparkles className="size-3.5" />
      </div>
      <div className="flex w-64 flex-col gap-2 rounded-2xl rounded-tl-sm border bg-card px-3.5 py-3">
        {label && <p className="animate-pulse text-xs text-muted-foreground">{label}…</p>}
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  );
}

function MessageView({
  message,
  onRetry,
  modelLabel,
}: {
  message: ThreadMessage;
  onRetry?: () => void;
  modelLabel?: string;
}) {
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
      exportable={{ text: message.content, sources: message.sources ?? [] }}
      messageId={message.id}
      footer={
        <>
          <SourceList sources={message.sources ?? []} />
          {modelLabel && <p className="text-[11px] text-muted-foreground">{modelLabel} 답변</p>}
        </>
      }
    >
      {renderWithCitations(message.content, message.sources ?? [])}
    </AssistantMessage>
  );
}

// 빈 대화에서 보여줄 추천 질문 (행감 질의 후보 등). 누르면 prompt를 그대로 보낸다
export type ChatSuggestion = { id: string; title: string; tags: string[]; detail: string; prompt: string };

export function ChatThread({
  menu,
  conversationId,
  initialMessages,
  placeholder,
  onConversationCreated,
  autoSendQuestion,
  suggestions = [],
  modelOptions = [],
}: {
  menu: "laws" | "meetings" | "budget" | "assistant";
  conversationId: string | null;
  initialMessages: DbMessage[];
  placeholder: string;
  onConversationCreated?: (conv: { id: string; title: string; updatedAt: string }) => void;
  autoSendQuestion?: string;
  suggestions?: ChatSuggestion[];
  modelOptions?: ChatModelOption[];
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initialMessages);
  const [activeConversationId, setActiveConversationId] = useState(conversationId);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<QuestionUsage | null>(null);
  const [model, setModel] = useState("");
  const [progress, setProgress] = useState<string | null>(null);

  useEffect(() => {
    // localStorage는 브라우저에서만 읽을 수 있어 마운트 후 반영
    queueMicrotask(() => setModel(loadSavedModel(modelOptions)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function chooseModel(id: string) {
    setModel(id);
    try {
      window.localStorage.setItem(MODEL_STORAGE_KEY, id);
    } catch {
      // 저장하지 못해도 이번 화면에서는 선택이 유지됨
    }
  }

  const labelOf = (id?: string | null) => modelOptions.find((m) => m.id === id)?.label ?? id ?? undefined;

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
        body: JSON.stringify({ conversationId: activeConversationId, menu, question, model: model || undefined }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        if (data?.code === "daily_limit") {
          // 서버에 저장되지 않은 질문이므로 말풍선을 거두고 입력창에 되돌려 둠
          setMessages((prev) => prev.filter((m) => !m.id.startsWith("pending-")));
          setDraft(question);
          if (data.usage) setUsage(data.usage);
          appendNotice("limit", data.error);
        } else {
          setMessages((prev) => prev.filter((m) => !m.id.startsWith("pending-")));
          setDraft(question);
          appendNotice("error", data?.error ?? "");
        }
        return;
      }

      // 서버가 NDJSON으로 보내는 진행 이벤트를 한 줄씩 읽는다: meta → progress* → done
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let createdConversationId: string | null = null;
      let completed = false;

      const handleEvent = (event: StreamEvent) => {
        if (event.type === "meta") {
          if (event.usage) setUsage(event.usage);
          if (!activeConversationId) {
            createdConversationId = event.conversationId;
            setActiveConversationId(event.conversationId);
          }
          setMessages((prev) => [
            ...prev.filter((m) => !m.id.startsWith("pending-")),
            { id: event.userMessage.id, role: "user", content: event.userMessage.content, trustLevel: null, kind: "normal", sources: null },
          ]);
        } else if (event.type === "progress") {
          setProgress(event.label);
        } else if (event.type === "done") {
          completed = true;
          const a = event.assistantMessage;
          setMessages((prev) => [
            ...prev,
            {
              id: a.id,
              role: "assistant",
              content: a.content,
              trustLevel: a.trustLevel,
              kind: a.kind,
              sources: a.sources,
              model: a.model,
              fallbackFrom: a.fallbackFrom,
            },
          ]);
        }
      };

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (line) handleEvent(JSON.parse(line) as StreamEvent);
        }
      }

      buffer += decoder.decode();
      if (buffer.trim()) handleEvent(JSON.parse(buffer) as StreamEvent);
      if (!completed) throw new Error("답변 수신이 중단되었습니다");

      // 새 대화는 답변을 다 받은 뒤 목록에 알린다 (먼저 알리면 화면이 다시 그려져 진행 중인 응답을 놓침)
      if (createdConversationId) {
        onConversationCreated?.({
          id: createdConversationId,
          title: question.slice(0, 40),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      appendNotice("error", "네트워크 연결을 확인한 뒤 다시 시도해주세요.");
    } finally {
      setLoading(false);
      setProgress(null);
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
        {messages.length === 0 && suggestions.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 py-12 text-center text-muted-foreground">
            <Sparkles className="size-5" />
            <p className="text-sm">새 대화를 시작해보세요</p>
          </div>
        )}
        {messages.length === 0 && suggestions.length > 0 && (
          <div className="flex flex-col gap-3 py-4">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="size-4 text-muted-foreground" />
                행정사무감사에서 다시 물어볼 만한 사안
              </p>
              <p className="text-xs text-muted-foreground">
                작년 행감 지적사항 중 여러 해 반복됐거나 시정을 요구한 것입니다. 누르면 근거를 찾아 질의 포인트와 질의서 초안을 만들어 드립니다.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleSend(s.prompt)}
                  disabled={loading || limitReached}
                  className="flex flex-col gap-1.5 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
                >
                  <span className="flex flex-wrap gap-1">
                    {s.tags.map((t) => (
                      <span key={t} className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        {t}
                      </span>
                    ))}
                  </span>
                  <span className="text-sm font-medium leading-snug">{s.title}</span>
                  <span className="line-clamp-2 text-xs text-muted-foreground">{s.detail}</span>
                </button>
              ))}
            </div>
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
              modelLabel={
                m.role === "assistant" && m.kind === "normal"
                  ? m.fallbackFrom
                    ? `${labelOf(m.model)} (${labelOf(m.fallbackFrom)} 한도 초과로 자동 전환)`
                    : labelOf(m.model)
                  : undefined
              }
            />
          );
        })}
        {loading && <LoadingBubble label={progress} />}
      </div>

      <div className="flex flex-col gap-1.5 border-t pt-3">
        <div className="flex gap-2">
          {modelOptions.length > 1 && (
            <Select value={model} onValueChange={chooseModel} disabled={loading}>
              <SelectTrigger className="h-11! w-36 shrink-0 text-xs sm:w-44" aria-label="답변 모델">
                <SelectValue placeholder="모델" />
              </SelectTrigger>
              <SelectContent>
                {modelOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                    <span className="text-muted-foreground"> · {m.note}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={limitReached ? "오늘 사용할 수 있는 질문을 모두 사용했습니다" : placeholder}
            aria-label="비서에게 질문"
            maxLength={1000}
            rows={2}
            className="min-h-11 max-h-40 resize-y"
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
