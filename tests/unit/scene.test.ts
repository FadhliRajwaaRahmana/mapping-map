import { describe, it, expect, vi } from "vitest";

// Mock @excalidraw/excalidraw to avoid loading the full React component tree
// (which requires canvas and a full browser environment).
vi.mock("@excalidraw/excalidraw", () => ({
  reconcileElements: (local: unknown[], remote: unknown[]) => {
    const seen = new Set<string>();
    const result: unknown[] = [];
    for (const el of local) {
      const id = (el as { id: string }).id;
      if (!seen.has(id)) { seen.add(id); result.push(el); }
    }
    for (const el of remote) {
      const id = (el as { id: string }).id;
      if (!seen.has(id)) { seen.add(id); result.push(el); }
    }
    return result;
  },
  restoreElements: (elements: unknown[]) => elements ?? [],
}));

import {
  parseScene,
  sceneSizeBytes,
  mergeFiles,
  MAX_SCENE_BYTES,
  MAX_IMAGE_BYTES,
  type ScenePayload,
} from "@/lib/scene";
import { toScenePayload, mergeScenes } from "@/lib/scene-client";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { OrderedExcalidrawElement } from "@excalidraw/excalidraw/element/types";

function fakeElement(id: string): OrderedExcalidrawElement {
  return { id, type: "rectangle", x: 0, y: 0, width: 10, height: 10 } as unknown as OrderedExcalidrawElement;
}

describe("scene helpers (server-safe)", () => {
  it("parseScene rejects garbage and accepts a valid scene", () => {
    expect(parseScene("not-json")).toBeNull();
    expect(parseScene("42")).toBeNull();
    const ok = parseScene(
      JSON.stringify({ type: "excalidraw", version: 2, elements: [] }),
    );
    expect(ok).not.toBeNull();
    expect(ok!.type).toBe("excalidraw");
  });

  it("sceneSizeBytes measures the JSON payload", () => {
    const p: ScenePayload = {
      type: "excalidraw",
      version: 2,
      source: "test",
      elements: [],
      appState: {},
      files: {},
    };
    expect(sceneSizeBytes(p)).toBeGreaterThan(20);
  });

  it("mergeFiles unions both maps, local wins on conflict", () => {
    const merged = mergeFiles({ a: 1 }, { a: 2, b: 3 });
    expect(merged).toEqual({ a: 1, b: 3 });
  });

  it("reports the 4MB scene cap and 2MB image cap", () => {
    expect(MAX_SCENE_BYTES).toBe(4 * 1024 * 1024);
    expect(MAX_IMAGE_BYTES).toBe(2 * 1024 * 1024);
  });
});

describe("scene helpers (client, excalidraw mocked)", () => {
  it("toScenePayload emits the excalidraw scene shape with a SAFE appState subset", () => {
    const els = [fakeElement("el-1")];
    const appState = {
      viewBackgroundColor: "#ff0000",
      selectedElementIds: { a: true },
      scrollX: 123,
    } as unknown as AppState;
    const p = toScenePayload(els, appState, {});
    expect(p.type).toBe("excalidraw");
    expect(p.version).toBe(2);
    expect(p.elements.length).toBe(1);
    expect(p.appState.viewBackgroundColor).toBe("#ff0000");
    expect(p.appState.selectedElementIds).toBeUndefined();
    expect(p.appState.scrollX).toBeUndefined();
  });

  it("mergeScenes merges local and remote elements (both survive when ids differ)", () => {
    const local = [fakeElement("local-1")];
    const remote: ScenePayload = {
      type: "excalidraw",
      version: 2,
      source: "test",
      elements: [fakeElement("remote-1")],
      appState: {},
      files: { "file-r": { id: "file-r" } },
    };
    const appState = { selectedElementIds: {}, scrollX: 0, scrollY: 0 } as unknown as AppState;
    const localFiles = { "file-l": { id: "file-l" } } as unknown as BinaryFiles;

    const result = mergeScenes(local, appState, localFiles, remote);
    const ids = (result.elements as unknown as { id: string }[]).map((e) => e.id);
    expect(ids).toContain("local-1");
    expect(ids).toContain("remote-1");
    expect(result.files).toHaveProperty("file-l");
    expect(result.files).toHaveProperty("file-r");
  });
});
