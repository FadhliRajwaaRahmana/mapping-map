import type { Metadata } from "next";
import { Space_Grotesk, Inter, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { LenisProvider } from "@/lib/providers/lenis-provider";
import { GsapProvider } from "@/lib/providers/gsap-provider";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mapping — Mind map interaktif",
  description:
    "Petakan ide & catatan teknismu di kanvas mind map interaktif. Klik node untuk detail Markdown, kolaborasi dengan tim.",
  metadataBase: new URL("https://mapping-map.vercel.app"),
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    title: "Mapping — Mind map interaktif",
    description:
      "Petakan ide & catatan teknismu di kanvas mind map interaktif. Klik node untuk detail Markdown, kolaborasi dengan tim.",
    url: "https://mapping-map.vercel.app",
    siteName: "Mapping",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "Mapping — Mind map interaktif" }],
    type: "website",
    locale: "id_ID",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mapping — Mind map interaktif",
    description:
      "Petakan ide & catatan teknismu di kanvas mind map interaktif. Klik node untuk detail Markdown, kolaborasi dengan tim.",
    images: ["/opengraph-image"],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${spaceGrotesk.variable} ${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <LenisProvider>
          <GsapProvider>
            <Toaster richColors position="top-center" />
            {children}
          </GsapProvider>
        </LenisProvider>
      </body>
    </html>
  );
}
