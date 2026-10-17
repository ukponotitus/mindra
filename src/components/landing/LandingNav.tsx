import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Menu, X } from "lucide-react";
import { Link } from "react-router";
import Logo from "./Logo";
import { cn } from "../../lib/cn";
import { useCtaLinks } from "./useCtaLinks";

const links = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function LandingNav() {
  const { signedIn, startTo, loginTo } = useCtaLinks();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || menuOpen;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
      {/* At the top of the page the bar is see-through; once you scroll, a dark capsule fades in behind it.
          Only the background's opacity changes, so nothing is laid out again. */}
      <nav className="relative mx-auto flex h-14 max-w-[1080px] items-center justify-between pr-2 pl-4 sm:pl-5">
        <div
          aria-hidden="true"
          className={cn(
            "absolute inset-0 rounded-full border border-white/10 bg-[#0C0C10]/90 shadow-lg backdrop-blur-xl transition-opacity duration-200",
            solid ? "opacity-100" : "opacity-0",
          )}
        />
        <div className="relative">
          <Logo onDark />
        </div>

        <div className="relative hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="relative hidden items-center gap-1 md:flex">
          {!signedIn && (
            <Link to={loginTo} className="px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:text-white">
              Log in
            </Link>
          )}
          <Link
            to={startTo}
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0B0B1A] transition-colors hover:bg-white/90"
          >
            {signedIn ? "Open app" : "Start free"}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <button
          className="relative mr-1 grid size-10 place-items-center text-white md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          aria-controls="landing-menu"
        >
          {menuOpen ? <X aria-hidden="true" className="size-6" /> : <Menu aria-hidden="true" className="size-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="landing-menu"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mx-auto mt-2 max-w-[1080px] rounded-3xl border border-white/10 bg-[#0C0C10]/90 p-4 backdrop-blur-xl md:hidden"
          >
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-3 text-white/80 hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
            <div className="flex gap-2 pt-4">
              {!signedIn && (
                <Link
                  to={loginTo}
                  className="flex-1 rounded-full border border-white/15 px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Log in
                </Link>
              )}
              <Link to={startTo} className="flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-[#0B0B1A]">
                {signedIn ? "Open app" : "Start free"}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
