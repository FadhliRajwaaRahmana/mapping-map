"use client";

import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CanvasBridge,
  type CanvasHandle,
  type SceneSnapshot,
} from "./canvas-bridge";
import type { ScenePayload } from "@/lib/scene";
import { api, ApiError } from "@/lib/api-client";

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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  selfUserId,
  initialScene,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialRevision,
  initialNodes,
}: Props) {
  const handleRef = useRef<CanvasHandle | null>(null);
  const [openNodeId, setOpenNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<NodeRow[]>(initialNodes);
  const canEdit = role !== "viewer";

  const onSceneChange = useCallback((_snap: SceneSnapshot) => {
    // Task 12 wires debounced save here.
  }, []);

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
      handle.removeElement(created.elementId); // roll back the canvas element
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan node");
    }
  }

  const openNode = openNodeId
    ? nodes.find((n) => n.id === openNodeId)
    : undefined;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center gap-3 border-b bg-background px-4 py-2">
        <Link
          href="/maps"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
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
            className="inline mr-1"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Peta
        </Link>
        <div className="h-4 w-px bg-border" />
        <h1 className="truncate text-sm font-semibold">{title}</h1>
        <div className="ml-auto flex items-center gap-2">
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
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
              Node
            </Button>
          )}
          <span className="text-xs text-muted-foreground">{userName}</span>
        </div>
      </header>
      <div className="relative flex-1">
        <CanvasBridge
          initial={initialScene}
          viewMode={!canEdit}
          onSceneChange={onSceneChange}
          onNodeClick={setOpenNodeId}
          onEmptyClick={() => setOpenNodeId(null)}
          handleRef={handleRef}
        />
        {openNodeId && (
          <aside className="absolute bottom-3 right-3 top-3 flex w-80 flex-col rounded-lg border bg-background/95 p-4 shadow-xl backdrop-blur-sm sm:w-96">
            <div className="flex items-center justify-between">
              <h2 className="truncate text-sm font-semibold">
                {openNode?.title ?? "Node"}
              </h2>
              <Button
                size="sm"
                variant="ghost"
                className="size-7 p-0"
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
            </div>
            <div className="mt-3 flex-1 overflow-auto text-sm text-muted-foreground">
              {openNode ? (
                <p>
                  {openNode.contentMd || "Belum ada catatan. Panel Markdown penuh dipasang di Task 11."}
                </p>
              ) : (
                <p>Node tidak ditemukan.</p>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
