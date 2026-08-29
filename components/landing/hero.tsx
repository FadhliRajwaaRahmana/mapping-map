"use client";

import { motion, MotionConfig } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DemoCanvas } from "./demo-canvas";

export function Hero() {
  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col items-center gap-8 px-4 py-24 text-center">
      <MotionConfig reducedMotion="user">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Petakan ide &amp; catatan teknismu
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Mind map interaktif bergaya Excalidraw. Klik node untuk membuka detail
            Markdown, dan kolaborasi dengan tim secara langsung.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg">
              <Link href="/register">Coba gratis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/login">Masuk</Link>
            </Button>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3, duration: 0.6 }}>
          <DemoCanvas />
        </motion.div>
      </MotionConfig>
    </section>
  );
}
