"use client";

import { motion } from "framer-motion";

const nodes = [
  { x: 60, y: 50, w: 160, h: 52, label: "API Response", color: "var(--primary)" },
  { x: 290, y: 150, w: 160, h: 52, label: "Table: users", color: "var(--secondary)" },
  { x: 40, y: 230, w: 160, h: 52, label: "Schema", color: "var(--primary)" },
  { x: 340, y: 40, w: 120, h: 42, label: "Auth", color: "var(--secondary)" },
];

const lines = [
  { d: "M 220 76 Q 260 110 290 170", delay: 0.3 },
  { d: "M 140 102 Q 100 160 120 230", delay: 0.5 },
  { d: "M 340 66 Q 340 110 370 150", delay: 0.7 },
];

export function DemoCanvas() {
  return (
    <div className="relative w-full overflow-hidden rounded-md bg-muted/30">
      <svg
        viewBox="0 0 500 320"
        className="h-auto w-full"
        role="img"
        aria-label="Demo mind map"
      >
        {/* Grid dots */}
        <defs>
          <pattern
            id="grid-dots"
            width="20"
            height="20"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.8" fill="var(--muted-foreground)" opacity="0.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-dots)" />

        {/* Connecting lines — animated */}
        {lines.map((l, i) => (
          <motion.path
            key={i}
            d={l.d}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth="2"
            strokeDasharray="6 4"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 0.8, delay: l.delay, ease: "easeOut" }}
          />
        ))}

        {/* Nodes — brutalist rectangles with offset shadows */}
        {nodes.map((n, i) => (
          <motion.g
            key={n.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 + 0.15 * i, duration: 0.5, ease: "easeOut" }}
          >
            {/* Offset shadow */}
            <rect
              x={n.x + 3}
              y={n.y + 3}
              width={n.w}
              height={n.h}
              rx={4}
              fill="var(--foreground)"
              opacity={0.15}
            />
            {/* Card */}
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={n.h}
              rx={4}
              fill="var(--card)"
              stroke={n.color}
              strokeWidth={2}
            />
            {/* Colored left accent bar */}
            <rect
              x={n.x}
              y={n.y}
              width={4}
              height={n.h}
              rx={2}
              fill={n.color}
            />
            <text
              x={n.x + n.w / 2 + 2}
              y={n.y + n.h / 2 + 5}
              textAnchor="middle"
              className="fill-foreground font-heading"
              fontSize={14}
              fontWeight={600}
            >
              {n.label}
            </text>
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
