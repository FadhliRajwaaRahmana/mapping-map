"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";

/**
 * Lenis smooth-scroll provider.
 * Mounted once in the root layout — handles rAF loop and cleanup.
 * Only activates on pages with scroll (not full-screen editor).
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
