"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "lenis";

/**
 * Lenis smooth-scroll provider.
 * Mounted once in the root layout — handles rAF loop and cleanup.
 * Only activates on pages with scroll (not full-screen editor).
 */
export function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isEditor = pathname?.startsWith("/maps/");
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (isAdmin || isEditor) return;
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, [isAdmin, isEditor]);

  return <>{children}</>;
}
