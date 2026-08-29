"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";

type Collab = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "editor" | "viewer";
};

export function ShareDialog({ mapId }: { mapId: string }) {
  const [open, setOpen] = useState(false);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setCollabs(
        await api.get<Collab[]>(`/api/maps/${mapId}/collaborators`),
      );
    } catch {
      /* non-owner or transient */
    }
  }, [mapId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function invite() {
    if (!email.trim()) return;
    setBusy(true);
    try {
      await api.post(`/api/maps/${mapId}/collaborators`, {
        email: email.trim(),
        role,
      });
      toast.success("Kolaborator ditambahkan");
      setEmail("");
      await load();
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Gagal menambah kolaborator",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(userId: string) {
    try {
      await api.delete(`/api/maps/${mapId}/collaborators/${userId}`);
      toast.success("Kolaborator dihapus");
      await load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menghapus");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="border-2 border-foreground/20 text-xs font-semibold transition-all hover:border-foreground hover:shadow-brutal-sm sm:text-sm"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" x2="12" y1="2" y2="15" />
          </svg>
          <span className="hidden sm:inline">Bagikan</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-foreground shadow-brutal-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">
            Bagikan peta
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Invite form */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                type="email"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void invite();
                }}
                className="border-2 border-foreground/20 bg-background transition-colors focus:border-primary"
              />
              <select
                className="h-9 rounded-md border-2 border-foreground/20 bg-background px-2 text-sm font-medium transition-colors focus:border-primary"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as "editor" | "viewer")
                }
                aria-label="Peran"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <Button
              size="sm"
              className="w-full border-2 border-foreground font-bold shadow-brutal-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal"
              onClick={() => void invite()}
              disabled={busy || !email.trim()}
            >
              {busy ? "..." : "Undang"}
            </Button>
          </div>

          {/* Collaborator list */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">Kolaborator</Label>
            {collabs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Belum ada kolaborator.
              </p>
            )}
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {collabs.map((c) => (
                <div
                  key={c.userId}
                  className="flex items-center justify-between rounded-md border-2 border-foreground/10 bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold">{c.name}</span>{" "}
                    <span className="text-muted-foreground">({c.email})</span>
                    <Badge
                      className="ml-2 border-0 text-[10px] font-bold"
                      variant={c.role === "owner" ? "default" : "secondary"}
                    >
                      {c.role}
                    </Badge>
                  </div>
                  {c.role !== "owner" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-destructive hover:text-destructive"
                      onClick={() => void remove(c.userId)}
                    >
                      Hapus
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
