import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { maps, mapState, mapNodes, mapCollaborators } from "@/lib/schema";
import { requireUser } from "@/lib/guards";
import { eq, and } from "drizzle-orm";
import { parseScene } from "@/lib/scene";
import { EditorClient } from "@/components/editor/editor-client";

export const metadata = { title: "Editor — Mapping" };

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) redirect("/login");

  const mapRows = await db
    .select()
    .from(maps)
    .where(eq(maps.id, id))
    .limit(1);
  const map = mapRows[0];
  if (!map) notFound();

  const collab = await db
    .select({ role: mapCollaborators.role })
    .from(mapCollaborators)
    .where(
      and(
        eq(mapCollaborators.mapId, id),
        eq(mapCollaborators.userId, user.id),
      ),
    )
    .limit(1);

  // Revoked/never-invited users must NOT get a read-only editor: show a denial state.
  const hasAccess = collab.length > 0 || map.ownerId === user.id;
  if (!hasAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold">
            Anda tidak punya akses ke peta ini.
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Minta owner untuk mengundang Anda kembali.
          </p>
        </div>
      </div>
    );
  }

  const role =
    (collab[0]?.role as "owner" | "editor" | "viewer" | undefined) ??
    (map.ownerId === user.id ? "owner" : "viewer");

  const stateRows = await db
    .select()
    .from(mapState)
    .where(eq(mapState.mapId, id))
    .limit(1);
  const scene = stateRows[0] ? parseScene(stateRows[0].scene) : null;
  const currentRevision = stateRows[0]?.revision ?? 0;

  const nodes = await db
    .select()
    .from(mapNodes)
    .where(eq(mapNodes.mapId, id));

  return (
    <EditorClient
      mapId={id}
      title={map.title}
      role={role}
      userName={user.name}
      selfUserId={user.id}
      initialScene={scene}
      initialRevision={currentRevision}
      initialNodes={nodes.map((n) => ({
        id: n.id,
        elementId: n.elementId,
        title: n.title,
        contentMd: n.contentMd,
      }))}
    />
  );
}
