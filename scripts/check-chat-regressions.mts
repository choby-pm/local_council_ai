import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { neonConfig } from "@neondatabase/serverless";

// Next.js 전용 표시만 비운다. DB와 외부 사이트에는 접속하지 않는다.
registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: new URL("../node_modules/next/dist/compiled/server-only/empty.js", import.meta.url).href, shortCircuit: true };
  return nextResolve(specifier, context);
} });

const { searchMinutes, searchMemberMinutes, readMinutesExcerpts } = await import("../src/lib/goyang-council.ts");
const { sourcesForAnswer } = await import("../src/lib/agent.ts");
const source = { index: 1, documentId: "", sourceUrl: "https://www.goyangcouncil.go.kr/", title: "회의록", meta: "", excerpt: "확인한 발언" };
assert.deepEqual(sourcesForAnswer("확인한 발언[1]", [source]), [source]);
assert.deepEqual(sourcesForAnswer("확인한 발언[1], 허위 인용[9]", [source]), [], "실제 출처가 섞여 있어도 존재하지 않는 인용을 통과시키지 않음");
assert.deepEqual(sourcesForAnswer("출처 없는 설명", [source]), []);
const originalFetch = globalThis.fetch;
try {
  globalThis.fetch = async () => new Response('<a href="/viewer/minutes.do?uid=42" title="건설교통위원회 버스정책과">회의록</a>');
  assert.equal((await searchMinutes("버스 건설교통위원회")).length, 1, "대수별 중복 회의록 제거");
  assert.deepEqual(await searchMinutes("버스 문화복지위원회"), [], "조건 불일치를 다른 위원회 결과로 대체하면 안 됨");
  assert.deepEqual(await searchMinutes("  "), []);
  globalThis.fetch = async () => new Response("장애", { status: 503 });
  await assert.rejects(searchMinutes("버스"), /503/, "검색 장애는 결과 없음과 구분");
  globalThis.fetch = async () => { throw new Error("연결 중단"); };
  await assert.rejects(searchMinutes("버스"), /연결 중단/);
  globalThis.fetch = async (input) => new Response(String(input).includes("mem_sch=") ? "장애" : "<select name=\"mem_sch\"><option value='7'>테스트의원</option></select>", { status: String(input).includes("mem_sch=") ? 503 : 200 });
  await assert.rejects(searchMemberMinutes("테스트의원", "버스"), /503/);
  globalThis.fetch = async () => new Response("<title>교통 회의</title><script>버스 거짓근거</script><p>버스 운행 실적</p><p>추가 설명</p>");
  const minutes = await readMinutesExcerpts("42", "버스");
  assert.match(minutes.excerpts.join(" "), /버스 운행 실적/);
  assert.doesNotMatch(minutes.excerpts.join(" "), /거짓근거/);
  globalThis.fetch = async () => new Response(`<title>발언자 구분 테스트</title><p id='date-line'>2026년 10월 14일</p><p id='temporary-minutes-sub-title-line'>임시회의록</p>
    <div class='contents-block speaker-block'><strong>○과장 다른사람</strong>테스트의원님, 버스 운영에 답변드립니다.</div>
    <div class='contents-block speaker-block member-speech'><strong>○위원 <a>테스트의원</a></strong>버스 운행 자료를 요청합니다.</div>
    <div class='contents-block speaker-block member-speech'><strong>○위원 또다른의원</strong>버스 예산에 대해 질문합니다.</div>
    <script><div class='speaker-block'><strong>○위원 테스트의원</strong>버스 가짜발언</div></script>`);
  const own = await readMinutesExcerpts("42", "버스", { speaker: "테스트의원" });
  assert.equal(own.speakerVerified, true);
  assert.equal(own.temporary, true);
  assert.match(own.date, /2026년/);
  assert.match(own.excerpts.join(" "), /버스 운행 자료/);
  assert.doesNotMatch(own.excerpts.join(" "), /답변드립니다|예산|가짜발언/);
  assert.equal((await readMinutesExcerpts("42", "버스", { speaker: "없는의원" })).excerpts.length, 0);
  globalThis.fetch = async () => new Response("<p>참석자: 테스트의원</p><p>버스 관련 내용</p>");
  assert.equal((await readMinutesExcerpts("42", "버스", { speaker: "테스트의원" })).excerpts.length, 0, "구조를 확인하지 못하면 참석·언급만으로 발언을 반환하지 않음");
  await assert.rejects(readMinutesExcerpts("https://invalid.example", "버스"), /잘못된/);
} finally {
  globalThis.fetch = originalFetch;
}

process.env.DATABASE_URL = "postgresql://test:test@ep-test.us-east-2.aws.neon.tech/test";
const originalLimit = process.env.DAILY_QUESTION_LIMIT;
const originalNeonFetch = neonConfig.fetchFunction;
const queries: { query: string; params: unknown[] }[] = [];
let returned: string[][] = [["1"]];
globalThis.fetch = async (_url, init) => {
  assert.ok(init?.body, "DB 모의 요청 본문 필요");
  queries.push(JSON.parse(String(init.body)));
  return Response.json({ fields: [{ name: "used", dataTypeID: 23 }], rows: returned, rowCount: returned.length, command: "INSERT" });
};
neonConfig.fetchFunction = globalThis.fetch;
try {
  const { reserveQuestion, getQuestionUsage } = await import("../src/lib/usage.ts");
  const memberId = "00000000-0000-4000-8000-000000000001";
  process.env.DAILY_QUESTION_LIMIT = "2";
  assert.deepEqual(await reserveQuestion(memberId), { used: 1, limit: 2 });
  const reservation = queries.at(-1)!;
  assert.match(reservation.query, /on conflict.*do update.*where/i, "충돌 갱신에도 SQL로 상한 적용");
  assert.match(reservation.query, /"used" \+ 1/);
  assert.match(reservation.query, /Asia\/Seoul/);
  assert.ok(reservation.params.map(String).includes("2"));
  assert.ok(reservation.params.includes(memberId));
  assert.doesNotMatch(reservation.query, /conversations|messages/, "대화 삭제가 한도를 초기화하면 안 됨");
  returned = [];
  assert.equal(await reserveQuestion(memberId), null, "한도에 도달해 갱신되지 않은 요청 거절");
  assert.deepEqual(await getQuestionUsage(memberId), { used: 0, limit: 2 });
  process.env.DAILY_QUESTION_LIMIT = "0";
  returned = [["3"]];
  assert.deepEqual(await reserveQuestion(memberId), { used: 3, limit: null });
  assert.doesNotMatch(queries.at(-1)!.query, /where/i);
  process.env.DAILY_QUESTION_LIMIT = "invalid";
  assert.equal((await reserveQuestion(memberId))?.limit, 50);
} finally {
  neonConfig.fetchFunction = originalNeonFetch;
  globalThis.fetch = originalFetch;
  if (originalLimit === undefined) delete process.env.DAILY_QUESTION_LIMIT;
  else process.env.DAILY_QUESTION_LIMIT = originalLimit;
}
console.log("PASS: 인용 번호, 회의록 조건·장애·발췌, 사용량 SQL·한도·KST 회귀 검사 (실제 DB 동시성은 별도 검증 필요)");
