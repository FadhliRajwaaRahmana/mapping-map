import { db } from "@/lib/db";
import { presence, user } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";

const STALE_MS = 30_000;

async function activeRows(mapId: string) {
  const rows = await db
    .select({ userId: presence.userId, lastSeen: presence.lastSeen })
    .from(presence)
    .where(eq(presence.mapId, mapId));
  const now = new Date();
  const active = rows.filter(
    (r) => now.getTime() - r.lastSeen.getTime() < STALE_MS,
  );
  if (active.length === 0) return [];
  const users = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(inArray(user.id, active.map((r) => r.userId)));
  const byId = new Map(users.map((u) => [u.id, u]));
  return active.map((r) => ({
    userId: r.userId,
    name: byId.get(r.userId)?.name ?? "?",
    lastSeen: r.lastSeen.getTime(),
  }));
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  return Response.json({ data: await activeRows(id) });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  const now = new Date();
  await db
    .insert(presence)
    .values({ mapId: id, userId: res.user.id, lastSeen: now })
    .onConflictDoUpdate({
      target: [presence.mapId, presence.userId],
      set: { lastSeen: now },
    });
  return Response.json({ data: await activeRows(id) });
}
