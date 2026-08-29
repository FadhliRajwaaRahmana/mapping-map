"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  exportToBlob,
  exportToSvg,
  serializeAsJSON,
  MIME_TYPES,
} from "@excalidraw/excalidraw";
import type {
  AppState,
  BinaryFiles,
  ExcalidrawImperativeAPI,
  PointerDownState,
} from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { newId } from "@/lib/utils";
import { mergeScenes, type ScenePayload } from "@/lib/scene-client";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import ExcalidrawLazy, { WelcomeScreen, Footer } from "./excalidraw-lazy";

export type SceneSnapshot = {
  elements: readonly OrderedExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
};

export type NodeShape = "rectangle" | "ellipse" | "diamond";

export type CanvasHandle = {
  /** Create a labeled rectangle node at the viewport center. Returns ids or null. */
  addNodeAtCenter(title: string): { nodeId: string; elementId: string } | null;
  /** Auto-add node near target with optional arrow to target. Arrow is bound on both ends so it follows when boxes move. */
  addAutoNode(
    title: string,
    targetElementId?: string | null,
    shape?: NodeShape,
  ): { nodeId: string; elementId: string } | null;
  /** Apply a remote persisted scene WITHOUT polluting local undo/redo. */
  applyRemote(remote: ScenePayload): void;
  /** Soft-delete an element by id (used to roll back a failed node save). */
  removeElement(elementId: string): void;
  /** Current serializable snapshot (elements + appState + files). */
  getSnapshot(): SceneSnapshot | null;
  /** PNG of the whole scene as a Blob. */
  exportPng(): Promise<Blob>;
  /** SVG of the whole scene as a string. */
  exportSvg(): Promise<string>;
  /** JSON of the whole scene as a string. */
  exportJson(): string | null;
  /** Toggle read-only imperatively (prop toggle would remount and lose state). */
  setViewMode(view: boolean): void;
};

type Props = {
  mapId: string;
  initial: ScenePayload | null;
  viewMode: boolean;
  onSceneChange: (snap: SceneSnapshot) => void;
  onNodeClick: (nodeId: string) => void;
  onEmptyClick: () => void;
  handleRef: React.RefObject<CanvasHandle | null>;
};

