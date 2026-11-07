import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  // Don't throw at import time (it would break `next build`); queries will fail loudly instead.
  console.warn(
    "[db] DATABASE_URL is not set. Copy .env.example to .env.local and add your Tiger Data connection string.",
  );
}

// Reuse one client across hot reloads in development.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> };

const client =
  globalForDb.pgClient ??
  postgres(connectionString ?? "postgres://missing-database-url@127.0.0.1:1/missing", {
    max: 10,
    // Tiger Data requires TLS; the connection string carries sslmode=require.
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.pgClient = client;

export const db = drizzle(client, { schema, casing: "snake_case" });
export { schema };
