import { db } from "@/lib/db";
import { maps, mapState } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { saveStateSchema } from "@/lib/validators";
import {
  parseScene,
  sceneSizeBytes,
  mergeFiles,
  mergeElementsLWW,
  type ScenePayload,
} from "@/lib/scene";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

const MAX_BODY = 4 * 1024 * 1024;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "viewer");
  if (!res.ok) return Response.json(res.body, { status: res.status });

  const rows = await db
    .select()
    .from(mapState)
    .where(eq(mapState.mapId, id))
    .limit(1);
  const row = rows[0];
  if (!row) {
    return Response.json(
      { data: { revision: 0, scene: null } },
      { headers: { ETag: '"0"' } },
    );
  }

  const ifNoneMatch = request.headers.get("if-none-match");
  if (ifNoneMatch && ifNoneMatch === `"${row.revision}"`) {
    return new Response(null, { status: 304 });
  }

  return Response.json(
    { data: { revision: row.revision, scene: JSON.parse(row.scene) } },
    { headers: { ETag: `"${row.revision}"` } },
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "editor");
  if (!res.ok) return Response.json(res.body, { status: res.status });

  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return Response.json(
      {
        error: "too_large",
        message:
          "Scene melebihi 4MB — hapus beberapa gambar lalu coba lagi.",
      },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return Response.json(
      { error: "validation", message: "Body JSON tidak valid." },
      { status: 400 },
    );
  }

  const parsed = saveStateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "validation",
        message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
      },
      { status: 400 },
    );
  }

  const incoming = parsed.data.scene as unknown as ScenePayload;

  const storedRows = await db
    .select()
    .from(mapState)
    .where(eq(mapState.mapId, id))
    .limit(1);
  const stored = storedRows[0] ? parseScene(storedRows[0].scene) : null;

  let finalScene: ScenePayload;
  if (!stored) {
    finalScene = incoming;
  } else {
    // Server-safe merge: per-element LWW by version, union files.
    const mergedElements = mergeElementsLWW(
      stored.elements ?? [],
      incoming.elements ?? [],
    );
    const mergedFiles = mergeFiles(
      (incoming.files ?? {}) as Record<string, unknown>,
      (stored.files ?? {}) as Record<string, unknown>,
    );
    finalScene = {
      type: "excalidraw",
      version: 2,
      source: incoming.source ?? "mapping-app",
      elements: mergedElements,
      appState: { ...(stored.appState ?? {}), ...(incoming.appState ?? {}) },
      files: mergedFiles,
    };
  }

  if (sceneSizeBytes(finalScene) > MAX_BODY) {
    return Response.json(
      {
        error: "too_large",
        message: "Scene gabungan melebihi 4MB — hapus beberapa gambar.",
      },
      { status: 413 },
    );
  }

  const revision = (storedRows[0]?.revision ?? 0) + 1;
  const now = new Date();
  const json = JSON.stringify(finalScene);
  await db
    .insert(mapState)
    .values({
      mapId: id,
      revision,
      scene: json,
      updatedBy: res.user.id,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: mapState.mapId,
      set: { revision, scene: json, updatedBy: res.user.id, updatedAt: now },
    });
  await db.update(maps).set({ updatedAt: now }).where(eq(maps.id, id));

  return Response.json(
    { data: { revision, scene: finalScene } },
    { headers: { ETag: `"${revision}"` } },
  );
}
