"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const NAV_LINKS = [
  { href: "#features", label: "Fitur" },
  { href: "#how-it-works", label: "Cara Kerja" },
  { href: "#testimonials", label: "Testimoni" },
  { href: "#open-source", label: "Open Source" },
];

const MOBILE_TABS_LOGGED_OUT = [
  { href: "#hero", label: "Beranda", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ) },
  { href: "#features", label: "Fitur", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
  ) },
  { href: "#how-it-works", label: "Cara kerja", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
  ) },
  { href: "#open-source", label: "Open", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-3a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 4 5 4 5 4c-.28 1.15-.28 2.35 0 3.5A2.93 2.93 0 0 0 4 11c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.2 1.23-.1 1.85v3" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
  ) },
  { href: "/login", label: "Masuk", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" x2="3" y1="12" y2="12" /></svg>
  ) },
];

const MOBILE_TABS_LOGGED_IN = [
  { href: "#hero", label: "Beranda", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
  ) },
  { href: "#features", label: "Fitur", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
  ) },
  { href: "/maps", label: "Dashboard", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="12" rx="1" /></svg>
  ) },
  { href: "/maps", label: "Peta", icon: (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-3a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 4 5 4 5 4c-.28 1.15-.28 2.35 0 3.5A2.93 2.93 0 0 0 4 11c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.2 1.23-.1 1.85v3" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
  ) },
];

function scrollTo(href: string) {
  if (href.startsWith("#")) {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function Navbar({ isLoggedIn = false, userName = null }: { isLoggedIn?: boolean; userName?: string | null }) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("#hero");
  const MOBILE_TABS = isLoggedIn ? MOBILE_TABS_LOGGED_IN : MOBILE_TABS_LOGGED_OUT;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const sections = ["#hero", "#features", "#how-it-works", "#demo", "#testimonials", "#open-source", "#faq"];
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(`#${e.target.id}`);
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 },
    );
    sections.forEach((id) => {
      const el = document.querySelector(id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <>
      {/* ── Desktop top bar ── */}
      <header
        className={`sticky top-0 z-50 hidden border-b-2 border-foreground bg-card/90 backdrop-blur-md transition-shadow md:block ${scrolled ? "shadow-brutal-sm" : ""}`}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border-2 border-foreground bg-primary font-heading text-sm font-bold text-primary-foreground shadow-brutal-sm">
              M
            </div>
            <span className="font-heading text-lg font-bold tracking-tight">Mapping</span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Navigasi utama">
            {NAV_LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => scrollTo(l.href)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${active === l.href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {l.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {userName && <span className="hidden text-sm font-medium text-muted-foreground lg:inline">{userName}</span>}
                <Link
                  href="/maps"
                  className="rounded-lg border-2 border-foreground bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-brutal-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal"
                >
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-md px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  Masuk
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg border-2 border-foreground bg-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-brutal-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal"
                >
                  Coba gratis
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Mobile FAB — centered above bottom bar ── */}
      <Link
        href={isLoggedIn ? "/maps" : "/register"}
        className="fixed bottom-[calc(4rem+12px)] left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 rounded-full border-2 border-foreground bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-brutal transition-all hover:translate-x-[calc(-50%-1px)] hover:translate-y-[-1px] hover:shadow-brutal-lg md:hidden"
        aria-label={isLoggedIn ? "Buka dashboard" : "Coba gratis"}
      >
        {isLoggedIn ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="12" rx="1" /></svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        )}
        {isLoggedIn ? "Dashboard" : "Coba gratis"}
      </Link>

      {/* ── Mobile bottom bar ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-center justify-around border-t-2 border-foreground bg-card px-1 pb-[env(safe-area-inset-bottom)] md:hidden"
        aria-label="Navigasi bawah"
      >
        {MOBILE_TABS.map((t) => {
          const isActive = active === t.href;
          const isExternal = t.href.startsWith("/");
          if (isExternal) {
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium leading-none transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
              >
                {t.icon}
                <span className="mt-0.5">{t.label}</span>
              </Link>
            );
          }
          return (
            <button
              key={t.href}
              onClick={() => scrollTo(t.href)}
              className={`flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium leading-none transition-colors ${isActive ? "text-primary" : "text-muted-foreground"}`}
            >
              {t.icon}
              <span className="mt-0.5">{t.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ── Mobile top mini bar (logo only) ── */}
      <div className="sticky top-0 z-40 flex h-12 items-center justify-between border-b-2 border-foreground bg-card px-4 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-foreground bg-primary font-heading text-xs font-bold text-primary-foreground shadow-brutal-sm">
            M
          </div>
          <span className="font-heading text-base font-bold tracking-tight">Mapping</span>
        </Link>
        <Link
          href={isLoggedIn ? "/maps" : "/register"}
          className="rounded-lg border-2 border-foreground bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-brutal-sm"
        >
          {isLoggedIn ? "Dashboard" : "Coba Gratis"}
        </Link>
      </div>
    </>
  );
}
