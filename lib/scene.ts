/**
 * Server-safe scene utilities.
 *
 * This module MUST NOT import `@excalidraw/excalidraw` (which references
 * `window` at init time). Functions that need excalidraw's runtime
 * (mergeScenes, toScenePayload) live in `lib/scene-client.ts` instead.
 */

export const MAX_SCENE_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5MB body limit
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

/** Persisted scene = the excalidraw JSON shape (type must be "excalidraw"). */
export type ScenePayload = {
  type: string;
  version: number;
  source: string;
  elements: unknown[];
  appState: Record<string, unknown>;
  files: Record<string, unknown>;
};

export function parseScene(raw: string): ScenePayload | null {
  try {
    const p = JSON.parse(raw) as ScenePayload;
    return p && Array.isArray(p.elements) ? p : null;
  } catch {
    return null;
  }
}

export function sceneSizeBytes(p: ScenePayload): number {
  return new TextEncoder().encode(JSON.stringify(p)).length;
}

export function mergeFiles<T extends Record<string, unknown>>(
  local: T,
  remote: T,
): T {
  return { ...remote, ...local };
}

type SceneElement = { id: string; version: number; [k: string]: unknown };

/**
 * Server-safe per-element last-write-wins merge.
 * Same semantics as excalidraw's `reconcileElements` but runs without DOM.
 * `stored` = what's in the database, `incoming` = what the client sent.
 */
export function mergeElementsLWW(
  stored: unknown[],
  incoming: unknown[],
): unknown[] {
  const map = new Map<string, SceneElement>();
  for (const el of stored) {
    const e = el as SceneElement;
    if (e.id) map.set(e.id, e);
  }
  for (const el of incoming) {
    const e = el as SceneElement;
    if (!e.id) continue;
    const existing = map.get(e.id);
    if (!existing || (e.version ?? 0) >= (existing.version ?? 0)) {
      map.set(e.id, e);
    }
  }
  return Array.from(map.values());
}
