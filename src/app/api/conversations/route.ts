import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { conversations } from "@/db/schema";
import { getCurrentMember } from "@/lib/member";

type Menu = "laws" | "meetings" | "budget" | "reports";

export async function GET(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const menu = req.nextUrl.searchParams.get("menu") as Menu | null;
  if (!menu) return NextResponse.json({ error: "menu가 필요합니다" }, { status: 400 });

  const db = getDb();
  const rows = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.memberId, member.id), eq(conversations.menu, menu)))
    .orderBy(desc(conversations.updatedAt));

  return NextResponse.json({ conversations: rows });
}

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const body = await req.json();
  const menu = body.menu as Menu;
  if (!menu) return NextResponse.json({ error: "menu가 필요합니다" }, { status: 400 });

  const db = getDb();
  const [conv] = await db
    .insert(conversations)
    .values({ memberId: member.id, menu, title: "새 대화" })
    .returning();

  return NextResponse.json({ conversation: conv });
}
