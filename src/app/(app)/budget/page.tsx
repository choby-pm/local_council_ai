"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

import { BudgetChart } from "@/components/chat/budget-chart";
import { ChatThread, type ThreadTurn } from "@/components/chat/chat-thread";
import { ConversationList, type ConversationItem } from "@/components/chat/conversation-list";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const budgetRows = [
  { dept: "행정안전국", item: "재난안전 통신망 유지보수", prev: 820, curr: 1180, ratio: 44 },
  { dept: "복지환경국", item: "청년 주거 지원 사업", prev: 1500, curr: 1620, ratio: 8 },
  { dept: "기획조정실", item: "주민참여예산 운영", prev: 210, curr: 205, ratio: -2 },
  { dept: "건설교통국", item: "노후 교량 정밀점검", prev: 340, curr: 690, ratio: 103 },
];

function OutlierAnswer(): ThreadTurn {
  return {
    role: "assistant",
    trust: "high",
    saveable: true,
    content: (
      <>
        <p>
          부서별 사업 예산을 비교한 결과, 아래 2건이 전년比 30% 이상 증가한 이상치로
          확인됩니다.
        </p>
        <div className="mt-3 overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>부서</TableHead>
                <TableHead>사업명</TableHead>
                <TableHead className="text-right">전년(백만원)</TableHead>
                <TableHead className="text-right">금년(백만원)</TableHead>
                <TableHead className="text-right">증감률</TableHead>
                <TableHead className="w-28">비교</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {budgetRows.map((row) => {
                const isOutlier = Math.abs(row.ratio) >= 30;
                const barWidth = Math.min(100, (row.curr / 1800) * 100);
                return (
                  <TableRow key={row.item}>
                    <TableCell className="font-medium">{row.dept}</TableCell>
                    <TableCell>{row.item}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.prev.toLocaleString()}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.curr.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={isOutlier ? "destructive" : "outline"} className="font-normal tabular-nums">
                        {row.ratio > 0 ? "+" : ""}
                        {row.ratio}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full", isOutlier ? "bg-destructive" : "bg-primary")}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          이상치 기준(±30%)은 잠정 기준이며 시범의회 데이터로 보정 예정입니다.
        </div>
      </>
    ),
  };
}

function TrendAnswer(): ThreadTurn {
  return {
    role: "assistant",
    trust: "medium",
    saveable: true,
    content: (
      <>
        <p>부서별 전년 대비 예산 추이입니다. 건설교통국·행정안전국의 증가폭이 두드러집니다.</p>
        <div className="mt-3 rounded-md border p-3">
          <BudgetChart />
        </div>
      </>
    ),
  };
}

const conversations: ConversationItem[] = [
  { id: "1", title: "행정안전국 예산 증감 이상치", updatedAt: "오늘 11:05" },
  { id: "2", title: "2026 3회 추경 부서별 비교", updatedAt: "09-19" },
  { id: "3", title: "예시: 검색 결과 없음", updatedAt: "09-12" },
  { id: "4", title: "예시: 일시적 오류", updatedAt: "09-10" },
];

const seeds: Record<string, ThreadTurn[]> = {
  "1": [
    { role: "user", content: "2026년도 3회 추경에서 전년 대비 증감이 큰 사업 찾아줘" },
    OutlierAnswer(),
  ],
  "2": [
    { role: "user", content: "부서별 예산 규모를 전년과 비교해서 보여줘" },
    TrendAnswer(),
  ],
  "3": [
    { role: "user", content: "문화체육국 축제 예산 증감 내역 알려줘" },
    { role: "assistant", kind: "empty" },
  ],
  "4": [
    { role: "user", content: "2025년도 결산서 세출 항목 전체 알려줘" },
    { role: "assistant", kind: "error" },
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

export default function BudgetPage() {
  const conv = useConversations(conversations);

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 md:h-[calc(100vh-6.5rem)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">예산·결산</h1>
        <p className="text-sm text-muted-foreground">
          증감·이상치를 한눈에 파악합니다 (전년比 ±30% 이상 잠정 이상치 기준).
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-hidden md:flex-row">
        <ConversationList
          items={conv.items}
          activeId={conv.activeId}
          onSelect={conv.setActiveId}
          onCreate={conv.create}
          onRename={conv.rename}
          onDelete={conv.remove}
        />
        <ChatThread
          key={conv.activeId}
          seed={seeds[conv.activeId] ?? []}
          placeholder="예: 건설교통국 노후 교량 점검 예산 증가 사유 알려줘"
        />
      </div>
    </div>
  );
}
