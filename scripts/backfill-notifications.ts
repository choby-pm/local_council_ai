import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "../src/db/schema";
import { buildDocumentNotification } from "../src/lib/document-notifications";

// 알림 기능 도입 이전에 적재된 문서에 대해 알림을 생성. 이미 알림이 있는 문서는 건너뛰므로 여러 번 실행해도 안전.
// 사용법: npx dotenv -e .env.local -- npx tsx scripts/backfill-notifications.ts
async function main() {
  const db = drizzle(neon(process.env.DATABASE_URL!), { schema });

  const docs = await db
    .select({
      id: schema.documents.id,
      type: schema.documents.type,
      council: schema.documents.council,
      title: schema.documents.title,
      sourceMeta: schema.documents.sourceMeta,
    })
    .from(schema.documents);

  const existing = new Set(
    (await db.select({ documentId: schema.notifications.documentId }).from(schema.notifications))
      .map((r) => r.documentId)
      .filter(Boolean)
  );
  const targets = docs.filter((d) => !existing.has(d.id));

  if (targets.length === 0) {
    console.log("새로 생성할 알림이 없습니다");
    return;
  }

  await db.insert(schema.notifications).values(targets.map(buildDocumentNotification));
  for (const d of targets) console.log(`알림 생성: [${d.type}] ${d.title}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
