import "server-only";
import { z } from "zod";

const BASE = "https://www.law.go.kr";
const MAX_BYTES = 4 * 1024 * 1024;
const MAX_EXCERPT = 12000;
const candidateSchema = z.object({
  kind: z.enum(["law", "ordinance"]),
  id: z.string().regex(/^\d+$/),
  version: z.string().regex(/^\d+$/),
  title: z.string().min(1),
  effectiveDate: z.string().regex(/^\d{8}$/),
  publicationDate: z.string().regex(/^\d{8}$/),
  agency: z.string().min(1),
});
export type LegislationCandidate = z.infer<typeof candidateSchema>;

export class LegislationError extends Error {
  constructor(public code: "unconfigured" | "unsupported" | "unavailable", message: string) { super(message); }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new LegislationError("unavailable", "법제처 응답 형식을 확인하지 못했습니다.");
  return value as Record<string, unknown>;
}
function string(value: unknown): string { return typeof value === "string" || typeof value === "number" ? String(value) : ""; }
function array(value: unknown): unknown[] { return value == null || value === "" ? [] : Array.isArray(value) ? value : [value]; }
function todayKst() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date()).replaceAll("-", ""); }

async function request(path: string, params: Record<string, string>): Promise<unknown> {
  const oc = process.env.LAW_API_OC?.trim();
  if (!oc) throw new LegislationError("unconfigured", "법제처 공식 조회가 설정되지 않았습니다. 관리자에게 LAW_API_OC 설정을 요청해주세요.");
  const url = new URL(`/DRF/${path}`, BASE);
  url.search = new URLSearchParams({ ...params, OC: oc, type: "JSON" }).toString();
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) });
    if (!response.ok || !response.body || Number(response.headers.get("content-length")) > MAX_BYTES) throw new Error();
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let text = "";
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) { await reader.cancel(); throw new Error(); }
        text += decoder.decode(value, { stream: true });
      }
    } finally { reader.releaseLock(); }
    return JSON.parse(text + decoder.decode());
  } catch {
    // 인증값이 URL에 포함되므로 외부 오류 객체·응답 본문을 로그나 답변에 전달하지 않는다.
    throw new LegislationError("unavailable", "법제처 원문을 조회하지 못했습니다. 인증·접속 허용 설정과 서비스 상태를 확인해주세요.");
  }
}

export function legislationUrl(candidate: LegislationCandidate) {
  const url = new URL(candidate.kind === "law" ? "/LSW/lsInfoP.do" : "/LSW/ordinInfoP.do", BASE);
  url.searchParams.set(candidate.kind === "law" ? "lsiSeq" : "ordinSeq", candidate.version);
  return url.toString();
}

export async function searchLegislation(kind: "law" | "ordinance", query: string, council: string, searchIn: "title" | "body" = "title") {
  const keyword = z.string().trim().min(1).max(100).parse(query);
  if (kind === "ordinance" && council !== "고양특례시의회") throw new LegislationError("unsupported", "현재 공식 자치법규 조회는 고양시만 지원합니다.");
  const target = kind === "law" ? "eflaw" : "ordin";
  const params: Record<string, string> = { target, query: keyword, nw: kind === "law" ? "3" : "1", search: searchIn === "body" ? "2" : "1", display: "8", page: "1" };
  if (kind === "ordinance") { params.org = "6410000"; params.sborg = "3940000"; }
  const root = object(await request("lawSearch.do", params));
  const result = object(root[kind === "law" ? "LawSearch" : "OrdinSearch"]);
  if (result.resultCode !== "00") throw new LegislationError("unavailable", "법제처 검색을 완료하지 못했습니다.");
  const total = z.coerce.number().int().nonnegative().parse(result.totalCnt);
  if (total > 0 && array(result.law).length === 0) throw new LegislationError("unavailable", "법제처 검색 목록의 본문을 확인하지 못했습니다.");
  const candidates = array(result.law).map((value) => {
    const row = object(value);
    return candidateSchema.parse({ kind,
      id: string(row[kind === "law" ? "법령ID" : "자치법규ID"]),
      version: string(row[kind === "law" ? "법령일련번호" : "자치법규일련번호"]),
      title: string(row[kind === "law" ? "법령명한글" : "자치법규명"]),
      effectiveDate: string(row.시행일자), publicationDate: string(row.공포일자),
      agency: string(row[kind === "law" ? "소관부처명" : "지자체기관명"]),
    });
  }).filter((item) => item.effectiveDate <= todayKst() && (kind === "law" || item.agency === "경기도 고양시"));
  return { candidates, total, truncated: total > candidates.length, checkedAt: new Date().toISOString(), scope: "현재 시행본 검색. 과거 시점의 법령 적용 판단은 지원하지 않습니다." };
}

