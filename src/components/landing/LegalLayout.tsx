import { useEffect, type ComponentType, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../lib/cn";
import { LEGAL_LAST_UPDATED } from "../../lib/legal";
import { useDocumentTitle } from "../../lib/useDocumentTitle";
import LandingFooter from "./LandingFooter";
import Logo from "./Logo";
import SectionLabel from "./SectionLabel";
import { useCtaLinks } from "./useCtaLinks";

interface Props {
  title: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;
  children: ReactNode;
}

// The pages write plain h2, p, ul and a elements; these classes style them like the landing page's text.
const prose = cn(
  "mt-10 text-[15.5px] leading-relaxed text-pretty text-[#52525B]",
  "[&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:font-semibold [&_h2]:text-balance [&_h2]:text-foreground",
  "[&_p]:mt-4 [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_ul]:marker:text-[#A3A3AB]",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_a]:rounded-sm [&_a]:font-medium [&_a]:wrap-anywhere [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
  "[&_a]:focus-visible:outline-2 [&_a]:focus-visible:outline-offset-2 [&_a]:focus-visible:outline-primary",
);

/** The privacy policy and terms of service: the landing page's header and footer around a column of text. */
export default function LegalLayout({ title, label, icon, children }: Props) {
  const { signedIn, startTo } = useCtaLinks();
  useDocumentTitle(title);

  // Links at the bottom of the landing page would otherwise open this page already scrolled down. "instant" skips
  // the page's smooth scrolling, which would scroll up through the whole text.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-dvh bg-white text-foreground antialiased">
      <header className="px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 max-w-[1080px] items-center justify-between gap-4 rounded-full bg-[#0C0C10] pr-2 pl-4 sm:pl-5"
        >
          <Logo onDark />
          <Link
            to={startTo}
            className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-white px-5 text-sm font-semibold text-foreground transition-colors hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {signedIn ? "Open app" : "Start free"}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </nav>
      </header>

      <main className="px-6 pt-16 pb-24 lg:pt-24 lg:pb-32">
        <article className="mx-auto max-w-3xl">
          <SectionLabel icon={icon}>{label}</SectionLabel>
          <h1 className="mt-6 text-[2.6rem] leading-[1.05] font-semibold text-balance text-foreground sm:text-6xl">{title}</h1>
          <p className="mt-5 text-sm text-muted-foreground">Last updated {LEGAL_LAST_UPDATED}</p>
          <div className={prose}>{children}</div>
        </article>
      </main>

      <LandingFooter />
    </div>
  );
}
