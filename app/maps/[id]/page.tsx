import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { maps, mapState, mapNodes } from "@/lib/schema";
import { requireUser, getMapAccess } from "@/lib/guards";
import { eq } from "drizzle-orm";
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

  const mapRows = await db
    .select()
    .from(maps)
    .where(eq(maps.id, id))
    .limit(1);
  const map = mapRows[0];
  if (!map) notFound();

  // Visibility-aware access: private requires collaborator/owner, public allows anyone
  const access = await getMapAccess(id);
  // For public maps, allow anonymous viewer access (no login required)
  const isPublicViewer = (map.visibility as string) === "public" && (map.publicRole as string) === "viewer";
  if (!access.hasAccess) {
    // Public viewer maps: allow anonymous read
    if (isPublicViewer && !user) {
      const stateRowsAnon = await db.select().from(mapState).where(eq(mapState.mapId, id)).limit(1);
      const sceneAnon = stateRowsAnon[0] ? parseScene(stateRowsAnon[0].scene) : null;
      const revAnon = stateRowsAnon[0]?.revision ?? 0;
      const nodesAnon = await db.select().from(mapNodes).where(eq(mapNodes.mapId, id));
      return (
        <EditorClient
          mapId={id}
          title={map.title}
          role="viewer"
          userName="Tamu"
          selfUserId="anon"
          initialScene={sceneAnon}
          initialRevision={revAnon}
          initialNodes={nodesAnon.map((n) => ({ id: n.id, elementId: n.elementId, title: n.title, contentMd: n.contentMd }))}
        />
      );
    }
    if (!user) redirect("/login");
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Anda tidak punya akses ke peta ini.</h1>
          <p className="mt-2 text-sm text-muted-foreground">Minta owner untuk mengundang Anda kembali.</p>
        </div>
      </div>
    );
  }
  // At this point access.hasAccess is true and user is not null (anon case already returned above)
  const role = access.role as "owner" | "editor" | "viewer";

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
      userName={user!.name}
      selfUserId={user!.id}
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
