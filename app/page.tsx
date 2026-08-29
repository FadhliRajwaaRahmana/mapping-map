import { Hero } from "@/components/landing/hero";
import { Features } from "@/components/landing/features";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <main className="flex-1">
      <Hero />
      <Features />
      <LandingFooter />
    </main>
  );
}
