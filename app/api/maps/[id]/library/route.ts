import { db } from "@/lib/db";
import { mapLibrary } from "@/lib/schema";
import { requireMapAccess } from "@/lib/guards";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const res = await requireMapAccess(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });

  const rows = await db
    .select()
    .from(mapLibrary)
    .where(eq(mapLibrary.mapId, id))
    .limit(1);

  if (rows.length === 0) {
    return Response.json({ data: { libraryItems: null } });
  }

  try {
    const parsed = JSON.parse(rows[0].dataJson);
    return Response.json({ data: { libraryItems: parsed } });
  } catch {
    return Response.json({ data: { libraryItems: null } });
  }
}

export async function PUT(request: Request, { params }: Ctx) {
  const { id } = await params;
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

  const libraryItems = (body as { libraryItems?: unknown })?.libraryItems;
  if (!Array.isArray(libraryItems)) {
    return Response.json(
      { error: "validation", message: "libraryItems harus berupa array." },
      { status: 400 },
    );
  }

  const dataJson = JSON.stringify(libraryItems);
  if (dataJson.length > 1024 * 1024) {
    return Response.json(
      { error: "too_large", message: "Library terlalu besar (>1 MB)." },
      { status: 413 },
    );
  }

  const now = new Date();
  const userId = res.user?.id ?? null;

  const existing = await db
    .select({ mapId: mapLibrary.mapId })
    .from(mapLibrary)
    .where(eq(mapLibrary.mapId, id))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(mapLibrary).values({
      mapId: id,
      dataJson,
      updatedBy: userId,
      updatedAt: now,
    });
  } else {
    await db
      .update(mapLibrary)
      .set({
        dataJson,
        updatedBy: userId,
        updatedAt: now,
      })
      .where(eq(mapLibrary.mapId, id));
  }

  return Response.json({ data: { ok: true } });
}
