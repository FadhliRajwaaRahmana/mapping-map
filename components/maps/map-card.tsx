"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, ApiError } from "@/lib/api-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type MapItem = {
  id: string;
  title: string;
  description: string;
  isArchived: boolean;
  updatedAt: Date;
  mine: boolean;
  role: "owner" | "editor" | "viewer";
};

const roleLabels: Record<string, { label: string; color: string }> = {
  owner: { label: "Milik saya", color: "bg-primary text-primary-foreground" },
  editor: { label: "Editor", color: "bg-secondary text-secondary-foreground" },
  viewer: { label: "Viewer", color: "bg-muted text-muted-foreground" },
};

export function MapCard({ map, index = 0 }: { map: MapItem; index?: number }) {
  const router = useRouter();
  const role = roleLabels[map.role] ?? roleLabels.viewer;

  async function patch(p: Record<string, unknown>) {
    try {
      await api.patch(`/api/maps/${map.id}`, p);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memperbarui");
    }
  }

  async function remove() {
    if (!confirm(`Hapus peta "${map.title}"?`)) return;
    try {
      await api.delete(`/api/maps/${map.id}`);
      toast.success("Peta dihapus");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menghapus");
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
      className="group relative"
    >
      <Link
        href={`/maps/${map.id}`}
        className="block rounded-lg border-2 border-foreground bg-card p-5 shadow-brutal-sm transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-lg font-semibold leading-tight line-clamp-1">{map.title}</h3>
          {map.role === "owner" && (
            <span className="shrink-0 rounded-md p-1 text-muted-foreground opacity-40 group-hover:opacity-100" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </span>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{map.description || "Belum ada deskripsi"}</p>
        <div className="mt-4 flex items-center gap-2">
          <Badge className={`border-0 text-xs font-semibold ${role.color}`}>{role.label}</Badge>
          {map.isArchived && <Badge variant="outline" className="border-2 border-foreground/20 text-xs">Arsip</Badge>}
          <span className="ml-auto text-xs text-muted-foreground">{new Date(map.updatedAt).toLocaleDateString("id-ID")}</span>
        </div>
      </Link>
      {map.role === "owner" && (
        <div className="absolute right-3 top-3 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.preventDefault()}
              className="rounded-md bg-card p-1.5 text-muted-foreground opacity-0 shadow-sm transition-all hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 data-[state=open]:bg-muted"
            >
              <span className="sr-only">Opsi</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" />
              </svg>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-2 border-foreground shadow-brutal-sm">
              <DropdownMenuItem onClick={() => void patch({ isArchived: !map.isArchived })}>
                {map.isArchived ? "Keluarkan dari arsip" : "Arsipkan"}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => void remove()}>
                Hapus
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </motion.div>
  );
}
