"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { MarkdownView } from "@/components/markdown/markdown-view";
import { api, ApiError } from "@/lib/api-client";
import { useDebouncedCallback } from "@/lib/hooks/use-debounced-callback";

type Props = {
  mapId: string;
  nodeId: string;
  canEdit: boolean;
  initial: { title: string; contentMd: string };
  onClose: () => void;
};

export function NodePanel({
  mapId,
  nodeId,
  canEdit,
  initial,
  onClose,
}: Props) {
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.contentMd);
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setTitle(initial.title);
    setContent(initial.contentMd);
    setDirty(false);
  }, [nodeId, initial.title, initial.contentMd]);

  const save = useCallback(
    async (t: string, c: string) => {
      try {
        await api.patch(`/api/maps/${mapId}/nodes/${nodeId}`, {
          title: t,
          contentMd: c,
        });
        setDirty(false);
      } catch (e) {
        toast.error(
          e instanceof ApiError ? e.message : "Gagal menyimpan node",
        );
      }
    },
    [mapId, nodeId],
  );

  useDebouncedCallback(content, 800, (c) => {
    if (canEdit && dirty) void save(title, c);
  });
  useDebouncedCallback(title, 800, (t) => {
    if (canEdit && dirty) void save(t, content);
  });

  async function removeNode() {
    if (!confirm("Hapus node ini? Isinya ikut terhapus dari database."))
      return;
    try {
      await api.delete(`/api/maps/${mapId}/nodes/${nodeId}`);
      toast.success("Node dihapus");
      onClose();
    } catch (e) {
      toast.error(
        e instanceof ApiError ? e.message : "Gagal menghapus node",
      );
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header bar */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="size-7 p-0 hover:bg-muted"
          onClick={onClose}
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

        {/* Mode toggle — brutalist pill */}
        <div className="ml-auto flex overflow-hidden rounded-md border-2 border-foreground text-xs font-bold">
          <button
            className={`px-3 py-1.5 transition-colors ${mode === "write" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
            onClick={() => setMode("write")}
          >
            Tulis
          </button>
          <button
            className={`px-3 py-1.5 transition-colors ${mode === "preview" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}
            onClick={() => setMode("preview")}
          >
            Pratinjau
          </button>
        </div>
      </div>

      {/* Title input */}
      <Input
        value={title}
        readOnly={!canEdit}
        onChange={(e) => {
          setTitle(e.target.value);
          setDirty(true);
        }}
        className="border-2 border-foreground/20 font-heading text-base font-bold transition-colors focus:border-primary"
        aria-label="Judul node"
      />

      <Separator className="bg-foreground/10" />

      {/* Editor / preview */}
      <div className="min-h-0 flex-1 overflow-hidden rounded-md border-2 border-foreground/20">
        {mode === "write" ? (
          <MarkdownEditor
            value={content}
            readOnly={!canEdit}
            onChange={(v) => {
              setContent(v);
              setDirty(true);
            }}
          />
        ) : (
          <div className="h-full overflow-auto p-3">
            <MarkdownView markdown={content} />
          </div>
        )}
      </div>

      {/* Delete node */}
      {canEdit && (
        <Button
          size="sm"
          variant="destructive"
          className="self-end border-2 border-destructive/50 font-bold shadow-brutal-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal"
          onClick={() => void removeNode()}
        >
          Hapus node
        </Button>
      )}
    </div>
  );
}
