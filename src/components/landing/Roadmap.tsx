import { motion } from "framer-motion";
import { ArrowRight, Check, Circle, Flag, Hammer } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../lib/cn";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import { useCtaLinks } from "./useCtaLinks";

// What works today, what's built and waiting (on a platform's approval, or testing), and what's planned. Only the first
// group may be described as available anywhere on the page.
const groups = [
  {
    when: "Available now",
    tone: "live",
    icon: Check,
    items: [
      "Transcripts of video and audio, with speakers",
      "Posts for 11 platforms in your brand voice",
      "Posts from photos and event flyers",
      "Captioned clips and vertical videos",
      "Content plans turned into draft posts",
      "Content library and calendar, with one-tap sharing",
      "Automatic posting to YouTube, LinkedIn and WordPress",
      "Post results: YouTube views, likes and comments, and clicks on Mindra links",
    ],
  },
  {
    when: "In development",
    tone: "building",
    icon: Hammer,
    items: [
      "Automatic posting to Facebook, Instagram, TikTok and X: built, waiting on each platform's approval",
      "Paying for plans online, in naira: built, being tested",
    ],
  },
  {
    when: "Planned",
    tone: "planned",
    icon: Circle,
    items: [
      "Reach and impressions, as each platform gives access",
      "Video watch time, where platforms share it",
      "AI recommendations for what to post next",
      "Advanced workflow automation",
      "Team collaboration and approvals",
    ],
  },
] as const;

const TONE = {
  live: { label: "text-[#047857]", dot: "bg-[#10B981]", icon: "bg-[#10B981] text-white", mark: "text-[#10B981]" },
  building: { label: "text-[#6D28D9]", dot: "bg-[#8B5CF6]", icon: "bg-[#EDE9FE] text-[#6D28D9]", mark: "text-[#8B5CF6]" },
  planned: { label: "text-[#71717A]", dot: "bg-[#A1A1AA]", icon: "bg-[#F4F4F5] text-[#71717A]", mark: "text-[#A1A1AA]" },
};

export default function Roadmap() {
  const { startTo } = useCtaLinks();

  return (
    <section id="roadmap" className="scroll-mt-16 bg-white px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionLabel icon={Flag}>Private beta</SectionLabel>
            <h2 className="mt-6 text-[2.6rem] leading-[1.02] font-medium text-balance text-[#0B0B0F] sm:text-6xl">
              Live today,
              <br />
              <span className="text-[#A3A3AB]">growing every month.</span>
            </h2>
          </div>
          <div className="max-w-sm lg:pb-2">
            <p className="text-[15px] leading-relaxed text-[#52525B]">
              What you can use now, what we're finishing and what's planned. Beta members help decide what we build first.
            </p>
            <Link
              to={startTo}
              className="group mt-5 inline-flex items-center gap-2 rounded-full bg-[#0B0B0F] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27272A]"
            >
              Join the beta
              <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </Reveal>

        {/* A track across the top: the part that's live is lit, the rest is still to come */}
        <div className="relative mt-16 hidden h-px bg-black/10 lg:block">
          <motion.div
            className="absolute inset-y-0 left-0 w-1/3 origin-left bg-[#10B981]"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.span
            className="absolute -top-[5px] left-1/3 h-[11px] w-[11px] -translate-x-1/2 rounded-full bg-[#10B981] ring-4 ring-[#10B981]/20"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, amount: 1 }}
            transition={{ delay: 0.75, duration: 0.2, ease: "easeOut" }}
          />
        </div>

        <div className="mt-10 grid gap-y-10 md:grid-cols-3 lg:mt-0">
          {groups.map((group, i) => {
            const tone = TONE[group.tone];
            const Icon = group.icon;
            return (
              <Reveal key={group.when} delay={i * 110} className="border-l border-black/10 px-6 lg:pt-10">
                <h3 className={cn("inline-flex items-center gap-2 text-xs font-semibold", tone.label)}>
                  <span className="relative flex h-2 w-2">
                    {group.tone === "live" && <span className="absolute inset-0 animate-ping-soft rounded-full bg-[#10B981]" />}
                    <span className={cn("relative h-2 w-2 rounded-full", tone.dot)} />
                  </span>
                  {group.when}
                </h3>
                <span className={cn("mt-6 grid h-11 w-11 place-items-center rounded-xl", tone.icon)}>
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <ul className="mt-6 space-y-3">
                  {group.items.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[14.5px] leading-relaxed text-[#3F3F46]">
                      {group.tone === "live" ? (
                        <Check aria-hidden="true" className={cn("mt-1 size-4 shrink-0", tone.mark)} strokeWidth={2.5} />
                      ) : (
                        <Circle aria-hidden="true" className={cn("mt-1.5 size-3 shrink-0 mx-0.5", tone.mark)} strokeWidth={2.5} />
                      )}
                      <span className="text-pretty">{item}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
