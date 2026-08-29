import { db } from "@/lib/db";
import { mapCollaborators } from "@/lib/schema";
import { requireMapRole } from "@/lib/guards";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id, userId } = await params;
  const res = await requireMapRole(id, "owner");
  if (!res.ok) return Response.json(res.body, { status: res.status });
  if (userId === res.user.id) {
    return Response.json(
      {
        error: "conflict",
        message: "Anda tidak bisa menghapus diri sendiri sebagai owner.",
      },
      { status: 409 },
    );
  }
  await db
    .delete(mapCollaborators)
    .where(
      and(
        eq(mapCollaborators.mapId, id),
        eq(mapCollaborators.userId, userId),
      ),
    );
  return Response.json({ data: { ok: true } });
}
