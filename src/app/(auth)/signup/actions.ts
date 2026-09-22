"use server";

import { auth, currentUser } from "@clerk/nextjs/server";

import { getDb } from "@/db";
import { members } from "@/db/schema";

export async function createMemberProfile(input: {
  name: string;
  council: string;
  committee: string;
  district: string;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("로그인 상태가 아닙니다");

  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress ?? "";

  const db = getDb();
  await db.insert(members).values({
    clerkUserId: userId,
    name: input.name,
    email,
    council: input.council,
    committee: input.committee,
    district: input.district,
  });
}
