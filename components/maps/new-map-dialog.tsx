"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";

export function NewMapDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function onCreate() {
    const trimmed = title.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      const { id } = await api.post<{ id: string }>("/api/maps", {
        title: trimmed,
        description: "",
      });
      setOpen(false);
      setTitle("");
      router.push(`/maps/${id}`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal membuat peta");
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !busy && title.trim()) {
      e.preventDefault();
      void onCreate();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="border-2 border-foreground font-bold shadow-brutal-sm transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1.5"
          >
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
          Peta baru
        </Button>
      </DialogTrigger>
      <DialogContent className="border-2 border-foreground shadow-brutal-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">
            Buat peta baru
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="map-title" className="text-sm font-semibold">
              Judul
            </Label>
            <Input
              id="map-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="mis. Arsitektur API"
              autoFocus
              className="border-2 border-foreground/20 bg-background transition-colors focus:border-primary"
            />
          </div>
          <Button
            className="w-full border-2 border-foreground py-5 font-bold shadow-brutal-sm transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal"
            onClick={() => void onCreate()}
            disabled={busy || !title.trim()}
          >
            {busy ? "Membuat..." : "Buat peta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
