"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  CanvasBridge,
  type CanvasHandle,
  type SceneSnapshot,
} from "./canvas-bridge";
import type { ScenePayload } from "@/lib/scene";
import { MAX_IMAGE_BYTES, sceneSizeBytes } from "@/lib/scene";
import { toScenePayload } from "@/lib/scene-client";
import { api, ApiError, requestWithHeaders } from "@/lib/api-client";
import { useCreateNodeKeybinding } from "@/lib/hooks/use-create-node-keybinding";
import { NodePanel } from "./node-panel";
import { ShareDialog } from "@/components/maps/share-dialog";
import { PresenceAvatars } from "./presence-avatars";
import { AutoAddPanel } from "./auto-add-panel";

export type NodeRow = {
  id: string;
  elementId: string;
  title: string;
  contentMd: string;
};

type Props = {
  mapId: string;
  title: string;
  role: "owner" | "editor" | "viewer";
  userName: string;
  selfUserId: string;
  initialScene: ScenePayload | null;
  initialRevision: number;
  initialNodes: NodeRow[];
};

export function EditorClient({
  mapId,
  title,
  role,
  userName,
  selfUserId,
  initialScene,
  initialRevision,
  initialNodes,
}: Props) {
  const handleRef = useRef<CanvasHandle | null>(null);
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<NodeRow[]>(initialNodes);
  const canEdit = role !== "viewer";

  // ── Save + poll state ─────────────────────────────────────────────────
  const [revision, setRevision] = useState(initialRevision);
  const revisionRef = useRef(revision);
  revisionRef.current = revision;
  const skipSaveRef = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [syncStatus, setSyncStatus] = useState<"saved" | "saving" | "error">("saved");

  const doSave = useCallback(
    async (snap: SceneSnapshot) => {
      for (const f of Object.values(snap.files)) {
        const dataURL = (f as { dataURL?: string }).dataURL;
        if (dataURL && dataURL.length > MAX_IMAGE_BYTES) {
          toast.error("Ada gambar melebihi 2 MB — kompres terlebih dahulu.", { id: "img-too-big" });
          return;
        }
      }
      const scene = toScenePayload(snap.elements, snap.appState, snap.files);
      if (sceneSizeBytes(scene) > 4 * 1024 * 1024) {
        toast.error("Peta terlalu besar (>4 MB). Hapus beberapa gambar untuk menyimpan.", { id: "scene-too-big" });
        return;
      }
      setSyncStatus("saving");
      try {
        const r = await api.post<{ revision: number }>(`/api/maps/${mapId}/state`, {
          scene,
          baseRevision: revisionRef.current,
        });
        setRevision(r.revision);
        setSyncStatus("saved");
      } catch (e) {
        setSyncStatus("error");
        toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan — akan menyinkronkan ulang");
        try {
          const latest = await requestWithHeaders<{ revision: number; scene: ScenePayload | null }>(
            `/api/maps/${mapId}/state`,
          );
          if (latest.data?.scene) {
            skipSaveRef.current = true;
            handleRef.current?.applyRemote(latest.data.scene);
            setRevision(latest.data.revision);
            setSyncStatus("saved");
          }
        } catch {
          /* will retry on the next edit */
        }
      }
    },
    [mapId],
  );

  const onSceneChange = useCallback(
    (snap: SceneSnapshot) => {
      if (!canEdit) return;
      if (skipSaveRef.current) {
        skipSaveRef.current = false;
        return;
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void doSave(snap), 700);
    },
    [canEdit, doSave],
  );
  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  // ── 2.5s poll ──────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const r = await requestWithHeaders<{ revision: number; scene: ScenePayload | null }>(
          `/api/maps/${mapId}/state`,
          { headers: { "if-none-match": `"${revisionRef.current}"` } },
        );
        if (r.status === 304) return;
        const rev = r.data?.revision ?? 0;
        if (rev > revisionRef.current && r.data?.scene) {
          skipSaveRef.current = true;
          handleRef.current?.applyRemote(r.data.scene);
          setRevision(rev);
        }
      } catch {
        /* transient network error */
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [mapId]);

  // ── Presence heartbeat (10s) ───────────────────────────────────────────
  const [people, setPeople] = useState<Array<{ userId: string; name: string }>>([]);
  useEffect(() => {
    const tick = async () => {
      try {
        const data = await api.post<Array<{ userId: string; name: string }>>(
          `/api/maps/${mapId}/presence`,
          {},
        );
        setPeople(data);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const timer = setInterval(() => void tick(), 10_000);
    return () => clearInterval(timer);
  }, [mapId]);

  // ── Export helpers ─────────────────────────────────────────────────────
  const safeName = title.replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "peta";

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function exportPng() {
    const handle = handleRef.current;
    if (!handle) return;
    try {
      const blob = await handle.exportPng();
      triggerDownload(blob, `${safeName}.png`);
    } catch {
      toast.error("Gagal ekspor PNG");
    }
  }

  function exportJson() {
    const handle = handleRef.current;
    if (!handle) return;
    const json = handle.exportJson();
    if (!json) return;
    triggerDownload(
      new Blob([json], { type: "application/json" }),
      `${safeName}.json`,
    );
  }

  async function addNode() {
    const handle = handleRef.current;
    if (!handle) {
      toast.error("Canvas belum siap");
      return;
    }
    const created = handle.addNodeAtCenter("Node baru");
    if (!created) return;
    try {
      const node = await api.post<NodeRow>(`/api/maps/${mapId}/nodes`, {
        id: created.nodeId,
        elementId: created.elementId,
        title: "Node baru",
      });
      setNodes((prev) => [...prev, node]);
      setOpenNodeId(created.nodeId);
    } catch (e) {
      handle.removeElement(created.elementId);
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan node");
    }
  }

  async function handleAutoAdd(title: string, targetElementId: string | null) {
    const handle = handleRef.current;
    if (!handle) { toast.error("Canvas belum siap"); return; }
    const created = handle.addAutoNode(title, targetElementId);
    if (!created) return;
    try {
      const node = await api.post<NodeRow>(`/api/maps/${mapId}/nodes`, {
        id: created.nodeId,
        elementId: created.elementId,
        title,
      });
      setNodes((prev) => [...prev, node]);
      setOpenNodeId(created.nodeId);
    } catch (e) {
      handle.removeElement(created.elementId);
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan node");
    }
  }

  const openNode = openNodeId
    ? nodes.find((n) => n.id === openNodeId)
    : undefined;

  const addNodeCb = useCallback(() => {
    void addNode();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useCreateNodeKeybinding(addNodeCb, canEdit && !openNodeId);

  // Sync status indicator
  const statusConfig = {
    saved: { label: "Tersimpan", color: "bg-green-500" },
    saving: { label: "Menyimpan…", color: "bg-yellow-500 animate-pulse" },
    error: { label: "Gagal", color: "bg-destructive" },
  };
  const status = statusConfig[syncStatus];

  return (
    <div className="flex h-screen flex-col">
      {/* ── Brutalist Editor Header ─────────────────────────── */}
      <header className="flex items-center gap-2 border-b-2 border-foreground bg-card px-3 py-2 sm:gap-3 sm:px-4">
        {/* Back link */}
        <Link
          href="/maps"
          className="flex items-center gap-1 rounded-md p-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
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
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span className="hidden sm:inline">Peta</span>
        </Link>

        <div className="h-4 w-px bg-foreground/20" />

        {/* Title */}
        <h1 className="truncate font-heading text-sm font-bold sm:text-base">
          {title}
        </h1>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          {/* Add node button */}
          {canEdit && (
            <Button
              size="sm"
              className="border-2 border-foreground text-xs font-bold shadow-brutal-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal sm:text-sm"
              onClick={() => void addNode()}
              title="Shortcut: N"
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
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              <span className="hidden sm:inline">Node</span>
            </Button>
          )}

          {/* Presence */}
          <AutoAddPanel nodes={nodes} onAdd={(title, tid) => void handleAutoAdd(title, tid)} canEdit={canEdit} />
          <PresenceAvatars people={people} selfId={selfUserId} />

          {/* Share dialog — owner only */}
          {role === "owner" && <ShareDialog mapId={mapId} />}

          {/* Export dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                <span className="hidden sm:inline">Ekspor</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-2 border-foreground shadow-brutal-sm">
              <DropdownMenuItem onClick={() => void exportPng()}>
                Gambar (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportJson}>
                Data (JSON)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sync status */}
          <div className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${status.color}`} />
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {status.label}
            </span>
          </div>

          <div className="hidden h-4 w-px bg-foreground/20 sm:block" />

          {/* User name */}
          <span className="hidden text-xs font-medium text-muted-foreground sm:inline">
            {userName}
          </span>
        </div>
      </header>

      {/* ── Canvas + Side Panel ──────────────────────────────── */}
      <div className="relative flex-1">
        <CanvasBridge
          initial={initialScene}
          viewMode={!canEdit}
          onSceneChange={onSceneChange}
          onNodeClick={setOpenNodeId}
          onEmptyClick={() => setOpenNodeId(null)}
          handleRef={handleRef}
        />

        {/* Node detail panel — slides in with Framer Motion */}
        <AnimatePresence>
          {openNodeId && (
            <motion.aside
              initial={{ x: "100%", opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute bottom-3 right-3 top-3 flex w-[90vw] max-w-96 flex-col rounded-lg border-2 border-foreground bg-card p-4 shadow-brutal-lg sm:w-96"
            >
              {openNode ? (
                <NodePanel
                  key={openNodeId}
                  mapId={mapId}
                  nodeId={openNodeId}
                  canEdit={canEdit}
                  initial={{
                    title: openNode.title,
                    contentMd: openNode.contentMd,
                  }}
                  onClose={() => setOpenNodeId(null)}
                />
              ) : (
                <div className="flex h-full flex-col">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="size-7 self-end p-0"
                    onClick={() => setOpenNodeId(null)}
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
                    >
                      <path d="M18 6 6 18" />
                      <path d="m6 6 12 12" />
                    </svg>
                  </Button>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Catatan untuk node ini belum ada di server (tampil setelah
                    refresh).
                  </p>
                </div>
              )}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
