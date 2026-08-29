import { db } from "@/lib/db";
import { user, account, maps, mapCollaborators } from "@/lib/schema";
import { requireSuperAdmin } from "@/lib/guards";
import { eq, count, sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const check = await requireSuperAdmin();
  if (!check.ok) return Response.json(check.body, { status: check.status });

  const { userId } = await params;
  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  const u = rows[0];
  if (!u) return Response.json({ error: "not_found", message: "User tidak ditemukan." }, { status: 404 });

  const pwRows = await db
    .select({ password: account.password })
    .from(account)
    .where(sql`${account.userId} = ${userId} AND ${account.providerId} = 'credential'`)
    .limit(1);

  const userMaps = await db.select().from(maps).where(eq(maps.ownerId, userId));
  const collabCount = await db
    .select({ value: count() })
    .from(mapCollaborators)
    .where(eq(mapCollaborators.userId, userId));

  return Response.json({
    data: {
      id: u.id,
      name: u.name,
      email: u.email,
      emailVerified: u.emailVerified,
      image: u.image,
      role: u.role,
      banned: u.banned,
      banReason: u.banReason,
      banExpiresAt: u.banExpiresAt,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      passwordHash: pwRows[0]?.password ?? null,
      maps: userMaps,
      collabCount: collabCount[0].value,
    },
  });
}
