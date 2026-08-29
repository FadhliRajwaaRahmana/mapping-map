import { db } from "@/lib/db";
import { maps, presence } from "@/lib/schema";
import { requireSuperAdmin } from "@/lib/guards";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function DELETE(_request: Request, { params }: { params: Promise<{ mapId: string }> }) {
  const check = await requireSuperAdmin();
  if (!check.ok) return Response.json(check.body, { status: check.status });

  const { mapId } = await params;
  const existing = await db.select({ id: maps.id }).from(maps).where(eq(maps.id, mapId)).limit(1);
  if (!existing[0]) return Response.json({ error: "not_found", message: "Peta tidak ditemukan." }, { status: 404 });

  await db.delete(maps).where(eq(maps.id, mapId));
  await db.delete(presence).where(eq(presence.mapId, mapId));
  return Response.json({ data: { ok: true } });
}
