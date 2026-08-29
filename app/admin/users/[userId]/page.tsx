import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { user, account, maps } from "@/lib/schema";
import { eq, sql } from "drizzle-orm";
import { requireSuperAdmin } from "@/lib/guards";
import { UserDetailActions } from "@/components/admin/user-detail-actions";
import { BanToggle } from "@/components/admin/ban-toggle";
import { ResetPasswordDialog } from "@/components/admin/reset-password-dialog";
import { RoleToggle } from "@/components/admin/role-toggle";

export const dynamic = "force-dynamic";

export default async function AdminUserDetail({ params }: { params: Promise<{ userId: string }> }) {
  const check = await requireSuperAdmin();
  if (!check.ok) notFound();
  const { userId } = await params;

  const rows = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  const u = rows[0];
  if (!u) notFound();

  const pwRows = await db
    .select({ password: account.password })
    .from(account)
    .where(sql`${account.userId} = ${userId} AND ${account.providerId} = 'credential'`)
    .limit(1);
  const passwordHash = pwRows[0]?.password ?? null;

  const userMaps = await db.select().from(maps).where(eq(maps.ownerId, userId));
  const isSelf = check.user.id === userId;

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground">
        ← Kembali ke Users
      </Link>

      {/* Header */}
      <div className="flex flex-col gap-4 rounded-lg border-2 border-foreground bg-card p-6 shadow-brutal sm:flex-row sm:items-center">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-primary font-heading text-2xl font-black text-primary-foreground shadow-brutal-sm">
          {u.name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-heading text-xl font-bold">{u.name}</h1>
          <p className="text-sm text-muted-foreground">{u.email}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className={`rounded-full border-2 px-2.5 py-0.5 text-xs font-bold ${u.role === "superadmin" ? "border-destructive bg-destructive text-destructive-foreground" : "border-foreground/20 bg-muted text-muted-foreground"}`}>{u.role}</span>
            {u.banned ? (
              <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">BANNED{u.banReason ? ` — ${u.banReason}` : ""}</span>
            ) : (
              <span className="rounded-full border-2 border-green-600 bg-green-50 px-2.5 py-0.5 text-xs font-bold text-green-700">Aktif</span>
            )}
            <span className="rounded-full border-2 border-foreground/10 bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              Daftar {new Date(u.createdAt).toLocaleDateString("id-ID", { dateStyle: "long" })}
            </span>
          </div>
        </div>
      </div>

      {/* Info Akun */}
      <div className="rounded-lg border-2 border-foreground bg-card p-5 shadow-brutal-sm">
        <h2 className="font-heading text-sm font-bold">Info Akun</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email</p>
            <p className="mt-1 font-medium">{u.email} {u.emailVerified ? "✓" : ""}</p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email Verified</p>
            <p className="mt-1">{u.emailVerified ? "Ya" : "Belum"}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Password Hash (bcrypt/scrypt)</p>
            <UserDetailActions userId={u.id} passwordHash={passwordHash} isSelf={isSelf} />
          </div>
        </div>
      </div>

      {/* Aksi Admin */}
      <div className="rounded-lg border-2 border-foreground bg-card p-5 shadow-brutal-sm">
        <h2 className="font-heading text-sm font-bold">Aksi Admin</h2>
        <p className="mt-1 text-xs text-muted-foreground">Hanya superadmin yang bisa melakukan aksi ini. Tidak bisa untuk diri sendiri.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <BanToggle userId={u.id} banned={!!u.banned} banReason={u.banReason} isSelf={isSelf} />
          <ResetPasswordDialog userId={u.id} isSelf={isSelf} />
          <RoleToggle userId={u.id} currentRole={u.role as "user" | "superadmin"} isSelf={isSelf} />
        </div>
      </div>

      {/* Maps milik user */}
      <div className="rounded-lg border-2 border-foreground bg-card shadow-brutal-sm">
        <div className="flex items-center justify-between border-b-2 border-foreground px-5 py-3">
          <h2 className="font-heading text-sm font-bold">Mapping milik user ({userMaps.length})</h2>
        </div>
        {userMaps.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">Belum ada mapping.</p>
        ) : (
          <div className="divide-y divide-border">
            {userMaps.map((m) => (
              <div key={m.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{m.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.description || "—"} · {m.visibility} · {m.isArchived ? "Arsip" : "Aktif"}</p>
                </div>
                <Link href={`/maps/${m.id}`} className="shrink-0 rounded-md border-2 border-foreground/20 px-2 py-1 text-xs font-semibold hover:border-foreground">Lihat →</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Inline client islands for interactivity ──────────────────────────────
