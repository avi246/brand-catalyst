// Enables pgvector on the database (idempotent). npx tsx scripts/db-enable-vector.ts
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    const avail = await sql`select name, default_version, installed_version from pg_available_extensions where name in ('vector', 'vectorscale')`;
    console.table(avail);
    await sql`create extension if not exists vector`;
    const [v] = await sql`select extversion from pg_extension where extname = 'vector'`;
    console.log("pgvector installed:", v?.extversion);
  } finally {
    await sql.end();
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
