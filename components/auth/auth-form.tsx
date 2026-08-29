"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Mode = "register" | "login";
type LoginRole = "user" | "superadmin";

function EyeIcon({ open }: { open: boolean }) {
  return (
    <motion.span
      initial={false}
      animate={{ scale: open ? 1.05 : 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 15 }}
      className="flex"
    >
      {open ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" className="animate-pulse" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.53 9.53a3 3 0 0 0 4.24 4.24" />
          <path d="M14.12 14.12 9.88 9.88" />
          <path d="M1 1l22 22" />
        </svg>
      )}
    </motion.span>
  );
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loginRole, setLoginRole] = useState<LoginRole>("user");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const path = mode === "register" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email";
      const body = mode === "register" ? { name, email, password } : { email, password };
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string };
        toast.error(j.message ?? (mode === "register" ? "Gagal mendaftar" : "Gagal masuk"));
        return;
      }
      toast.success(mode === "register" ? "Akun dibuat" : "Selamat datang");

      // Superadmin → redirect ke /admin, user biasa → /maps
      if (mode === "login" && loginRole === "superadmin") {
        // Verify role after login
        try {
          const me = await fetch("/api/admin/stats", { credentials: "include" });
          if (me.ok) {
            router.push("/admin");
          } else {
            toast.error("Akun ini bukan superadmin. Mengalihkan ke dashboard.");
            router.push("/maps");
          }
        } catch {
          router.push("/maps");
        }
      } else {
        router.push("/maps");
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.98 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
      >
        <div className="rounded-lg border-2 border-foreground bg-card shadow-brutal-lg">
          <div className="border-b-2 border-foreground px-6 py-5 sm:px-8">
            <h1 className="font-heading text-2xl font-bold">{mode === "register" ? "Buat akun" : "Masuk"}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "register" ? "Mulai petakan idemu." : "Lanjutkan ke peta Anda."}
            </p>
          </div>

          {/* Dual login tabs — only on login mode */}
          {mode === "login" && (
            <div className="flex gap-2 border-b-2 border-foreground/10 px-6 py-3 sm:px-8">
              <button
                type="button"
                onClick={() => setLoginRole("user")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-bold transition-all ${loginRole === "user" ? "border-foreground bg-primary text-primary-foreground shadow-brutal-sm" : "border-foreground/20 bg-card hover:border-foreground"}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">◐</span>
                User
              </button>
              <button
                type="button"
                onClick={() => setLoginRole("superadmin")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 px-3 py-2 text-sm font-bold transition-all ${loginRole === "superadmin" ? "border-destructive bg-destructive text-destructive-foreground shadow-brutal-sm" : "border-foreground/20 bg-card hover:border-foreground"}`}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-current text-xs">⬢</span>
                Superadmin
              </button>
            </div>
          )}

          <div className="px-6 py-6 sm:px-8">
            <form onSubmit={onSubmit} className="space-y-5">
              {mode === "register" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">Nama</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="border-2 border-foreground/20 bg-background transition-colors focus:border-primary"
                    placeholder="Nama lengkap"
                  />
                </motion.div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="border-2 border-foreground/20 bg-background transition-colors focus:border-primary"
                  placeholder="kamu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold">Kata sandi</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPw ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete={mode === "register" ? "new-password" : "current-password"}
                    className="border-2 border-foreground/20 bg-background pr-10 transition-colors focus:border-primary"
                    placeholder="Min. 8 karakter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(!showPw)}
                    aria-label={showPw ? "Sembunyikan password" : "Lihat password"}
                    className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <EyeIcon open={showPw} />
                  </button>
                </div>
                {mode === "login" && loginRole === "superadmin" && (
                  <p className="text-xs text-muted-foreground">Login sebagai superadmin — kredensial akan diverifikasi terhadap role di server.</p>
                )}
              </div>
              <Button
                type="submit"
                className={`w-full border-2 py-5 text-base font-bold shadow-brutal-sm transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal ${loginRole === "superadmin" && mode === "login" ? "border-destructive bg-destructive text-destructive-foreground hover:bg-destructive/90" : "border-foreground"}`}
                disabled={busy}
              >
                {busy ? (
                  <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="mr-2 inline-block">⏳</motion.span>
                ) : null}
                {busy ? "Memproses..." : mode === "register" ? "Daftar" : loginRole === "superadmin" ? "Masuk sebagai Superadmin" : "Masuk"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "register" ? (
                <>Sudah punya akun? <Link href="/login" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">Masuk</Link></>
              ) : (
                <>Belum punya akun? <Link href="/register" className="font-semibold text-primary underline underline-offset-4 hover:text-primary/80">Daftar</Link></>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
