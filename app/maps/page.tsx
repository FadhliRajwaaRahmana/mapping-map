import { redirect } from "next/navigation";
import { requireUser } from "@/lib/guards";
import { db } from "@/lib/db";
import { maps, mapCollaborators } from "@/lib/schema";
import { or, eq, and, desc } from "drizzle-orm";
import { MapCard } from "@/components/maps/map-card";
import { NewMapDialog } from "@/components/maps/new-map-dialog";
import { LogoutButton } from "@/components/maps/logout-button";

export const metadata = { title: "Peta Saya — Mapping" };

export default async function MapsPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

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
    .leftJoin(
      mapCollaborators,
      and(eq(mapCollaborators.mapId, maps.id), eq(mapCollaborators.userId, user.id)),
    )
    .where(or(eq(maps.ownerId, user.id), eq(mapCollaborators.userId, user.id)))
    .orderBy(desc(maps.updatedAt));

  const mapsData = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    isArchived: r.isArchived,
    updatedAt: r.updatedAt,
    mine: r.ownerId === user.id,
    role: (r.role as "owner" | "editor" | "viewer" | undefined) ?? (r.ownerId === user.id ? "owner" : "viewer"),
  }));

  const active = mapsData.filter((m) => !m.isArchived);
  const archived = mapsData.filter((m) => m.isArchived);

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              M
            </div>
            <span className="text-lg font-semibold tracking-tight">Mapping</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user.name}
            </span>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Peta Saya</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mapsData.length === 0
                ? "Buat peta pertamamu untuk mulai mapping."
                : `${active.length} peta aktif${archived.length > 0 ? `, ${archived.length} diarsipkan` : ""}`}
            </p>
          </div>
          <NewMapDialog />
        </div>

        {mapsData.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-8 py-20 text-center">
            <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-muted-foreground"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12h8" />
                <path d="M12 8v8" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold">Belum ada peta</h2>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Klik &ldquo;Peta baru&rdquo; untuk membuat mind map pertamamu. Kamu bisa menambahkan
              node, menghubungkannya, dan menuliskan catatan Markdown di dalamnya.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {active.map((m) => (
                <MapCard key={m.id} map={m} />
              ))}
            </div>

            {archived.length > 0 && (
              <details className="mt-10">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                  Arsip ({archived.length})
                </summary>
                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {archived.map((m) => (
                    <MapCard key={m.id} map={m} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}
