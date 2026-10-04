"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SendHorizonal, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const quickPrompts = [
  "우리 위원회에서 작년 행정사무감사 때 지적된 사항 정리해줘",
  "최근 처리된 조례안 결과 알려줘",
  "버스 준공영제 관련 회의록 발언 찾아줘",
];

export function DashboardAsk() {
  const router = useRouter();
  const [draft, setDraft] = useState("");

  function ask(question: string) {
    if (!question.trim()) return;
    router.push(`/assistant?q=${encodeURIComponent(question.trim())}`);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-muted-foreground" />
          무엇을 도와드릴까요?
        </CardTitle>
        <CardDescription>
          법령·조례, 회의록, 행정사무감사 지적사항을 찾아 출처와 함께 답합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(draft)}
            placeholder="예: 상하수도사업소가 작년에 지적받은 내용 알려줘"
            className="h-11"
          />
          <Button size="icon" className="h-11 w-11 shrink-0" onClick={() => ask(draft)} disabled={!draft.trim()}>
            <SendHorizonal />
            <span className="sr-only">질문 보내기</span>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <Badge
              key={prompt}
              variant="secondary"
              className="cursor-pointer px-3 py-1.5 font-normal hover:bg-secondary/70"
              onClick={() => ask(prompt)}
            >
              {prompt}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
