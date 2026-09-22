import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { members } from "@/db/schema";

export type Member = typeof members.$inferSelect;

export async function getCurrentMember(): Promise<Member | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(members)
    .where(eq(members.clerkUserId, userId))
    .limit(1);

  return rows[0] ?? null;
}
