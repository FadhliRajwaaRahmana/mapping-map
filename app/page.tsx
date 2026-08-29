import { requireUser } from "@/lib/guards";
import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Logos } from "@/components/landing/logos";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { DemoSection } from "@/components/landing/demo-section";
import { Testimonials } from "@/components/landing/testimonials";
import { OpenSource } from "@/components/landing/open-source";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default async function LandingPage() {
  const user = await requireUser();

  return (
    <>
      <Navbar isLoggedIn={!!user} userName={user?.name ?? null} />
      <main className="flex-1 pb-20 md:pb-0">
        <Hero isLoggedIn={!!user} />
        <Logos />
        <Features />
        <HowItWorks />
        <DemoSection />
        <Testimonials />
        <OpenSource />
        <Faq />
        <FinalCta isLoggedIn={!!user} />
        <LandingFooter isLoggedIn={!!user} />
      </main>
    </>
  );
}
