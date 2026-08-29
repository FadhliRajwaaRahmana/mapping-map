import { db } from "@/lib/db";
import { mapCollaborators, user } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { inviteSchema } from "@/lib/validators";
import { eq, and, inArray } from "drizzle-orm";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const res = await requireMapRole(id, "owner");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  const rows = await db
    .select({ userId: mapCollaborators.userId, role: mapCollaborators.role })
    .from(mapCollaborators)
    .where(eq(mapCollaborators.mapId, id));
  if (rows.length === 0) return Response.json({ data: [] });
  const users = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(inArray(user.id, rows.map((r) => r.userId)));
  const byId = new Map(users.map((u) => [u.id, u]));
  return Response.json({
    data: rows.map((r) => ({
      userId: r.userId,
      name: byId.get(r.userId)?.name ?? "Unknown",
      email: byId.get(r.userId)?.email ?? "",
      role: r.role as "owner" | "editor" | "viewer",
    })),
  });
}

export async function POST(
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
    return Response.json(
      { error: "validation", message: "Body JSON tidak valid." },
      { status: 400 },
    );
  }
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "validation",
        message: parsed.error.issues[0]?.message ?? "Data tidak valid.",
      },
      { status: 400 },
    );
  }
  const email = parsed.data.email.toLowerCase();
  const targets = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (targets.length === 0) {
    return Response.json(
      {
        error: "conflict",
        message: "Email belum terdaftar. Minta dia membuat akun dulu.",
      },
      { status: 409 },
    );
  }
  const target = targets[0];
  const existing = await db
    .select({ role: mapCollaborators.role })
    .from(mapCollaborators)
    .where(
      and(
        eq(mapCollaborators.mapId, id),
        eq(mapCollaborators.userId, target.id),
      ),
    )
    .limit(1);
  if (existing.length > 0) {
    return Response.json(
      { error: "conflict", message: "User sudah jadi kolaborator." },
      { status: 409 },
    );
  }
  await db.insert(mapCollaborators).values({
    mapId: id,
    userId: target.id,
    role: parsed.data.role,
    createdAt: new Date(),
  });
  return Response.json(
    { data: { userId: target.id, email, role: parsed.data.role } },
    { status: 201 },
  );
}
