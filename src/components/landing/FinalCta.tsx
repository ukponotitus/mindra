import { ArrowRight } from "lucide-react";
import { Link } from "react-router";
import Eclipse from "./Eclipse";
import Reveal from "./Reveal";
import { useCtaLinks } from "./useCtaLinks";

export default function FinalCta() {
  const { signedIn, startTo, loginTo } = useCtaLinks();

  return (
    // A sky going from day to dusk; the footer below carries on from its darkest colour.
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#FFFFFF_0%,#F3F2F7_16%,#DEDCEB_32%,#BDB5D8_46%,#8E86BC_58%,#4E4D85_70%,#22244A_84%,#0B0D1C_100%)] px-6 pb-20 pt-28 text-center lg:pt-36">
      <Reveal className="relative z-10">
        <h2 className="mx-auto max-w-4xl text-[2.6rem] leading-[1.02] font-medium text-balance text-[#0B0B0F] sm:text-6xl lg:text-7xl">
          What you already have could fill your feed <span className="text-[#8A8798]">for a month.</span>
        </h2>
        <p className="mt-6 text-lg text-pretty text-[#52525B]">Free during the beta. No credit card, no editing skills needed.</p>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to={startTo}
            className="group inline-flex items-center gap-2 rounded-full bg-[#0B0B0F] px-7 py-3.5 text-[15px] font-medium text-white shadow-md transition-colors hover:bg-[#27272A]"
          >
            {signedIn ? "Open your workspace" : "Start creating for free"}
            <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
          {!signedIn && (
            <Link to={loginTo} className="px-6 py-3.5 text-[15px] font-medium text-[#3F3F46] transition-colors hover:text-black">
              I already have an account
            </Link>
          )}
        </div>
      </Reveal>

      <div className="mt-20 lg:mt-24">
        <Eclipse />
      </div>
    </section>
  );
}
