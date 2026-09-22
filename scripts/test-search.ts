import { neon } from "@neondatabase/serverless";
import { embed } from "ai";
import { google } from "@ai-sdk/google";

async function main() {
  const query = process.argv[2] ?? "주민참여예산제 관련 조례 알려줘";
  const sql = neon(process.env.DATABASE_URL!);

  const { embedding } = await embed({
    model: google.textEmbeddingModel("gemini-embedding-001"),
    value: query,
    providerOptions: { google: { outputDimensionality: 1536, taskType: "RETRIEVAL_QUERY" } },
  });

  const vectorLiteral = `[${embedding.join(",")}]`;
  const rows = await sql`
    SELECT d.title, d.type, d.council, dc.content, dc.embedding <=> ${vectorLiteral}::vector AS distance
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    ORDER BY distance ASC
    LIMIT 5
  `;

  console.log(`질의: "${query}"\n`);
  for (const r of rows as any[]) {
    console.log(`[${r.distance.toFixed(4)}] (${r.type}/${r.council ?? "전국"}) ${r.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
