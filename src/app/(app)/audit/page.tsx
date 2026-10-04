import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, Info } from "lucide-react";
import { eq } from "drizzle-orm";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDb } from "@/db";
import { auditDrafts } from "@/db/schema";
import { getQuestionCandidates, type QuestionCandidate } from "@/lib/audit";
import { getLinkedCouncilMember } from "@/lib/council-members";
import { getActiveMember } from "@/lib/member";

import type { DraftKind } from "./actions";
import { CandidateCard, type CandidateView } from "./candidate-card";

const TOP_N = 5;

function toView(c: QuestionCandidate, savedDrafts: Map<string, DraftKind[]>): CandidateView {
  const f = c.finding;
  return {
    id: f.id,
    year: f.year,
    department: f.department,
    project: f.project,
    actionType: f.actionType,
    finding: f.finding,
    request: f.request,
    page: f.page,
    sourceTitle: f.sourceTitle,
    sourceUrl: f.sourceUrl,
    signals: c.signals.map(({ kind, label, detail }) => ({ kind, label, detail })),
    history: c.history.map((h) => ({
      year: h.year,
      project: h.project,
      finding: h.finding,
      page: h.page,
      sourceUrl: h.sourceUrl,
    })),
    savedDrafts: savedDrafts.get(f.id) ?? [],
  };
}

function Notice({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{children}</CardDescription>
      </CardHeader>
      {action && <CardContent>{action}</CardContent>}
    </Card>
  );
}

export default async function AuditPage() {
  const member = await getActiveMember();
  if (!member) redirect("/login");

  const linked = await getLinkedCouncilMember(member);
  const committee = member.committee;

  const header = (
    <div className="flex items-start gap-2">
      <ClipboardList className="mt-1 size-5 text-muted-foreground" />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">행정사무감사 준비</h1>
        <p className="text-sm text-muted-foreground">
          {committee
            ? `${committee} 소관 부서의 작년 지적사항 중 올해 다시 물어볼 만한 것을 골랐습니다`
            : "의원님 위원회의 작년 지적사항으로 올해 질의를 준비합니다"}
        </p>
      </div>
    </div>
  );

  if (!committee) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {header}
        <Notice
          title="먼저 의원 정보를 연결해주세요"
          action={
            <Button asChild>
              <Link href="/mypage/account">마이페이지에서 연결하기</Link>
            </Button>
          }
        >
          행정사무감사는 위원회별로 소관 부서를 감사합니다. 의원 명단에서 본인을 선택하면 위원회에 맞춰 준비합니다.
        </Notice>
      </div>
    );
  }

  const { latestYear, candidates, departments } = await getQuestionCandidates({
    council: member.council,
    committee,
    districtAreas: linked?.districtAreas ?? [],
  });

  if (latestYear === null) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {header}
        <Notice title="아직 준비 중인 위원회입니다">
          {committee}의 행정사무감사 결과보고서는 아직 정리되지 않았습니다. 현재는 건설교통위원회부터 제공합니다.
        </Notice>
      </div>
    );
  }

  const drafts = await getDb()
    .select({ findingId: auditDrafts.findingId, kind: auditDrafts.kind })
    .from(auditDrafts)
    .where(eq(auditDrafts.memberId, member.id));
  const savedDrafts = new Map<string, DraftKind[]>();
  for (const d of drafts) savedDrafts.set(d.findingId, [...(savedDrafts.get(d.findingId) ?? []), d.kind]);

  const top = candidates.slice(0, TOP_N);
  const repeatTotal = candidates.filter((c) => c.history.length > 0).length;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {header}

      <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-lg border bg-muted/40 px-4 py-3 text-sm">
        <span>
          기준 <strong>{latestYear}년도 행감 결과보고서</strong>
        </span>
        <span>
          지적 <strong>{candidates.length}건</strong> · 부서 <strong>{departments.length}곳</strong>
        </span>
        <span>
          이전 연도에도 지적된 사업 <strong>{repeatTotal}건</strong>
        </span>
        {linked?.district && (
          <span>
            지역구 <strong>{linked.district}</strong>
          </span>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">올해 다시 물어볼 만한 질의 후보</h2>
          <p className="text-sm text-muted-foreground">
            여러 해 반복된 지적, 지역구 관련, 시정요구 순으로 우선순위를 매겼습니다.
          </p>
        </div>
        {top.map((c, i) => (
          <CandidateCard key={c.finding.id} c={toView(c, savedDrafts)} rank={i + 1} />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-semibold">부서별로 보기</h2>
          <p className="text-sm text-muted-foreground">감사 일정에 맞춰 부서를 열어 준비하세요.</p>
        </div>
        <div className="flex flex-col divide-y rounded-lg border">
          {departments.map((d) => (
            <details key={d.department} className="group px-4 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium">
                <span>{d.department}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  지적 {d.candidates.length}건{d.repeatCount > 0 ? ` · 반복 ${d.repeatCount}건` : ""}
                </span>
              </summary>
              <div className="mt-3 flex flex-col gap-3">
                {d.candidates.map((c) => (
                  <CandidateCard key={c.finding.id} c={toView(c, savedDrafts)} />
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        지적사항은 의회 홈페이지에 공개된 행정사무감사 결과보고서를 AI로 정리한 것입니다. 각 카드의 원문 쪽수로 확인할 수 있습니다.
        반복 여부는 사업명 비교로 판단해 일부 다르게 묶일 수 있습니다.
      </p>
    </div>
  );
}
