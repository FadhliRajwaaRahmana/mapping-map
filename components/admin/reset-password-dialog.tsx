"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export function ResetPasswordDialog({ userId, isSelf }: { userId: string; isSelf: boolean }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (pw.length < 8) { toast.error("Password minimal 8 karakter."); return; }
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ newPassword: pw }),
      });
      const json = (await res.json().catch(() => ({}))) as { message?: string };
      if (!res.ok) { toast.error(json.message ?? "Gagal reset password"); return; }
      toast.success("Password berhasil direset");
      setOpen(false);
      setPw("");
    } finally { setBusy(false); }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-2 text-xs font-bold">Reset Password</Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-foreground shadow-brutal-lg sm:max-w-md">
        <DialogHeader><DialogTitle className="font-heading">Reset Password</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Password baru (min 8)</Label>
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="••••••••" className="border-2" />
          </div>
          <p className="text-xs text-muted-foreground">Password akan di-hash dengan scrypt. User bisa login dengan password baru ini.</p>
          <Button onClick={() => void submit()} disabled={busy || pw.length < 8} className="w-full border-2 border-foreground font-bold">
            {busy ? "..." : "Reset"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
