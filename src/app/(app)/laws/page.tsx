"use client";

import { useSearchParams } from "next/navigation";

import { ChatMenuPanel } from "@/components/chat/chat-menu-panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function LawsPage() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get("q") ?? undefined;

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

        <TabsContent value="ordinance" className="flex flex-1 overflow-hidden">
          <ChatMenuPanel
            menu="laws"
            placeholder="예: 최근 3년간 청년 주거 지원 조례 제정 현황 알려줘"
            initialQuestion={initialQuestion}
          />
        </TabsContent>

        <TabsContent value="statute" className="flex flex-1 overflow-hidden">
          <ChatMenuPanel menu="laws" placeholder="예: 자치법규와 상위법 정합성 확인해줘" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
