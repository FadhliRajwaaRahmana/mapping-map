import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";
import { mapCollaborators, maps } from "./schema";
import { eq, and } from "drizzle-orm";

export type SessionUser = { id: string; name: string; email: string; emailVerified: boolean };

export async function requireUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    emailVerified: session.user.emailVerified,
  };
}

export type MapRole = "owner" | "editor" | "viewer";
const ROLE_RANK: Record<MapRole, number> = { viewer: 1, editor: 2, owner: 3 };

export type RoleCheck =
  | { ok: true; user: SessionUser; role: MapRole }
  | { ok: false; status: number; body: { error: string; message: string } };

export async function requireMapRole(mapId: string, minRole: MapRole): Promise<RoleCheck> {
  const user = await requireUser();
  if (!user) {
    return { ok: false, status: 401, body: { error: "unauthorized", message: "Silakan masuk dulu." } };
  }
  const mapRows = await db
    .select({ id: maps.id })
    .from(maps)
    .where(eq(maps.id, mapId))
    .limit(1);
  if (mapRows.length === 0) {
    return { ok: false, status: 404, body: { error: "not_found", message: "Peta tidak ditemukan." } };
  }
  const rows = await db
    .select({ role: mapCollaborators.role })
    .from(mapCollaborators)
    .where(and(eq(mapCollaborators.mapId, mapId), eq(mapCollaborators.userId, user.id)))
    .limit(1);
  const row = rows[0];
  // No collaborator row => not a member of this map => deny. (The owner always
  // has a row, so this never affects the owner. Falling back to "viewer" here
  // would let any logged-in stranger read any map — IDOR.)
  if (!row || ROLE_RANK[row.role] < ROLE_RANK[minRole]) {
    return { ok: false, status: 403, body: { error: "forbidden", message: "Anda tidak punya akses." } };
  }
  return { ok: true, user, role: row.role };
}

export type MapAccess =
  | { hasAccess: true; role: MapRole; isPublicAccess: boolean; user: SessionUser | null }
  | { hasAccess: false; role: null; isPublicAccess: false; user: SessionUser | null };

export async function getMapAccess(mapId: string): Promise<MapAccess> {
  const user = await requireUser();
  const mapRows = await db
    .select({ id: maps.id, visibility: maps.visibility, publicRole: maps.publicRole, ownerId: maps.ownerId })
    .from(maps)
    .where(eq(maps.id, mapId))
    .limit(1);
  const map = mapRows[0];
  if (!map) return { hasAccess: false, role: null, isPublicAccess: false, user };
  // Owner always has access
  if (user && map.ownerId === user.id) {
    // Check collaborator row for exact role, fallback to owner
    const rows = await db
      .select({ role: mapCollaborators.role })
      .from(mapCollaborators)
      .where(and(eq(mapCollaborators.mapId, mapId), eq(mapCollaborators.userId, user.id)))
      .limit(1);
    const role = (rows[0]?.role as MapRole) ?? "owner";
    return { hasAccess: true, role, isPublicAccess: false, user };
  }
  // Collaborator check
  if (user) {
    const rows = await db
      .select({ role: mapCollaborators.role })
      .from(mapCollaborators)
      .where(and(eq(mapCollaborators.mapId, mapId), eq(mapCollaborators.userId, user.id)))
      .limit(1);
    if (rows[0]) return { hasAccess: true, role: rows[0].role as MapRole, isPublicAccess: false, user };
  }
  // Public map fallback — anyone (even anonymous for viewer) can view
  if (map.visibility === "public") {
    const publicRole = (map.publicRole as MapRole) ?? "viewer";
    // If user is not logged in but map is public viewer, allow read-only anonymous access
    // We still return hasAccess true but user may be null
    if (!user && publicRole === "viewer") {
      return { hasAccess: true, role: "viewer" as MapRole, isPublicAccess: true, user: null };
    }
    if (user) {
      return { hasAccess: true, role: publicRole, isPublicAccess: true, user };
    }
  }
  return { hasAccess: false, role: null, isPublicAccess: false, user };
}

export async function requireMapAccess(mapId: string, minRole: MapRole = "viewer"): Promise<RoleCheck> {
  const access = await getMapAccess(mapId);
  if (!access.hasAccess || !access.user) {
    if (!access.user) return { ok: false, status: 401, body: { error: "unauthorized", message: "Silakan masuk dulu." } };
    return { ok: false, status: 403, body: { error: "forbidden", message: "Anda tidak punya akses." } };
  }
  if (ROLE_RANK[access.role] < ROLE_RANK[minRole]) {
    return { ok: false, status: 403, body: { error: "forbidden", message: "Anda tidak punya akses." } };
  }
  return { ok: true, user: access.user, role: access.role };
}

