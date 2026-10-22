"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  ChatThread,
  type ChatModelOption,
  type ChatSuggestion,
  type DbMessage,
} from "@/components/chat/chat-thread";
import { ConversationList, type ConversationItem } from "@/components/chat/conversation-list";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/chat/state-panels";

type Menu = "laws" | "meetings" | "budget" | "assistant";

type ApiConversation = { id: string; title: string; updatedAt: string };

async function checkedResponse(response: Response) {
  if (response.status === 401 || response.status === 403) {
    throw new Error("로그인 상태와 이용 권한을 확인해주세요. 다시 로그인한 뒤 시도할 수 있습니다.");
  }
  if (!response.ok) throw new Error("대화를 불러오거나 변경하지 못했습니다. 다시 시도해주세요.");
  return response.json();
}
type ApiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  trustLevel: "high" | "medium" | "low" | null;
  kind: "normal" | "unavailable" | "empty" | "error";
  sources:
    | { index: number; documentId: string; sourceUrl: string | null; title: string; meta: string; excerpt: string }[]
    | null;
  model: string | null;
};

function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatMenuPanel({
  menu,
  placeholder,
  initialQuestion,
  suggestions = [],
  modelOptions = [],
}: {
  menu: Menu;
  placeholder: string;
  initialQuestion?: string;
  suggestions?: ChatSuggestion[];
  modelOptions?: ChatModelOption[];
}) {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const error = listError ?? messageError;
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/conversations?menu=${menu}`)
      .then(checkedResponse)
      .then((data: { conversations: ApiConversation[] }) => {
        if (cancelled) return;
        setItems(data.conversations.map((c) => ({ id: c.id, title: c.title, updatedAt: formatUpdatedAt(c.updatedAt) })));
        // 대시보드 빠른 질문 등으로 넘어온 질문이 있으면, 기존 대화를 이어가지 않고 새 대화로 시작
        // 추천 질문이 있으면 빈 대화로 시작해 추천을 먼저 보여준다 (이전 대화는 목록에서 열 수 있음)
        if (data.conversations.length > 0 && !initialQuestion && suggestions.length === 0) {
          setActiveId(data.conversations[0].id);
        }
        setListError(null);
      })
      .catch((err: Error) => { if (!cancelled) setListError(err.message); })
      .finally(() => { if (!cancelled) setLoadingList(false); });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu, retry]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoadingMessages(true);
    });
    fetch(`/api/conversations/${activeId}/messages`)
      .then(checkedResponse)
      .then((data: { messages: ApiMessage[] }) => {
        if (cancelled) return;
        setMessages(
          data.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            trustLevel: m.trustLevel,
            kind: m.kind,
            sources: m.sources,
            model: m.model,
          }))
        );
        setMessageError(null);
      })
      .catch((err: Error) => { if (!cancelled) setMessageError(err.message); })
      .finally(() => { if (!cancelled) setLoadingMessages(false); });
    return () => {
      cancelled = true;
    };
  }, [activeId, retry]);

  async function handleCreate() {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menu }),
      });
      const data = await checkedResponse(res);
      setItems((prev) => [{ id: data.conversation.id, title: data.conversation.title, updatedAt: "방금 전" }, ...prev]);
      setActiveId(data.conversation.id);
      setMessageError(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "대화를 만들지 못했습니다");
    }
  }

  async function handleRename(id: string, title: string) {
    try {
      const data = await checkedResponse(await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }));
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title: data.conversation.title } : i)));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "대화 이름을 변경하지 못했습니다");
    }
  }

  async function handleDelete(id: string) {
    try {
      await checkedResponse(await fetch(`/api/conversations/${id}`, { method: "DELETE" }));
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (id === activeId) setActiveId("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "대화를 삭제하지 못했습니다");
    }
  }

  if (loadingList) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-4">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-full w-full flex-1" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row">
      <ConversationList
        items={items}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      {error ? (
        <div className="flex-1 space-y-3">
          <ErrorState description={error} onRetry={() => setRetry((value) => value + 1)} />
          <a className="text-sm underline" href="/login">다시 로그인</a>
        </div>
      ) : loadingMessages ? (
        <div className="flex flex-1 flex-col gap-3 py-2">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-16 w-2/3 self-end" />
        </div>
      ) : (
        <ChatThread
          key={activeId || "new"}
          menu={menu}
          conversationId={activeId || null}
          initialMessages={activeId ? messages : []}
          placeholder={placeholder}
          autoSendQuestion={activeId ? undefined : initialQuestion}
          suggestions={suggestions}
          modelOptions={modelOptions}
          onConversationCreated={(conv) => {
            setItems((prev) => [{ id: conv.id, title: conv.title, updatedAt: "방금 전" }, ...prev]);
            setActiveId(conv.id);
          }}
        />
      )}
    </div>
  );
}
