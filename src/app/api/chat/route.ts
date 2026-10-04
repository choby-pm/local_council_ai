import { NextRequest, NextResponse } from "next/server";
import { and, cosineDistance, eq, inArray, or, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { conversations, documentChunks, documents, messages } from "@/db/schema";
import { getActiveMember, type Member } from "@/lib/member";
import { getQuestionUsage, isOverLimit } from "@/lib/usage";
import { isUuid } from "@/lib/utils";
import {
  CHAT_MODEL,
  classifyAiError,
  embedQuery,
  generateGroundedAnswer,
  trustFromDistance,
  type AiFailure,
  type RetrievedChunk,
  type TrustLevel,
} from "@/lib/ai";

type DocType = "law" | "ordinance" | "meeting" | "budget";

const MENU_DOC_TYPES: Record<string, DocType[]> = {
  laws: ["law", "ordinance"],
  meetings: ["meeting"],
  budget: ["budget"],
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
  sources: RetrievedChunk[];
};

async function answerQuestion(member: Member, question: string, docTypes: DocType[]): Promise<Answer> {
  // 1) 질의 임베딩
  const queryEmbedding = await embedQuery(question);

  // 2) pgvector 코사인 유사도 검색 (메뉴별 문서유형 + 의회 테넌시 범위)
  const distanceExpr = cosineDistance(documentChunks.embedding, queryEmbedding);
  const rows = await getDb()
    .select({
      chunkId: documentChunks.id,
      documentId: documents.id,
      title: documents.title,
      sourceMeta: documents.sourceMeta,
      sourceUrl: documents.sourceUrl,
      content: documentChunks.content,
      distance: distanceExpr,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documents.id, documentChunks.documentId))
    .where(
      and(
        inArray(documents.type, docTypes),
        or(isNull(documents.council), eq(documents.council, member.council))
      )
    )
    .orderBy(distanceExpr)
    .limit(5);

  const chunks: RetrievedChunk[] = rows.map((r) => ({
    chunkId: r.chunkId,
    documentId: r.documentId,
    title: r.title,
    meta: r.sourceMeta ? Object.values(r.sourceMeta).join(" · ") : "",
    sourceUrl: r.sourceUrl,
    content: r.content,
    distance: Number(r.distance),
  }));

  if (chunks.length === 0) {
    return { kind: "empty", text: "검색 결과가 없습니다.", trust: null, sources: [] };
  }

  const trust = trustFromDistance(chunks[0].distance);
  if (trust === "low") {
    return {
      kind: "unavailable",
      text: "관련 자료는 있으나 충분한 근거를 찾지 못해 답변을 제공하지 않습니다.",
      trust: null,
      sources: [],
    };
  }

  // 3) 근거 기반 답변 생성
  const sources = chunks.slice(0, 3);
  const text = await generateGroundedAnswer(question, sources);
  return { kind: "normal", text, trust, sources };
}

export async function POST(req: NextRequest) {
  const member = await getActiveMember();
  if (!member) {
    return NextResponse.json({ error: "이용 권한이 없습니다" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const menu = body?.menu;
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
    // 요청 본문의 conversationId는 신뢰할 수 없음 — 본인 소유이며 같은 메뉴의 대화인지 확인
    const [owned] = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.id, conversationId),
          eq(conversations.memberId, member.id),
          eq(conversations.menu, menu as "laws" | "meetings" | "budget")
        )
      );
    if (!owned) {
      return NextResponse.json({ error: "대화를 찾을 수 없습니다" }, { status: 404 });
    }
  } else {
    const [conv] = await db
      .insert(conversations)
      .values({
        memberId: member.id,
        menu: menu as "laws" | "meetings" | "budget" | "reports",
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
    answer = await answerQuestion(member, question, docTypes);
  } catch (error) {
    // 실패도 대화 기록에 남겨, 질문만 덩그러니 남고 답이 없는 상태를 막음
    const failure = classifyAiError(error);
    console.error(`[chat] ${CHAT_MODEL} 호출 실패 (${failure})`, error);
    answer = { kind: "error", text: FAILURE_MESSAGES[failure], trust: null, sources: [] };
  }

  const sourcesSnapshot = answer.sources.map((s, i) => ({
    index: i + 1,
    documentId: s.documentId,
    sourceUrl: s.sourceUrl,
    title: s.title,
    meta: s.meta,
    excerpt: s.content,
  }));

  const [assistantMessage] = await db
    .insert(messages)
    .values({
      conversationId,
      role: "assistant",
      content: answer.text,
      trustLevel: answer.trust,
      kind: answer.kind,
      sources: sourcesSnapshot,
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
