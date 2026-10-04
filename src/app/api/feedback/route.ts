import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { conversations, feedback, messages } from "@/db/schema";
import { getActiveMember } from "@/lib/member";
import { isUuid } from "@/lib/utils";

const MAX_REASON_LENGTH = 200;

export async function POST(req: NextRequest) {
  const member = await getActiveMember();
  if (!member) return NextResponse.json({ error: "이용 권한이 없습니다" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const messageId = body?.messageId;
  const reaction = body?.reaction;
  const reason = typeof body?.reason === "string" ? body.reason.slice(0, MAX_REASON_LENGTH) : null;
  if (!isUuid(messageId) || (reaction !== "up" && reaction !== "down")) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const db = getDb();

  // 본인 대화에 속한 AI 답변에만 피드백 허용
  const [target] = await db
    .select({ id: messages.id })
    .from(messages)
    .innerJoin(conversations, eq(conversations.id, messages.conversationId))
    .where(
      and(
        eq(messages.id, messageId),
        eq(messages.role, "assistant"),
        eq(conversations.memberId, member.id)
      )
    );
  if (!target) return NextResponse.json({ error: "메시지를 찾을 수 없습니다" }, { status: 404 });

  // 답변당 회원별 피드백은 1건 — 이전 반응을 지우고 새로 기록 (neon-http batch는 단일 트랜잭션)
  await db.batch([
    db
      .delete(feedback)
      .where(and(eq(feedback.messageId, messageId), eq(feedback.memberId, member.id))),
    db.insert(feedback).values({ messageId, memberId: member.id, reaction, reason }),
  ]);

  return NextResponse.json({ ok: true });
}
