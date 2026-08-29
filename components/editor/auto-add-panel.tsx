"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";

type NodeOption = { id: string; elementId: string; title: string };

type Props = {
  nodes: NodeOption[];
  onAdd: (title: string, targetElementId: string | null) => void;
  canEdit: boolean;
};

export function AutoAddPanel({ nodes, onAdd, canEdit }: Props) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState<string>("");
  const [open, setOpen] = useState(false);

  function submit() {
    const t = title.trim();
    if (!t) return;
    onAdd(t, target || null);
    setTitle("");
  }

  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-2">
      {/* Collapsible on mobile, inline on desktop */}
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
              onKeyDown={(e) => { if (e.key === "Enter") submit(); if (e.key === "Escape") setOpen(false); }}
              placeholder='mis. "report dashboard"'
              className="h-8 w-44 border-2 border-foreground/20 bg-background text-sm sm:w-56"
              autoFocus
            />
            {nodes.length > 0 && (
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                className="h-8 rounded-md border-2 border-foreground/20 bg-background px-2 text-xs sm:text-sm"
                aria-label="Hubungkan ke"
              >
                <option value="">— tanpa hubung —</option>
                {nodes.map((n) => (
                  <option key={n.id} value={n.elementId}>{n.title}</option>
                ))}
              </select>
            )}
            <Button size="sm" onClick={submit} disabled={!title.trim()} className="h-8 border-2 border-foreground text-xs font-bold shadow-brutal-sm">
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
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
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
