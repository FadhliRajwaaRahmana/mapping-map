"use client";

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import "@excalidraw/excalidraw/index.css";

const ExcalidrawWrapper = dynamic(
  () =>
    import("@excalidraw/excalidraw").then((m) => {
      const ExcalidrawComponent = m.Excalidraw;
      const WelcomeScreenComponent = m.WelcomeScreen;
      const FooterComponent = m.Footer;

      return function ExcalidrawWithCustomChildren(props: Record<string, unknown>) {
        return (
          <ExcalidrawComponent {...props}>
            <WelcomeScreenComponent>
              <WelcomeScreenComponent.Center>
                <WelcomeScreenComponent.Center.Heading>
                  Petakan ide & catatan teknismu
                </WelcomeScreenComponent.Center.Heading>
                <WelcomeScreenComponent.Center.Menu>
                  <WelcomeScreenComponent.Center.MenuItemHelp />
                </WelcomeScreenComponent.Center.Menu>
              </WelcomeScreenComponent.Center>
            </WelcomeScreenComponent>
            <FooterComponent>
              <div className="flex items-center gap-2 rounded border border-foreground/20 bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground backdrop-blur-sm shadow-sm">
                <span>
                  Tip: Tekan <b>N</b> untuk node baru atau gunakan <b>Auto Add</b> di atas
                </span>
              </div>
            </FooterComponent>
          </ExcalidrawComponent>
        );
      };
    }),
  { ssr: false },
);

export default ExcalidrawWrapper as ComponentType<Record<string, unknown>>;
