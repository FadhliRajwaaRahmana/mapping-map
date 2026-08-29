import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { Logos } from "@/components/landing/logos";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
import { DemoSection } from "@/components/landing/demo-section";
import { Testimonials } from "@/components/landing/testimonials";
import { Pricing } from "@/components/landing/pricing";
import { Faq } from "@/components/landing/faq";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        <Hero />
        <Logos />
        <Features />
        <HowItWorks />
        <DemoSection />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
        <LandingFooter />
      </main>
    </>
  );
}
