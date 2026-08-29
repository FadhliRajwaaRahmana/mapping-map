import { db } from "@/lib/db";
import { user, account } from "@/lib/schema";
import { requireSuperAdmin } from "@/lib/guards";
import { eq, count, inArray, and, or, like } from "drizzle-orm";
import { desc } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const check = await requireSuperAdmin();
  if (!check.ok) return Response.json(check.body, { status: check.status });

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const roleFilter = url.searchParams.get("role");
  const bannedFilter = url.searchParams.get("banned");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20));
  const offset = (page - 1) * limit;

  const conditions: ReturnType<typeof eq>[] = [];
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(or(like(user.email, pattern), like(user.name, pattern)) as unknown as ReturnType<typeof eq>);
  }
  if (roleFilter && roleFilter !== "all") {
    conditions.push(eq(user.role, roleFilter as "user" | "superadmin"));
  }
  if (bannedFilter === "true") conditions.push(eq(user.banned, true as unknown as boolean));
  else if (bannedFilter === "false") conditions.push(eq(user.banned, false as unknown as boolean));

  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [totalRow] = await db.select({ value: count() }).from(user).where(whereClause);

  const rows = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: user.role,
      banned: user.banned,
      banReason: user.banReason,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })
    .from(user)
    .where(whereClause)
    .orderBy(desc(user.createdAt))
    .limit(limit)
    .offset(offset);

  const userIds = rows.map((r) => r.id);
  const hashes = userIds.length
    ? await db
        .select({ userId: account.userId, password: account.password })
        .from(account)
        .where(and(inArray(account.userId, userIds), eq(account.providerId, "credential")))
    : [];
  const hashByUserId = new Map(hashes.map((h) => [h.userId, h.password]));

  const data = rows.map((r) => ({
    ...r,
    passwordHash: hashByUserId.get(r.id) ?? null,
  }));

  return Response.json({ data, total: totalRow.value, page, limit });
}
