import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Link } from "react-router";
import { useSignupOffer } from "../../lib/billing";
import { cn } from "../../lib/cn";
import { useCtaLinks } from "./useCtaLinks";

/** The hero's offer, as a banner that's a link to sign-up: while the launch offer is on, that everything is free
 * until its last day; after it, what a free account gets each month. The date and numbers are the API's
 * (`useSignupOffer`), never typed in. */
export default function SignupOffer() {
  const { startTo } = useCtaLinks();
  const offer = useSignupOffer();
  return (
    <Link
      to={startTo}
      className="group mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-[#B4A9FF]/50 bg-[#B4A9FF]/[0.14] py-3 pr-4 pl-3 text-left transition-colors hover:bg-[#B4A9FF]/[0.22] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B4A9FF]"
    >
      <span className="shrink-0 rounded-xl bg-[#B4A9FF] px-3 py-2 text-sm font-bold tracking-wide text-[#0B0B1A] uppercase">Free</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] leading-snug font-semibold text-pretty text-white sm:text-base">{offer.headline}</span>
        <span className="mt-0.5 block text-[13px] leading-snug text-pretty text-white/70">{offer.detail}</span>
      </span>
      <ArrowRight aria-hidden="true" className="size-5 shrink-0 text-[#B4A9FF] transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

/** The same offer along the bottom of the screen once the hero's button has scrolled away, until it's closed: on a
 * phone the navigation's own sign-up button is small, and most visitors read on one. Not shown to someone signed in. */
export function StickyOffer() {
  const { signedIn, startTo } = useCtaLinks();
  const offer = useSignupOffer();
  const [past, setPast] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    const onScroll = () => setPast(window.scrollY > 640);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (signedIn || closed) return null;
  const shown = past;
  return (
    <aside
      aria-label="Sign-up offer"
      inert={!shown}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[opacity,translate] duration-200",
        shown ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl border border-white/15 bg-[#0C0C10]/95 py-2.5 pr-2 pl-4 shadow-lg backdrop-blur-xl">
        <p className="min-w-0 flex-1 text-sm leading-snug font-medium text-pretty text-white">
          {offer.short}
          <span className="hidden text-white/60 sm:inline"> {offer.detail}</span>
        </p>
        <Link to={startTo} className="shrink-0 rounded-full bg-[#B4A9FF] px-4 py-2.5 text-sm font-semibold text-[#0B0B1A] transition-colors hover:bg-[#C9C1FF]">
          Sign up free
        </Link>
        <button type="button" onClick={() => setClosed(true)} aria-label="Close the offer" className="grid size-9 shrink-0 place-items-center rounded-full text-white/60 transition-colors hover:text-white">
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </aside>
  );
}
