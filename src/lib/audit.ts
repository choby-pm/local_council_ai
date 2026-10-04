import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { auditFindings } from "@/db/schema";

export type AuditFinding = typeof auditFindings.$inferSelect;

export type SignalKind = "repeat" | "corrective" | "budget";

export type Signal = {
  kind: SignalKind;
  label: string;
  detail: string;
  weight: number;
};

export type QuestionCandidate = {
  finding: AuditFinding;
  // 이전 연도에 같은 사업으로 지적된 항목 (최근 순)
  history: AuditFinding[];
  signals: Signal[];
  score: number;
};

export type DepartmentSummary = {
  department: string;
  candidates: QuestionCandidate[];
  repeatCount: number;
};

// 사업명·지적문에서 비교에 쓸 단어만 남긴다. 행정 문서에 흔한 일반어는 빼야
// "백마역세권 개발"과 "삼송취락지구 개발"처럼 다른 사업이 한 단어로 묶이지 않는다.
const STOPWORDS = new Set([
  "관련", "사업", "및", "등", "추진", "운영", "관리", "방안", "개선", "문제", "필요",
  "개발", "안전", "점검", "단속", "주요", "조성", "도입", "계획", "현황", "지원", "설치", "강화",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .map((w) => w.replace(/(의|을|를|이|가|은|는|에|에서|으로|로|과|와)$/, ""))
      .filter((w) => w.length >= 2 && !STOPWORDS.has(w))
  );
}

function overlap(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size);
}

// "상하수도사업소(하수행정과)" → "하수행정과": 조직 개편으로 상위 국 이름이 바뀌어도 과 단위로 비교
function unit(department: string): string {
  return department.match(/\(([^)]+)\)\s*$/)?.[1] ?? department;
}

/**
 * 같은 사업인지 판단: 과(課)가 같고 사업명 단어가 절반 이상 겹치거나,
 * 사업명이 없으면 지적문 단어가 많이 겹칠 때. 연도마다 표현이 달라 보수적으로 잡는다.
 */
function isSameIssue(a: AuditFinding, b: AuditFinding): boolean {
  if (unit(a.department) !== unit(b.department)) return false;
  if (a.project && b.project) return overlap(tokens(a.project), tokens(b.project)) >= 0.5;
  return overlap(tokens(`${a.project ?? ""} ${a.finding}`), tokens(`${b.project ?? ""} ${b.finding}`)) >= 0.6;
}

const CORRECTIVE = /시정/;

function buildSignals(f: AuditFinding, history: AuditFinding[]): Signal[] {
  const signals: Signal[] = [];

  if (history.length > 0) {
    const years = [...new Set(history.map((h) => h.year))].sort();
    signals.push({
      kind: "repeat",
      label: `${years.length + 1}개 연도 반복`,
      detail: `${years.join("·")}년 행감에서도 같은 사업이 지적됨 — 작년 요구가 이행되지 않았을 가능성`,
      weight: 3 * years.length,
    });
  }

  if (f.actionType && CORRECTIVE.test(f.actionType) && !/처리요구|건의/.test(f.actionType)) {
    signals.push({
      kind: "corrective",
      label: "시정요구",
      detail: "작년에 시정을 요구한 사항 — 조치 결과를 확인할 필요",
      weight: 1,
    });
  }

  return signals;
}

/**
 * 위원회의 가장 최근 행감 지적사항을 질의 후보로 만들고, 신호 점수순으로 정렬한다.
 * AI 호출 없이 DB 데이터와 계산만으로 만든다(무료 티어 한도 보호, 결정 D-20).
 */
export async function getQuestionCandidates(opts: {
  council: string;
  committee: string;
}): Promise<{ latestYear: number | null; candidates: QuestionCandidate[]; departments: DepartmentSummary[] }> {
  const rows = await getDb()
    .select()
    .from(auditFindings)
    .where(and(eq(auditFindings.council, opts.council), eq(auditFindings.committee, opts.committee)))
    .orderBy(desc(auditFindings.year), auditFindings.page);

  if (rows.length === 0) return { latestYear: null, candidates: [], departments: [] };

  const latestYear = rows[0].year;
  const latest = rows.filter((r) => r.year === latestYear);
  const earlier = rows.filter((r) => r.year < latestYear);

  const candidates = latest.map((finding) => {
    const history = earlier.filter((e) => isSameIssue(finding, e));
    const signals = buildSignals(finding, history);
    return { finding, history, signals, score: signals.reduce((s, x) => s + x.weight, 0) };
  });

  // 점수가 같으면 보고서 앞쪽(원문 순서)을 우선
  candidates.sort((a, b) => b.score - a.score || (a.finding.page ?? 0) - (b.finding.page ?? 0));

  const byDept = new Map<string, QuestionCandidate[]>();
  for (const c of candidates) {
    const list = byDept.get(c.finding.department) ?? [];
    list.push(c);
    byDept.set(c.finding.department, list);
  }
  const departments = [...byDept.entries()]
    .map(([department, list]) => ({
      department,
      candidates: list,
      repeatCount: list.filter((c) => c.history.length > 0).length,
    }))
    .sort((a, b) => b.repeatCount - a.repeatCount || b.candidates.length - a.candidates.length);

  return { latestYear, candidates, departments };
}

export type AuditSuggestion = { id: string; title: string; tags: string[]; detail: string; prompt: string };

/**
 * AI 비서의 빈 대화에 보여줄 추천 질문. 질의 후보 상위 항목을 "비서에게 물어볼 질문"으로 바꾼다.
 * 카드를 만들 때는 AI를 쓰지 않고, 누른 뒤 비서가 도구로 근거를 찾아 답한다.
 */
export async function getAuditSuggestions(council: string, committee: string, limit = 4): Promise<AuditSuggestion[]> {
  const { candidates } = await getQuestionCandidates({ council, committee });
  return candidates.slice(0, limit).map(({ finding: f, signals }) => {
    const subject = f.project ?? f.finding.slice(0, 30);
    return {
      id: f.id,
      title: `${f.department} · ${subject}`,
      tags: signals.length > 0 ? signals.map((s) => s.label) : [`${f.year}년 지적`],
      detail: f.finding,
      prompt:
        `${f.department}의 "${subject}" 건에 대해 ${f.year}년 행정사무감사 지적사항과 이전 연도 지적 이력을 찾아, ` +
        "올해 행정사무감사에서 이행 여부를 확인할 질의 포인트를 정리하고 질의서 초안을 만들어줘.",
    };
  });
}
