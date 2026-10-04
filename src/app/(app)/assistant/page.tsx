"use client";

import { useSearchParams } from "next/navigation";

import { ChatMenuPanel } from "@/components/chat/chat-menu-panel";

// 법령·조례 검색과 회의·안건을 합친 화면. 에이전트가 질문에 맞춰 법령 문서·회의록·행감 지적사항 도구를 고른다.
export default function AssistantPage() {
  const searchParams = useSearchParams();
  const initialQuestion = searchParams.get("q") ?? undefined;

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 md:h-[calc(100vh-6.5rem)]">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI 비서</h1>
        <p className="text-sm text-muted-foreground">
          법령·조례, 회의록, 행정사무감사 지적사항을 찾아 출처와 함께 답합니다.
        </p>
      </div>

      <ChatMenuPanel
        menu="assistant"
        placeholder="예: 버스정책과가 작년 행정사무감사에서 지적받은 내용 알려줘"
        initialQuestion={initialQuestion}
      />
    </div>
  );
}
