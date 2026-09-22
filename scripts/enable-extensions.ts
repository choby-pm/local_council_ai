import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL!);
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  console.log("vector extension enabled");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
