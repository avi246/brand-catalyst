// Lists real (non-demo) connections and their consignments. npx tsx scripts/db-deals.ts
import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false, max: 1 });
  try {
    const rows = await sql`
      select c.id as connection, c.status as connection_status,
             fu.display_name as from_user, tu.display_name as to_user,
             k.title, k.status as deal_status, k.updated_at
      from connections c
      join users fu on fu.id = c.from_user_id
      join users tu on tu.id = c.to_user_id
      left join consignments k on k.connection_id = c.id
      where not fu.is_demo and not tu.is_demo
      order by c.created_at, k.updated_at`;
    console.table(rows);
  } finally {
    await sql.end();
  }
}
main();
