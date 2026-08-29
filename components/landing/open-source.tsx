"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

const CARDS = [
  {
    title: "Transparan",
    body: "Semua kode di GitHub. Audit, fork, dan kontribusi kapan saja — tanpa black box.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-3a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 4 5 4 5 4c-.28 1.15-.28 2.35 0 3.5A2.93 2.93 0 0 0 4 11c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.2 1.23-.1 1.85v3" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
    ),
  },
  {
    title: "Gratis Selamanya",
    body: "Tidak ada tier berbayar tersembunyi. Deploy sendiri atau pakai hosted — tetap gratis.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
    ),
  },
  {
    title: "Komunitas",
    body: "Dibangun bersama. Laporkan issue, ajukan PR, diskusikan di GitHub Discussions.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    ),
  },
];

export function OpenSource() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.from(".os-card", {
        y: 30,
        opacity: 0,
        duration: 0.5,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
      });
    },
    { scope: ref },
  );

  return (
    <section id="open-source" ref={ref} className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Open Source</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Sepenuhnya Open Source</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Kode terbuka, self-hostable, transparan — bukan paywall. Milik komunitas, bukan korporat.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {CARDS.map((c) => (
            <div key={c.title} className="os-card flex flex-col rounded-lg border-2 border-foreground bg-card p-6 shadow-brutal-sm">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">{c.icon}</div>
              <h3 className="font-heading text-lg font-bold">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="https://github.com/FadhliRajwaaRahmana/mapping-map"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-card px-6 py-3 text-sm font-bold shadow-brutal-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-3a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 4 5 4 5 4c-.28 1.15-.28 2.35 0 3.5A2.93 2.93 0 0 0 4 11c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.2 1.23-.1 1.85v3" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
            Lihat di GitHub
          </a>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-brutal-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal"
          >
            Mulai Gratis
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
