import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { conversations } from "@/db/schema";
import { getCurrentMember } from "@/lib/member";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { id } = await params;
  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "제목이 필요합니다" }, { status: 400 });

  const db = getDb();
  const [updated] = await db
    .update(conversations)
    .set({ title: title.trim(), updatedAt: new Date() })
    .where(and(eq(conversations.id, id), eq(conversations.memberId, member.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "대화를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json({ conversation: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.memberId, member.id)));

  return NextResponse.json({ ok: true });
}
