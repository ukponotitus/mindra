import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Minus, Tag } from "lucide-react";
import { Link } from "react-router";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import { recordingAllowance, usePricingPlans } from "../../lib/billing";
import { useCtaLinks } from "./useCtaLinks";

// Monthly prices in naira; yearly billing gives two months free. The plans come from the API (billing/plans.py, the
// one list of prices and limits), shown from the built-in copy until it answers. Features Mindra doesn't have yet are
// marked `soon`, so the cards never promise what isn't built.
const naira = (amount: number) => amount.toLocaleString("en-NG");

function yearlyPerMonth(monthly: number) {
  return Math.round((monthly * 10) / 12);
}

export default function Pricing() {
  const { startTo } = useCtaLinks();
  const [yearly, setYearly] = useState(false);
  const pricing = usePricingPlans().data;
  const plans = pricing?.plans ?? [];
  const inBeta = pricing?.in_beta ?? true;
  // beta_ends_on is the first day after the beta, as YYYY-MM-DD.
  const betaEnds = pricing?.beta_ends_on
    ? new Date(`${pricing.beta_ends_on}T12:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <section id="pricing" className="relative scroll-mt-16 overflow-hidden bg-black px-6 py-24 lg:py-32">
      <div className="relative mx-auto max-w-7xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <SectionLabel icon={Tag} dark>
            Pricing
          </SectionLabel>
          <h2 className="mt-6 text-[2.6rem] leading-[1.02] font-medium text-balance text-white sm:text-6xl">
            Simple plans,
            <br />
            <span className="text-white/40">priced by hours.</span>
          </h2>
          <p className="mt-5 text-lg text-white/50">Every plan comes with recording time, posts, clips and image or flyer projects each month.</p>
        </Reveal>

        <Reveal className="mt-10 flex flex-col items-center gap-5">
          {inBeta && (
            <div className="inline-flex items-center rounded-full bg-[#34D399]/10 px-4 py-2 text-sm font-medium text-[#6EE7B7] ring-1 ring-[#34D399]/20">
              Everything is free while Mindra is in beta
            </div>
          )}
          <div role="group" aria-label="Billing period" className="relative flex rounded-full bg-white/[0.06] p-1 ring-1 ring-white/10">
            {[
              { label: "Monthly", value: false },
              { label: "Yearly · 2 months free", value: true },
            ].map((option) => {
              const selected = yearly === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setYearly(option.value)}
                  className={`relative whitespace-nowrap rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    selected ? "text-black" : "text-white/60 hover:text-white"
                  }`}
                >
                  {selected && (
                    <motion.span
                      layoutId="billing-pill"
                      className="absolute inset-0 rounded-full bg-white"
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    />
                  )}
                  <span className="relative">{option.label}</span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan, i) => {
            const price = yearly ? yearlyPerMonth(plan.monthly_price) : plan.monthly_price;
            return (
              <Reveal key={plan.name} delay={i * 90}>
                <div
                  className={`relative flex h-full flex-col overflow-hidden rounded-[1.6rem] p-7 ${
                    plan.recommended
                      ? "bg-[#17142E] ring-1 ring-[#8B7CFF]/60"
                      : "bg-white/[0.03] ring-1 ring-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-white">{plan.name}</h3>
                    {plan.recommended && (
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-black">Recommended</span>
                    )}
                  </div>
                  {plan.tagline && <p className="mt-1.5 min-h-10 text-sm text-white/50">{plan.tagline}</p>}
                  <p className="mt-5 flex h-14 items-baseline overflow-hidden">
                    <span className="text-[2.75rem] font-medium text-white">₦</span>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span
                        key={price}
                        initial={{ y: 40, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -40, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="text-[2.75rem] font-medium text-white tabular-nums"
                      >
                        {naira(price)}
                      </motion.span>
                    </AnimatePresence>
                    <span className="ml-1.5 text-sm text-white/40">/month</span>
                  </p>
                  <p className="mt-1 h-4 text-xs text-white/40 tabular-nums">
                    {plan.monthly_price > 0 && yearly ? `₦${naira(plan.yearly_price)} paid once a year` : ""}
                  </p>
                  <p className="mt-5 text-sm font-medium text-[#B4A9FF]">{recordingAllowance(plan.hours_per_month)}</p>
                  <ul className="mt-5 flex-1 space-y-3">
                    {plan.features.map(({ text, soon, included }) => {
                      const Icon = included ? Check : Minus;
                      return (
                        <li key={text} className={`flex items-start gap-2.5 text-sm ${soon || !included ? "text-white/45" : "text-white/70"}`}>
                          <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 flex-shrink-0 ${soon || !included ? "text-white/25" : "text-[#5EEAD4]"}`} strokeWidth={3} />
                          <span>
                            {text}
                            {soon && (
                              <span className="ml-2 inline-block rounded-full border border-white/15 px-1.5 py-px align-middle text-[10px] font-medium text-white/55">
                                Coming soon
                              </span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <Link
                    to={startTo}
                    className={`mt-8 block rounded-full py-3 text-center text-sm font-semibold transition-colors ${
                      plan.recommended ? "bg-white text-black hover:bg-white/90" : "bg-white/[0.07] text-white ring-1 ring-white/10 hover:bg-white/[0.12]"
                    }`}
                  >
                    Start free
                  </Link>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-white/35">
          Prices in naira.
          {inBeta && (betaEnds ? ` Everything is free until the beta ends on ${betaEnds}; paid plans start then.` : " Paid plans start after the beta.")}{" "}
          Agency plans for teams running many brands are on the way.
        </p>
      </div>
    </section>
  );
}
