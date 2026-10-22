import { NextRequest, NextResponse } from "next/server";
import { runCouncilAgent } from "@/lib/agent";
import { classifyAiError } from "@/lib/ai";
import { demoClientKey, demoRequestSchema, DEMO_COOLDOWN_SECONDS, DEMO_DAILY_LIMIT, reserveDemoQuestion } from "@/lib/demo-usage";

export const maxDuration = 90;

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== request.nextUrl.origin) return NextResponse.json({ error: "데모 화면에서 질문을 보내주세요." }, { status: 403 });
  if (Number(request.headers.get("content-length")) > 64000) return NextResponse.json({ error: "질문과 대화 내용이 너무 깁니다." }, { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 64000) return NextResponse.json({ error: "질문과 대화 내용이 너무 깁니다." }, { status: 413 });
  const parsed = demoRequestSchema.safeParse(await Promise.resolve().then(() => JSON.parse(raw)).catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "질문은 1,000자 이내로 입력해주세요. 대화 형식도 확인해주세요." }, { status: 400 });
  const clientKey = demoClientKey(request.headers);
  if (!clientKey) return NextResponse.json({ error: "접속 정보를 확인하지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 503 });
  let used: number | null;
  try { used = await reserveDemoQuestion(clientKey); }
  catch { return NextResponse.json({ error: "데모 사용량을 확인하지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 503 }); }
  if (used === null) return NextResponse.json({ error: `데모는 같은 IP에서 하루 ${DEMO_DAILY_LIMIT}회, 요청 간 ${DEMO_COOLDOWN_SECONDS}초 간격으로 이용할 수 있습니다. 전체 데모 한도가 소진된 경우에도 이용이 제한됩니다.` }, { status: 429, headers: { "Retry-After": String(DEMO_COOLDOWN_SECONDS) } });
  const usage = { used, limit: DEMO_DAILY_LIMIT };
  try {
    const result = await runCouncilAgent({
      member: { name: "데모 사용자", council: "고양특례시의회", committee: "건설교통위원회", district: null },
      docTypes: ["law", "ordinance"], question: parsed.data.question, history: parsed.data.history,
      modelId: "google:gemini-3.6-flash", demo: true,
    });
    const issues = [...new Set(result.lookupIssues)].join(" ");
    const text = result.sources.length > 0 ? result.text + (issues ? `\n\n조회하지 못한 자료: ${issues}` : "")
      : issues || "질문에 답할 공개 근거를 확보하지 못했습니다. 부서·사업·연도를 구체적으로 지정해 다시 질문해주세요.";
    return NextResponse.json({ text, sources: result.sources, model: "Gemini 3.6 Flash", usage }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: classifyAiError(error) === "quota" ? "AI 제공자의 사용량 한도에 도달했습니다. 잠시 후 다시 시도해주세요." : "AI 답변을 생성하지 못했습니다. 조회가 지연되거나 서비스에 문제가 있을 수 있습니다. 잠시 후 다시 시도해주세요.", usage }, { status: 503 });
  }
}
