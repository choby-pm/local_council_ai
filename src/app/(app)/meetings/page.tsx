"use client";

import { useState } from "react";

import { ChatThread, type ThreadTurn } from "@/components/chat/chat-thread";
import { ConversationList, type ConversationItem } from "@/components/chat/conversation-list";
import { SourceCitation, type Source } from "@/components/chat/source-citation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const meetingSources: Source[] = [
  {
    label: "회의록",
    title: "제314회 정례회 제3차 본회의 회의록",
    meta: "2026-09-10 · 행정안전위원회",
    excerpt: "재난안전관리 조례 제9조 관련 김OO 의원 질의 및 담당관 답변 요지",
  },
];

const historyConversations: ConversationItem[] = [
  { id: "1", title: "재난안전관리 조례 질의응답 이력", updatedAt: "오늘 09:40" },
  { id: "2", title: "예시: 검색 결과 없음", updatedAt: "09-14" },
];

const historySeeds: Record<string, ThreadTurn[]> = {
  "1": [
    { role: "user", content: "재난안전관리 조례 관련 과거 질의응답 이력 찾아줘" },
    {
      role: "assistant",
      trust: "high",
      saveable: true,
      content: (
        <>
          <p>
            제314회 정례회 본회의<SourceCitation index={1} source={meetingSources[0]} />
            에서 재난안전관리 조례 제9조(민간 협력체계 구축)와 관련해 김OO 의원이 예산 집행
            실적을 질의했고, 담당관은 2026년 상반기 집행률 62%로 답변했습니다.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="font-normal">본회의</Badge>
            <Badge variant="outline" className="font-normal">행정안전위원회</Badge>
            <Badge variant="outline" className="font-normal">2026-09-10</Badge>
          </div>
        </>
      ),
    },
  ],
  "2": [
    { role: "user", content: "동물복지 조례 관련 질의응답 있었어?" },
    { role: "assistant", kind: "empty" },
  ],
};

const analysisConversations: ConversationItem[] = [
  { id: "1", title: "제315회 임시회 상정 안건 쟁점", updatedAt: "어제 14:15" },
];

const analysisSeeds: Record<string, ThreadTurn[]> = {
  "1": [
    { role: "user", content: "이번 임시회 상정 예정인 지방보조금 관리 조례 개정안 쟁점 정리해줘" },
    {
      role: "assistant",
      trust: "medium",
      saveable: true,
      content: (
        <>
          <p className="font-medium">핵심 쟁점 3가지</p>
          <ol className="mt-1 list-decimal space-y-1 pl-4">
            <li>보조금 부정수급 환수 절차 강화 — 반대 측은 소급 적용 위헌 소지 우려</li>
            <li>민간단체 보조금 상한액 조정 — 형평성 논란</li>
            <li>정산보고 주기 단축(연 1회 → 반기 1회) — 행정부담 증가 우려</li>
          </ol>
        </>
      ),
    },
  ],
};

function useConversations(initial: ConversationItem[]) {
  const [items, setItems] = useState(initial);
  const [activeId, setActiveId] = useState(initial[0]?.id ?? "");

  function create() {
    const id = crypto.randomUUID();
    setItems((prev) => [{ id, title: "새 대화", updatedAt: "방금 전" }, ...prev]);
    setActiveId(id);
  }
  function rename(id: string, title: string) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, title } : i)));
  }
  function remove(id: string) {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? "");
      return next;
    });
  }

  return { items, activeId, setActiveId, create, rename, remove };
}

export default function MeetingsPage() {
  const history = useConversations(historyConversations);
  const analysis = useConversations(analysisConversations);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 md:h-[calc(100vh-6.5rem)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">회의·안건</h1>
        <p className="text-sm text-muted-foreground">
          과거 유사 사례 누락 없이 검색하고, 상정 전 쟁점 파악 시간을 단축합니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select defaultValue="all-period">
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="기간" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-period">전체 기간</SelectItem>
            <SelectItem value="6m">최근 6개월</SelectItem>
            <SelectItem value="1y">최근 1년</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all-committee">
          <SelectTrigger size="sm" className="w-44">
            <SelectValue placeholder="상임위" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-committee">전체 상임위</SelectItem>
            <SelectItem value="admin">행정안전위원회</SelectItem>
            <SelectItem value="welfare">복지환경위원회</SelectItem>
            <SelectItem value="budget">예산결산특별위원회</SelectItem>
          </SelectContent>
        </Select>
        <Input placeholder="키워드 검색" className="h-8 w-40 text-sm" />
      </div>

      <Tabs defaultValue="history" className="flex flex-1 flex-col overflow-hidden">
        <TabsList>
          <TabsTrigger value="history">이력조회</TabsTrigger>
          <TabsTrigger value="analysis">안건분석</TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row">
          <ConversationList
            items={history.items}
            activeId={history.activeId}
            onSelect={history.setActiveId}
            onCreate={history.create}
            onRename={history.rename}
            onDelete={history.remove}
          />
          <ChatThread
            key={history.activeId}
            seed={historySeeds[history.activeId] ?? []}
            placeholder="예: 지난 회기 주민참여예산 관련 발언 모아줘"
          />
        </TabsContent>

        <TabsContent value="analysis" className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row">
          <ConversationList
            items={analysis.items}
            activeId={analysis.activeId}
            onSelect={analysis.setActiveId}
            onCreate={analysis.create}
            onRename={analysis.rename}
            onDelete={analysis.remove}
          />
          <ChatThread
            key={analysis.activeId}
            seed={analysisSeeds[analysis.activeId] ?? []}
            placeholder="예: 이 안건과 유사한 타 시도 조례 개정 사례 있어?"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
