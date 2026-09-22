import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getCurrentMember } from "@/lib/member";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [conv] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.memberId, member.id)));
  if (!conv) return NextResponse.json({ error: "대화를 찾을 수 없습니다" }, { status: 404 });

  const rows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  return NextResponse.json({ messages: rows });
}
