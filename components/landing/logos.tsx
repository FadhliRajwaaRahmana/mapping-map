"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger);

const LOGOS = ["Nusantara Labs", "KataKita", "Ruang Ide", "PetaKarya", "Sinar Digital"];

export function Logos() {
  const ref = useRef<HTMLElement>(null);
  useGSAP(() => {
    gsap.from(".logo-pill", {
      y: 16, opacity: 0, duration: 0.4, stagger: 0.08, ease: "power2.out",
      scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
    });
  }, { scope: ref });

  return (
    <section ref={ref} className="border-y-2 border-foreground bg-card py-8">
      <div className="mx-auto max-w-6xl px-4">
        <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">Dipercaya oleh tim kreatif</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {LOGOS.map((name) => (
            <span key={name} className="logo-pill rounded-full border-2 border-foreground bg-background px-4 py-2 text-sm font-bold shadow-brutal-sm">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
