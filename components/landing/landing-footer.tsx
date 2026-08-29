"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export function LandingFooter() {
  const footerRef = useRef<HTMLElement>(null);
  useGSAP(() => {
    gsap.from(".footer-content", {
      y: 30, opacity: 0, duration: 0.6, ease: "power2.out",
      scrollTrigger: { trigger: footerRef.current, start: "top 95%", once: true },
    });
  }, { scope: footerRef });

  return (
    <footer ref={footerRef} className="border-t-2 border-foreground bg-card">
      <div className="footer-content mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-foreground bg-primary font-heading text-sm font-bold text-primary-foreground shadow-brutal-sm">M</div>
              <span className="font-heading text-lg font-bold tracking-tight">Mapping</span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">Mind map kolaboratif untuk tim modern. Petakan ide, catat detail, kolaborasi real-time.</p>
          </div>
          <div>
            <p className="mb-3 text-sm font-bold">Produk</p>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <button onClick={() => document.querySelector("#features")?.scrollIntoView({ behavior: "smooth" })} className="text-left hover:text-foreground">Fitur</button>
              <button onClick={() => document.querySelector("#how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="text-left hover:text-foreground">Cara Kerja</button>
              <button onClick={() => document.querySelector("#open-source")?.scrollIntoView({ behavior: "smooth" })} className="text-left hover:text-foreground">Open Source</button>
            </nav>
          </div>
          <div>
            <p className="mb-3 text-sm font-bold">Akun</p>
            <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/register" className="hover:text-foreground">Daftar</Link>
              <Link href="/login" className="hover:text-foreground">Masuk</Link>
              <Link href="/maps" className="hover:text-foreground">Dashboard</Link>
            </nav>
          </div>
          <div>
            <p className="mb-3 text-sm font-bold">Ikuti Kami</p>
            <div className="flex gap-2">
              {["𝕏", "◇", "◎"].map((icon) => (
                <span key={icon} className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-foreground bg-muted text-sm font-bold">{icon}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} Mapping. Dibuat dengan Next.js.</p>
          <p className="text-xs">Slate Edge Brutalist — Built for teams.</p>
        </div>
      </div>
    </footer>
  );
}
