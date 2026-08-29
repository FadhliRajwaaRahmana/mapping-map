import { db } from "@/lib/db";
import { mapNodes } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { createNodeFullSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  const rows = await db
    .select()
    .from(mapNodes)
    .where(eq(mapNodes.mapId, id));
  return Response.json({
    data: rows.map((n) => ({
      id: n.id,
      elementId: n.elementId,
      title: n.title,
      contentMd: n.contentMd,
      updatedAt: n.updatedAt,
    })),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "editor");
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
  const parsed = createNodeFullSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "validation",
        message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
      },
      { status: 400 },
    );
  }
  const now = new Date();
  try {
    await db.insert(mapNodes).values({
      id: parsed.data.id,
      mapId: id,
      elementId: parsed.data.elementId,
      title: parsed.data.title,
      createdAt: now,
      updatedAt: now,
      updatedBy: res.user.id,
    });
  } catch (e: unknown) {
    const err = e as { code?: string; message?: string };
    const msg = err?.message ?? String(e ?? "");
    if (err?.code === "SQLITE_CONSTRAINT" && msg.includes("map_nodes_map_element_uidx")) {
      return Response.json(
        { error: "conflict", message: "Node untuk elemen ini sudah ada." },
        { status: 409 },
      );
    }
    return Response.json(
      { error: "internal", message: "Gagal membuat node." },
      { status: 500 },
    );
  }
  return Response.json(
    {
      data: {
        id: parsed.data.id,
        elementId: parsed.data.elementId,
        title: parsed.data.title,
        contentMd: "",
        updatedAt: now,
      },
    },
    { status: 201 },
  );
}
