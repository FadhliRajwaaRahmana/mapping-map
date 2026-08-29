"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type MapRow = {
  id: string;
  title: string;
  visibility: string;
  publicRole: string;
  isArchived: boolean;
  ownerId: string;
  owner: { id: string; name: string; email: string };
  createdAt: string;
};

export default function AdminMapsPage() {
  const [q, setQ] = useState("");
  const [vis, setVis] = useState("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<MapRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (q) params.set("q", q);
      if (vis !== "all") params.set("visibility", vis);
      const res = await fetch(`/api/admin/maps?${params.toString()}`, { credentials: "include" });
      const json = (await res.json()) as { data: MapRow[]; total: number; message?: string };
      if (!res.ok) throw new Error(json.message ?? "Gagal");
      setRows(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat maps");
    } finally {
      setLoading(false);
    }
  }, [q, vis, page]);

  useEffect(() => { void load(); }, [load]);

  async function removeMap(mapId: string) {
    if (!confirm("Hapus mapping ini? Tidak bisa dibatalkan.")) return;
    try {
      const res = await fetch(`/api/admin/maps/${mapId}`, { method: "DELETE", credentials: "include" });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) { toast.error(json.message ?? "Gagal hapus"); return; }
      toast.success("Map dihapus");
      void load();
    } catch { toast.error("Gagal hapus"); }
  }

  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl font-bold">Semua Maps</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input placeholder="Cari judul..." value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="max-w-sm border-2 border-foreground/20" />
        <select value={vis} onChange={(e) => { setVis(e.target.value); setPage(1); }} className="h-9 rounded-md border-2 border-foreground/20 bg-background px-2 text-sm">
          <option value="all">Semua visibility</option>
          <option value="private">Private</option>
          <option value="public">Public</option>
        </select>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border-2 border-foreground bg-card shadow-brutal-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2 border-foreground bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-bold">Judul</th>
                <th className="px-3 py-2 text-left font-bold">Owner</th>
                <th className="px-3 py-2 text-left font-bold">Visibility</th>
                <th className="px-3 py-2 text-left font-bold">Arsip</th>
                <th className="px-3 py-2 text-right font-bold">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Memuat...</td></tr>}
              {!loading && rows.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">Tidak ada map.</td></tr>}
              {rows.map((m) => (
                <tr key={m.id}>
                  <td className="px-3 py-2 font-semibold">{m.title}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{m.owner.name} ({m.owner.email})</td>
                  <td className="px-3 py-2"><Badge variant={m.visibility === "public" ? "default" : "secondary"} className="text-xs">{m.visibility}</Badge></td>
                  <td className="px-3 py-2">{m.isArchived ? <Badge variant="outline" className="text-xs">Arsip</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <Link href={`/maps/${m.id}`} className="rounded-md border-2 border-foreground/20 px-2 py-1 text-xs font-semibold hover:border-foreground">Lihat</Link>
                      <Button size="sm" variant="destructive" onClick={() => void removeMap(m.id)} className="h-7 border-2 text-xs">Hapus</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="grid gap-3 md:hidden">
        {loading && <p className="py-8 text-center text-sm text-muted-foreground">Memuat...</p>}
        {!loading && rows.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada map.</p>}
        {rows.map((m) => (
          <div key={m.id} className="rounded-lg border-2 border-foreground bg-card p-4 shadow-brutal-sm">
            <p className="font-bold">{m.title}</p>
            <p className="text-xs text-muted-foreground">{m.owner.name} · {m.visibility}</p>
            <div className="mt-2 flex gap-2">
              <Link href={`/maps/${m.id}`} className="rounded-md border-2 border-foreground/20 px-3 py-1.5 text-xs font-semibold">Lihat</Link>
              <Button size="sm" variant="destructive" onClick={() => void removeMap(m.id)} className="h-7 border-2 text-xs">Hapus</Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">Total {total} maps</p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="border-2">‹ Prev</Button>
          <span className="flex items-center px-2 text-sm font-semibold">{page} / {totalPages}</span>
          <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="border-2">Next ›</Button>
        </div>
      </div>
    </div>
  );
}
