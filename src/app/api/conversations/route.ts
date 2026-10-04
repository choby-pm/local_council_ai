import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { conversations } from "@/db/schema";
import { getActiveMember } from "@/lib/member";

const MENUS = ["laws", "meetings", "budget", "reports", "assistant"] as const;
type Menu = (typeof MENUS)[number];

function parseMenu(value: unknown): Menu | null {
  return MENUS.includes(value as Menu) ? (value as Menu) : null;
}

export async function GET(req: NextRequest) {
  const member = await getActiveMember();
  if (!member) return NextResponse.json({ error: "이용 권한이 없습니다" }, { status: 403 });

  const menu = parseMenu(req.nextUrl.searchParams.get("menu"));
  if (!menu) return NextResponse.json({ error: "menu가 필요합니다" }, { status: 400 });

  const db = getDb();
  const rows = await db
    .select()
    .from(conversations)
    // 통합 AI 비서는 메뉴 통합 이전의 대화(법령·조례, 회의·안건 등)까지 함께 보여준다
    .where(
      menu === "assistant"
        ? eq(conversations.memberId, member.id)
        : and(eq(conversations.memberId, member.id), eq(conversations.menu, menu))
    )
    .orderBy(desc(conversations.updatedAt));

  return NextResponse.json({ conversations: rows });
}

export async function POST(req: NextRequest) {
  const member = await getActiveMember();
  if (!member) return NextResponse.json({ error: "이용 권한이 없습니다" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const menu = parseMenu(body?.menu);
  if (!menu) return NextResponse.json({ error: "menu가 필요합니다" }, { status: 400 });

  const db = getDb();
  const [conv] = await db
    .insert(conversations)
    .values({ memberId: member.id, menu, title: "새 대화" })
    .returning();

  return NextResponse.json({ conversation: conv });
}
