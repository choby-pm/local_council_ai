import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { NextRequest } from "next/server";
import { DEMO_QUESTIONS, DEMO_SOURCES, demoAnswer } from "../src/lib/demo.ts";
const proxy = createRequire(import.meta.url)("../src/proxy.ts").default;

const originalFetch = globalThis.fetch;
globalThis.fetch = async () => { throw new Error("데모는 외부 요청을 보내면 안 됨"); };
try {
  for (const question of DEMO_QUESTIONS) {
    const answer = demoAnswer(question);
    assert.match(answer.text, /예시/);
    assert.ok(answer.sources.length > 0);
  }
  assert.match(demoAnswer(DEMO_QUESTIONS[1]).text, /질의서 예시/);
  assert.match(demoAnswer(DEMO_QUESTIONS[2]).text, /자료요구서 예시/);
  assert.match(demoAnswer("예시에 없는 질문").text, /서버나 AI에 전송되지 않습니다/);
  for (const source of DEMO_SOURCES) {
    assert.ok(["www.goyangcouncil.go.kr", "www.law.go.kr"].includes(new URL(source.sourceUrl!).hostname));
  }
  assert.equal(proxy(new NextRequest("https://example.com/demo")).headers.get("x-middleware-next"), "1");
  for (const path of ["/api/chat", "/api/conversations", "/api/feedback"]) {
    assert.equal(proxy(new NextRequest(`https://example.com${path}`)).status, 401, "데모가 실제 API 권한을 열면 안 됨");
  }
  for (const path of ["/assistant", "/admin/accounts"]) {
    assert.equal(proxy(new NextRequest(`https://example.com${path}`)).headers.get("location"), "https://example.com/login");
  }
} finally {
  globalThis.fetch = originalFetch;
}
console.log("PASS: 데모 예시 응답·공식 참고 링크·네트워크 미사용·실제 API 접근 차단");
