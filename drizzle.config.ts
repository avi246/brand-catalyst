import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  casing: "snake_case",
  // Tiger Data ships extension-owned views (pg_buffercache, ...) in the public schema.
  // Never let drizzle-kit try to drop them.
  tablesFilter: ["!pg_*"],
  strict: true,
  verbose: true,
});
