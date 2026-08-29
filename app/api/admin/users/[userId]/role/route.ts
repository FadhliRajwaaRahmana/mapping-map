import { db } from "@/lib/db";
import { user } from "@/lib/schema";
import { requireSuperAdmin } from "@/lib/guards";
import { updateRoleSchema } from "@/lib/validators";
import { count, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const check = await requireSuperAdmin();
  if (!check.ok) return Response.json(check.body, { status: check.status });

  const { userId } = await params;
  if (userId === check.user.id) {
    return Response.json({ error: "forbidden", message: "Tidak bisa ubah role diri sendiri." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "validation", message: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = updateRoleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const [superadminCount] = await db.select({ value: count() }).from(user).where(eq(user.role, "superadmin"));
  const target = await db.select({ role: user.role }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target[0]) return Response.json({ error: "not_found", message: "User tidak ditemukan." }, { status: 404 });
  if (target[0]?.role === "superadmin" && parsed.data.role === "user" && superadminCount.value <= 1) {
    return Response.json({ error: "forbidden", message: "Tidak bisa demote superadmin terakhir." }, { status: 403 });
  }

  await db.update(user).set({ role: parsed.data.role, updatedAt: new Date() }).where(eq(user.id, userId));

  return Response.json({ data: { id: userId, role: parsed.data.role } });
}
