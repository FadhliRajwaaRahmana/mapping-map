import { db } from "@/lib/db";
import { mapNodes } from "@/lib/schema";
import { requireMapAccess } from "@/lib/guards";
import { updateNodeSchema } from "@/lib/validators";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string; nodeId: string }> };

function findNode(mapId: string, nodeId: string) {
  return db
    .select()
    .from(mapNodes)
    .where(and(eq(mapNodes.mapId, mapId), eq(mapNodes.id, nodeId)))
    .limit(1);
}

export async function GET(request: Request, { params }: Ctx) {
  const { id, nodeId } = await params;
  const res = await requireMapAccess(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  const rows = await findNode(id, nodeId);
  if (rows.length === 0) {
    return Response.json(
      { error: "not_found", message: "Node tidak ditemukan." },
      { status: 404 },
    );
  }
  const n = rows[0];
  return Response.json({
    data: {
      id: n.id,
      elementId: n.elementId,
      title: n.title,
      contentMd: n.contentMd,
      updatedAt: n.updatedAt,
    },
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { id, nodeId } = await params;
  const res = await requireMapAccess(id, "editor");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "validation", message: "Body JSON tidak valid." },
      { status: 400 },
    );
  }
  const parsed = updateNodeSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "validation",
        message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
      },
      { status: 400 },
    );
  }
  const values: Record<string, unknown> = {
    updatedAt: new Date(),
    updatedBy: res.user.id,
  };
  if (parsed.data.title !== undefined) values.title = parsed.data.title;
  if (parsed.data.contentMd !== undefined)
    values.contentMd = parsed.data.contentMd;
  const rows = await db
    .update(mapNodes)
    .set(values)
    .where(and(eq(mapNodes.mapId, id), eq(mapNodes.id, nodeId)))
    .returning();
  if (rows.length === 0) {
    return Response.json(
      { error: "not_found", message: "Node tidak ditemukan." },
      { status: 404 },
    );
  }
  const n = rows[0];
  return Response.json({
    data: {
      id: n.id,
      elementId: n.elementId,
      title: n.title,
      contentMd: n.contentMd,
      updatedAt: n.updatedAt,
    },
  });
}

export async function DELETE(request: Request, { params }: Ctx) {
  const { id, nodeId } = await params;
  const res = await requireMapAccess(id, "editor");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  await db
    .delete(mapNodes)
    .where(and(eq(mapNodes.mapId, id), eq(mapNodes.id, nodeId)));
  return Response.json({ data: { ok: true } });
}
