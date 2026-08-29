import { db } from "@/lib/db";
import { maps } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { visibilitySchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "owner");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "validation", message: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = visibilitySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }
  const values: Record<string, unknown> = {
    visibility: parsed.data.visibility,
    updatedAt: new Date(),
  };
  if (parsed.data.publicRole) values.publicRole = parsed.data.publicRole;
  const rows = await db.update(maps).set(values).where(eq(maps.id, id)).returning();
  const updated = rows[0] as Record<string, unknown>;
  return Response.json({ data: { id: updated.id, visibility: updated.visibility, publicRole: updated.publicRole } });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  // Also allow public viewers to read visibility state — check map directly if requireMapRole denies
  if (!res.ok) {
    const mapRows = await db.select({ visibility: maps.visibility, publicRole: maps.publicRole }).from(maps).where(eq(maps.id, id)).limit(1);
    const map = mapRows[0];
    if (map?.visibility === "public") {
      return Response.json({ data: { visibility: map.visibility, publicRole: map.publicRole } });
    }
    return Response.json(res.body, { status: res.status });
  }
  const mapRows = await db.select({ visibility: maps.visibility, publicRole: maps.publicRole }).from(maps).where(eq(maps.id, id)).limit(1);
  const map = mapRows[0];
  if (!map) return Response.json({ error: "not_found", message: "Peta tidak ditemukan." }, { status: 404 });
  return Response.json({ data: { visibility: map.visibility, publicRole: map.publicRole } });
}
