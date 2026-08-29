"use client";

import { motion } from "framer-motion";

export function DemoCanvas() {
  const nodes = [
    { x: 120, y: 60, w: 150, h: 48, label: "API Response" },
    { x: 320, y: 160, w: 150, h: 48, label: "Table: users" },
    { x: 90, y: 240, w: 150, h: 48, label: "Schema" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border bg-white/5 shadow-xl dark:bg-black/40">
      <svg viewBox="0 0 480 340" className="h-auto w-full" role="img" aria-label="Demo mind map">
        {/* connecting arrows — dashed; fade in (framer-motion's pathLength draw-in
            takes over stroke-dasharray, so the two effects are mutually exclusive) */}
        <motion.path
          d="M 205 108 Q 270 130 320 180"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6"
          className="text-primary/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
        <motion.path
          d="M 170 108 Q 120 180 165 240"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="6"
          className="text-primary/60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        />
        {nodes.map((n, i) => (
          <motion.g key={n.label} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 * i, duration: 0.4 }}>
            <rect x={n.x} y={n.y} width={n.w} height={n.h} rx={10} fill="var(--primary)" fillOpacity={0.12} stroke="var(--primary)" strokeWidth={1.5} />
            <text x={n.x + n.w / 2} y={n.y + n.h / 2 + 5} textAnchor="middle" className="fill-foreground" fontSize={15} fontWeight={600}>
              {n.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
