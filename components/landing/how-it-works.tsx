"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const STEPS = [
  {
    num: "01",
    title: "Buat Peta",
    body: "Klik Peta baru, beri judul, dan kamu langsung di kanvas tak terbatas.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Tambah Node & Catatan",
    body: "Tekan N atau klik Node, hubungkan elemen, dan tulis detail Markdown di panel samping.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Kolaborasi Real-time",
    body: "Undang tim via email atau bagikan link public. Perubahan muncul dalam 2–3 detik.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(
    () => {
      gsap.from(".hiw-card", {
        y: 40,
        opacity: 0,
        duration: 0.6,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
      });
      gsap.from(".hiw-line", {
        scaleX: 0,
        duration: 0.8,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 75%", once: true },
      });
    },
    { scope: ref },
  );

  return (
    <section id="how-it-works" ref={ref} className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Cara Kerja</p>
        <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Tiga langkah, langsung jadi</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Dari ide pertama sampai peta yang bisa dibagikan — tanpa ribet.</p>
      </div>

      <div className="relative grid gap-6 md:grid-cols-3">
        {/* Connecting dashed line — desktop only, behind cards */}
        <div className="hiw-line pointer-events-none absolute left-[16%] right-[16%] top-[52px] hidden h-0.5 origin-left border-t-2 border-dashed border-foreground/20 md:block" />

        {STEPS.map((s) => (
          <div key={s.num} className="hiw-card relative rounded-lg border-2 border-foreground bg-card p-6 shadow-brutal-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border-2 border-foreground bg-primary text-primary-foreground shadow-brutal-sm">
              {s.icon}
            </div>
            <span className="font-heading text-5xl font-black text-foreground/10">{s.num}</span>
            <h3 className="mt-1 font-heading text-lg font-bold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
