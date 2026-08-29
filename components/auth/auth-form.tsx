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

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const path =
        mode === "register"
          ? "/api/auth/sign-up/email"
          : "/api/auth/sign-in/email";
      const body =
        mode === "register" ? { name, email, password } : { email, password };
      const res = await fetch(path, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        toast.error(
          j.message ??
            (mode === "register" ? "Gagal mendaftar" : "Gagal masuk"),
        );
        return;
      }
      toast.success(
        mode === "register" ? "Akun dibuat" : "Selamat datang",
      );
      router.push("/maps");
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
          {/* Header */}
          <div className="border-b-2 border-foreground px-6 py-5 sm:px-8">
            <h1 className="font-heading text-2xl font-bold">
              {mode === "register" ? "Buat akun" : "Masuk"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "register"
                ? "Mulai petakan idemu."
                : "Lanjutkan ke peta Anda."}
            </p>
          </div>

          {/* Form */}
          <div className="px-6 py-6 sm:px-8">
            <form onSubmit={onSubmit} className="space-y-5">
              {mode === "register" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  <Label htmlFor="name" className="text-sm font-semibold">
                    Nama
                  </Label>
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
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email
                </Label>
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
                <Label htmlFor="password" className="text-sm font-semibold">
                  Kata sandi
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  className="border-2 border-foreground/20 bg-background transition-colors focus:border-primary"
                  placeholder="Min. 8 karakter"
                />
              </div>
              <Button
                type="submit"
                className="w-full border-2 border-foreground py-5 text-base font-bold shadow-brutal-sm transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-brutal"
                disabled={busy}
              >
                {busy ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="mr-2 inline-block"
                  >
                    ⏳
                  </motion.span>
                ) : null}
                {busy
                  ? "Memproses..."
                  : mode === "register"
                    ? "Daftar"
                    : "Masuk"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              {mode === "register" ? (
                <>
                  Sudah punya akun?{" "}
                  <Link
                    href="/login"
                    className="font-semibold text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                  >
                    Masuk
                  </Link>
                </>
              ) : (
                <>
                  Belum punya akun?{" "}
                  <Link
                    href="/register"
                    className="font-semibold text-primary underline underline-offset-4 transition-colors hover:text-primary/80"
                  >
                    Daftar
                  </Link>
                </>
              )}
            </p>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
