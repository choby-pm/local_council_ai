"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Landmark, SendHorizonal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MessageExport } from "@/components/chat/message-export";
import { SourceList } from "@/components/chat/source-list";
import { renderWithCitations, type CitationSource } from "@/components/chat/render-citations";
import { DEMO_QUESTIONS } from "@/lib/demo";

type DemoTurn = { question: string; answer: { text: string; sources: CitationSource[]; model: string } };

export function DemoExperience() {
  const [tab, setTab] = useState("assistant");
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<DemoTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ used: number; limit: number } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [turns]);

  async function send(question = draft) {
    const trimmed = question.trim().slice(0, 1000);
    if (!trimmed || loading) return;
    setLoading(true);
    setPendingQuestion(trimmed);
    setError(null);
    setDraft("");
    setTab("assistant");
    try {
      const history = turns.flatMap((turn) => [{ role: "user", content: turn.question }, { role: "assistant", content: turn.answer.text.slice(0, 2000) }]).slice(-6);
      const response = await fetch("/demo/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: trimmed, history }), signal: AbortSignal.timeout(85000) });
      const answer = await response.json();
      if (answer.usage) setUsage(answer.usage);
      if (!response.ok) throw new Error(answer.error ?? "AI 답변을 받지 못했습니다.");
      setTurns((current) => [...current, { question: trimmed, answer }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI 답변을 받지 못했습니다. 다시 시도해주세요.");
      setDraft(trimmed);
    } finally { setLoading(false); setPendingQuestion(""); }
  }

  return (
    <div className="min-h-svh bg-muted/20">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-background px-4 py-3 md:px-8">
        <Link href="/demo" className="flex items-center gap-2 font-semibold"><Landmark className="size-5" />지방의회 AI비서 <Badge variant="secondary">데모</Badge></Link>
        <Button asChild variant="outline" size="sm"><Link href="/login">데모 종료 · 로그인</Link></Button>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:p-6">
        <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          실제 AI가 공개 자료를 조회해 답변합니다. 같은 IP에서 하루 10회, 데모 전체 하루 100회까지 이용할 수 있으며 요청 간 15초 간격이 필요합니다. 질문과 최근 대화는 답변 생성을 위해 Google AI로 전달되며, 대화 본문은 서비스 DB에 저장하지 않습니다. 민감 정보는 입력하지 마세요.
        </p>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList aria-label="데모 메뉴"><TabsTrigger value="assistant">AI 비서</TabsTrigger><TabsTrigger value="dashboard">대시보드</TabsTrigger><TabsTrigger value="account">계정 정보</TabsTrigger></TabsList>
          <TabsContent value="assistant" className="mt-3 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div><h1 className="text-2xl font-semibold">AI 비서 체험</h1><p className="text-sm text-muted-foreground">자유롭게 질문하고, 근거 확인부터 문서 초안까지 이어서 체험하세요.</p></div>
              <Button variant="outline" size="sm" disabled={loading} onClick={() => { setTurns([]); setDraft(""); setError(null); }}>새 대화</Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {DEMO_QUESTIONS.map((question) => <Button key={question} disabled={loading || (usage !== null && usage.used >= usage.limit)} variant="outline" className="h-auto justify-start whitespace-normal p-3 text-left" onClick={() => send(question)}>{question}</Button>)}
            </div>
            <div role="log" aria-label="데모 대화" aria-live="polite" className="max-h-[55svh] space-y-5 overflow-y-auto rounded-xl border bg-background p-4">
              {turns.length === 0 && <div className="py-10 text-center text-muted-foreground"><Sparkles className="mx-auto mb-2 size-6" /><p>위의 예시 질문을 선택해 시작하세요.</p></div>}
              {turns.map((turn, index) => (
                <div key={index} className="space-y-3">
                  <p className="ml-auto w-fit max-w-[90%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">{turn.question}</p>
                  <div className="max-w-[95%] space-y-2">
                    <Badge variant="secondary">{turn.answer.model} · 원문 확인 필요</Badge>
                    <div className="whitespace-pre-wrap rounded-2xl border px-4 py-3 text-sm leading-relaxed">{renderWithCitations(turn.answer.text, turn.answer.sources)}</div>
                    <SourceList sources={turn.answer.sources} />
                    <MessageExport text={turn.answer.text} sources={turn.answer.sources} />
                  </div>
                </div>
              ))}
              {loading && <div className="space-y-3"><p className="ml-auto w-fit rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground">{pendingQuestion}</p><p role="status" className="animate-pulse text-sm text-muted-foreground">공개 자료를 조회하고 AI 답변을 작성하고 있습니다…</p></div>}
              <div ref={bottom} />
            </div>
            <form onSubmit={(event) => { event.preventDefault(); send(); }} className="flex items-end gap-2">
              <Textarea disabled={loading} aria-label="데모 질문" placeholder="예: 버스 운영 관련 질의서 초안을 작성해줘" value={draft} maxLength={1000} rows={2} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); send(); }
              }} />
              <Button type="submit" size="icon" disabled={loading || !draft.trim() || (usage !== null && usage.used >= usage.limit)} aria-label="데모 질문 보내기"><SendHorizonal /></Button>
            </form>
            <p className="text-xs text-muted-foreground">Enter로 보내기 · Shift+Enter로 줄바꿈</p>
            {usage && <p className="text-xs text-muted-foreground">오늘 남은 데모 질문 {Math.max(usage.limit - usage.used, 0)} / {usage.limit}회 · 한국 시간 자정 초기화</p>}
            {error && <p role="alert" className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
          </TabsContent>
          <TabsContent value="dashboard" className="mt-3 space-y-4">
            <h1 className="text-2xl font-semibold">행정사무감사 준비 체험</h1>
            <Card><CardHeader><CardTitle>처음이라면 이렇게 시작하세요</CardTitle><CardDescription>건설교통위원회 업무를 가정한 예시 흐름입니다.</CardDescription></CardHeader><CardContent className="space-y-3"><p>관심 부서 선택 → 과거 지적사항·회의록 확인 → 질의서·자료요구서 초안 작성 → 원문 대조</p><Button onClick={() => send(DEMO_QUESTIONS[0])}>버스정책과 예시로 시작</Button></CardContent></Card>
            <Card><CardHeader><CardTitle>공개 근거로 답하는 AI</CardTitle></CardHeader><CardContent className="text-sm">데모에서도 실제 AI가 고양시 공개 지적사항과 회의록을 조회합니다. 법제처 인증이 설정되지 않은 법령 조회는 미설정으로 안내합니다. 근거를 확보하지 못하면 그 사실을 알립니다.</CardContent></Card>
          </TabsContent>
          <TabsContent value="account" className="mt-3 space-y-4">
            <h1 className="text-2xl font-semibold">데모 계정 정보</h1>
            <Card><CardHeader><CardTitle>체험용 프로필</CardTitle><CardDescription>실제 의원 계정과 연결되지 않은 예시입니다.</CardDescription></CardHeader><CardContent><dl className="grid grid-cols-2 gap-3 text-sm"><dt>이름</dt><dd>데모 사용자</dd><dt>소속 의회</dt><dd>고양특례시의회(예시)</dd><dt>상임위원회</dt><dd>건설교통위원회(예시)</dd><dt>저장 방식</dt><dd>현재 화면에서만 유지</dd></dl></CardContent></Card>
            <p className="text-sm text-muted-foreground">계정 변경·관심 사업 알림·대화 저장은 가입·승인 후 이용할 수 있습니다.</p>
            <Button asChild><Link href="/signup">가입 신청하기</Link></Button>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
