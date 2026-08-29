/**
 * Client-only scene utilities that depend on `@excalidraw/excalidraw`.
 * Do NOT import this from server components or route handlers.
 */

import { reconcileElements, restoreElements } from "@excalidraw/excalidraw";
import type {
  AppState,
  BinaryFiles,
} from "@excalidraw/excalidraw/types";
import type {
  ExcalidrawElement,
  OrderedExcalidrawElement,
} from "@excalidraw/excalidraw/element/types";
import type {
  ReconciledExcalidrawElement,
  RemoteExcalidrawElement,
} from "@excalidraw/excalidraw/data/reconcile";
import { mergeFiles, type ScenePayload } from "./scene";

export type { ScenePayload };

const APPSTATE_PERSIST_KEYS = ["viewBackgroundColor", "gridSize"] as const;

export function toScenePayload(
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
): ScenePayload {
  const safe: Record<string, unknown> = {};
  for (const k of APPSTATE_PERSIST_KEYS) {
    safe[k] = appState[k];
  }
  return {
    type: "excalidraw",
    version: 2,
    source: "mapping-app",
    elements: elements.map((el) => el as unknown as ExcalidrawElement),
    appState: safe,
    files: { ...files },
  };
}

/**
 * Per-element last-write-wins merge of the local (in-canvas) scene with a
 * remote persisted scene. Returns reconciled elements + unioned files.
 */
export function mergeScenes(
  localElements: readonly OrderedExcalidrawElement[],
  localAppState: AppState,
  localFiles: BinaryFiles,
  remote: ScenePayload,
): { elements: ReconciledExcalidrawElement[]; files: BinaryFiles } {
  const restored = restoreElements(remote.elements as ExcalidrawElement[] ?? null, null);
  const remoteEl = restored as unknown as RemoteExcalidrawElement[];
  const elements = reconcileElements(localElements, remoteEl, localAppState);
  return {
    elements,
    files: mergeFiles(localFiles, (remote.files ?? {}) as BinaryFiles),
  };
}
