import { NextRequest, NextResponse } from "next/server";

import { getDb } from "@/db";
import { feedback } from "@/db/schema";
import { getCurrentMember } from "@/lib/member";

export async function POST(req: NextRequest) {
  const member = await getCurrentMember();
  if (!member) return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });

  const { messageId, reaction, reason } = await req.json();
  if (!messageId || (reaction !== "up" && reaction !== "down")) {
    return NextResponse.json({ error: "잘못된 요청입니다" }, { status: 400 });
  }

  const db = getDb();
  await db.insert(feedback).values({ messageId, memberId: member.id, reaction, reason: reason ?? null });

  return NextResponse.json({ ok: true });
}
