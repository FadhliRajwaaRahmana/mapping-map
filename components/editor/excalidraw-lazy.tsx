"use client";

import dynamic from "next/dynamic";
import type { ComponentType, ReactNode } from "react";
import "@excalidraw/excalidraw/index.css";

export const Excalidraw = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (m) => m.Excalidraw as ComponentType<Record<string, unknown>>,
    ),
  { ssr: false },
);

type AnyComponent = ComponentType<Record<string, unknown>>;

export const MainMenu = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (m) => m.MainMenu as unknown as ComponentType<{ children?: ReactNode }>,
    ),
  { ssr: false },
) as unknown as ComponentType<{ children?: ReactNode }> & {
  Item: AnyComponent;
  ItemLink: AnyComponent;
  ItemCustom: AnyComponent;
  DefaultItems: Record<string, AnyComponent>;
  Group: AnyComponent;
};

export const WelcomeScreen = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (m) => m.WelcomeScreen as unknown as ComponentType<{ children?: ReactNode }>,
    ),
  { ssr: false },
) as unknown as ComponentType<{ children?: ReactNode }> & {
  Center: ComponentType<{ children?: ReactNode }> & {
    Heading: ComponentType<{ children?: ReactNode }>;
    Menu: ComponentType<{ children?: ReactNode }>;
    MenuItemHelp: AnyComponent;
    MenuItem: AnyComponent;
    MenuItemLink: AnyComponent;
  };
  Hints: Record<string, AnyComponent>;
};

export const Footer = dynamic(
  () =>
    import("@excalidraw/excalidraw").then(
      (m) => m.Footer as unknown as ComponentType<{ children?: ReactNode }>,
    ),
  { ssr: false },
);

export default Excalidraw;
