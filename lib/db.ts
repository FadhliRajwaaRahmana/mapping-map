import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { env } from "./env";
import * as schema from "./schema";

// globalThis guard so Next dev HMR doesn't leak libsql handles on each reload.
const g = globalThis as unknown as { __libsqlClient?: ReturnType<typeof createClient> };
const client = g.__libsqlClient ?? createClient({
  url: env.DATABASE_URL,
  authToken: env.DATABASE_AUTH_TOKEN,
});
if (process.env.NODE_ENV !== "production") g.__libsqlClient = client;

export const db = drizzle(client, { schema });
