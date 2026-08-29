"use client";

import { useEffect } from "react";

/**
 * Fires `onCreate` on a plain "N" keypress, ignoring:
 *  - any modifier key (ctrl/cmd/alt/shift),
 *  - typing contexts (input/textarea/contentEditable).
 */
export function useCreateNodeKeybinding(
  onCreate: () => void,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "n") return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return;
      const t = e.target as HTMLElement | null;
      if (t) {
        if (
          t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable
        )
          return;
      }
      e.preventDefault();
      onCreate();
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }, [enabled, onCreate]);
}
