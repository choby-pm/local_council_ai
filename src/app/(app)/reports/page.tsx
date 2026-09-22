"use client";

import { useState } from "react";
import { Check, Download, Pencil, RefreshCw, SendHorizonal, Sparkles, X } from "lucide-react";

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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

type Status = "접수됨" | "생성중" | "초안생성됨" | "검토중" | "완료" | "보류";

const statusStyle: Record<Status, string> = {
  접수됨: "bg-muted text-muted-foreground",
  생성중: "bg-muted text-muted-foreground",
  초안생성됨: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-400",
  검토중: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400",
  완료: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400",
  보류: "bg-muted text-muted-foreground",
};

type Section = { title: string; content: string; regenerating: boolean; editing: boolean };

const initialSections: Section[] = [
  { title: "주요 의정활동 요약", content: "본회의 발언 4건, 5분 자유발언 2건, 상임위 질의 7건을 수행했습니다.", regenerating: false, editing: false },
  { title: "조례 발의·개정", content: "「OO시 주민참여 기본 조례 일부개정조례안」을 대표발의했습니다.", regenerating: false, editing: false },
  { title: "예산·결산 심의", content: "2026년도 3회 추경 심사에서 재난안전 통신망 예산 44% 증액에 대해 질의했습니다.", regenerating: false, editing: false },
];

const regeneratedText = "(재생성됨) " ;

const historySeed = [
  { period: "2026년 2분기", status: "완료", date: "2026-07-05" },
  { period: "2026년 1분기", status: "완료", date: "2026-04-08" },
  { period: "2025년 연간", status: "완료", date: "2026-01-15" },
];

export default function ReportsPage() {
  const [status, setStatus] = useState<Status>("접수됨");
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [request, setRequest] = useState("");
  const [history, setHistory] = useState(historySeed);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const started = status !== "접수됨";
  const finalized = status === "완료" || status === "보류";

  function requestDraft() {
    if (!request.trim() || started) return;
    setStatus("생성중");
    window.setTimeout(() => {
      setStatus("초안생성됨");
      setSections(initialSections);
    }, 1100);
  }

  function regenerateSection(idx: number) {
    if (finalized) return;
    setStatus("검토중");
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, regenerating: true } : s)));
    window.setTimeout(() => {
      setSections((prev) =>
        prev.map((s, i) => (i === idx ? { ...s, regenerating: false, content: regeneratedText + s.content } : s))
      );
    }, 900);
  }

  function toggleEdit(idx: number) {
    if (finalized) return;
    setStatus("검토중");
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, editing: !s.editing } : s)));
  }

  function updateContent(idx: number, value: string) {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, content: value } : s)));
  }

  function finalize(result: "완료" | "보류") {
    setStatus(result);
    if (result === "완료") {
      setHistory((prev) => [{ period: "2026년 3분기", status: "완료", date: "2026-09-22" }, ...prev]);
    }
  }

  function reset() {
    setStatus("접수됨");
    setRequest("");
    setSections(initialSections);
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">의정활동 보고서</h1>
        <p className="text-sm text-muted-foreground">
          수정만 하면 되는 초안을 제공합니다. 완료/보류는 직접 확정합니다.
        </p>
      </div>

      {!bannerDismissed && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed bg-muted/40 px-4 py-3">
          <Sparkles className="size-4 shrink-0 text-muted-foreground" />
          <p className="flex-1 text-xs text-muted-foreground">
            활동이력이 더 많이 쌓일수록 초안 품질이 좋아집니다. 마이페이지에서 과거 이력을 추가해보세요.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href="/mypage/history">활동이력 입력하기</a>
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => setBannerDismissed(true)}>
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {!started && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">새 보고서 초안 요청</CardTitle>
            <CardDescription>요청 상태: <Badge className={statusStyle["접수됨"]}>접수됨</Badge></CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && requestDraft()}
              placeholder="예: 2026년 3분기 의정활동 보고서 초안 만들어줘"
              className="h-11"
            />
            <Button className="h-11 gap-1.5" onClick={requestDraft} disabled={!request.trim()}>
              <SendHorizonal className="size-4" />
              요청
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "생성중" && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="size-4 animate-pulse" />
              활동이력을 취합해 초안을 생성하고 있습니다...
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      )}

      {(status === "초안생성됨" || status === "검토중" || finalized) && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-base">2026년 3분기 의정활동 보고서</CardTitle>
              <CardDescription>2026-07-01 ~ 2026-09-30</CardDescription>
            </div>
            <Badge className={statusStyle[status]}>{status}</Badge>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {sections.map((s, i) => (
              <div key={s.title}>
                {i > 0 && <Separator className="mb-4" />}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.title}</p>
                    {s.regenerating ? (
                      <div className="mt-2 flex flex-col gap-1.5">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    ) : s.editing ? (
                      <Textarea
                        value={s.content}
                        onChange={(e) => updateContent(i, e.target.value)}
                        className="mt-1.5"
                        rows={3}
                        disabled={finalized}
                      />
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">{s.content}</p>
                    )}
                  </div>
                  {!finalized && !s.regenerating && (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => toggleEdit(i)}>
                        {s.editing ? <Check className="size-3.5" /> : <Pencil className="size-3.5" />}
                        <span className="sr-only">{s.editing ? "수정 완료" : "직접 수정"}</span>
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => regenerateSection(i)}>
                        <RefreshCw className="size-3.5" />
                        <span className="sr-only">이 구간 재생성</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <Separator />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="size-3.5" />
                  PDF 내보내기
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="size-3.5" />
                  DOCX 내보내기
                </Button>
              </div>
              {finalized ? (
                <Button variant="outline" size="sm" onClick={reset}>
                  새 보고서 시작
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => finalize("보류")}>
                    보류
                  </Button>
                  <Button size="sm" onClick={() => finalize("완료")}>
                    완료
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">보고서 이력</CardTitle>
          <CardDescription>분기·반기·연간 보고서를 다시 조회합니다</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {history.map((h, i) => (
            <div key={`${h.period}-${i}`} className="flex items-center justify-between py-2.5 text-sm">
              <span className="font-medium">{h.period}</span>
              <span className="text-muted-foreground">{h.date}</span>
              <Badge variant="outline" className="font-normal">
                {h.status}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
