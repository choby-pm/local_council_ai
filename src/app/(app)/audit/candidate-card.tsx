"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, FileQuestion, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { getOrCreateAuditDraft, type DraftKind } from "./actions";

export type CandidateView = {
  id: string;
  year: number;
  department: string;
  project: string | null;
  actionType: string | null;
  finding: string;
  request: string | null;
  page: number | null;
  sourceTitle: string;
  sourceUrl: string;
  signals: { kind: string; label: string; detail: string }[];
  history: { year: number; project: string | null; finding: string; page: number | null; sourceUrl: string }[];
  savedDrafts: DraftKind[];
};

const signalStyle: Record<string, string> = {
  repeat: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  district: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  corrective: "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
  budget: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
};

const draftLabel: Record<DraftKind, string> = {
  question: "질의서 초안",
  data_request: "자료요구서 초안",
};

export function CandidateCard({ c, rank }: { c: CandidateView; rank?: number }) {
  const [draftKind, setDraftKind] = useState<DraftKind | null>(null);
  const [drafts, setDrafts] = useState<Partial<Record<DraftKind, string>>>({});
  const [saved, setSaved] = useState<Set<DraftKind>>(new Set(c.savedDrafts));
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function open(kind: DraftKind, regenerate = false) {
    setDraftKind(kind);
    if (drafts[kind] && !regenerate) return;
    startTransition(async () => {
      const result = await getOrCreateAuditDraft(c.id, kind, regenerate);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDrafts((prev) => ({ ...prev, [kind]: result.content }));
      setSaved((prev) => new Set(prev).add(kind));
    });
  }

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const draft = draftKind ? drafts[draftKind] : undefined;

  return (
    <Card className="gap-3">
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {rank !== undefined && (
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {rank}
            </span>
          )}
          <span className="text-xs text-muted-foreground">{c.department}</span>
          {c.signals.map((s) => (
            <Badge key={s.kind} variant="outline" className={cn("font-normal", signalStyle[s.kind])} title={s.detail}>
              {s.label}
            </Badge>
          ))}
        </div>
        <h3 className="font-semibold leading-snug">{c.project ?? c.finding}</h3>
      </CardHeader>

      <CardContent className="flex flex-col gap-3 text-sm">
        <dl className="grid gap-1.5">
          <div>
            <dt className="inline font-medium">{c.year}년 지적 </dt>
            <dd className="inline text-muted-foreground">{c.finding}</dd>
          </div>
          {c.request && (
            <div>
              <dt className="inline font-medium">요구 </dt>
              <dd className="inline text-muted-foreground">{c.request}</dd>
            </div>
          )}
        </dl>

        {c.signals.length > 0 && (
          <ul className="flex flex-col gap-1 text-xs text-muted-foreground">
            {c.signals.map((s) => (
              <li key={s.kind}>· {s.detail}</li>
            ))}
          </ul>
        )}

        {c.history.length > 0 && (
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
            <p className="mb-1 font-medium">이전 연도 지적</p>
            <ul className="flex flex-col gap-1">
              {c.history.map((h, i) => (
                <li key={i} className="text-muted-foreground">
                  <a href={h.sourceUrl} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
                    {h.year}년{h.page ? ` ${h.page}쪽` : ""}
                  </a>{" "}
                  {h.project ? `${h.project} — ` : ""}
                  {h.finding}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant={draftKind === "question" ? "default" : "outline"} onClick={() => open("question")} disabled={pending}>
            <FileQuestion className="size-3.5" />
            질의서 초안{saved.has("question") ? " (저장됨)" : ""}
          </Button>
          <Button size="sm" variant={draftKind === "data_request" ? "default" : "outline"} onClick={() => open("data_request")} disabled={pending}>
            <FileText className="size-3.5" />
            자료요구서 초안{saved.has("data_request") ? " (저장됨)" : ""}
          </Button>
          <a
            href={c.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            원문 {c.page ? `${c.page}쪽` : "보기"}
            <ExternalLink className="size-3" />
          </a>
        </div>

        {draftKind && (pending || draft) && (
          <div className="rounded-md border">
            <div className="flex items-center justify-between border-b px-3 py-1.5">
              <span className="text-xs font-medium">{draftLabel[draftKind]}</span>
              {draft && !pending && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => copy(draft)} title="복사">
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7" onClick={() => open(draftKind, true)} title="다시 만들기">
                    <RefreshCw className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
            {pending ? (
              <p className="flex items-center gap-2 px-3 py-4 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                지적사항과 이전 연도 기록을 바탕으로 작성 중입니다…
              </p>
            ) : (
              <p className="whitespace-pre-wrap px-3 py-3 text-sm leading-relaxed">{draft}</p>
            )}
            <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
              AI가 작성한 초안입니다. 원문과 대조한 뒤 수정해 사용하세요.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
