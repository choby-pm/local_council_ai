"use client";

import { useState } from "react";
import { CheckCircle2, Clock, RotateCw, Server, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type BatchStatus = "success" | "failed" | "delayed" | "running";

type Batch = {
  id: string;
  name: string;
  cycle: string;
  status: BatchStatus;
  lastRun: string;
  note: string;
};

const initialBatches: Batch[] = [
  { id: "b1", name: "법령 갱신 배치", cycle: "주간", status: "success", lastRun: "2026-09-21 03:00", note: "정상 완료 · 1,204건 색인" },
  { id: "b2", name: "조례 갱신 배치", cycle: "주간", status: "success", lastRun: "2026-09-21 03:20", note: "정상 완료 · 342건 색인" },
  { id: "b3", name: "시범의회 크롤링 배치", cycle: "월 1회", status: "failed", lastRun: "2026-09-01 04:00", note: "회의록 페이지 구조 변경 감지 — 배치 실패, 관리자 알림 발송됨" },
  { id: "b4", name: "색인 배치", cycle: "수집 직후", status: "delayed", lastRun: "2026-09-21 03:45", note: "외부 API rate limit로 다음 배치로 이월됨" },
];

const statusMeta: Record<BatchStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  success: { label: "성공", icon: CheckCircle2, className: "text-emerald-600" },
  failed: { label: "실패", icon: XCircle, className: "text-destructive" },
  delayed: { label: "지연", icon: Clock, className: "text-amber-600" },
  running: { label: "실행중", icon: RotateCw, className: "text-primary" },
};

export default function AdminBatchesPage() {
  const [batches, setBatches] = useState(initialBatches);

  function rerun(id: string) {
    setBatches((prev) => prev.map((b) => (b.id === id ? { ...b, status: "running" } : b)));
    window.setTimeout(() => {
      setBatches((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, status: "success", note: "수동 재실행 완료", lastRun: "방금 전" }
            : b
        )
      );
    }, 1300);
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Server className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">배치 모니터링</h1>
          <p className="text-sm text-muted-foreground">관리자 전용 — 배치 상태, 실패 로그, 수동 재실행</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">배치 목록</CardTitle>
          <CardDescription>실행 중 중복 락(lock) 처리가 적용됩니다</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {batches.map((b, i) => {
            const meta = statusMeta[b.status];
            const Icon = meta.icon;
            return (
              <div
                key={b.id}
                className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${i === 0 ? "pt-0" : ""}`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 size-4 shrink-0 ${meta.className} ${b.status === "running" ? "animate-spin" : ""}`} />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium">{b.name}</p>
                      <Badge variant="outline" className="font-normal">
                        {b.cycle}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{b.lastRun}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{b.note}</p>
                  </div>
                </div>
                {(b.status === "failed" || b.status === "delayed") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 gap-1.5 self-start sm:self-center"
                    onClick={() => rerun(b.id)}
                  >
                    <RotateCw className="size-3.5" />
                    수동 재실행
                  </Button>
                )}
                {b.status === "running" && (
                  <Badge variant="outline" className="shrink-0 self-start font-normal sm:self-center">
                    재실행 중...
                  </Badge>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Separator />
      <p className="text-xs text-muted-foreground">
        외부 API 스펙 변경은 응답값 검증 로직으로 자동 감지되며, 감지 시 배치는 실패 처리되고 관리자에게 알림이 발송됩니다.
      </p>
    </div>
  );
}
