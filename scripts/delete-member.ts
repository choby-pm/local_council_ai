import { eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/db/schema";

async function main() {
  const email = process.argv[2];
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });
  const deleted = await db.delete(schema.members).where(eq(schema.members.email, email)).returning();
  console.log(`삭제됨: ${deleted.length}건`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
