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

const quickPrompts: { text: string; menu: "laws" | "meetings" | "budget" }[] = [
  { text: "이번 회기 상정 안건 요약해줘", menu: "meetings" },
  { text: "최근 개정된 조례 알려줘", menu: "laws" },
  { text: "우리 의회 예산 이상 증감 항목 찾아줘", menu: "budget" },
];

export function DashboardAsk() {
  const router = useRouter();
  const [draft, setDraft] = useState("");

  function goToSearch(menu: "laws" | "meetings" | "budget", question: string) {
    if (!question.trim()) return;
    router.push(`/${menu}?q=${encodeURIComponent(question.trim())}`);
  }

  function handleSend() {
    goToSearch("laws", draft);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-muted-foreground" />
          무엇을 도와드릴까요?
        </CardTitle>
        <CardDescription>
          법령·조례, 회의·안건, 예산·결산, 의정활동 보고서 — 원하시는 주제를 바로 질문해보세요.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="예: 최근 3년간 청년 주거 지원 조례 제정 현황 알려줘"
            className="h-11"
          />
          <Button size="icon" className="h-11 w-11 shrink-0" onClick={handleSend} disabled={!draft.trim()}>
            <SendHorizonal />
            <span className="sr-only">질문 보내기</span>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <Badge
              key={prompt.text}
              variant="secondary"
              className="cursor-pointer px-3 py-1.5 font-normal hover:bg-secondary/70"
              onClick={() => goToSearch(prompt.menu, prompt.text)}
            >
              {prompt.text}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
