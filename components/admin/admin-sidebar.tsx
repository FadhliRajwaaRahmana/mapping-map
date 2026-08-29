"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "▦", exact: true },
  { href: "/admin/users", label: "Users", icon: "◐" },
  { href: "/admin/maps", label: "Maps", icon: "⬡" },
];

export function AdminSidebar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  const navContent = (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition-all ${isActive(item.href, item.exact) ? "border-foreground bg-primary text-primary-foreground shadow-brutal-sm" : "border-transparent hover:border-foreground/20 hover:bg-muted"}`}
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md border border-current text-xs">{item.icon}</span>
          {item.label}
        </Link>
      ))}
      <div className="mt-4 border-t-2 border-foreground/10 pt-4">
        <p className="px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">Akun</p>
        <p className="mt-1 px-3 text-sm font-semibold">{userName}</p>
        <p className="px-3 text-xs text-muted-foreground">{userEmail}</p>
      </div>
      <div className="mt-4 flex flex-col gap-2">
        <Link
          href="/maps"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-foreground bg-card px-3 py-2 text-sm font-bold shadow-brutal-sm"
        >
          ← Kembali ke App
        </Link>
        <button
          onClick={async () => {
            await fetch("/api/auth/sign-out", { method: "POST", credentials: "include" });
            window.location.href = "/login";
          }}
          className="flex items-center justify-center gap-1.5 rounded-lg border-2 border-destructive bg-destructive px-3 py-2 text-sm font-bold text-destructive-foreground shadow-brutal-sm"
        >
          Keluar
        </button>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile hamburger — positioned below admin topbar (top-14) so it doesn't overlap */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed left-3 top-[3.75rem] z-50 flex h-9 w-9 items-center justify-center rounded-lg border-2 border-foreground bg-card shadow-brutal-sm md:hidden"
        aria-label="Toggle menu"
      >
        <span className="text-lg">{open ? "✕" : "☰"}</span>
      </button>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 border-r-2 border-foreground bg-card shadow-brutal-lg">
            <div className="flex h-14 items-center gap-2 border-b-2 border-foreground px-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-foreground bg-primary text-xs font-bold text-primary-foreground">M</div>
              <span className="font-heading text-sm font-bold">Admin Panel</span>
              <button onClick={() => setOpen(false)} className="ml-auto rounded-md p-1 hover:bg-muted">✕</button>
            </div>
            {navContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r-2 border-foreground bg-card md:flex">
        <div className="flex h-14 items-center gap-2 border-b-2 border-foreground px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border-2 border-foreground bg-primary text-xs font-bold text-primary-foreground shadow-brutal-sm">M</div>
          <span className="font-heading text-sm font-bold">Admin Panel</span>
          <span className="ml-auto rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">ADMIN</span>
        </div>
        {navContent}
        <div className="mt-auto border-t-2 border-foreground/10 p-3">
          <Link href="/" className="flex items-center gap-2 rounded-lg border-2 border-foreground/20 px-3 py-2 text-xs font-semibold hover:border-foreground">
            ← Landing
          </Link>
        </div>
      </aside>
    </>
  );
}
