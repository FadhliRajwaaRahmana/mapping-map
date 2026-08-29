"use client";

import { useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

export function LandingFooter() {
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      gsap.from(".footer-content", {
        y: 30,
        opacity: 0,
        duration: 0.6,
        ease: "power2.out",
        scrollTrigger: {
          trigger: footerRef.current,
          start: "top 95%",
          once: true,
        },
      });
    },
    { scope: footerRef },
  );

  return (
    <footer
      ref={footerRef}
      className="border-t-2 border-foreground bg-card"
    >
      <div className="footer-content mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-4 py-10 sm:flex-row sm:py-12">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-foreground bg-primary font-heading text-sm font-bold text-primary-foreground shadow-brutal-sm">
            M
          </div>
          <span className="font-heading text-lg font-bold tracking-tight">
            Mapping
          </span>
        </div>

        {/* Links */}
        <nav className="flex gap-6 text-sm text-muted-foreground">
          <Link
            href="/register"
            className="transition-colors hover:text-foreground"
          >
            Daftar
          </Link>
          <Link
            href="/login"
            className="transition-colors hover:text-foreground"
          >
            Masuk
          </Link>
        </nav>

        {/* Copyright */}
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} Mapping
        </p>
      </div>
    </footer>
  );
}
