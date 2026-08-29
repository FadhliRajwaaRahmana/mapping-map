"use client";

import { useRef } from "react";
import { motion, MotionConfig } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DemoCanvas } from "./demo-canvas";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      // Parallax effect on scroll
      gsap.to(".hero-canvas-wrapper", {
        y: 60,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden px-4 pb-20 pt-28 sm:pb-28 sm:pt-36 lg:pt-44"
    >
      {/* Background grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:64px_64px] opacity-40" />

      <MotionConfig reducedMotion="user">
        <div className="relative mx-auto max-w-5xl text-center">
          {/* Pill badge */}
          <motion.div
            ref={badgeRef}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-card px-4 py-1.5 shadow-brutal-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <span className="text-sm font-medium">
              Mind map kolaboratif — gratis
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
            className="font-heading text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Petakan ide &amp;{" "}
            <span className="text-gradient">catatan teknismu</span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Mind map interaktif bergaya Excalidraw. Klik node untuk membuka
            detail Markdown, dan kolaborasi dengan tim secara langsung.
          </motion.p>

          {/* CTA Buttons — brutalist */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45, ease: "easeOut" }}
            className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="border-2 border-foreground px-8 py-6 text-base font-bold shadow-brutal transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal-lg"
            >
              <Link href="/register">
                Coba gratis
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
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-2 border-foreground bg-card px-8 py-6 text-base font-bold shadow-brutal-sm transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:bg-accent hover:shadow-brutal"
            >
              <Link href="/login">Masuk</Link>
            </Button>
          </motion.div>

          {/* Demo canvas — brutalist frame with parallax */}
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.6, ease: "easeOut" }}
            className="hero-canvas-wrapper mt-16 sm:mt-20"
          >
            <div className="relative rounded-lg border-2 border-foreground bg-card p-2 shadow-brutal-lg sm:p-3">
              {/* Fake browser chrome */}
              <div className="mb-2 flex items-center gap-2 border-b border-border pb-2">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-destructive/60" />
                  <div className="h-3 w-3 rounded-full bg-warning/60" />
                  <div className="h-3 w-3 rounded-full bg-primary/40" />
                </div>
                <div className="flex-1 rounded-md bg-muted px-3 py-1 text-center text-xs text-muted-foreground">
                  mapping.app/maps/demo
                </div>
              </div>
              <DemoCanvas />
            </div>
          </motion.div>
        </div>
      </MotionConfig>
    </section>
  );
}
