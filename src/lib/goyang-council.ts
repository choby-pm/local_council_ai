// 고양특례시의회 홈페이지를 도구로 감싼다 (공식 API 없음, 결정 D-09).
// 비밀값이 없어 서버 전용 표시 없이 두고, 크론 라우트와 scripts/에서 함께 쓴다.
// - 회의록 목록 검색: /promote/minutes/search.do — 대수별, 한 단어 검색만 결과가 나옴, 10~18초 소요
// - 회의록 본문: /viewer/minutes.do?uid=N — 발언 전문이 HTML 텍스트

const BASE = "https://www.goyangcouncil.go.kr";
const UA = "Mozilla/5.0 (compatible; local-council-ai/0.1)";
// 2026년 7월 시작한 제10대와 직전 제9대를 기본 검색 범위로 둔다
const DEFAULT_TERMS = [10, 9];
const SEARCH_TIMEOUT_MS = 30_000;

export type MinutesHit = { uid: string; title: string; url: string };

function decode(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`의회 홈페이지 응답 오류 ${res.status}`);
  return res.text();
}

/**
 * 회의록 목록 검색. 여러 단어를 넣으면 결과가 0건이 되므로 첫 단어만 검색하고,
 * 나머지 단어는 제목(회의명·피감사기관)에 들어 있는지로 거른다.
 */
export async function searchMinutes(query: string, opts: { terms?: number[]; limit?: number } = {}) {
  const [keyword, ...filters] = query.trim().split(/\s+/);
  if (!keyword) return [];
  const terms = opts.terms ?? DEFAULT_TERMS;
  const limit = opts.limit ?? 8;

  const pages = await Promise.all(
    terms.map((th) =>
      fetchText(
        `${BASE}/promote/minutes/search.do?cl_cd_sch=CT&th_sch=${th}&schwrd=${encodeURIComponent(keyword)}`
      ).catch(() => "")
    )
  );

  const hits: MinutesHit[] = [];
  const seen = new Set<string>();
  for (const html of pages) {
    for (const m of html.matchAll(/href="\/viewer\/minutes\.do\?uid=(\d+)[^"]*"\s+title="([^"]+)"/g)) {
      const [, uid, rawTitle] = m;
      if (seen.has(uid)) continue;
      seen.add(uid);
      const title = decode(rawTitle).replace(/\s+/g, " ").replace(/^고양특례시의회\s*/, "").trim();
      hits.push({ uid, title, url: `${BASE}/viewer/minutes.do?uid=${uid}` });
    }
  }

  const filtered = filters.length > 0 ? hits.filter((h) => filters.every((f) => h.title.includes(f))) : hits;
  return (filtered.length > 0 ? filtered : hits).slice(0, limit);
}

/** 회의록 본문에서 검색어 주변 발언만 잘라 돌려준다 (본문 전체는 수십만 자라 모델에 넣기엔 큼) */
export async function readMinutesExcerpts(uid: string, keyword: string, opts: { window?: number; max?: number } = {}) {
  if (!/^\d+$/.test(uid)) throw new Error("잘못된 회의록 번호");
  const window = opts.window ?? 600;
  const max = opts.max ?? 4;

  const { title, url, text } = await getMinutesText(uid);
  const words = keyword.trim().split(/\s+/).filter(Boolean);
  const excerpts: string[] = [];
  let from = 0;
  while (excerpts.length < max && words.length > 0) {
    const positions = words.map((w) => text.indexOf(w, from)).filter((i) => i >= 0);
    if (positions.length === 0) break;
    const at = Math.min(...positions);
    excerpts.push(text.slice(Math.max(0, at - window / 2), at + window).trim());
    from = at + window;
  }

  return { uid, title, url, excerpts };
}

/** 회의록 한 건의 본문 전체(텍스트). 발언 전문이라 수십만 자일 수 있다 */
export async function getMinutesText(uid: string) {
  if (!/^\d+$/.test(uid)) throw new Error("잘못된 회의록 번호");
  const html = await fetchText(`${BASE}/viewer/minutes.do?uid=${uid}`);
  const text = decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, "")
      .replace(/<style[\s\S]*?<\/style>/g, "")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, " ")
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n");
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? `회의록 ${uid}`);
  return { uid, title, url: `${BASE}/viewer/minutes.do?uid=${uid}`, text };
}

