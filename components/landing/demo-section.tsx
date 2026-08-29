"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { DemoCanvas } from "./demo-canvas";

export function DemoSection() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(".demo-heading", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 80%",
          once: true,
        },
      });
      gsap.from(".demo-frame", {
        y: 40,
        opacity: 0,
        scale: 0.98,
        duration: 0.7,
        delay: 0.15,
        ease: "power3.out",
        scrollTrigger: {
          trigger: ref.current,
          start: "top 75%",
          once: true,
        },
      });
    },
    { scope: ref },
  );

  return (
    <section
      id="demo"
      ref={ref}
      className="bg-muted/30 py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-4">
        <div className="demo-heading mb-10 text-center">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">
            Preview Interaktif
          </p>
          <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Lihat kanvas beraksi
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Seret, hubungkan, dan klik node untuk membuka catatan Markdown — semua langsung di browser.
          </p>
        </div>

        <div className="demo-frame relative mx-auto max-w-4xl rounded-xl border-2 border-foreground bg-card p-2 shadow-brutal-lg sm:p-4">
          {/* Browser chrome */}
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-destructive/70" />
              <span className="h-3 w-3 rounded-full bg-[#eab308]/70" />
              <span className="h-3 w-3 rounded-full bg-primary/50" />
            </div>
            <div className="flex-1 rounded-md bg-muted px-3 py-1.5 text-center text-xs text-muted-foreground">
              mapping.app/maps/demo — kanvas interaktif
            </div>
          </div>

          <DemoCanvas />

          {/* Floating hint pill */}
          <div className="absolute -bottom-3 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border-2 border-foreground bg-card px-4 py-1.5 text-xs font-bold shadow-brutal-sm sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Klik node untuk lihat detail
          </div>
        </div>

        <div className="mt-10 flex justify-center">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-primary px-8 py-3.5 text-base font-bold text-primary-foreground shadow-brutal transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg"
          >
            Coba di kanvas asli
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
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
