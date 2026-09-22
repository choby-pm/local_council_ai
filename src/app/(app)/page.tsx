"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  FileText,
  SendHorizonal,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useMember } from "@/lib/member-context";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const quickPrompts: { text: string; menu: "laws" | "meetings" | "budget" }[] = [
  { text: "이번 회기 상정 안건 요약해줘", menu: "meetings" },
  { text: "최근 개정된 조례 알려줘", menu: "laws" },
  { text: "우리 의회 예산 이상 증감 항목 찾아줘", menu: "budget" },
];

const agendaNews = [
  {
    title: "제315회 임시회 본회의 안건 상정",
    meta: "행정안전위원회 · D-2",
    desc: "「OO시 지방보조금 관리 조례 일부개정조례안」 외 2건 상정 예정",
  },
  {
    title: "예산결산특별위원회 심사 일정 공지",
    meta: "예산결산특별위원회 · D-4",
    desc: "2026년도 3회 추가경정예산안 부서별 심사 일정 확정",
  },
];

const meetingNews = [
  {
    title: "제314회 정례회 회의록 공개",
    meta: "본회의 · 2026-09-10",
    desc: "주민참여예산 관련 5분 자유발언 3건 포함",
  },
  {
    title: "행정안전위원회 상임위 회의록 공개",
    meta: "행정안전위원회 · 2026-09-08",
    desc: "재난안전관리 조례 질의응답 요지 정리 완료",
  },
];

export default function DashboardPage() {
  const router = useRouter();
  const member = useMember();
  const [draft, setDraft] = useState("");

  function goToSearch(menu: "laws" | "meetings" | "budget", question: string) {
    if (!question.trim()) return;
    router.push(`/${menu}?q=${encodeURIComponent(question.trim())}`);
  }

  function handleSend() {
    goToSearch("laws", draft);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">안녕하세요, {member.name} 의원님</h1>
        <p className="text-sm text-muted-foreground">
          오늘 확인이 필요한 소식과 마감 일정을 정리했습니다.
        </p>
      </div>

      <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3">
        <AlertTriangle className="size-4 shrink-0 text-destructive" />
        <div className="flex-1">
          <p className="text-sm font-medium">2026년 3분기 의정활동 보고서 마감까지 D-5</p>
          <p className="text-xs text-muted-foreground">
            누적된 활동이력을 기반으로 초안을 생성할 수 있습니다.
          </p>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0">
          <Link href="/reports">
            초안 작성하러 가기
            <ArrowUpRight />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4 text-muted-foreground" />
              안건 소식
            </CardTitle>
            <CardDescription>상정 예정·진행 중인 안건 업데이트</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {agendaNews.map((item, i) => (
              <div key={item.title}>
                {i > 0 && <Separator className="mb-4" />}
                <Link href="/meetings" className="block rounded-md -m-1 p-1 transition-colors hover:bg-muted/50">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                  <Badge variant="outline" className="mt-2 font-normal text-muted-foreground">
                    {item.meta}
                  </Badge>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="size-4 text-muted-foreground" />
              회의록 소식
            </CardTitle>
            <CardDescription>새로 공개된 회의록·발언 요지</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {meetingNews.map((item, i) => (
              <div key={item.title}>
                {i > 0 && <Separator className="mb-4" />}
                <Link href="/meetings" className="block rounded-md -m-1 p-1 transition-colors hover:bg-muted/50">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                  <Badge variant="outline" className="mt-2 font-normal text-muted-foreground">
                    {item.meta}
                  </Badge>
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex-1" />

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
    </div>
  );
}
