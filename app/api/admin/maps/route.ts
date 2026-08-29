import { db } from "@/lib/db";
import { maps, user, mapNodes } from "@/lib/schema";
import { requireSuperAdmin } from "@/lib/guards";
import { sql, count, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const check = await requireSuperAdmin();
  if (!check.ok) return Response.json(check.body, { status: check.status });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const visibility = url.searchParams.get("visibility"); // private | public | all
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof sql>[] = [];
  if (q) conditions.push(sql`${maps.title} LIKE ${`%${q}%`}`);
  if (visibility && visibility !== "all") conditions.push(sql`${maps.visibility} = ${visibility}`);

  const whereClause = conditions.length ? sql.join(conditions, sql` AND `) : undefined;

  const [totalRow] = await db.select({ value: count() }).from(maps).where(whereClause);
  const rows = await db
    .select({
      id: maps.id,
      title: maps.title,
      description: maps.description,
      visibility: maps.visibility,
      publicRole: maps.publicRole,
      isArchived: maps.isArchived,
      ownerId: maps.ownerId,
      createdAt: maps.createdAt,
      updatedAt: maps.updatedAt,
    })
    .from(maps)
    .where(whereClause)
    .orderBy(sql`${maps.updatedAt} DESC`)
    .limit(limit)
    .offset(offset);

  // Enrich with owner info + node count
  const ownerIds = [...new Set(rows.map((r) => r.ownerId))];
  const owners = ownerIds.length
    ? await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(sql`${user.id} IN ${sql.join(ownerIds.map((id) => sql`${id}`), sql`, `)}`)
    : [];
  const ownerById = new Map(owners.map((o) => [o.id, o]));

  const data = rows.map((r) => ({
    ...r,
    owner: ownerById.get(r.ownerId) ?? { id: r.ownerId, name: "Unknown", email: "" },
  }));

  return Response.json({ data, total: totalRow.value, page, limit });
}
