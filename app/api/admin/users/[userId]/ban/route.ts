import { db } from "@/lib/db";
import { user, session } from "@/lib/schema";
import { requireSuperAdmin } from "@/lib/guards";
import { banSchema } from "@/lib/validators";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const check = await requireSuperAdmin();
  if (!check.ok) return Response.json(check.body, { status: check.status });

  const { userId } = await params;
  if (userId === check.user.id) {
    return Response.json({ error: "forbidden", message: "Tidak bisa ban diri sendiri." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "validation", message: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = banSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const existing = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).limit(1);
  if (!existing[0]) return Response.json({ error: "not_found", message: "User tidak ditemukan." }, { status: 404 });

  await db
    .update(user)
    .set({
      banned: parsed.data.banned,
      banReason: parsed.data.banned ? (parsed.data.banReason ?? null) : null,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  // If banning, invalidate all sessions so user is logged out immediately
  if (parsed.data.banned) {
    await db.delete(session).where(eq(session.userId, userId));
  }

  return Response.json({ data: { id: userId, banned: parsed.data.banned } });
}
