import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/db/schema";

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("사용법: npx dotenv -e .env.local -- npx tsx scripts/promote-master.ts <email>");
    process.exit(1);
  }

  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });

  const result = await db
    .update(schema.members)
    .set({ role: "master", status: "active", approvedAt: new Date() })
    .where(eq(schema.members.email, email))
    .returning();

  if (result.length === 0) {
    console.error(`"${email}" 로 가입된 계정을 찾을 수 없습니다. 먼저 /signup에서 가입 신청을 완료해주세요.`);
    process.exit(1);
  }

  console.log(`마스터로 승격됨: ${result[0].name} <${result[0].email}>`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
