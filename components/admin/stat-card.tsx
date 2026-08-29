"use client";

import { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") gsap.registerPlugin(ScrollTrigger);


export function StatCard({ label, value, icon, accent }: { label: string; value: number | string; icon: React.ReactNode; accent?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (!ref.current) return;
      gsap.from(ref.current, {
        y: 20,
        opacity: 0,
        duration: 0.5,
        ease: "power3.out",
        scrollTrigger: { trigger: ref.current, start: "top 90%", once: true },
      });
    },
    { scope: ref },
  );
  return (
    <div ref={ref} className="stat-card rounded-lg border-2 border-foreground bg-card p-5 shadow-brutal-sm transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
          <p className="mt-1 font-heading text-3xl font-black">{value}</p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 border-foreground text-lg ${accent ?? "bg-primary/10"}`}>{icon}</div>
      </div>
    </div>
  );
}
