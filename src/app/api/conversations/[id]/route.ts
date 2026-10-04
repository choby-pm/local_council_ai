import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { conversations } from "@/db/schema";
import { getActiveMember } from "@/lib/member";
import { isUuid } from "@/lib/utils";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getActiveMember();
  if (!member) return NextResponse.json({ error: "이용 권한이 없습니다" }, { status: 403 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "대화를 찾을 수 없습니다" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 100) : "";
  if (!title) return NextResponse.json({ error: "제목이 필요합니다" }, { status: 400 });

  const db = getDb();
  const [updated] = await db
    .update(conversations)
    .set({ title, updatedAt: new Date() })
    .where(and(eq(conversations.id, id), eq(conversations.memberId, member.id)))
    .returning();

  if (!updated) return NextResponse.json({ error: "대화를 찾을 수 없습니다" }, { status: 404 });
  return NextResponse.json({ conversation: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const member = await getActiveMember();
  if (!member) return NextResponse.json({ error: "이용 권한이 없습니다" }, { status: 403 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "대화를 찾을 수 없습니다" }, { status: 404 });
  const db = getDb();
  await db.delete(conversations).where(and(eq(conversations.id, id), eq(conversations.memberId, member.id)));

  return NextResponse.json({ ok: true });
}
