"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/db";
import { members } from "@/db/schema";
import { createSession, deleteSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export type AuthFormState = {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "username" | "password", string>>;
  values?: { name?: string; username?: string };
} | undefined;

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{4,20}$/, "아이디는 영문 소문자·숫자·밑줄(_) 4~20자로 입력해주세요");

const signupSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요").max(30, "이름은 30자 이내로 입력해주세요"),
  username: usernameSchema,
  password: z
    .string()
    .min(8, "비밀번호는 8자 이상이어야 합니다")
    .max(100, "비밀번호는 100자 이내로 입력해주세요"),
});

export async function signup(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const raw = {
    name: String(formData.get("name") ?? ""),
    username: String(formData.get("username") ?? ""),
    password: String(formData.get("password") ?? ""),
  };
  const values = { name: raw.name, username: raw.username };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: NonNullable<AuthFormState>["fieldErrors"] = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof typeof fieldErrors;
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors, values };
  }

  const { name, username, password } = parsed.data;
  const db = getDb();
  const now = new Date();

  // MVP: 승인·온보딩 절차 없이 가입 즉시 사용 가능 (인증 고도화 시 재도입)
  const [member] = await db
    .insert(members)
    .values({
      username,
      passwordHash: await hashPassword(password),
      name,
      status: "active",
      approvedAt: now,
      onboardedAt: now,
    })
    .onConflictDoNothing({ target: members.username })
    .returning({ id: members.id });

  if (!member) {
    return { fieldErrors: { username: "이미 사용 중인 아이디입니다" }, values };
  }

  await createSession(member.id);
  redirect("/");
}

// 존재하지 않는 아이디에도 같은 시간만큼 해시 비교를 수행해 응답 시간으로 아이디 존재 여부가 드러나지 않게 함
const DUMMY_HASH = `scrypt$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(64).toString("base64")}`;

export async function login(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const values = { username };

  if (!username || !password) {
    return { error: "아이디와 비밀번호를 입력해주세요", values };
  }

  const [member] = await getDb()
    .select({ id: members.id, passwordHash: members.passwordHash })
    .from(members)
    .where(eq(members.username, username));

  const valid = await verifyPassword(password, member?.passwordHash ?? DUMMY_HASH);
  if (!member || !valid) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다", values };
  }

  // 회원 상태(대기·거절·비활성)에 따른 화면 분기는 (app) 레이아웃이 담당
  await createSession(member.id);
  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
