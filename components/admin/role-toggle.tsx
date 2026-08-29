"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function RoleToggle({ userId, currentRole, isSelf }: { userId: string; currentRole: "user" | "superadmin"; isSelf: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState(currentRole);
  const [busy, setBusy] = useState(false);
  const nextRole = currentRole === "superadmin" ? "user" : "superadmin";

  async function save() {
    if (isSelf) { toast.error("Tidak bisa ubah role diri sendiri."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) { toast.error(json.message ?? "Gagal ubah role"); return; }
      toast.success(`Role diubah menjadi ${role}`);
      setOpen(false);
      router.refresh();
    } finally { setBusy(false); }
  }

  if (isSelf) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-2 text-xs font-bold">
          Jadikan {nextRole === "superadmin" ? "Superadmin" : "User"}
        </Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-foreground shadow-brutal-lg sm:max-w-md">
        <DialogHeader><DialogTitle className="font-heading">Ubah Role</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm">Role saat ini: <strong>{currentRole}</strong></p>
          <select value={role} onChange={(e) => setRole(e.target.value as "user" | "superadmin")} className="h-9 w-full rounded-md border-2 border-foreground/20 bg-background px-2 text-sm">
            <option value="user">user</option>
            <option value="superadmin">superadmin</option>
          </select>
          <Button onClick={() => void save()} disabled={busy} className="w-full border-2 border-foreground font-bold">
            {busy ? "..." : "Simpan"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
