"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const QA = [
  { q: "Apakah gratis selamanya?", a: "Ya. Paket Gratis mencakup 3 peta aktif dan semua fitur inti. Upgrade hanya jika butuh peta tak terbatas atau fitur tim." },
  { q: "Bagaimana kolaborasi bekerja?", a: "Undang via email (private) atau bagikan link public. Edit konkuren di-merge otomatis (last-write-wins per elemen) dan polling setiap 2–3 detik." },
  { q: "Apakah data saya aman?", a: "Semua data disimpan di Turso (SQLite) dengan enkripsi. Private map hanya bisa diakses oleh yang diundang. Public map hanya via link yang kamu bagikan." },
  { q: "Bisa export peta?", a: "Bisa export sebagai PNG (gambar) atau JSON (data mentah) langsung dari editor — tanpa batas." },
  { q: "Apakah perlu install aplikasi?", a: "Tidak. Mapping berjalan di browser — desktop maupun mobile. Cukup buka link dan mulai mapping." },
];

export function Faq() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    gsap.from(".faq-item", {
      y: 20, opacity: 0, duration: 0.4, stagger: 0.08, ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 85%", once: true },
    });
  }, { scope: ref });

  return (
    <section id="faq" ref={ref} className="mx-auto max-w-3xl px-4 py-20 sm:py-28">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">FAQ</p>
        <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Pertanyaan umum</h2>
      </div>
      <div className="space-y-3">
        {QA.map((item) => (
          <details key={item.q} className="faq-item group rounded-lg border-2 border-foreground bg-card shadow-brutal-sm open:shadow-brutal">
            <summary className="flex cursor-pointer items-center justify-between p-4 font-semibold">
              {item.q}
              <span className="ml-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-muted text-xs transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
