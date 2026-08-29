import Link from "next/link";
import { db } from "@/lib/db";
import { user, maps } from "@/lib/schema";
import { count, sql, desc, inArray } from "drizzle-orm";
import { StatCard } from "@/components/admin/stat-card";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [totalUsers, totalMaps, publicMaps, bannedUsers] = await Promise.all([
    db.select({ value: count() }).from(user).then((r) => r[0].value),
    db.select({ value: count() }).from(maps).then((r) => r[0].value),
    db.select({ value: count() }).from(maps).where(sql`${maps.visibility} = 'public'`).then((r) => r[0].value),
    db.select({ value: count() }).from(user).where(sql`${user.banned} = 1`).then((r) => r[0].value),
  ]);

  const recentUsers = await db
    .select({ id: user.id, name: user.name, email: user.email, role: user.role, banned: user.banned })
    .from(user)
    .orderBy(desc(user.createdAt))
    .limit(5);

  const recentMaps = await db
    .select({ id: maps.id, title: maps.title, visibility: maps.visibility, ownerId: maps.ownerId })
    .from(maps)
    .orderBy(desc(maps.createdAt))
    .limit(5);

  const ownerIds = [...new Set(recentMaps.map((m) => m.ownerId))];
  const owners = ownerIds.length
    ? await db.select({ id: user.id, name: user.name }).from(user).where(inArray(user.id, ownerIds))
    : [];
  const ownerById = new Map(owners.map((o) => [o.id, o.name]));

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={totalUsers} icon="◐" accent="bg-primary/10" />
        <StatCard label="Total Maps" value={totalMaps} icon="⬡" accent="bg-secondary/10" />
        <StatCard label="Public Maps" value={publicMaps} icon="◉" accent="bg-green-500/10" />
        <StatCard label="Banned" value={bannedUsers} icon="⊘" accent="bg-destructive/10" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border-2 border-foreground bg-card shadow-brutal-sm">
          <div className="border-b-2 border-foreground px-4 py-3">
            <h2 className="font-heading text-sm font-bold">User Terbaru</h2>
          </div>
          <div className="divide-y divide-border">
            {recentUsers.length === 0 && <p className="p-4 text-sm text-muted-foreground">Belum ada user.</p>}
            {recentUsers.map((u) => (
              <Link key={u.id} href={`/admin/users/${u.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground bg-primary text-xs font-bold text-primary-foreground">
                  {(u.name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${u.role === "superadmin" ? "bg-destructive text-destructive-foreground" : "bg-muted text-muted-foreground"}`}>{u.role ?? "user"}</span>
                {u.banned && <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">BANNED</span>}
              </Link>
            ))}
          </div>
          <div className="border-t-2 border-foreground/10 px-4 py-2 text-right">
            <Link href="/admin/users" className="text-xs font-semibold text-primary hover:underline">Lihat semua →</Link>
          </div>
        </div>

        <div className="rounded-lg border-2 border-foreground bg-card shadow-brutal-sm">
          <div className="border-b-2 border-foreground px-4 py-3">
            <h2 className="font-heading text-sm font-bold">Map Terbaru</h2>
          </div>
          <div className="divide-y divide-border">
            {recentMaps.length === 0 && <p className="p-4 text-sm text-muted-foreground">Belum ada map.</p>}
            {recentMaps.map((m) => (
              <Link key={m.id} href={`/maps/${m.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.title}</p>
                  <p className="truncate text-xs text-muted-foreground">oleh {ownerById.get(m.ownerId) ?? (m.ownerId ?? "").slice(0, 8)}</p>
                </div>
                <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${m.visibility === "public" ? "border-primary bg-primary/10 text-primary" : "border-foreground/20 bg-muted text-muted-foreground"}`}>{m.visibility}</span>
              </Link>
            ))}
          </div>
          <div className="border-t-2 border-foreground/10 px-4 py-2 text-right">
            <Link href="/admin/maps" className="text-xs font-semibold text-primary hover:underline">Lihat semua →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
