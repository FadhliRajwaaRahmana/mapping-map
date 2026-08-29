import { db } from "@/lib/db";
import { account, session } from "@/lib/schema";
import { requireSuperAdmin } from "@/lib/guards";
import { resetPasswordSchema } from "@/lib/validators";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "@better-auth/utils/password";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const check = await requireSuperAdmin();
  if (!check.ok) return Response.json(check.body, { status: check.status });

  const { userId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "validation", message: "Body JSON tidak valid." }, { status: 400 });
  }
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "validation", message: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  }

  const hash = await hashPassword(parsed.data.newPassword);

  const existing = await db
    .select({ id: account.id })
    .from(account)
    .where(sql`${account.userId} = ${userId} AND ${account.providerId} = 'credential'`)
    .limit(1);

  if (existing[0]) {
    await db.update(account).set({ password: hash, updatedAt: new Date() }).where(eq(account.id, existing[0].id));
  } else {
    const { newId } = await import("@/lib/utils");
    await db.insert(account).values({
      id: newId(),
      issuer: "local:credential",
      accountId: userId,
      providerId: "credential",
      userId,
      password: hash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db.delete(session).where(eq(session.userId, userId));

  return Response.json({ data: { ok: true } });
}
