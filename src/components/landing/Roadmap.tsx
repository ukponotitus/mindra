import { motion } from "framer-motion";
import { ArrowRight, Captions, Clapperboard, Flag, PenLine, Send } from "lucide-react";
import { Link } from "react-router";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import { useCtaLinks } from "./useCtaLinks";

const stages = [
  {
    when: "Live now",
    icon: Captions,
    title: "Transcripts",
    text: "Upload a video, audio file or transcript and get every word, timestamped and searchable.",
    live: true,
  },
  {
    when: "Coming next",
    icon: PenLine,
    title: "Posts in your voice",
    text: "Captions and posts for every platform, plus a brand voice trained on your past posts.",
  },
  {
    when: "Then",
    icon: Clapperboard,
    title: "Automatic clips",
    text: "Vertical clips with animated captions, cut from your strongest moments.",
  },
  {
    when: "Then",
    icon: Send,
    title: "Publishing and WhatsApp",
    text: "Auto-import, a content calendar, scheduled posting and WhatsApp share packs.",
  },
];

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
              Here's what you can use now and what's on the way. Beta members help decide what we build first.
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

        {/* A track across the top: the live part is lit, the rest is still to come */}
        <div className="relative mt-16 hidden h-px bg-black/10 lg:block">
          <motion.div
            className="absolute inset-y-0 left-0 w-1/4 origin-left bg-[#10B981]"
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true, amount: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
          <motion.span
            className="absolute -top-[5px] left-1/4 h-[11px] w-[11px] -translate-x-1/2 rounded-full bg-[#10B981] ring-4 ring-[#10B981]/20"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, amount: 1 }}
            transition={{ delay: 0.75, duration: 0.2, ease: "easeOut" }}
          />
        </div>

        <div className="mt-10 grid gap-y-10 sm:grid-cols-2 lg:mt-0 lg:grid-cols-4">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            return (
              <Reveal key={stage.title} delay={i * 110} className="border-l border-black/10 px-6 lg:pt-10">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center gap-2 text-xs font-semibold ${stage.live ? "text-[#047857]" : "text-[#A1A1AA]"}`}>
                    {stage.live && (
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inset-0 animate-ping-soft rounded-full bg-[#10B981]" />
                        <span className="relative h-2 w-2 rounded-full bg-[#10B981]" />
                      </span>
                    )}
                    {stage.when}
                  </span>
                  <span className="text-xs font-medium text-[#D4D4D8]">0{i + 1}</span>
                </div>
                <span
                  className={`mt-6 grid h-11 w-11 place-items-center rounded-xl ${
                    stage.live ? "bg-[#10B981] text-white" : "bg-[#F4F4F5] text-[#71717A]"
                  }`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="mt-5 text-xl font-medium text-balance text-[#0B0B0F]">{stage.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-[#71717A]">{stage.text}</p>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
