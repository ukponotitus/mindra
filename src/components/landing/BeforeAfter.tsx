import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Check, Clock, Heart, MessageCircle, Send, X } from "lucide-react";
import { cn } from "../../lib/cn";
import BrandMark from "../BrandMark";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

const byHand = [
  "Scrub through the whole recording to find the good bits",
  "Cut, reframe and caption every clip by hand",
  "Rewrite the same message for eight different platforms",
  "Design quote cards and thumbnails from scratch",
  "Post everything, one app at a time",
];

const withMindra = [
  "Upload once, or connect your channel",
  "Mindra finds the moments worth sharing",
  "Clips, captions and posts arrive in your voice",
  "Review, tweak and approve in minutes",
  "Publish everywhere from one calendar",
];

const clips = [
  { caption: "Worry empties today.", tint: "bg-[#2A2356]" },
  { caption: "Fear is loud. Faith is louder.", tint: "bg-[#231E4A]" },
  { caption: "Trust God with the timing.", tint: "bg-[#1C2346]" },
];

/** One vertical clip: a speaker, the platform buttons and a caption. */
function Clip({ caption, tint, focus = false }: { caption: string; tint: string; focus?: boolean }) {
  return (
    <div className={cn("relative h-[300px] w-[170px] overflow-hidden rounded-[1.6rem] shadow-2xl ring-1 ring-white/15 sm:h-[370px] sm:w-[210px]", tint)}>
      <div className="absolute top-[22%] left-1/2 size-14 -translate-x-1/2 rounded-full bg-white/20" />
      <div className="absolute top-[40%] left-1/2 h-24 w-28 -translate-x-1/2 rounded-t-[3rem] bg-white/10" />
      <div className="absolute right-2.5 bottom-24 flex flex-col items-center gap-3 text-white/80">
        <Heart className="size-4" />
        <MessageCircle className="size-4" />
        <Send className="size-4" />
      </div>
      <p className={cn("absolute inset-x-3 bottom-8 text-center leading-snug font-extrabold text-balance text-white", focus ? "text-[15px]" : "text-[13px]")}>
        {caption}
      </p>
    </div>
  );
}

const FANNED = {
  left: "perspective(1200px) translateX(-128px) rotateY(28deg) scale(0.88)",
  right: "perspective(1200px) translateX(128px) rotateY(-28deg) scale(0.88)",
};

/** The big card: one recording fanning out into clips as it scrolls into view. */
function FanCard() {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  // From the card's top entering the screen until half of it is showing: a range the browser's view timeline can run.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "center end"] });
  const left = useTransform(scrollYProgress, [0.2, 1], ["perspective(1200px) translateX(0px) rotateY(0deg) scale(0.8)", FANNED.left]);
  const right = useTransform(scrollYProgress, [0.2, 1], ["perspective(1200px) translateX(0px) rotateY(0deg) scale(0.8)", FANNED.right]);

  return (
    <div ref={ref} className="relative flex min-h-[620px] flex-col overflow-hidden rounded-[2rem] bg-[#0E0E12] ring-1 ring-white/10 lg:h-full">
      {/* Status bar, like a headset's home view */}
      <div className="relative z-10 flex items-center justify-center gap-3 pt-5 text-[11px] font-medium text-white/55 tabular-nums">
        <span className="size-1.5 rounded-full bg-[#FF453A]" />
        Sunday Service · 52:14
        <span className="text-white/25">|</span>
        Sun 12 Oct
      </div>

      <div aria-hidden="true" className="relative flex flex-1 items-center justify-center pt-6 pb-48 sm:pt-8 sm:pb-40">
        <motion.div className="absolute" style={{ transform: reduce ? FANNED.left : left }}>
          <div className="opacity-70">
            <Clip {...clips[0]} />
          </div>
        </motion.div>
        <motion.div className="absolute" style={{ transform: reduce ? FANNED.right : right }}>
          <div className="opacity-70">
            <Clip {...clips[2]} />
          </div>
        </motion.div>
        <div className="relative z-10">
          <Clip {...clips[1]} focus />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black via-black/90 to-transparent px-8 pt-24 pb-8">
        <h3 className="text-[1.7rem] leading-tight font-medium text-balance text-white">One sermon. Thirty moments.</h3>
        <p className="mt-2 max-w-sm text-[15px] leading-relaxed text-pretty text-white/60">
          Mindra finds the hooks, quotes and stories in every recording, so nothing good is heard only once.
        </p>
      </div>
    </div>
  );
}

