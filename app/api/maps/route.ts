import { db } from "@/lib/db";
import { maps, mapCollaborators } from "@/lib/schema";
import { requireUser } from "@/lib/guards";
import { createMapSchema } from "@/lib/validators";
import { newId } from "@/lib/utils";
import { desc, or, eq, and } from "drizzle-orm";

export const runtime = "nodejs";

function jsonError(status: number, error: string, message: string) {
  return Response.json({ error, message }, { status });
}

export async function GET() {
  const user = await requireUser();
  if (!user) return jsonError(401, "unauthorized", "Silakan masuk dulu.");
  const rows = await db
    .select({
      id: maps.id,
      title: maps.title,
      description: maps.description,
      isArchived: maps.isArchived,
      updatedAt: maps.updatedAt,
      ownerId: maps.ownerId,
      role: mapCollaborators.role,
    })
    .from(maps)
    .leftJoin(mapCollaborators, and(eq(mapCollaborators.mapId, maps.id), eq(mapCollaborators.userId, user.id)))
    .where(or(eq(maps.ownerId, user.id), eq(mapCollaborators.userId, user.id)))
    .orderBy(desc(maps.updatedAt));
  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    isArchived: r.isArchived,
    updatedAt: r.updatedAt,
    mine: r.ownerId === user.id,
    role: (r.role as "owner" | "editor" | "viewer" | undefined) ?? (r.ownerId === user.id ? "owner" : "viewer"),
  }));
  return Response.json({ data });
}

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) return jsonError(401, "unauthorized", "Silakan masuk dulu.");
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "validation", "Body JSON tidak valid.");
  }
  const parsed = createMapSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, "validation", parsed.error.issues[0]?.message ?? "Data tidak valid.");
  }
  const id = newId();
  // The schema uses `timestamp_ms` (Date-based) — drizzle calls value.getTime()
  // on write, so it must be a Date, not an epoch-ms number.
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(maps).values({
      id,
      ownerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      createdAt: now,
      updatedAt: now,
    });
    // INVARIANT: owner always has a collaborator row (requireMapRole relies on it —
    // the IDOR fix in Task 3 treats "no collaborator row" as "not a member").
    await tx.insert(mapCollaborators).values({ mapId: id, userId: user.id, role: "owner", createdAt: now });
  });
  return Response.json({ data: { id, title: parsed.data.title } }, { status: 201 });
}
