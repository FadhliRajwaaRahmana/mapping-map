import { db } from "@/lib/db";
import { maps, mapState, mapNodes, mapFiles, presence, mapCollaborators, user as userTable } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { renameMapSchema } from "@/lib/validators";
import { eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";

function jsonError(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  const mapRows = await db.select().from(maps).where(eq(maps.id, id)).limit(1);
  const map = mapRows[0];
  if (!map) return jsonError(404, "not_found", "Peta tidak ditemukan.");
  const stateRows = await db.select().from(mapState).where(eq(mapState.mapId, id)).limit(1);
  const state = stateRows[0]
    ? { revision: stateRows[0].revision, scene: JSON.parse(stateRows[0].scene) }
    : null;
  const nodes = await db.select().from(mapNodes).where(eq(mapNodes.mapId, id));
  const files = await db
    .select({ id: mapFiles.id, fileId: mapFiles.fileId, filename: mapFiles.filename, mime: mapFiles.mime, createdAt: mapFiles.createdAt })
    .from(mapFiles)
    .where(eq(mapFiles.mapId, id));
  const collaborators = await (async () => {
    const rows = await db
      .select({ userId: mapCollaborators.userId, role: mapCollaborators.role })
      .from(mapCollaborators)
      .where(eq(mapCollaborators.mapId, id));
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.userId);
    const users = await db
      .select({ id: userTable.id, name: userTable.name, email: userTable.email })
      .from(userTable)
      .where(inArray(userTable.id, ids));
    const byId = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => ({
      userId: r.userId,
      name: byId.get(r.userId)?.name ?? "Unknown",
      email: byId.get(r.userId)?.email ?? "",
      role: r.role as "owner" | "editor" | "viewer",
    }));
  })();
  return Response.json({
    data: {
      map: { id: map.id, title: map.title, description: map.description, isArchived: map.isArchived, role: res.role },
      state,
      nodes: nodes.map((n) => ({ id: n.id, elementId: n.elementId, title: n.title, contentMd: n.contentMd, updatedAt: n.updatedAt })),
      files: files.map((f) => ({ id: f.id, fileId: f.fileId, filename: f.filename, mime: f.mime, size: 0, createdAt: f.createdAt })),
      collaborators,
    },
  });
}

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
    return jsonError(400, "validation", "Body JSON tidak valid.");
  }
  const parsed = renameMapSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  }
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (parsed.data.title !== undefined) values.title = parsed.data.title;
  if (parsed.data.description !== undefined) values.description = parsed.data.description;
  if (parsed.data.isArchived !== undefined) values.isArchived = parsed.data.isArchived;
  const rows = await db.update(maps).set(values).where(eq(maps.id, id)).returning();
  return Response.json({ data: { ...rows[0] } });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "owner");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  await db.delete(maps).where(eq(maps.id, id)); // cascades to state/nodes/files/collaborators
  await db.delete(presence).where(eq(presence.mapId, id));
  return Response.json({ data: { ok: true } });
}
