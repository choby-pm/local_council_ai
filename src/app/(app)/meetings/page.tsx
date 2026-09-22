"use client";

import { useSearchParams } from "next/navigation";

import { ChatMenuPanel } from "@/components/chat/chat-menu-panel";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function MeetingsPage() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get("q") ?? undefined;

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

        <TabsContent value="history" className="flex flex-1 overflow-hidden">
          <ChatMenuPanel
            menu="meetings"
            placeholder="예: 지난 회기 주민참여예산 관련 발언 모아줘"
            initialQuestion={initialQuestion}
          />
        </TabsContent>

        <TabsContent value="analysis" className="flex flex-1 overflow-hidden">
          <ChatMenuPanel menu="meetings" placeholder="예: 이 안건과 유사한 타 시도 조례 개정 사례 있어?" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
