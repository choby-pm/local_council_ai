import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

// 가입 화면을 거치지 않고 바로 사용 가능한(active) 계정을 만든다. 이미 있는 아이디면 비밀번호·권한만 갱신.
// 사용법: npx dotenv -e .env.local -- npx tsx scripts/create-account.ts <아이디> <비밀번호> <이름> [--master]
async function main() {
  const args = process.argv.slice(2);
  const master = args.includes("--master");
  const [rawUsername, password, name] = args.filter((a) => !a.startsWith("--"));
  if (!rawUsername || !password || !name) {
    console.error("사용법: npx dotenv -e .env.local -- npx tsx scripts/create-account.ts <아이디> <비밀번호> <이름> [--master]");
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
  const values = {
    username,
    name,
    passwordHash: await hashPassword(password),
    role: master ? ("master" as const) : ("member" as const),
    status: "active" as const,
    approvedAt: new Date(),
  };

  const [existing] = await db
    .select({ id: schema.members.id })
    .from(schema.members)
    .where(eq(schema.members.username, username));

  if (existing) {
    await db.update(schema.members).set(values).where(eq(schema.members.id, existing.id));
    console.log(`기존 계정 갱신: ${username} (${values.role})`);
  } else {
    await db.insert(schema.members).values(values);
    console.log(`계정 생성: ${username} (${values.role})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
