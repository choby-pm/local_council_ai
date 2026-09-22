"use client";

import { useState } from "react";

import { ChatThread, type ThreadTurn } from "@/components/chat/chat-thread";
import { ConversationList, type ConversationItem } from "@/components/chat/conversation-list";
import { IndexingExcludedNotice, RateLimitNotice } from "@/components/chat/state-panels";
import { SourceCitation, type Source } from "@/components/chat/source-citation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ordinanceSources: Source[] = [
  {
    label: "OO시",
    title: "OO시 주민참여 기본 조례 제12조",
    meta: "OO시의회 · 2025-03-12 개정",
    excerpt: "시장은 주민참여예산위원회의 심의 결과를 예산안에 반영하도록 노력하여야 한다.",
  },
  {
    label: "상위법",
    title: "지방자치법 제27조의2",
    meta: "법률 · 2024-01-16 시행",
    excerpt: "지방자치단체는 예산 편성 등 예산 과정에 주민을 참여하게 할 수 있다.",
  },
];

const compareRows = [
  { region: "OO광역시(우리 시)", name: "주민참여 기본 조례", scope: "예산편성 전 과정", penalty: "없음", diff: "기준" as const },
  { region: "△△광역시", name: "주민참여 기본 조례", scope: "예산편성 · 집행", penalty: "없음", diff: "변경" as const },
  { region: "□□시", name: "주민참여예산제 운영 조례", scope: "예산편성 전 과정", penalty: "이행실적 공표", diff: "신설" as const },
];

const diffBadge: Record<string, string> = {
  기준: "bg-muted text-muted-foreground",
  신설: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  변경: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  삭제: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
};

function ComparisonAnswer(): ThreadTurn {
  return {
    role: "assistant",
    trust: "high",
    saveable: true,
    footer: <IndexingExcludedNotice />,
    content: (
      <>
        <p>
          「OO시 주민참여 기본 조례」<SourceCitation index={1} source={ordinanceSources[0]} />
          는 상위법인 지방자치법 제27조의2<SourceCitation index={2} source={ordinanceSources[1]} />
          에 근거하고 있으며, 유사 자치단체 3곳의 조례를 비교하면 아래와 같습니다. 우리 시 대비
          차이가 있는 항목은 색으로 표시했습니다.
        </p>
        <div className="mt-3 overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>지자체</TableHead>
                <TableHead>조례명</TableHead>
                <TableHead>적용 범위</TableHead>
                <TableHead>미이행 제재</TableHead>
                <TableHead>구분</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compareRows.map((row) => (
                <TableRow key={row.region}>
                  <TableCell className="font-medium">{row.region}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.scope}</TableCell>
                  <TableCell>{row.penalty}</TableCell>
                  <TableCell>
                    <Badge className={diffBadge[row.diff]}>{row.diff}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </>
    ),
  };
}

const ordinanceConversations: ConversationItem[] = [
  { id: "1", title: "주민참여예산 조례 개정 근거", updatedAt: "오늘 10:21" },
  { id: "2", title: "청년 주거 지원 조례 제정 현황", updatedAt: "어제 16:02" },
  { id: "3", title: "예시: 검색 결과 없음", updatedAt: "09-17" },
  { id: "4", title: "예시: 일시적 오류", updatedAt: "09-16" },
];

const ordinanceSeeds: Record<string, ThreadTurn[]> = {
  "1": [
    { role: "user", content: "우리 시 주민참여예산 조례 개정 근거가 될 만한 전국 사례 비교해줘" },
    ComparisonAnswer(),
    { role: "user", content: "미이행 시 제재 조항을 신설한 조례의 실제 효과 사례도 있어?" },
    { role: "assistant", kind: "unavailable", relatedLinkLabel: "□□시 조례" },
  ],
  "2": [
    { role: "user", content: "최근 3년간 청년 주거 지원 조례 제정 현황 알려줘" },
    {
      role: "assistant",
      trust: "medium",
      saveable: true,
      footer: <RateLimitNotice />,
      content: "최근 3년간 17개 광역자치단체 중 11곳이 청년 주거 지원 조례를 신규 제정했습니다.",
    },
  ],
  "3": [
    { role: "user", content: "OO시 반려동물 등록 조례 위반 처벌 조항 알려줘" },
    { role: "assistant", kind: "empty" },
  ],
  "4": [
    { role: "user", content: "지방자치법 제27조 관련 최신 판례 알려줘" },
    { role: "assistant", kind: "error" },
  ],
};

const statuteConversations: ConversationItem[] = [
  { id: "1", title: "지방자치법상 주민참여예산 조문", updatedAt: "오늘 09:10" },
];

const statuteSeeds: Record<string, ThreadTurn[]> = {
  "1": [
    { role: "user", content: "지방자치법상 주민참여예산 관련 조문 알려줘" },
    {
      role: "assistant",
      trust: "high",
      saveable: true,
      content: (
        <>
          지방자치법 제27조의2<SourceCitation index={1} source={ordinanceSources[1]} />
          는 지방자치단체가 예산 편성 등 예산 과정에 주민을 참여시킬 수 있다고 규정하며, 구체적
          절차는 시행령 제46조에서 정하고 있습니다.
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

export default function LawsPage() {
  const ordinance = useConversations(ordinanceConversations);
  const statute = useConversations(statuteConversations);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 md:h-[calc(100vh-6.5rem)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">법령·조례 검색</h1>
        <p className="text-sm text-muted-foreground">
          30초 내 근거자료 확보 — 모든 답변에는 출처가 함께 표시됩니다.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select defaultValue="all-period">
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="기간" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-period">전체 기간</SelectItem>
            <SelectItem value="1y">최근 1년</SelectItem>
            <SelectItem value="3y">최근 3년</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all-region">
          <SelectTrigger size="sm" className="w-36">
            <SelectValue placeholder="지역" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-region">전국</SelectItem>
            <SelectItem value="metro">광역시·도</SelectItem>
            <SelectItem value="basic">기초 시·군·구</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all-dept">
          <SelectTrigger size="sm" className="w-40">
            <SelectValue placeholder="소관부처" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-dept">전체 소관</SelectItem>
            <SelectItem value="admin">행정안전</SelectItem>
            <SelectItem value="welfare">보건복지</SelectItem>
            <SelectItem value="finance">기획재정</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="ordinance" className="flex flex-1 flex-col overflow-hidden">
        <TabsList>
          <TabsTrigger value="ordinance">조례</TabsTrigger>
          <TabsTrigger value="statute">법률·시행령</TabsTrigger>
        </TabsList>

        <TabsContent value="ordinance" className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row">
          <ConversationList
            items={ordinance.items}
            activeId={ordinance.activeId}
            onSelect={ordinance.setActiveId}
            onCreate={ordinance.create}
            onRename={ordinance.rename}
            onDelete={ordinance.remove}
          />
          <ChatThread
            key={ordinance.activeId}
            seed={ordinanceSeeds[ordinance.activeId] ?? []}
            placeholder="예: 최근 3년간 청년 주거 지원 조례 제정 현황 알려줘"
          />
        </TabsContent>

        <TabsContent value="statute" className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row">
          <ConversationList
            items={statute.items}
            activeId={statute.activeId}
            onSelect={statute.setActiveId}
            onCreate={statute.create}
            onRename={statute.rename}
            onDelete={statute.remove}
          />
          <ChatThread
            key={statute.activeId}
            seed={statuteSeeds[statute.activeId] ?? []}
            placeholder="예: 자치법규와 상위법 정합성 확인해줘"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