// 조문 내용과 항·호·목만 합친다. 번호·연락처 등의 메타데이터는 본문에 섞지 않는다.
function content(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.map(content).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";
  const row = object(value);
  return ["조문내용", "조내용", "항내용", "호내용", "목내용", "부칙내용", "항", "호", "목", "부칙단위"]
    .map((key) => content(row[key])).filter(Boolean).join("\n");
}

export async function readLegislation(candidate: LegislationCandidate, opts: { keyword?: string; article?: string }) {
  candidateSchema.parse(candidate);
  const keyword = opts.keyword?.trim() ?? "";
  const article = opts.article?.trim() ?? "";
  if ((!keyword && !article) || keyword.length > 100 || (article && !/^제?\d{1,4}조(?:의\d{1,2})?$/.test(article))) throw new LegislationError("unsupported", "조문을 찾을 핵심 단어나 제49조·제10조의2 형식의 조문 번호를 지정해주세요.");
  const articleParts = article.match(/^제?(\d+)조(?:의(\d+))?$/);
  const jo = articleParts ? articleParts[1].padStart(4, "0") + (articleParts[2] ?? "0").padStart(2, "0") : "";
  const root = object(await request("lawService.do", { target: candidate.kind === "law" ? "eflaw" : "ordin", MST: candidate.version, ...(candidate.kind === "law" ? { efYd: candidate.effectiveDate, ...(jo ? { JO: jo } : {}) } : {}) }));
  const body = object(root[candidate.kind === "law" ? "법령" : "LawService"]);
  const info = object(body[candidate.kind === "law" ? "기본정보" : "자치법규기본정보"]);
  const id = string(info[candidate.kind === "law" ? "법령ID" : "자치법규ID"]);
  const title = string(info[candidate.kind === "law" ? "법령명_한글" : "자치법규명"]);
  if (id !== candidate.id || title !== candidate.title || string(info.시행일자) !== candidate.effectiveDate || (candidate.kind === "ordinance" && string(info.지자체기관명) !== "경기도 고양시")) {
    throw new LegislationError("unavailable", "검색한 법규와 본문의 식별자·시행일·관할이 일치하지 않아 근거로 사용하지 않습니다.");
  }
  const clauses = object(body.조문);
  const pattern = article ? new RegExp(`^제${article.replace(/^제/, "")}\\s*(?:\\(|[\\s　])`) : null;
  const matches = array(clauses[candidate.kind === "law" ? "조문단위" : "조"]).map(content).filter((text) => pattern ? pattern.test(text) : text.includes(keyword));
  const supplementUnits = body.부칙 && !Array.isArray(body.부칙) && typeof body.부칙 === "object" ? object(body.부칙).부칙단위 ?? body.부칙 : body.부칙;
  const supplements = array(supplementUnits).map(content).filter((text) => keyword && text.includes(keyword));
  const picked = [...matches, ...supplements].slice(0, 5);
  if (picked.some((text) => text.length > MAX_EXCERPT)) throw new LegislationError("unsupported", "해당 조문이 길어 전체 내용을 전달하지 못했습니다. 원문을 직접 확인해주세요.");
  return { title, sourceUrl: legislationUrl(candidate), effectiveDate: candidate.effectiveDate, publicationDate: candidate.publicationDate, agency: candidate.agency,
    excerpts: picked, truncated: matches.length + supplements.length > picked.length, checkedAt: new Date().toISOString(),
    scope: "검색한 현행 버전의 발췌입니다. 부칙 전체와 별표·서식, 과거 법령 적용 여부는 확인하지 않았습니다.",
  };
}
