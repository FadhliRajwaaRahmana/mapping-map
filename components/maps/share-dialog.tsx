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
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api-client";
import { Lock, Globe, Copy, Check } from "lucide-react";

type Collab = {
  userId: string;
  name: string;
  email: string;
  role: "owner" | "editor" | "viewer";
};

type Visibility = "private" | "public";
type PublicRole = "viewer" | "editor";

type Props = {
  mapId: string;
  initialVisibility?: Visibility;
  initialPublicRole?: PublicRole;
};

export function ShareDialog({
  mapId,
  initialVisibility,
  initialPublicRole,
}: Props) {
  const [open, setOpen] = useState(false);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [busy, setBusy] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>(
    initialVisibility ?? "private",
  );
  const [publicRole, setPublicRole] = useState<PublicRole>(
    initialPublicRole ?? "viewer",
  );
  const [visBusy, setVisBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      // Collaborators — owner-only endpoint, separate from map GET
      const collabPromise = api
        .get<Collab[]>(`/api/maps/${mapId}/collaborators`)
        .catch(() => [] as Collab[]);

      // Visibility — prefer map GET (will include visibility/publicRole after backend migration),
      // fallback to dedicated visibility endpoint.
      const visibilityPromise: Promise<{
        visibility: Visibility;
        publicRole: PublicRole;
      } | null> = (async () => {
        try {
          const mapData = await api.get<{
            map: {
              id: string;
              visibility?: Visibility;
              publicRole?: PublicRole;
            };
          }>(`/api/maps/${mapId}`);
          if (
            mapData?.map?.visibility === "private" ||
            mapData?.map?.visibility === "public"
          ) {
            return {
              visibility: mapData.map.visibility,
              publicRole: (mapData.map.publicRole as PublicRole) ?? "viewer",
            };
          }
        } catch {
          /* fallback below */
        }
        try {
          const vis = await api.get<{
            visibility: Visibility;
            publicRole: PublicRole;
          }>(`/api/maps/${mapId}/visibility`);
          return vis;
        } catch {
          return null;
        }
      })();

      const [collabData, visData] = await Promise.all([
        collabPromise,
        visibilityPromise,
      ]);

      setCollabs(collabData);
      if (visData) {
        setVisibility(visData.visibility);
        setPublicRole(visData.publicRole);
      }
    } catch {
      /* silent — toast on mutation only */
    }
  }, [mapId]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  // Keep state in sync if parent provides initial values after mount
  useEffect(() => {
    if (initialVisibility) setVisibility(initialVisibility);
  }, [initialVisibility]);
  useEffect(() => {
    if (initialPublicRole) setPublicRole(initialPublicRole);
  }, [initialPublicRole]);

  async function setVis(v: Visibility, pr?: PublicRole) {
    setVisBusy(true);
    try {
      const res = await api.patch<{
        visibility: Visibility;
        publicRole: PublicRole;
      }>(`/api/maps/${mapId}/visibility`, {
        visibility: v,
        publicRole: pr ?? publicRole,
      });
      setVisibility(res.visibility);
      setPublicRole(res.publicRole);
      toast.success(
        v === "public"
          ? "Peta sekarang dapat diakses via link"
          : "Peta kembali private",
      );
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Gagal mengubah visibilitas",
      );
    } finally {
      setVisBusy(false);
    }
  }

  async function setPublicRoleOnly(pr: PublicRole) {
    setVisBusy(true);
    try {
      const res = await api.patch<{
        visibility: Visibility;
        publicRole: PublicRole;
      }>(`/api/maps/${mapId}/visibility`, {
        visibility,
        publicRole: pr,
      });
      setPublicRole(res.publicRole);
      toast.success(
        pr === "editor"
          ? "Link public: siapa saja bisa edit"
          : "Link public: hanya lihat",
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengubah peran");
    } finally {
      setVisBusy(false);
    }
  }

  function copyLink() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/maps/${mapId}`
        : "";
    if (!url) return;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        setCopied(true);
        toast.success("Link disalin");
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        toast.error("Gagal menyalin link");
      });
  }

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

  const publicLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/maps/${mapId}`
      : "";

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
            aria-hidden
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" x2="12" y1="2" y2="15" />
          </svg>
          <span className="hidden sm:inline">Bagikan</span>
          <span className="sm:hidden">Share</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto border-2 border-foreground bg-card shadow-brutal-lg sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl font-bold">
            Bagikan peta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── 1. Visibility toggle — brutalist pill buttons ─────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">Visibilitas</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void setVis("private")}
                disabled={visBusy}
                aria-pressed={visibility === "private"}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm font-semibold transition-all disabled:opacity-60 ${
                  visibility === "private"
                    ? "border-foreground bg-primary text-primary-foreground shadow-brutal-sm"
                    : "border-foreground/20 bg-card hover:border-foreground hover:shadow-brutal-sm"
                }`}
              >
                <Lock className="h-[18px] w-[18px]" aria-hidden />
                Private
                <span
                  className={`text-xs font-normal ${
                    visibility === "private"
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  Hanya yang diundang
                </span>
              </button>

              <button
                type="button"
                onClick={() => void setVis("public")}
                disabled={visBusy}
                aria-pressed={visibility === "public"}
                className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm font-semibold transition-all disabled:opacity-60 ${
                  visibility === "public"
                    ? "border-foreground bg-primary text-primary-foreground shadow-brutal-sm"
                    : "border-foreground/20 bg-card hover:border-foreground hover:shadow-brutal-sm"
                }`}
              >
                <Globe className="h-[18px] w-[18px]" aria-hidden />
                Public
                <span
                  className={`text-xs font-normal ${
                    visibility === "public"
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  }`}
                >
                  Siapa saja dengan link
                </span>
              </button>
            </div>

            {/* publicRole secondary toggle */}
            {visibility === "public" && (
              <div className="flex items-center gap-2 rounded-lg border-2 border-foreground/10 bg-muted/30 p-2">
                <span className="flex-1 text-xs font-medium">
                  Link memberi akses:
                </span>
                <div className="flex overflow-hidden rounded-md border-2 border-foreground text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => void setPublicRoleOnly("viewer")}
                    disabled={visBusy}
                    aria-pressed={publicRole === "viewer"}
                    className={`px-3 py-1.5 transition-colors disabled:opacity-60 ${
                      publicRole === "viewer"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card hover:bg-muted"
                    }`}
                  >
                    Viewer
                  </button>
                  <button
                    type="button"
                    onClick={() => void setPublicRoleOnly("editor")}
                    disabled={visBusy}
                    aria-pressed={publicRole === "editor"}
                    className={`px-3 py-1.5 transition-colors disabled:opacity-60 ${
                      publicRole === "editor"
                        ? "bg-primary text-primary-foreground"
                        : "bg-card hover:bg-muted"
                    }`}
                  >
                    Editor
                  </button>
                </div>
              </div>
            )}

            {/* 2. Copy public link row */}
            {visibility === "public" && (
              <div className="flex gap-2">
                <Input
                  value={publicLink}
                  readOnly
                  aria-label="Link public"
                  className="flex-1 border-2 border-foreground/20 bg-muted/30 text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={copyLink}
                  className="shrink-0 border-2 border-foreground font-bold shadow-brutal-sm"
                >
                  {copied ? (
                    <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Copy className="mr-1 h-3.5 w-3.5" aria-hidden />
                  )}
                  {copied ? "Disalin" : "Salin"}
                </Button>
              </div>
            )}
          </div>

          <Separator className="bg-foreground/10" />

          {/* ── 4. Invite by email ───────────────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">
              Undang via email (private)
            </Label>
            <div className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                type="email"
                autoComplete="email"
                onKeyDown={(e) => {
                  if (e.key === "Enter") void invite();
                }}
                className="border-2 border-foreground/20 bg-background focus:border-primary"
              />
              <select
                className="h-9 rounded-md border-2 border-foreground/20 bg-background px-2 text-sm font-medium focus:border-primary focus:outline-none"
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

          {/* ── 5. Collaborator list ─────────────────────────────────────── */}
          <div className="space-y-3">
            <Label className="text-sm font-bold">Kolaborator</Label>
            {collabs.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Belum ada kolaborator.
              </p>
            )}
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {collabs.map((c) => (
                <div
                  key={c.userId}
                  className="flex items-center justify-between gap-2 rounded-md border-2 border-foreground/10 bg-muted/30 px-3 py-2 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold">{c.name}</span>{" "}
                    <span className="break-all text-muted-foreground">
                      ({c.email})
                    </span>
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
                      className="shrink-0 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
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
