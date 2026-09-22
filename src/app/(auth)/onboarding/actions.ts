"use server";

import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { members } from "@/db/schema";
import { getCurrentMember } from "@/lib/member";

export async function markOnboarded() {
  const member = await getCurrentMember();
  if (!member) throw new Error("로그인 상태가 아닙니다");

  const db = getDb();
  await db.update(members).set({ onboardedAt: new Date() }).where(eq(members.id, member.id));
}
