import { NextRequest, NextResponse } from "next/server";
import { and, cosineDistance, eq, inArray, or, isNull } from "drizzle-orm";

import { getDb } from "@/db";
import { conversations, documentChunks, documents, messages } from "@/db/schema";
import { getActiveMember } from "@/lib/member";
import { isUuid } from "@/lib/utils";
import {
  embedQuery,
  generateGroundedAnswer,
  trustFromDistance,
  type RetrievedChunk,
} from "@/lib/ai";

const MENU_DOC_TYPES: Record<string, ("law" | "ordinance" | "meeting" | "budget")[]> = {
  laws: ["law", "ordinance"],
  meetings: ["meeting"],
  budget: ["budget"],
};

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

  // 1) 질의 임베딩
  const queryEmbedding = await embedQuery(question);

  // 2) pgvector 코사인 유사도 검색 (메뉴별 문서유형 + 의회 테넌시 범위)
  const distanceExpr = cosineDistance(documentChunks.embedding, queryEmbedding);
  const rows = await db
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

  const topDistance = chunks[0]?.distance ?? 1;
  const trust = trustFromDistance(topDistance);

  let kind: "normal" | "unavailable" | "empty" = "normal";
  let answerText: string;
  let usedSources: RetrievedChunk[] = [];

  if (chunks.length === 0) {
    kind = "empty";
    answerText = "검색 결과가 없습니다.";
  } else if (trust === "low") {
    kind = "unavailable";
    answerText = "관련 자료는 있으나 충분한 근거를 찾지 못해 답변을 제공하지 않습니다.";
  } else {
    usedSources = chunks.slice(0, 3);
    answerText = await generateGroundedAnswer(question, usedSources);
  }

  const sourcesSnapshot = usedSources.map((s, i) => ({
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
      content: answerText,
      trustLevel: kind === "normal" ? trust : null,
      kind,
      sources: sourcesSnapshot,
    })
    .returning();

  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));

  return NextResponse.json({
    conversationId,
    userMessage: { id: userMessage.id, content: userMessage.content },
    assistantMessage: {
      id: assistantMessage.id,
      content: answerText,
      trustLevel: kind === "normal" ? trust : null,
      kind,
      sources: sourcesSnapshot,
    },
  });
}