/** 최근 공개된 회의록 목록 (최근회의록 메뉴, 최신순, 페이지당 10건) */
export async function listRecentMinutes(pages = 2): Promise<(MinutesHit & { date: string })[]> {
  const hits: (MinutesHit & { date: string })[] = [];
  for (let page = 1; page <= pages; page++) {
    const html = await fetchText(`${BASE}/promote/minutes/late.do?page=${page}`);
    for (const row of html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
      const link = row.match(/href="\/viewer\/minutes\.do\?uid=(\d+)[^"]*"\s+title="([^"]+)"/);
      if (!link) continue;
      const date = row.match(/(\d{4})\.(\d{2})\.(\d{2})/);
      hits.push({
        uid: link[1],
        title: decode(link[2]).replace(/\s+/g, " ").replace(/^고양특례시의회\s*/, "").trim(),
        url: `${BASE}/viewer/minutes.do?uid=${link[1]}`,
        date: date ? `${date[1]}-${date[2]}-${date[3]}` : "",
      });
    }
  }
  return hits;
}

// 의원별 회의록 검색(/promote/minutes/member.do)은 의원 코드로 찾는다. 코드는 검색 화면의 선택 목록에서 얻고 하루 동안 기억한다
let memberCodeCache: { at: number; codes: Map<string, string> } | null = null;

async function memberCodes(): Promise<Map<string, string>> {
  if (memberCodeCache && Date.now() - memberCodeCache.at < 24 * 60 * 60 * 1000) return memberCodeCache.codes;
  const html = await fetchText(`${BASE}/promote/minutes/member.do`);
  const select = html.slice(html.indexOf('name="mem_sch"'), html.indexOf("</select>", html.indexOf('name="mem_sch"')));
  const codes = new Map<string, string>();
  for (const m of select.matchAll(/<option value='(\d+)'[^>]*>([^<]+)<\/option>/g)) codes.set(m[2].trim(), m[1]);
  memberCodeCache = { at: Date.now(), codes };
  return codes;
}

export type MemberMinutesHit = MinutesHit & { date: string };

/**
 * 특정 의원이 발언한 회의록을 검색어로 찾는다 (제10대·제9대). 의원 이름이 현역 명단에 없으면 null.
 * 일반 회의록 검색과 달리 빠르다(1초 이내).
 */
export async function searchMemberMinutes(
  memberName: string,
  keyword: string,
  opts: { terms?: number[]; limit?: number } = {}
): Promise<MemberMinutesHit[] | null> {
  const code = (await memberCodes()).get(memberName.trim());
  if (!code) return null;
  const terms = opts.terms ?? DEFAULT_TERMS;
  const limit = opts.limit ?? 8;

  const pages = await Promise.all(
    terms.map((th) =>
      fetchText(
        `${BASE}/promote/minutes/member.do?th_sch=${th}&mem_sch=${code}&schwrd=${encodeURIComponent(keyword.trim())}`
      ).catch(() => "")
    )
  );

  const hits: MemberMinutesHit[] = [];
  for (const html of pages) {
    for (const row of html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
      const uid = row.match(/\/viewer\/minutes\.do\?uid=(\d+)/)?.[1];
      if (!uid) continue;
      // 열: 번호 · 회기 · 차수 · 회의명 · 일자
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) =>
        decode(c[1].replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()
      );
      const [, session, round, meeting, date] = cells;
      hits.push({
        uid,
        title: [session, meeting, round].filter(Boolean).join(" "),
        url: `${BASE}/viewer/minutes.do?uid=${uid}`,
        date: (date ?? "").replace(/\s*\S+요일$/, ""),
      });
    }
  }
  return hits.slice(0, limit);
}
