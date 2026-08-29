"use client";

import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
    ),
    title: "Kanvas tak terbatas",
    body: "Taruh node di mana saja. Bebas menggambar, menghubungkan, dan menata seperti papan putih.",
    accent: "bg-primary/10 text-primary",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"/></svg>
    ),
    title: "Detail Markdown",
    body: "Setiap node menyimpan catatan Markdown lengkap — heading, tabel, blok kode, list.",
    accent: "bg-secondary/10 text-secondary",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
    ),
    title: "Kolaborasi real-time",
    body: "Undang rekan, dan lihat perubahan mereka muncul dalam hitungan detik.",
    accent: "bg-chart-3/10 text-chart-3",
  },
  {
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
    ),
    title: "Simpan otomatis",
    body: "Tanpa tombol simpan. Peta dan catatanmu tersimpan otomatis di cloud.",
    accent: "bg-chart-4/10 text-chart-4",
  },
];

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(".feature-card", {
        y: 60,
        opacity: 0,
        duration: 0.7,
        stagger: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top 80%",
          once: true,
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      id="features"
      ref={sectionRef}
      className="relative mx-auto w-full max-w-6xl px-4 py-20 sm:py-28"
    >
      {/* Section heading */}
      <div className="mb-12 text-center sm:mb-16">
        <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Semua yang kamu butuhkan
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Satu platform untuk mapping ide, catatan, dan kolaborasi tim.
        </p>
      </div>

      {/* Feature cards grid — brutalist */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => (
          <motion.div
            key={f.title}
            whileHover={{ y: -4, x: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="feature-card group rounded-lg border-2 border-foreground bg-card p-6 shadow-brutal-sm transition-shadow hover:shadow-brutal"
          >
            <div
              className={`mb-4 flex h-11 w-11 items-center justify-center rounded-md ${f.accent}`}
            >
              {f.icon}
            </div>
            <h3 className="font-heading text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {f.body}
            </p>
          </motion.div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-14 flex justify-center">
        <Button
          asChild
          size="lg"
          className="border-2 border-foreground px-8 py-6 text-base font-bold shadow-brutal transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg"
        >
          <Link href="/register">
            Mulai sekarang — gratis
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="ml-2"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </Button>
      </div>
    </section>
  );
}
