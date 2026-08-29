import { db } from "@/lib/db";
import { user, maps } from "@/lib/schema";
import { requireSuperAdmin } from "@/lib/guards";
import { eq, count, desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  const check = await requireSuperAdmin();
  if (!check.ok) return Response.json(check.body, { status: check.status });

  const [totalUsersRow] = await db.select({ value: count() }).from(user);
  const [totalMapsRow] = await db.select({ value: count() }).from(maps);
  const [publicMapsRow] = await db.select({ value: count() }).from(maps).where(eq(maps.visibility, "public"));
  const [bannedRow] = await db.select({ value: count() }).from(user).where(eq(user.banned, true as unknown as boolean));

  const recentUsers = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, banned: user.banned, createdAt: user.createdAt })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(5);

  const recentMaps = await db
    .select({ id: maps.id, title: maps.title, visibility: maps.visibility, ownerId: maps.ownerId, createdAt: maps.createdAt })
    .from(maps)
    .orderBy(desc(maps.createdAt))
    .limit(5);

  return Response.json({
    data: {
      totalUsers: totalUsersRow.value,
      totalMaps: totalMapsRow.value,
      publicMaps: publicMapsRow.value,
      bannedUsers: bannedRow.value,
      recentUsers,
      recentMaps,
    },
  });
}
