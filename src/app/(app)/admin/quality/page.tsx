import { and, desc, eq, gte } from "drizzle-orm";
import { Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDb } from "@/db";
import { feedback, messages } from "@/db/schema";
import { modelLabel } from "@/lib/ai";

// 관리자 권한 검사는 admin/layout.tsx에서 한다.
// FDE "측정" 단계의 근거: 답변 품질(정상·답변불가·오류), 모델별 응답 시간, 의원 피드백을 한 화면에 모은다.
const PERIOD_DAYS = 30;

const KIND_LABEL: Record<string, string> = {
  normal: "정상 답변",
  unavailable: "답변불가(근거 부족)",
  empty: "결과 없음",
  error: "오류",
};

function pct(n: number, total: number) {
  return total === 0 ? "—" : `${Math.round((n / total) * 100)}%`;
}

function seconds(ms: number[]) {
  if (ms.length === 0) return "—";
  return `${(ms.reduce((a, b) => a + b, 0) / ms.length / 1000).toFixed(1)}초`;
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-card px-4 py-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-2xl font-semibold tabular-nums">{value}</span>
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

export default async function AdminQualityPage() {
  const now = new Date();
  const since = new Date(now.getTime() - PERIOD_DAYS * 24 * 60 * 60 * 1000);
  const db = getDb();

  const [answers, reactions] = await Promise.all([
    db
      .select({ kind: messages.kind, model: messages.model, latencyMs: messages.latencyMs })
      .from(messages)
      .where(and(eq(messages.role, "assistant"), gte(messages.createdAt, since))),
    db
      .select({
        reaction: feedback.reaction,
        reason: feedback.reason,
        createdAt: feedback.createdAt,
        content: messages.content,
        model: messages.model,
      })
      .from(feedback)
      .innerJoin(messages, eq(messages.id, feedback.messageId))
      .where(gte(feedback.createdAt, since))
      .orderBy(desc(feedback.createdAt)),
  ]);

  const total = answers.length;
  const normal = answers.filter((a) => a.kind === "normal").length;
  const latencies = answers.flatMap((a) => (a.latencyMs != null ? [a.latencyMs] : []));
  const ups = reactions.filter((r) => r.reaction === "up").length;
  const downs = reactions.filter((r) => r.reaction === "down");

  const kinds = Object.keys(KIND_LABEL).map((kind) => ({
    kind,
    count: answers.filter((a) => a.kind === kind).length,
  }));

  // 모델이 없는 답변(오류 등)은 "모델 미기록"으로 묶는다
  const modelIds = [...new Set(answers.map((a) => a.model ?? ""))];
  const byModel = modelIds
    .map((id) => {
      const rows = answers.filter((a) => (a.model ?? "") === id);
      const fb = reactions.filter((r) => (r.model ?? "") === id);
      return {
        id,
        label: id ? modelLabel(id) : "모델 미기록 (오류 등)",
        count: rows.length,
        normal: rows.filter((r) => r.kind === "normal").length,
        latency: seconds(rows.flatMap((r) => (r.latencyMs != null ? [r.latencyMs] : []))),
        up: fb.filter((r) => r.reaction === "up").length,
        down: fb.filter((r) => r.reaction === "down").length,
      };
    })
    .sort((a, b) => b.count - a.count);

  const reasonCounts = [...new Set(downs.map((d) => d.reason ?? "사유 없음"))]
    .map((reason) => ({ reason, count: downs.filter((d) => (d.reason ?? "사유 없음") === reason).length }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex items-center gap-2">
        <Activity className="size-5 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">품질 대시보드</h1>
          <p className="text-sm text-muted-foreground">관리자 전용 — 최근 {PERIOD_DAYS}일 AI 비서 답변 품질과 의원 피드백</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="답변 수" value={total.toLocaleString()} />
        <Stat label="정상 답변 비율" value={pct(normal, total)} hint="근거를 인용해 답한 비율" />
        <Stat label="평균 응답 시간" value={seconds(latencies)} hint={`${latencies.length}건 기준`} />
        <Stat label="좋아요 비율" value={pct(ups, ups + downs.length)} hint={`좋아요 ${ups} · 싫어요 ${downs.length}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">모델별</CardTitle>
          <CardDescription>무료 한도 자동 전환(D-29)으로 실제 답한 모델 기준입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {byModel.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">아직 답변이 없습니다</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>모델</TableHead>
                    <TableHead className="text-right">답변 수</TableHead>
                    <TableHead className="text-right">정상 답변</TableHead>
                    <TableHead className="text-right">평균 응답 시간</TableHead>
                    <TableHead className="text-right">좋아요 / 싫어요</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byModel.map((m) => (
                    <TableRow key={m.id || "none"}>
                      <TableCell className="font-medium">{m.label}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.count}</TableCell>
                      <TableCell className="text-right tabular-nums">{pct(m.normal, m.count)}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.latency}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {m.up} / {m.down}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">답변 유형</CardTitle>
            <CardDescription>답변불가가 많으면 데이터가 부족하다는 신호입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                {kinds.map((k) => (
                  <TableRow key={k.kind}>
                    <TableCell>{KIND_LABEL[k.kind]}</TableCell>
                    <TableCell className="text-right tabular-nums">{k.count}</TableCell>
                    <TableCell className="w-16 text-right text-muted-foreground tabular-nums">{pct(k.count, total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">싫어요 사유</CardTitle>
            <CardDescription>&quot;정보 오류·출처 불일치&quot;는 근거 신뢰도 문제입니다.</CardDescription>
          </CardHeader>
          <CardContent>
            {reasonCounts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">싫어요 피드백이 없습니다</p>
            ) : (
              <Table>
                <TableBody>
                  {reasonCounts.map((r) => (
                    <TableRow key={r.reason}>
                      <TableCell>{r.reason}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">최근 싫어요 답변</CardTitle>
          <CardDescription>개선 대상을 찾는 출발점입니다 (최근 10건).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col divide-y">
          {downs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">싫어요 피드백이 없습니다</p>
          ) : (
            downs.slice(0, 10).map((d, i) => (
              <div key={i} className="flex flex-col gap-1 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{d.createdAt.toISOString().slice(0, 10)}</span>
                  <span>· {d.model ? modelLabel(d.model) : "모델 미기록"}</span>
                  <Badge variant="outline" className="font-normal">
                    {d.reason ?? "사유 없음"}
                  </Badge>
                </div>
                <p className="line-clamp-2 text-muted-foreground">{d.content}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
