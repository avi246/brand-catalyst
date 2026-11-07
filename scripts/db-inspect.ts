// Prints what exists in the database's public schema. Usage: npx tsx scripts/db-inspect.ts
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    const tables = await sql`
      select table_name, table_type from information_schema.tables
      where table_schema = 'public' order by table_type, table_name`;
    console.table(tables);
    const ext = await sql`select extname, extversion from pg_extension order by extname`;
    console.table(ext);
    const types = await sql`
      select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typtype = 'e' order by 1`;
    console.log("enums:", types.map((r) => r.typname).join(", ") || "(none)");
    const drizzleMigrations = await sql`
      select to_regclass('drizzle.__drizzle_migrations') as tbl`;
    console.log("drizzle migrations table:", drizzleMigrations[0].tbl ?? "(none)");
  } finally {
    await sql.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
