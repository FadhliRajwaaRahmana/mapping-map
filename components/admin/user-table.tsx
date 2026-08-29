"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type UserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  banned: boolean;
  banReason: string | null;
  createdAt: string;
};

export function UserTable() {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [bannedFilter, setBannedFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (q) params.set("q", q);
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (bannedFilter !== "all") params.set("banned", bannedFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`, { credentials: "include" });
      const text = await res.text();
      let json: { data?: UserRow[]; total?: number; message?: string; error?: string } = {};
      try { json = text ? JSON.parse(text) : {}; } catch { json = { message: text || "Gagal" }; }
      if (!res.ok) throw new Error(json.message ?? json.error ?? `Error ${res.status}`);
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Gagal memuat users";
      if (!msg.includes("Unexpected end")) toast.error(msg);
      // Silent for initial load while session hydrates — retry once
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [q, roleFilter, bannedFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <Input placeholder="Cari nama atau email..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-sm border-2 border-foreground/20" />
        <div className="flex gap-2">
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="h-9 rounded-md border-2 border-foreground/20 bg-background px-2 text-sm">
            <option value="all">Semua role</option>
            <option value="user">User</option>
            <option value="superadmin">Superadmin</option>
          </select>
          <select value={bannedFilter} onChange={(e) => { setBannedFilter(e.target.value); setPage(1); }} className="h-9 rounded-md border-2 border-foreground/20 bg-background px-2 text-sm">
            <option value="all">Semua status</option>
            <option value="false">Aktif</option>
            <option value="true">Banned</option>
          </select>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-lg border-2 border-foreground bg-card shadow-brutal-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-foreground bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-bold">User</th>
                <th className="px-3 py-2 text-left font-bold">Email</th>
                <th className="px-3 py-2 text-left font-bold">Role</th>
                <th className="px-3 py-2 text-left font-bold">Status</th>
                <th className="px-3 py-2 text-left font-bold">Daftar</th>
                <th className="px-3 py-2 text-right font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Memuat...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">Tidak ada user.</td></tr>}
              {rows.map((u) => (
                <tr key={u.id} className={u.banned ? "bg-destructive/5" : ""}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-primary text-xs font-bold text-primary-foreground">
                        {(u.name ?? "?").slice(0, 1).toUpperCase()}
                      </div>
                      <span className={`font-semibold ${u.banned ? "line-through opacity-60" : ""}`}>{u.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{u.email ?? "-"}</td>
                  <td className="px-3 py-2"><Badge variant={u.role === "superadmin" ? "destructive" : "secondary"} className="text-xs">{u.role}</Badge></td>
                  <td className="px-3 py-2">{u.banned ? <Badge variant="destructive" className="text-xs">BANNED</Badge> : <Badge variant="outline" className="text-xs">Aktif</Badge>}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("id-ID")}</td>
                  <td className="px-3 py-2 text-right">
                    <Link href={`/admin/users/${u.id}`} className="rounded-md border-2 border-foreground/20 px-2 py-1 text-xs font-semibold hover:border-foreground">Detail →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {loading && <p className="py-8 text-center text-sm text-muted-foreground">Memuat...</p>}
        {!loading && rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada user.</p>}
        {rows.map((u) => (
          <Link key={u.id} href={`/admin/users/${u.id}`} className={`rounded-lg border-2 bg-card p-4 shadow-brutal-sm ${u.banned ? "border-destructive/50 bg-destructive/5" : "border-foreground"}`}>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-foreground bg-primary text-xs font-bold text-primary-foreground">{(u.name ?? "?").slice(0, 1).toUpperCase()}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{u.name}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email ?? "-"}</p>
              </div>
              <Badge variant={u.role === "superadmin" ? "destructive" : "secondary"} className="text-xs">{u.role}</Badge>
            </div>
            {u.banned && <p className="mt-2 text-xs font-bold text-destructive">⛔ BANNED{u.banReason ? ` — ${u.banReason}` : ""}</p>}
          </Link>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">Total {total} user</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border-2">‹ Prev</Button>
          <span className="flex items-center px-2 text-sm font-semibold">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="border-2">Next ›</Button>
        </div>
      </div>
    </div>
  );
}
