"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export function UserDetailActions({ userId, passwordHash }: { userId: string; passwordHash: string | null; isSelf: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!passwordHash) return <p className="mt-1 text-xs text-muted-foreground">Belum ada password (mungkin OAuth).</p>;

  const truncated = passwordHash.length > 20 ? `••••••••${passwordHash.slice(-12)}` : "••••••••";

  function copy() {
    navigator.clipboard.writeText(passwordHash!).then(() => {
      setCopied(true);
      toast.success("Hash disalin");
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <code className="max-w-full break-all rounded-md border-2 border-foreground/20 bg-muted px-2 py-1.5 text-xs leading-relaxed">
          {revealed ? passwordHash : truncated}
        </code>
        <Button size="sm" variant="outline" onClick={() => setRevealed(!revealed)} className="h-7 shrink-0 border-2 text-xs">
          {revealed ? "Sembunyikan" : "Lihat hash"}
        </Button>
        {revealed && (
          <Button size="sm" variant="outline" onClick={copy} className="h-7 shrink-0 border-2 text-xs">
            {copied ? "Disalin ✓" : "Salin"}
          </Button>
        )}
      </div>
      {revealed ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-200">
          Hash bcrypt — bukan plaintext, tidak bisa dipakai langsung untuk login. Hash bisa di-copy untuk audit, tapi tidak bisa di-reverse.
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Hash bcrypt — bukan plaintext, tidak bisa dipakai langsung untuk login.</span>
      )}
    </div>
  );
}
