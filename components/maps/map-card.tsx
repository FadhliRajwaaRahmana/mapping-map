"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
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

export function MapCard({ map }: { map: MapItem }) {
  const router = useRouter();

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
    <Card className="group relative transition-shadow hover:shadow-md">
      {/* Link covers the card; the "···" menu sits in a relative container above it
          (a <button> inside <a> would be invalid HTML). stopPropagation on the
          menu click so opening it doesn't navigate. */}
      <Link
        href={`/maps/${map.id}`}
        className="absolute inset-0 z-0 rounded-md"
        aria-label={`Buka peta ${map.title}`}
      />
      <CardContent className="relative z-10 pt-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight line-clamp-1">{map.title}</h3>
          {map.role === "owner" && (
            <div className="relative z-20" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100">
                  <span className="sr-only">Opsi</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <circle cx="12" cy="5" r="1.5" />
                    <circle cx="12" cy="12" r="1.5" />
                    <circle cx="12" cy="19" r="1.5" />
                  </svg>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void patch({ isArchived: !map.isArchived })}>
                    {map.isArchived ? "Keluarkan dari arsip" : "Arsipkan"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => void remove()}
                  >
                    Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
          {map.description || "Belum ada deskripsi"}
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={map.role === "owner" ? "default" : "secondary"} className="text-[11px]">
            {map.role === "owner" ? "Milik saya" : map.role === "editor" ? "Editor" : "Viewer"}
          </Badge>
          {map.isArchived && (
            <Badge variant="outline" className="text-[11px]">
              Arsip
            </Badge>
          )}
          <span>{new Date(map.updatedAt).toLocaleDateString("id-ID")}</span>
        </div>
      </CardContent>
    </Card>
  );
}
