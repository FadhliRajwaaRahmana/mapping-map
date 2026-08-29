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

export const MAX_SCENE_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5MB body limit
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Persisted scene = the excalidraw JSON shape (type must be "excalidraw"). */
export type ScenePayload = {
  type: string;
  version: number;
  source: string;
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
};

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
    appState: safe as Partial<AppState>,
    files: { ...files },
  };
}

export function sceneSizeBytes(p: ScenePayload): number {
  return new TextEncoder().encode(JSON.stringify(p)).length;
}

export function mergeFiles(local: BinaryFiles, remote: BinaryFiles): BinaryFiles {
  return { ...remote, ...local };
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
  const restored = restoreElements(remote.elements ?? null, null);
  const remoteEl = restored as unknown as RemoteExcalidrawElement[];
  const elements = reconcileElements(localElements, remoteEl, localAppState);
  return { elements, files: mergeFiles(localFiles, remote.files ?? {}) };
}

export function parseScene(raw: string): ScenePayload | null {
  try {
    const p = JSON.parse(raw) as ScenePayload;
    return p && Array.isArray(p.elements) ? p : null;
  } catch {
    return null;
  }
}
