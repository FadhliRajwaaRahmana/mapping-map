/**
 * Seed superadmin: set user.role = 'superadmin' for SUPERADMIN_EMAIL.
 * Usage:
 *   SUPERADMIN_EMAIL=admin@example.com npx tsx scripts/seed-superadmin.ts
 * Or locally with Turso:
 *   DATABASE_URL=libsql://... DATABASE_AUTH_TOKEN=... SUPERADMIN_EMAIL=... npx tsx scripts/seed-superadmin.ts
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "../lib/schema";

const email = process.env.SUPERADMIN_EMAIL?.toLowerCase().trim();
if (!email) {
  console.error("Set SUPERADMIN_EMAIL env var. Example: SUPERADMIN_EMAIL=admin@example.com npx tsx scripts/seed-superadmin.ts");
  process.exit(1);
}

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN || undefined;
if (!url) {
  console.error("Set DATABASE_URL");
  process.exit(1);
}

const client = createClient({ url, authToken });
const db = drizzle(client, { schema });

const rows = await db.select().from(schema.user).where(eq(schema.user.email, email)).limit(1);
if (!rows[0]) {
  console.error(`User dengan email ${email} tidak ditemukan. Buat akun dulu via /register.`);
  await client.close();
  process.exit(1);
}

await db.update(schema.user).set({ role: "superadmin", updatedAt: new Date() }).where(eq(schema.user.email, email));
console.log(`✓ ${email} sekarang superadmin.`);

// Also ensure the env is set for Vercel: remind
console.log("Jangan lupa set SUPERADMIN_EMAIL di Vercel env vars jika belum.");

await client.close();