const listItem = {
  hidden: { opacity: 0, x: -10 },
  show: (i: number) => ({ opacity: 1, x: 0, transition: { delay: 0.3 + i * 0.1, duration: 0.5, ease: "easeOut" as const } }),
};

export default function BeforeAfter() {
  return (
    <section className="bg-black px-6 py-28 lg:py-36">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-3xl text-center">
          <SectionLabel icon={Clock} dark>
            The problem
          </SectionLabel>
          <h2 className="mt-6 text-4xl leading-[1.05] font-medium text-balance text-white md:text-6xl">Your message deserves more than one airing.</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-relaxed text-pretty text-white/55">
            You already record hours every week. Most of it is heard once and then forgotten. Mindra keeps it working all
            week long.
          </p>
        </Reveal>

        <div className="mt-16 grid items-stretch gap-5 lg:grid-cols-[1.05fr_1fr]">
          <Reveal className="h-full">
            <FanCard />
          </Reveal>

          <div className="flex flex-col gap-5">
            <Reveal delay={120}>
              <div className="rounded-[1.6rem] bg-[#141417] p-7 ring-1 ring-white/10">
                <span className="grid size-14 place-items-center rounded-2xl bg-[#FF3B30]">
                  <Clock aria-hidden="true" className="size-7 text-white" />
                </span>
                <h3 className="mt-5 text-2xl font-medium text-white">Doing it by hand</h3>
                <motion.ul initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} className="mt-4 space-y-2.5">
                  {byHand.map((item, i) => (
                    <motion.li key={item} custom={i} variants={listItem} className="flex items-start gap-3 text-[15px] text-white/50">
                      <X aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-[#FF6961]" />
                      {/* The strike-through draws itself across each line. The outer span is the flex item, so the
                          inner one stays inline and each wrapped line gets its own stroke. */}
                      <span>
                        <motion.span
                          className="box-decoration-clone bg-[linear-gradient(rgba(255,255,255,0.45),rgba(255,255,255,0.45))] bg-[position:0_58%] bg-no-repeat"
                          variants={{
                            hidden: { backgroundSize: "0% 1.5px" },
                            show: { backgroundSize: "100% 1.5px", transition: { delay: 0.5 + i * 0.12, duration: 0.5, ease: "easeOut" } },
                          }}
                        >
                          {item}
                        </motion.span>
                      </span>
                    </motion.li>
                  ))}
                </motion.ul>
                <p className="mt-6 inline-flex rounded-full bg-[#FF3B30]/12 px-3.5 py-1.5 text-[13px] font-semibold text-[#FF8A80]">
                  Hours of editing, every week
                </p>
              </div>
            </Reveal>

            <Reveal delay={220}>
              <div className="rounded-[1.6rem] bg-[#141417] p-7 ring-1 ring-white/10">
                {/* "With Mindra": Mindra's own mark */}
                <BrandMark className="size-14 rounded-2xl" />
                <h3 className="mt-5 text-2xl font-medium text-white">With Mindra</h3>
                <motion.ul initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.4 }} className="mt-4 space-y-2.5">
                  {withMindra.map((item, i) => (
                    <motion.li key={item} custom={i} variants={listItem} className="flex items-start gap-3 text-[15px] text-white/85">
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#6D5EF5]">
                        <Check aria-hidden="true" className="size-2.5 text-white" strokeWidth={3.5} />
                      </span>
                      {item}
                    </motion.li>
                  ))}
                </motion.ul>
                <p className="mt-6 inline-flex rounded-full bg-[#34D399]/12 px-3.5 py-1.5 text-[13px] font-semibold text-[#6EE7B7]">
                  Minutes of review, then you're done
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
