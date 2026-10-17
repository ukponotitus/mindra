import { useEffect, useRef } from "react";
import { MotionConfig } from "framer-motion";
import AudienceTabs from "../components/landing/AudienceTabs";
import BeforeAfter from "../components/landing/BeforeAfter";
import Faq from "../components/landing/Faq";
import FeatureBento from "../components/landing/FeatureBento";
import FinalCta from "../components/landing/FinalCta";
import Hero from "../components/landing/Hero";
import HowItWorks from "../components/landing/HowItWorks";
import LandingFooter from "../components/landing/LandingFooter";
import LandingNav from "../components/landing/LandingNav";
import PlatformMarquee from "../components/landing/PlatformMarquee";
import Pricing from "../components/landing/Pricing";
import Roadmap from "../components/landing/Roadmap";
import { useDocumentTitle } from "../lib/useDocumentTitle";

// The page tells one story, top to bottom: what Mindra does (hero), why it matters,
// how it works, who it's for, what it can do, what's live today, what it costs.
export default function LandingPage() {
  const page = useRef<HTMLDivElement>(null);
  useDocumentTitle(null);

  // A link to a section from another page (the footer on the privacy and terms pages) opens the page at that section;
  // the browser can't do it on its own because the sections don't exist until the app has rendered.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "instant" });
  }, []);

  // Marks sections that are off-screen so their CSS loops pause (see `[data-offscreen]` in index.css).
  useEffect(() => {
    const sections = page.current?.querySelectorAll("main > section, footer");
    if (!sections) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
    });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  return (
    // Visitors who ask their system for less motion get the page without movement.
    <MotionConfig reducedMotion="user">
      <div ref={page} className="min-h-dvh bg-black text-[#111827] antialiased">
        <LandingNav />
        <main>
          <Hero />
          <PlatformMarquee />
          <BeforeAfter />
          <HowItWorks />
          <AudienceTabs />
          <FeatureBento />
          <Roadmap />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <LandingFooter />
      </div>
    </MotionConfig>
  );
}
