import { db } from "@/lib/db";
import { user, maps, session } from "@/lib/schema";
import { requireSuperAdmin } from "@/lib/guards";
import { count, sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET() {
  const check = await requireSuperAdmin();
  if (!check.ok) return Response.json(check.body, { status: check.status });

  const [totalUsersRow] = await db.select({ value: count() }).from(user);
  const [totalMapsRow] = await db.select({ value: count() }).from(maps);
  const [publicMapsRow] = await db
    .select({ value: count() })
    .from(maps)
    .where(sql`${maps.visibility} = 'public'`);
  const [bannedRow] = await db
    .select({ value: count() })
    .from(user)
    .where(sql`${user.banned} = 1`);
  const [activeTodayRow] = await db
    .select({ value: count(sql`DISTINCT ${session.userId}`) })
    .from(session)
    .where(sql`${session.createdAt} > unixepoch('now', '-1 day') * 1000`);

  const recentUsers = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, banned: user.banned, createdAt: user.createdAt })
    .from(user)
    .orderBy(sql`${user.createdAt} DESC`)
    .limit(5);

  const recentMaps = await db
    .select({ id: maps.id, title: maps.title, visibility: maps.visibility, ownerId: maps.ownerId, createdAt: maps.createdAt })
    .from(maps)
    .orderBy(sql`${maps.createdAt} DESC`)
    .limit(5);

  return Response.json({
    data: {
      totalUsers: totalUsersRow.value,
      totalMaps: totalMapsRow.value,
      publicMaps: publicMapsRow.value,
      bannedUsers: bannedRow.value,
      activeToday: activeTodayRow.value,
      recentUsers,
      recentMaps,
    },
  });
}
