"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const DATA = [
  { name: "Rina S.", role: "Product Manager", quote: "Akhirnya ada mind map yang tidak bikin pusing. Kolaborasi real-time-nya mulus, tim langsung sinkron.", initial: "RS" },
  { name: "Budi A.", role: "Tech Lead", quote: "Detail Markdown per node itu game changer. Arsitektur API kami jadi terdokumentasi sambil brainstorming.", initial: "BA" },
  { name: "Sari W.", role: "UX Researcher", quote: "Brutalist look-nya bikin betah. Export PNG langsung jadi deck presentasi tanpa edit lagi.", initial: "SW" },
];

export function Testimonials() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    gsap.from(".t-card", {
      y: 30, opacity: 0, duration: 0.5, stagger: 0.12, ease: "power3.out",
      scrollTrigger: { trigger: ref.current, start: "top 80%", once: true },
    });
  }, { scope: ref });

  return (
    <section ref={ref} className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm font-bold uppercase tracking-widest text-primary">Testimoni</p>
        <h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">Kata mereka</h2>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {DATA.map((t) => (
          <div key={t.name} className="t-card rounded-lg border-2 border-foreground bg-card p-6 shadow-brutal-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-primary font-heading text-sm font-bold text-primary-foreground shadow-brutal-sm">{t.initial}</div>
              <div><p className="text-sm font-bold">{t.name}</p><p className="text-xs text-muted-foreground">{t.role}</p></div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-3 flex gap-1 text-primary">{"★★★★★".split("").map((s, i) => <span key={i}>{s}</span>)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
