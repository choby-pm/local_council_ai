"use client";

import { useEffect, useState } from "react";

import { ChatThread, type DbMessage } from "@/components/chat/chat-thread";
import { ConversationList, type ConversationItem } from "@/components/chat/conversation-list";
import { Skeleton } from "@/components/ui/skeleton";

type Menu = "laws" | "meetings" | "budget" | "assistant";

type ApiConversation = { id: string; title: string; updatedAt: string };
type ApiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  trustLevel: "high" | "medium" | "low" | null;
  kind: "normal" | "unavailable" | "empty" | "error";
  sources:
    | { index: number; documentId: string; sourceUrl: string | null; title: string; meta: string; excerpt: string }[]
    | null;
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
}: {
  menu: Menu;
  placeholder: string;
  initialQuestion?: string;
}) {
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/conversations?menu=${menu}`)
      .then((r) => r.json())
      .then((data: { conversations: ApiConversation[] }) => {
        if (cancelled) return;
        setItems(data.conversations.map((c) => ({ id: c.id, title: c.title, updatedAt: formatUpdatedAt(c.updatedAt) })));
        // 대시보드 빠른 질문 등으로 넘어온 질문이 있으면, 기존 대화를 이어가지 않고 새 대화로 시작
        if (data.conversations.length > 0 && !initialQuestion) setActiveId(data.conversations[0].id);
        setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu]);

  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLoadingMessages(true);
    });
    fetch(`/api/conversations/${activeId}/messages`)
      .then((r) => r.json())
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
          }))
        );
        setLoadingMessages(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  async function handleCreate() {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ menu }),
    });
    const data = await res.json();
    setItems((prev) => [{ id: data.conversation.id, title: data.conversation.title, updatedAt: "방금 전" }, ...prev]);
    setActiveId(data.conversation.id);
  }

  async function handleRename(id: string, title: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title } : i)));
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
  }

  async function handleDelete(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? "");
      return next;
    });
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
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
      {loadingMessages ? (
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
          onConversationCreated={(conv) => {
            setItems((prev) => [{ id: conv.id, title: conv.title, updatedAt: "방금 전" }, ...prev]);
            setActiveId(conv.id);
          }}
        />
      )}
    </div>
  );
}
