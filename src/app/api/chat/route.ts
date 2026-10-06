import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq, ne } from "drizzle-orm";
import type { ModelMessage } from "ai";

import { getDb } from "@/db";
import { conversations, messages } from "@/db/schema";
import { runCouncilAgent, type AgentSource, type DocType } from "@/lib/agent";
import {
  classifyAiError,
  markModelExhausted,
  modelAttemptOrder,
  modelLabel,
  resolveRequestedModel,
  type AiFailure,
  type TrustLevel,
} from "@/lib/ai";
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
  modelId: string,
  onProgress?: (label: string) => void
): Promise<Answer> {
  const result = await runCouncilAgent({ member, docTypes, history, question, modelId, onProgress });

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
  const convId = conversationId;
  const startedAt = Date.now();

  // 답변은 NDJSON 이벤트로 흘려보낸다: meta → progress* → done. 검색에 수십 초가 걸려 진행 상황을 보여주기 위함
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      send({
        type: "meta",
        conversationId: convId,
        userMessage: { id: userMessage.id, content: userMessage.content },
        usage: { used: usage.used + 1, limit: usage.limit },
      });
      send({ type: "progress", label: "질문을 살펴보는 중" });

      let answer: Answer | null = null;
      let usedModel = modelId;
      let lastFailure: AiFailure = "unavailable";
      try {
        const history = await loadHistory(convId, userMessage.id);
        // 고른 모델이 한도 초과면 한도가 남은 다른 무료 모델로 자동 전환 (결정 D-29)
        for (const candidate of modelAttemptOrder(modelId)) {
          if (candidate !== modelId) {
            send({ type: "progress", label: `${modelLabel(usedModel)} 한도 초과 — ${modelLabel(candidate)}(으)로 다시 찾는 중` });
          }
          usedModel = candidate;
          try {
            answer = await answerQuestion(member, question, docTypes, history, candidate, (label) =>
              send({ type: "progress", label })
            );
            break;
          } catch (error) {
            lastFailure = classifyAiError(error);
            console.error(`[chat] ${candidate} 호출 실패 (${lastFailure})`, error);
            if (lastFailure !== "quota") break;
            markModelExhausted(candidate);
          }
        }
      } catch (error) {
        lastFailure = classifyAiError(error);
        console.error("[chat] 답변 준비 실패", error);
      }

      // 실패도 대화 기록에 남겨, 질문만 덩그러니 남고 답이 없는 상태를 막음
      const final: Answer = answer ?? { kind: "error", text: FAILURE_MESSAGES[lastFailure], trust: null, sources: [] };
      const fallbackFrom = answer && usedModel !== modelId ? modelId : null;

      const [assistantMessage] = await db
        .insert(messages)
        .values({
          conversationId: convId,
          role: "assistant",
          content: final.text,
          trustLevel: final.trust,
          kind: final.kind,
          sources: final.sources,
          model: answer ? usedModel : null,
          latencyMs: Date.now() - startedAt,
        })
        .returning();
      await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, convId));

      send({
        type: "done",
        assistantMessage: {
          id: assistantMessage.id,
          content: final.text,
          trustLevel: final.trust,
          kind: final.kind,
          sources: final.sources,
          model: assistantMessage.model,
          fallbackFrom,
        },
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
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