export function CanvasBridge({
  mapId,
  initial,
  viewMode,
  onSceneChange,
  onNodeClick,
  onEmptyClick,
  handleRef,
}: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const { resolvedTheme } = useTheme();
  const [libraryLoaded, setLibraryLoaded] = useState(false);
  const saveLibraryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Sync initial library from backend ─────────────────────────────────
  useEffect(() => {
    let active = true;
    async function loadLib() {
      try {
        const res = await api.get<{ libraryItems: unknown[] | null }>(
          `/api/maps/${mapId}/library`,
        );
        if (active && res.libraryItems && apiRef.current) {
          apiRef.current.updateLibrary({ libraryItems: res.libraryItems as never[] });
        }
      } catch {
        /* ignore fallback to empty library */
      } finally {
        if (active) setLibraryLoaded(true);
      }
    }
    void loadLib();
    return () => {
      active = false;
      if (saveLibraryTimer.current) clearTimeout(saveLibraryTimer.current);
    };
  }, [mapId]);

  const onLibraryChange = useCallback(
    (items: readonly unknown[]) => {
      if (!libraryLoaded || viewMode) return;
      if (saveLibraryTimer.current) clearTimeout(saveLibraryTimer.current);
      saveLibraryTimer.current = setTimeout(async () => {
        try {
          await api.put(`/api/maps/${mapId}/library`, {
            libraryItems: items,
          });
        } catch {
          /* silently retry on next change */
        }
      }, 1000);
    },
    [libraryLoaded, mapId, viewMode],
  );

  const onExcalidrawAPI = useCallback(
    (apiInstance: ExcalidrawImperativeAPI) => {
      apiRef.current = apiInstance;
      (handleRef as React.MutableRefObject<CanvasHandle | null>).current = {
        addNodeAtCenter(title) {
          const a = apiRef.current;
          if (!a) return null;
          const nodeId = newId();
          const st = a.getAppState();
          const x = -st.scrollX + st.width / 2 - 100;
          const y = -st.scrollY + st.height / 2 - 40;
          const created = convertToExcalidrawElements([
            {
              type: "rectangle",
              x,
              y,
              width: 200,
              height: 80,
              backgroundColor: "#a5d8ff",
              strokeColor: "#1971c2",
              customData: { nodeId },
              label: { text: title, fontSize: 20 },
            },
          ]);
          const container = created.find((e) => e.type === "rectangle");
          const elementId = container?.id ?? created[0]?.id ?? "";
          a.updateScene({
            elements: [...a.getSceneElements(), ...created],
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          });
          return { nodeId, elementId };
        },
        addAutoNode(title, targetElementId, shape = "rectangle") {
          const a = apiRef.current;
          if (!a) return null;
          const nodeId = newId();
          const newNodeElementId = newId();
          const allowed = new Set(["rectangle", "ellipse", "diamond"]);
          const nodeType = (allowed.has(shape as string) ? shape : "rectangle") as NodeShape;
          const currentElements = a.getSceneElements();
          const liveElements = currentElements.filter((e) => !e.isDeleted);

          let x: number, y: number;
          if (targetElementId) {
            const target = liveElements.find((e) => e.id === targetElementId);
            if (target) {
              const siblings = liveElements.filter(
                (e) => e.type === "rectangle" || e.type === "ellipse" || e.type === "diamond",
              ).length;
              const row = siblings % 3;
              x = target.x + target.width + 60;
              y = target.y + row * 110 - 55;
            } else {
              const st = a.getAppState();
              x = -st.scrollX + st.width / 2 - 100;
              y = -st.scrollY + st.height / 2 - 40;
            }
          } else if (liveElements.length > 0) {
            const rects = liveElements.filter(
              (e) => e.type === "rectangle" || e.type === "ellipse" || e.type === "diamond",
            );
            const last = rects[rects.length - 1];
            if (last) {
              x = last.x + last.width + 60;
              y = last.y;
            } else {
              const st = a.getAppState();
              x = -st.scrollX + st.width / 2 - 100;
              y = -st.scrollY + st.height / 2 - 40;
            }
          } else {
            const st = a.getAppState();
            x = -st.scrollX + st.width / 2 - 100;
            y = -st.scrollY + st.height / 2 - 40;
          }
          const nodeW = nodeType === "diamond" ? 200 : 220;

          const newSkeleton: unknown[] = [
            {
              id: newNodeElementId,
              type: nodeType,
              x,
              y,
              width: nodeW,
              height: 80,
              backgroundColor: "#a5d8ff",
              strokeColor: "#1971c2",
              customData: { nodeId },
              label: { text: title, fontSize: 16 },
            },
          ];

          if (targetElementId) {
            const target = liveElements.find((e) => e.id === targetElementId);
            if (target) {
              newSkeleton.push({
                type: "arrow",
                x: target.x + target.width,
                y: target.y + target.height / 2,
                width: x - (target.x + target.width),
                height: y + 40 - (target.y + target.height / 2),
                points: [
                  [0, 0],
                  [x - (target.x + target.width), y + 40 - (target.y + target.height / 2)],
                ],
                start: { id: targetElementId },
                end: { id: newNodeElementId },
              });
            }
          }

          const convertedAll = convertToExcalidrawElements(
            [...currentElements, ...newSkeleton] as never[],
            { regenerateIds: false },
          );

          const container = convertedAll.find((e) => e.id === newNodeElementId);
          const elementId = container?.id ?? newNodeElementId;

          a.updateScene({
            elements: convertedAll,
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          });

          return { nodeId, elementId };
        },
        applyRemote(remote) {
          const a = apiRef.current;
          if (!a) return;
          const { elements, files } = mergeScenes(
            a.getSceneElements(),
            a.getAppState(),
            a.getFiles(),
            remote,
          );
          if (Object.keys(files).length > 0) {
            a.addFiles(Object.values(files) as never[]);
          }
          a.updateScene({
            elements,
            appState: remote.appState as unknown as AppState,
            captureUpdate: CaptureUpdateAction.NEVER,
          });
        },
        removeElement(elementId) {
          const a = apiRef.current;
          if (!a) return;
          a.updateScene({
            elements: a.getSceneElements().map((el) =>
              el.id === elementId ? { ...el, isDeleted: true } : el,
            ),
            captureUpdate: CaptureUpdateAction.IMMEDIATELY,
          });
        },
        getSnapshot() {
          const a = apiRef.current;
          if (!a) return null;
          return {
            elements: a.getSceneElements(),
            appState: a.getAppState(),
            files: a.getFiles(),
          };
        },
        exportPng() {
          const a = apiRef.current;
          if (!a) return Promise.reject(new Error("canvas not ready"));
          return exportToBlob({
            elements: a.getSceneElements() as never[],
            appState: a.getAppState(),
            files: a.getFiles(),
            mimeType: MIME_TYPES.png,
          });
        },
        async exportSvg() {
          const a = apiRef.current;
          if (!a) throw new Error("canvas not ready");
          const svgEl = await exportToSvg({
            elements: a.getSceneElements() as never[],
            appState: a.getAppState(),
            files: a.getFiles(),
          });
          return svgEl.outerHTML;
        },
        exportJson() {
          const a = apiRef.current;
          if (!a) return null;
          return serializeAsJSON(a.getSceneElements(), a.getAppState(), a.getFiles(), "database");
        },
        setViewMode(view) {
          const a = apiRef.current;
          if (!a) return;
          a.updateScene({ appState: { viewModeEnabled: view } });
        },
      };
    },
    [handleRef],
  );

  const onChange = useCallback(
    (
      elements: readonly OrderedExcalidrawElement[],
      appState: AppState,
      files: BinaryFiles,
    ) => {
      onSceneChange({ elements, appState, files });
    },
    [onSceneChange],
  );

  const onPointerUp = useCallback(
    (_activeTool: unknown, pointerDownState: PointerDownState) => {
      if (pointerDownState.drag.hasOccurred) return;
      const el = pointerDownState.hit.element;
      if (!el) {
        onEmptyClick();
        return;
      }
      if (el.type === "rectangle" || el.type === "ellipse" || el.type === "diamond") {
        const nodeId = (el.customData as { nodeId?: string } | undefined)?.nodeId;
        if (nodeId) {
          onNodeClick(nodeId);
          return;
        }
      }
      onEmptyClick();
    },
    [onNodeClick, onEmptyClick],
  );

  const onLinkOpen = useCallback(
    (
      element: unknown,
      event: { preventDefault: () => void },
    ) => {
      const link = (element as { link?: string })?.link;
      if (!link) return;
      // Allow only safe http/https and anchor links
      if (!/^https?:\/\//i.test(link) && !link.startsWith("#")) {
        event.preventDefault();
        toast.error("Tautan eksternal tidak aman diblokir.");
      }
    },
    [],
  );

  const validateEmbeddable = useCallback((url: string) => {
    // Allow embeddable safe video / web tools
    return (
      /^https:\/\/(www\.)?(youtube\.com|youtu\.be|figma\.com|codepen\.io|loom\.com)/i.test(url)
    );
  }, []);

  const initialData = useCallback(
    () => (initial ? { ...initial, scrollToContent: true } : null),
    [initial],
  );

  useEffect(() => {
    apiRef.current?.updateScene({ appState: { viewModeEnabled: viewMode } });
  }, [viewMode]);

  const canvasTheme = resolvedTheme === "dark" ? "dark" : "light";

  return (
    <ExcalidrawLazy
      initialData={initialData}
      onChange={onChange}
      excalidrawAPI={onExcalidrawAPI}
      onPointerUp={onPointerUp}
      viewModeEnabled={viewMode}
      theme={canvasTheme}
      langCode="id-ID"
      onLibraryChange={onLibraryChange}
      onLinkOpen={onLinkOpen}
      validateEmbeddable={validateEmbeddable}
      UIOptions={{
        canvasActions: {
          loadScene: false,
          saveToActiveFile: false,
          toggleTheme: false,
          export: false,
        },
      }}
    >
      <WelcomeScreen>
        <WelcomeScreen.Center>
          <WelcomeScreen.Center.Heading>
            Petakan ide & catatan teknismu
          </WelcomeScreen.Center.Heading>
          <WelcomeScreen.Center.Menu>
            <WelcomeScreen.Center.MenuItemHelp />
          </WelcomeScreen.Center.Menu>
        </WelcomeScreen.Center>
      </WelcomeScreen>
      <Footer>
        <div className="flex items-center gap-2 rounded border border-foreground/20 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm shadow-sm">
          <span>Tip: Tekan <b>N</b> untuk node baru atau gunakan <b>Auto Add</b> di atas</span>
        </div>
      </Footer>
    </ExcalidrawLazy>
  );
}
