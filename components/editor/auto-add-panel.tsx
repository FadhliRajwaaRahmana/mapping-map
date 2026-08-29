"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

type NodeOption = { id: string; elementId: string; title: string };
type Shape = "rectangle" | "ellipse" | "diamond";

type Props = {
  nodes: NodeOption[];
  onAdd: (title: string, targetElementId: string | null, shape: Shape) => void;
  canEdit: boolean;
  /** Current scene elements — used to hide deleted nodes from dropdown */
  sceneElements?: readonly OrderedExcalidrawElement[];
};

export function AutoAddPanel({ nodes, onAdd, canEdit, sceneElements }: Props) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState<string>("");
  const [shape, setShape] = useState<Shape>("rectangle");
  const [open, setOpen] = useState(false);

  // Derive dropdown strictly from live non-deleted canvas shapes
  const visibleNodes = useMemo(() => {
    // If sceneElements is defined (even if empty), only show nodes whose elementId is actually live on canvas
    if (sceneElements) {
      const liveElementsMap = new Map(
        (
          sceneElements as unknown as {
            id: string;
            isDeleted?: boolean;
            type?: string;
            customData?: { nodeId?: string };
          }[]
        )
          .filter(
            (e) =>
              !e.isDeleted &&
              (e.type === "rectangle" || e.type === "ellipse" || e.type === "diamond"),
          )
          .map((e) => [e.id, e]),
      );

      // Filter nodes to only those that exist in the live scene
      return nodes.filter((n) => liveElementsMap.has(n.elementId));
    }

    return [];
  }, [nodes, sceneElements]);

  // Clear stale target when its box was deleted
  useEffect(() => {
    if (target && !visibleNodes.some((n) => n.elementId === target)) {
      setTarget("");
    }
  }, [visibleNodes, target]);

  function submit() {
    const t = title.trim();
    if (!t) return;
    // if selected target is no longer live, send null
    const stillLive = visibleNodes.some((n) => n.elementId === target);
    onAdd(t, stillLive ? target || null : null, shape);
    setTitle("");
  }

  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-2">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2 overflow-hidden"
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder='mis. "report dashboard"'
              className="h-8 w-44 border-2 border-foreground/20 bg-background text-sm sm:w-56"
              autoFocus
            />
            <select
              value={shape}
              onChange={(e) => setShape(e.target.value as Shape)}
              className="h-8 rounded-md border-2 border-foreground/20 bg-background px-2 text-xs sm:text-sm"
              aria-label="Bentuk"
              title="Bentuk node"
            >
              <option value="rectangle">▭ Persegi</option>
              <option value="ellipse">⬭ Elips</option>
              <option value="diamond">⬥ Diamond</option>
            </select>
            {visibleNodes.length > 0 ? (
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="h-8 rounded-md border-2 border-foreground/20 bg-background px-2 text-xs sm:text-sm"
                aria-label="Hubungkan ke"
              >
                <option value="">— tanpa hubung —</option>
                {visibleNodes.map((n) => (
                  <option key={n.id} value={n.elementId}>
                    {n.title}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              size="sm"
              onClick={submit}
              disabled={!title.trim()}
              className="h-8 border-2 border-foreground text-xs font-bold shadow-brutal-sm"
            >
              Tambah
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {!open ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
          className="h-8 border-2 border-foreground bg-card text-xs font-bold shadow-brutal-sm sm:text-sm"
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
          Auto Add
        </Button>
      ) : (
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} className="h-8 text-xs">
          Tutup
        </Button>
      )}
    </div>
  );
}
