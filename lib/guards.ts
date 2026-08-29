import { headers } from "next/headers";
import { auth } from "./auth";
import { db } from "./db";
import { mapCollaborators, maps, user } from "./schema";
import { eq, and } from "drizzle-orm";

export type SessionUser = { id: string; name: string; email: string; emailVerified: boolean };

export async function requireUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  // Check banned status
  const row = await db
    .select({ banned: user.banned })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (row[0]?.banned) return null;
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
  if (!row || ROLE_RANK[row.role] < ROLE_RANK[minRole]) {
    return { ok: false, status: 403, body: { error: "forbidden", message: "Anda tidak punya akses." } };
  }
  return { ok: true, user, role: row.role };
}

export type MapAccess =
  | { hasAccess: true; role: MapRole; isPublicAccess: boolean; user: SessionUser | null }
  | { hasAccess: false; role: null; isPublicAccess: false; user: SessionUser | null };

export async function getMapAccess(mapId: string): Promise<MapAccess> {
  const sessionUser = await requireUser();
  const mapRows = await db
    .select({ id: maps.id, visibility: maps.visibility, publicRole: maps.publicRole, ownerId: maps.ownerId })
    .from(maps)
    .where(eq(maps.id, mapId))
    .limit(1);
  const map = mapRows[0];
  if (!map) return { hasAccess: false, role: null, isPublicAccess: false, user: sessionUser };
  if (sessionUser && map.ownerId === sessionUser.id) {
    const rows = await db
      .select({ role: mapCollaborators.role })
      .from(mapCollaborators)
      .where(and(eq(mapCollaborators.mapId, mapId), eq(mapCollaborators.userId, sessionUser.id)))
      .limit(1);
    const role = (rows[0]?.role as MapRole) ?? "owner";
    return { hasAccess: true, role, isPublicAccess: false, user: sessionUser };
  }
  if (sessionUser) {
    const rows = await db
      .select({ role: mapCollaborators.role })
      .from(mapCollaborators)
      .where(and(eq(mapCollaborators.mapId, mapId), eq(mapCollaborators.userId, sessionUser.id)))
      .limit(1);
    if (rows[0]) return { hasAccess: true, role: rows[0].role as MapRole, isPublicAccess: false, user: sessionUser };
  }
  if (map.visibility === "public") {
    const publicRole = (map.publicRole as MapRole) ?? "viewer";
    if (!sessionUser && publicRole === "viewer") {
      return { hasAccess: true, role: "viewer" as MapRole, isPublicAccess: true, user: null };
    }
    if (sessionUser) {
      return { hasAccess: true, role: publicRole, isPublicAccess: true, user: sessionUser };
    }
  }
  return { hasAccess: false, role: null, isPublicAccess: false, user: sessionUser };
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

// ── Superadmin guard ────────────────────────────────────────────────────

export type SuperAdminCheck =
  | { ok: true; user: SessionUser & { role: "superadmin" } }
  | { ok: false; status: number; body: { error: string; message: string } };

export async function requireSuperAdmin(): Promise<SuperAdminCheck> {
  const sessionUser = await requireUser();
  if (!sessionUser) {
    return { ok: false, status: 401, body: { error: "unauthorized", message: "Silakan masuk dulu." } };
  }
  const rows = await db
    .select({ role: user.role, banned: user.banned })
    .from(user)
    .where(eq(user.id, sessionUser.id))
    .limit(1);
  const row = rows[0];
  if (!row || row.banned) {
    return { ok: false, status: 403, body: { error: "forbidden", message: "Akun dinonaktifkan. Hubungi admin." } };
  }
  if (row.role !== "superadmin") {
    return { ok: false, status: 403, body: { error: "forbidden", message: "Hanya superadmin yang bisa mengakses." } };
  }
  return { ok: true, user: { ...sessionUser, role: "superadmin" as const } };
}
