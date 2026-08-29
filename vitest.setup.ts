// Test env: use a real temp file DB (shared across all test connections) so the
// in-memory file::memory: per-connection isolation problem doesn't apply.
import { rmSync } from "node:fs";

rmSync("./vitest.db", { force: true });

// FORCE test isolation: never honor an externally-set DATABASE_URL (dev shell,
// CI, leaked env) — otherwise migrations + test data would be written to the
// real database. Tests always run against this throwaway file DB.
process.env.DATABASE_URL = "file:./vitest.db";
process.env.DATABASE_AUTH_TOKEN = "";
process.env.AUTH_SECRET = process.env.AUTH_SECRET ?? "test-secret-test-secret-test-secret-0000";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";

// Apply migrations to the test DB BEFORE any test or module import runs.
// Deterministic (awaited) — no fire-and-forget, no flake.
const { createClient } = await import("@libsql/client");
const { drizzle } = await import("drizzle-orm/libsql");
const { migrate } = await import("drizzle-orm/libsql/migrator");
const client = createClient({ url: process.env.DATABASE_URL! });
const testDb = drizzle(client);
await migrate(testDb, { migrationsFolder: "./drizzle" });
await client.close();
