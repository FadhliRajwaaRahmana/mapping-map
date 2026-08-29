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

export type CanvasHandle = {
  /** Create a labeled rectangle node at the viewport center. Returns ids or null. */
  addNodeAtCenter(title: string): { nodeId: string; elementId: string } | null;
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
            captureUpdate: CaptureUpdateAction.IMMEDIATELY, // user action → undoable
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
          // Merge files via addFiles (updateScene has no files param)
          if (Object.keys(files).length > 0) {
            a.addFiles(Object.values(files) as never[]);
          }
          a.updateScene({
            elements,
            appState: remote.appState as unknown as AppState,
            captureUpdate: CaptureUpdateAction.NEVER, // remote → never pollutes local undo/redo
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
          return serializeAsJSON(
            a.getSceneElements(),
            a.getAppState(),
            a.getFiles(),
            "database",
          );
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
      if (pointerDownState.drag.hasOccurred) return; // it was a drag, not a click
      const el = pointerDownState.hit.element;
      if (!el) {
        onEmptyClick();
        return;
      }
      if (el.type === "rectangle" || el.type === "ellipse") {
        const nodeId = (el.customData as { nodeId?: string } | undefined)
          ?.nodeId;
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
