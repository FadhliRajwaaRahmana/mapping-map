"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function BanToggle({ userId, banned, banReason, isSelf }: { userId: string; banned: boolean; banReason: string | null; isSelf: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(banReason ?? "");
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (isSelf) { toast.error("Tidak bisa untuk diri sendiri."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ banned: !banned, banReason: !banned ? reason : undefined }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) { toast.error(json.message ?? "Gagal"); return; }
      toast.success(banned ? "User diaktifkan" : "User dinonaktifkan");
      setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  if (isSelf) return <Button size="sm" variant="outline" disabled className="border-2 text-xs">Tidak bisa untuk diri sendiri</Button>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={banned ? "outline" : "destructive"} className="border-2 text-xs font-bold">
          {banned ? "Aktifkan kembali" : "Nonaktifkan"}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-foreground shadow-brutal-lg sm:max-w-md">
        <DialogHeader><DialogTitle className="font-heading">{banned ? "Aktifkan user?" : "Nonaktifkan user?"}</DialogTitle></DialogHeader>
        {!banned && (
          <div className="space-y-2">
            <Label className="text-xs font-bold">Alasan (opsional)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Mis. pelanggaran ketentuan" className="border-2" />
          </div>
        )}
        {banned && <p className="text-sm text-muted-foreground">User akan bisa login kembali.</p>}
        <Button onClick={() => void toggle()} disabled={busy} variant={banned ? "default" : "destructive"} className="w-full border-2 border-foreground font-bold">
          {busy ? "..." : banned ? "Aktifkan" : "Nonaktifkan"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
