"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const TIERS = [
  {
    name: "Gratis",
    price: "Rp 0",
    period: "/selamanya",
    features: ["3 peta aktif", "Kolaborasi via link", "Export PNG & JSON", "Markdown per node"],
    cta: "Mulai Gratis",
    href: "/register",
    featured: false,
  },
  {
    name: "Pro",
    price: "Rp 49k",
    period: "/bulan",
    features: ["Peta tak terbatas", "Kolaborasi real-time", "Riwayat versi", "Prioritas support"],
    cta: "Pilih Pro",
    href: "/register",
    featured: true,
  },
  {
    name: "Tim",
    price: "Rp 149k",
    period: "/bulan",
    features: ["Semua di Pro", "SSO & admin panel", "Storage 50GB", "Dedicated support"],
    cta: "Hubungi Kami",
    href: "/register",
    featured: false,
  },
];

export function Pricing() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    gsap.from(".price-card", {
      y: 30, opacity: 0, duration: 0.5, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
    });
  }, { scope: ref });

  return (
    <section id="pricing" ref={ref} className="bg-muted/30 py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Harga</p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Pilih yang pas untukmu</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Mulai gratis, upgrade kapan saja. Tanpa kartu kredit.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`price-card flex flex-col rounded-lg border-2 bg-card p-6 ${t.featured ? "border-primary shadow-brutal-lg scale-[1.02]" : "border-foreground shadow-brutal-sm"}`}
            >
              {t.featured && <span className="mb-3 self-start rounded-full bg-primary px-3 py-1 text-xs font-bold text-primary-foreground">Paling Populer</span>}
              <h3 className="font-heading text-lg font-bold">{t.name}</h3>
              <p className="mt-2"><span className="font-heading text-3xl font-black">{t.price}</span><span className="text-sm text-muted-foreground">{t.period}</span></p>
              <ul className="mt-4 flex-1 space-y-2">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg></span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={t.href} className={`mt-6 flex items-center justify-center rounded-lg border-2 border-foreground py-3 text-sm font-bold shadow-brutal-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal ${t.featured ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
