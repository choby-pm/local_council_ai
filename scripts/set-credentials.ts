import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

// 간이 인증 전환 이전(Clerk)에 가입한 회원에게 아이디·비밀번호를 부여 — 기존 대화·이력을 그대로 유지한 채 로그인 가능
// 사용법: npx dotenv -e .env.local -- npx tsx scripts/set-credentials.ts <기존 이메일> <새 아이디> <새 비밀번호>
async function main() {
  const [email, rawUsername, password] = process.argv.slice(2);
  if (!email || !rawUsername || !password) {
    console.error("사용법: npx dotenv -e .env.local -- npx tsx scripts/set-credentials.ts <기존 이메일> <새 아이디> <새 비밀번호>");
    process.exit(1);
  }

  const username = rawUsername.trim().toLowerCase();
  if (!/^[a-z0-9_]{4,20}$/.test(username)) {
    console.error("아이디는 영문 소문자·숫자·밑줄(_) 4~20자여야 합니다");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("비밀번호는 8자 이상이어야 합니다");
    process.exit(1);
  }

  const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

  const [taken] = await db
    .select({ email: schema.members.email })
    .from(schema.members)
    .where(eq(schema.members.username, username));
  if (taken && taken.email !== email) {
    console.error(`"${username}"는 이미 다른 회원이 사용 중인 아이디입니다`);
    process.exit(1);
  }

  const result = await db
    .update(schema.members)
    .set({ username, passwordHash: await hashPassword(password) })
    .where(eq(schema.members.email, email))
    .returning({ name: schema.members.name });

  if (result.length === 0) {
    console.error(`"${email}" 이메일로 가입된 회원을 찾을 수 없습니다`);
    process.exit(1);
  }

  console.log(`아이디 설정 완료: ${result[0].name} → ${username}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
