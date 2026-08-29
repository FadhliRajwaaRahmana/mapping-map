"use client";

import Link from "next/link";
import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function FinalCta() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    gsap.from(".cta-inner", {
      y: 30, opacity: 0, duration: 0.6, ease: "power3.out",
      scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
    });
  }, { scope: ref });

  return (
    <section ref={ref} className="bg-foreground py-16 sm:py-20">
      <div className="cta-inner mx-auto max-w-3xl px-4 text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-card sm:text-4xl">Siap petakan ide besarmu?</h2>
        <p className="mx-auto mt-3 max-w-xl text-card/70">Bergabung dengan tim yang sudah memetakan ribuan ide di Mapping. Gratis, tanpa kartu kredit.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/register" className="flex items-center gap-2 rounded-lg border-2 border-card bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-brutal-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal">
            Mulai Sekarang — Gratis
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Link>
          <Link href="/login" className="rounded-lg border-2 border-card/30 px-8 py-3.5 text-base font-semibold text-card transition-colors hover:border-card hover:bg-card/10">
            Sudah punya akun? Masuk
          </Link>
        </div>
      </div>
    </section>
  );
}
