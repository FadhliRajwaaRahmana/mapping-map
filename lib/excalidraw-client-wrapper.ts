"use client";

import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

let excalidrawModulePromise: Promise<typeof import("@excalidraw/excalidraw")> | null = null;

export function getExcalidrawModule() {
  if (typeof window === "undefined") {
    throw new Error("Excalidraw module can only be loaded in the browser");
  }
  if (!excalidrawModulePromise) {
    excalidrawModulePromise = import("@excalidraw/excalidraw");
  }
  return excalidrawModulePromise;
}

export async function convertElements(elements: unknown[], opts?: { regenerateIds: boolean }) {
  const m = await getExcalidrawModule();
  return m.convertToExcalidrawElements(elements as never[], opts);
}

export async function exportSceneToBlob(opts: {
  elements: readonly OrderedExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}) {
  const m = await getExcalidrawModule();
  return m.exportToBlob({
    elements: opts.elements as never[],
    appState: opts.appState,
    files: opts.files,
    mimeType: m.MIME_TYPES.png,
  });
}

export async function exportSceneToSvg(opts: {
  elements: readonly OrderedExcalidrawElement[];
  appState: AppState;
  files: BinaryFiles;
}) {
  const m = await getExcalidrawModule();
  const svg = await m.exportToSvg({
    elements: opts.elements as never[],
    appState: opts.appState,
    files: opts.files,
  });
  return svg.outerHTML;
}

export async function exportSceneToJson(
  elements: readonly OrderedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
) {
  const m = await getExcalidrawModule();
  return m.serializeAsJSON(elements as never[], appState, files, "database");
}
