import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ne } from "drizzle-orm";
import type { ModelMessage } from "ai";

import { getDb } from "@/db";
import { conversations, messages } from "@/db/schema";
import { runCouncilAgent, type AgentSource, type DocType } from "@/lib/agent";
import { classifyAiError, resolveRequestedModel, type AiFailure, type TrustLevel } from "@/lib/ai";
import { getActiveMember, type Member } from "@/lib/member";
import { getQuestionUsage, isOverLimit } from "@/lib/usage";
import { isUuid } from "@/lib/utils";

const MENU_DOC_TYPES: Record<string, DocType[]> = {
  laws: ["law", "ordinance"],
  meetings: ["meeting"],
  budget: ["budget"],
  // 통합 AI 비서: 모든 문서 유형을 검색 대상으로 두고 에이전트가 도구로 고른다
  assistant: ["law", "ordinance", "meeting", "budget"],
};

// 질문 1건이 프롬프트 토큰을 과도하게 쓰지 않도록 길이 제한
const MAX_QUESTION_LENGTH = 1000;

const FAILURE_MESSAGES: Record<AiFailure, string> = {
  quota: "AI 서비스 사용량 한도에 도달해 지금은 답변을 생성할 수 없습니다. 잠시 후 다시 시도하거나 관리자에게 문의해주세요.",
  unavailable: "AI 서비스와 연결하지 못했습니다. 잠시 후 다시 시도해주세요.",
};

type Answer = {
  kind: "normal" | "unavailable" | "empty" | "error";
  text: string;
  trust: TrustLevel | null;
  sources: AgentSource[];
};

// 이전 대화를 에이전트에 넘길 최대 메시지 수 (질문·답변 쌍 기준 3턴)
const HISTORY_LIMIT = 6;

async function loadHistory(conversationId: string, excludeMessageId: string): Promise<ModelMessage[]> {
  const rows = await getDb()
    .select({ role: messages.role, content: messages.content, kind: messages.kind })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), ne(messages.id, excludeMessageId)))
    .orderBy(asc(messages.createdAt));
  return rows
    .filter((m) => m.kind === "normal")
    .slice(-HISTORY_LIMIT)
    .map((m) => ({ role: m.role, content: m.content }));
}

async function answerQuestion(
  member: Member,
  question: string,
  docTypes: DocType[],
  history: ModelMessage[],
  modelId: string
): Promise<Answer> {
  const result = await runCouncilAgent({ member, docTypes, history, question, modelId });

  // 인용한 근거가 없으면 답변으로 내보내지 않음 (근거 없는 답변 금지 원칙)
  if (result.sources.length === 0) {
    return result.gathered === 0
      ? { kind: "empty", text: "관련 자료를 찾지 못했습니다. 질문을 바꾸거나 범위를 좁혀 다시 물어봐 주세요.", trust: null, sources: [] }
      : {
          kind: "unavailable",
          text: "관련 자료는 있으나 충분한 근거를 찾지 못해 답변을 제공하지 않습니다.",
          trust: null,
          sources: [],
        };
  }

  const trust: TrustLevel = result.sources.length >= 2 ? "high" : "medium";
  return { kind: "normal", text: result.text, trust, sources: result.sources };
}

export async function POST(req: NextRequest) {
  const member = await getActiveMember();
  if (!member) {
    return NextResponse.json({ error: "이용 권한이 없습니다" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const menu = body?.menu;
  // 허용 목록에 없는 모델은 기본 모델로 (요청 본문은 신뢰하지 않음)
  const modelId = resolveRequestedModel(body?.model);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  let conversationId: string | undefined = body?.conversationId ?? undefined;

  const docTypes =
    typeof menu === "string" && Object.hasOwn(MENU_DOC_TYPES, menu) ? MENU_DOC_TYPES[menu] : null;
  if (!docTypes || !question || (conversationId !== undefined && !isUuid(conversationId))) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return NextResponse.json(
      { error: `질문은 ${MAX_QUESTION_LENGTH}자 이내로 입력해주세요` },
      { status: 400 }
    );
  }

  // 일일 한도 초과 시 대화·메시지를 만들지 않고 바로 거절
  const usage = await getQuestionUsage(member.id);
  if (isOverLimit(usage)) {
    return NextResponse.json(
      {
        error: `오늘 사용할 수 있는 질문 ${usage.limit}회를 모두 사용했습니다. 내일 0시(한국 시간)에 다시 이용할 수 있습니다.`,
        code: "daily_limit",
        usage,
      },
      { status: 429 }
    );
  }

  const db = getDb();

  if (conversationId) {
    // 요청 본문의 conversationId는 신뢰할 수 없음 — 본인 소유인지 확인 (통합 비서에서 이전 메뉴의 대화도 이어갈 수 있음)
    const [owned] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(eq(conversations.id, conversationId), eq(conversations.memberId, member.id))
      );
    if (!owned) {
      return NextResponse.json({ error: "대화를 찾을 수 없습니다" }, { status: 404 });
    }
  } else {
    const [conv] = await db
      .insert(conversations)
      .values({
        memberId: member.id,
        menu: menu as "laws" | "meetings" | "budget" | "assistant",
        title: question.slice(0, 40),
      })
      .returning();
    conversationId = conv.id;
  }

  const [userMessage] = await db
    .insert(messages)
    .values({ conversationId, role: "user", content: question })
    .returning();

  let answer: Answer;
  try {
    const history = await loadHistory(conversationId, userMessage.id);
    answer = await answerQuestion(member, question, docTypes, history, modelId);
  } catch (error) {
    // 실패도 대화 기록에 남겨, 질문만 덩그러니 남고 답이 없는 상태를 막음
    const failure = classifyAiError(error);
    console.error(`[chat] ${modelId} 호출 실패 (${failure})`, error);
    answer = { kind: "error", text: FAILURE_MESSAGES[failure], trust: null, sources: [] };
  }

  const sourcesSnapshot = answer.sources;

  const [assistantMessage] = await db
    .insert(messages)
    .values({
      conversationId,
      role: "assistant",
      content: answer.text,
      trustLevel: answer.trust,
      kind: answer.kind,
      sources: sourcesSnapshot,
      model: modelId,
    })
    .returning();

  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));

  return NextResponse.json({
    conversationId,
    userMessage: { id: userMessage.id, content: userMessage.content },
    assistantMessage: {
      id: assistantMessage.id,
      content: answer.text,
      trustLevel: answer.trust,
      kind: answer.kind,
      sources: sourcesSnapshot,
      model: modelId,
    },
    usage: { used: usage.used + 1, limit: usage.limit },
  });
}

// 채팅 화면 진입 시 오늘 남은 질문 수 표시용
export async function GET() {
  const member = await getActiveMember();
  if (!member) {
    return NextResponse.json({ error: "이용 권한이 없습니다" }, { status: 403 });
  }
  return NextResponse.json({ usage: await getQuestionUsage(member.id) });
}
