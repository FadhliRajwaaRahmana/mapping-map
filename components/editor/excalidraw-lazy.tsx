"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import "@excalidraw/excalidraw/index.css";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((m) => m.Excalidraw as ComponentType<Record<string, unknown>>),
  { ssr: false },
);

export default Excalidraw;
