"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  CaptureUpdateAction,
  convertToExcalidrawElements,
  exportToBlob,
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
import ExcalidrawLazy from "./excalidraw-lazy";

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
  /** JSON of the whole scene as a string. */
  exportJson(): string | null;
  /** Toggle read-only imperatively (prop toggle would remount and lose state). */
  setViewMode(view: boolean): void;
};

type Props = {
  initial: ScenePayload | null;
  viewMode: boolean;
  onSceneChange: (snap: SceneSnapshot) => void;
  onNodeClick: (nodeId: string) => void;
  onEmptyClick: () => void;
  handleRef: React.RefObject<CanvasHandle | null>;
};

export function CanvasBridge({
  initial,
  viewMode,
  onSceneChange,
  onNodeClick,
  onEmptyClick,
  handleRef,
}: Props) {
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);

  const onExcalidrawAPI = useCallback(
    (api: ExcalidrawImperativeAPI) => {
      apiRef.current = api;
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
          const elementId = created[0]?.id ?? "";
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
          const allowed = new Set(["rectangle", "ellipse", "diamond"]);
          const nodeType = (allowed.has(shape as string) ? shape : "rectangle") as NodeShape;
          const elsAll = a.getSceneElements() as unknown as {
            id: string;
            x: number;
            y: number;
            width: number;
            height: number;
            type: string;
            isDeleted?: boolean;
          }[];
          const els = elsAll.filter((e) => !e.isDeleted);
          let x: number, y: number;
          if (targetElementId) {
            const target = els.find((e) => e.id === targetElementId);
            if (target) {
              const siblings = els.filter(
                (e) => e.type === "rectangle" || e.type === "ellipse" || e.type === "diamond",
              ).length;
              const row = siblings % 3;
              x = target.x + target.width + 40;
              y = target.y + row * 110 - 55;
            } else {
              const st = a.getAppState();
              x = -st.scrollX + st.width / 2 - 100;
              y = -st.scrollY + st.height / 2 - 40;
            }
          } else if (els.length > 0) {
            const rects = els.filter(
              (e) => e.type === "rectangle" || e.type === "ellipse" || e.type === "diamond",
            );
            const last = rects[rects.length - 1];
            if (last) {
              x = last.x + last.width + 40;
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
          const elements: unknown[] = [
            {
              type: nodeType,
              x,
              y,
              width: nodeW,
              height: 80,
              backgroundColor: "#a5d8ff",
              strokeColor: "#1971c2",
              customData: { nodeId },
              label: { text: title, fontSize: 16, fontFamily: 1 },
            },
          ];
          if (targetElementId) {
            const target = els.find((e) => e.id === targetElementId);
            if (target) {
              elements.push({
                type: "arrow",
                x: target.x + target.width,
                y: target.y + target.height / 2,
                width: x - (target.x + target.width),
                height: y + 40 - (target.y + target.height / 2),
                points: [
                  [0, 0],
                  [x - (target.x + target.width), y + 40 - (target.y + target.height / 2)],
                ],
                startBinding: { elementId: targetElementId, focus: 0, gap: 8, fixedPoint: null },
                endBinding: null,
              } as unknown as Record<string, unknown>);
            }
          }
          const created = convertToExcalidrawElements(elements as never[]);
          const elementId = created[0]?.id ?? "";
          // If arrow was created, bind it on both ends and patch boundElements so it follows on drag
          if (targetElementId && created.length > 1) {
            const newNode = created[0] as unknown as Record<string, unknown>;
            const arrow = created[1] as unknown as Record<string, unknown>;
            (arrow as Record<string, unknown>).endBinding = {
              elementId: newNode.id as string,
              focus: 0,
              gap: 8,
              fixedPoint: null,
            };
            (arrow as Record<string, unknown>).startBinding = {
              elementId: targetElementId,
              focus: 0,
              gap: 8,
              fixedPoint: null,
            };
            // Preserve label explicitly before binding mutation
            // (binding patch must not drop label — was causing empty text)
            const origLabel = (newNode as Record<string, unknown>).label as Record<string, unknown> | undefined;
            const newNodeBound = [
              ...(((newNode.boundElements as unknown[]) ?? []) as unknown[]),
              { id: arrow.id as string, type: "arrow" },
            ] as unknown[];
            (newNode as Record<string, unknown>).boundElements = newNodeBound;
            // Restore label if it was dropped by mutation, with safe defaults
            if (origLabel) {
              (newNode as Record<string, unknown>).label = origLabel;
            } else if (title) {
              (newNode as Record<string, unknown>).label = { text: title, fontSize: 16, fontFamily: 1 };
            }
            const existing = a.getSceneElements() as unknown as Record<string, unknown>[];
            const arrowId = arrow.id as string;
            const patchedExisting = existing.map((el) => {
              if (el.id === targetElementId) {
                const be = ((el.boundElements as unknown[]) ?? []) as unknown[];
                if ((be as { id: string }[]).some((b) => b.id === arrowId)) return el;
                return { ...el, boundElements: [...be, { id: arrowId, type: "arrow" }] };
              }
              return el;
            });
            const withoutOldIds = patchedExisting.filter(
              (el) => el.id !== newNode.id && el.id !== arrow.id,
            );
            a.updateScene({
              elements: [...withoutOldIds, newNode, arrow] as never[],
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          } else {
            a.updateScene({
              elements: [...a.getSceneElements(), ...created],
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          }
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

  const initialData = useCallback(
    () => (initial ? { ...initial, scrollToContent: true } : null),
    [initial],
  );

  useEffect(() => {
    apiRef.current?.updateScene({ appState: { viewModeEnabled: viewMode } });
  }, [viewMode]);

  return (
    <ExcalidrawLazy
      initialData={initialData}
      onChange={onChange}
      excalidrawAPI={onExcalidrawAPI}
      onPointerUp={onPointerUp}
      viewModeEnabled={viewMode}
    />
  );
}
