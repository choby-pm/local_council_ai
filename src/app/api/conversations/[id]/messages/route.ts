import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { conversations, messages } from "@/db/schema";
import { getActiveMember } from "@/lib/member";
import { isUuid } from "@/lib/utils";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getActiveMember();
  if (!member) return NextResponse.json({ error: "이용 권한이 없습니다" }, { status: 403 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "대화를 찾을 수 없습니다" }, { status: 404 });
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
