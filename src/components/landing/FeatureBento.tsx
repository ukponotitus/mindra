import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  Captions,
  Check,
  Clapperboard,
  Heart,
  Layers,
  MessageCircle,
  Send,
  TrendingUp,
} from "lucide-react";
import { cn } from "../../lib/cn";
import Ribbon from "./hero/Ribbon";
import { PlaybackContext, useLoop } from "./playback";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import { useMediaQuery } from "../../lib/useMediaQuery";

type Status = "live" | "next" | "soon";

const STATUS: Record<Status, { label: string; className: string }> = {
  live: { label: "Live now", className: "bg-[#DCFCE7] text-[#15803D]" },
  next: { label: "Coming next", className: "bg-[#EDE9FE] text-[#6D28D9]" },
  soon: { label: "On the roadmap", className: "bg-[#F4F4F5] text-[#71717A]" },
};

/** Steps through 0..length-1 on a timer, for looping demos. Pauses while the section is off-screen. */
function useTicker(length: number, intervalMs: number) {
  const [index, setIndex] = useState(0);
  useLoop(
    useCallback(() => setIndex((i) => (i + 1) % length), [length]),
    intervalMs,
  );
  return index;
}

/* ---------- The small demos shown in an open card ---------- */

const transcriptLines = [
  ["0:00", "Welcome, church. Today we're talking about courage."],
  ["0:42", "Fear is loud, but faith is louder."],
  ["1:15", "Turn with me to Joshua chapter one."],
  ["2:03", "Be strong and courageous. Do not be afraid."],
];

function TranscriptDemo() {
  const active = useTicker(transcriptLines.length, 1600);
  return (
    <div className="w-full space-y-1">
      {transcriptLines.map(([time, text], i) => (
        <div key={time} className="relative flex gap-3 rounded-lg px-3 py-1.5 text-[13px]">
          {i === active && (
            <motion.span layoutId="feature-transcript" className="absolute inset-0 rounded-lg bg-white/10" transition={{ duration: 0.3, ease: "easeOut" }} />
          )}
          <span className={cn("relative w-8 shrink-0 pt-0.5 font-mono text-[11px] tabular-nums", i === active ? "font-bold text-[#C4BBFF]" : "text-white/40")}>
            {time}
          </span>
          <span className={`relative ${i === active ? "text-white" : "text-white/45"}`}>{text}</span>
        </div>
      ))}
    </div>
  );
}

function VoiceDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [score, setScore] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 1400, 1);
      setScore(Math.round(94 * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView]);
  const radius = 44;
  const circumference = 2 * Math.PI * radius;
  return (
    <div ref={ref} className="flex items-center gap-6">
      <div className="relative size-28 shrink-0">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="50" cy="50" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="8" fill="none" />
          <motion.circle
            cx="50"
            cy="50"
            r={radius}
            stroke="#8B7CFF"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: inView ? circumference * 0.06 : circumference }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-semibold text-white tabular-nums">{score}%</p>
            <p className="-mt-0.5 text-[10px] text-white/50">match</p>
          </div>
        </div>
      </div>
      <dl className="space-y-2.5 text-xs">
        {[
          ["Tone", "Warm and hopeful"],
          ["Words you use", "“church family”, “grace”"],
          ["Words you avoid", "“synergy”"],
        ].map(([term, detail]) => (
          <div key={term}>
            <dt className="text-white/40">{term}</dt>
            <dd className="font-medium text-white/85">{detail}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const clipWords = ["Small", "steps,", "taken", "daily,", "change", "everything."];

function ClipsDemo() {
  const word = useTicker(clipWords.length + 3, 380);
  return (
    <div className="flex items-center gap-5">
      <div className="relative h-[184px] w-[104px] shrink-0 overflow-hidden rounded-[1.4rem] border-[3px] border-white/10 bg-[#231E4A]">
        <div className="absolute top-[20%] left-1/2 size-8 -translate-x-1/2 rounded-full bg-white/20" />
        <div className="absolute left-1/2 top-[38%] h-14 w-16 -translate-x-1/2 rounded-t-[2rem] bg-white/10" />
        <div className="absolute bottom-14 right-1.5 flex flex-col items-center gap-2 text-white/80">
          <Heart className="size-3" />
          <MessageCircle className="size-3" />
          <Send className="size-3" />
        </div>
        <div className="absolute inset-x-1.5 bottom-3 text-center text-[10px] font-extrabold leading-snug">
          {clipWords.map((text, i) => (
            <span
              key={i}
              className={cn("mx-[1px] inline-block rounded px-0.5 transition-colors duration-150", i === word ? "bg-[#FACC15] text-[#111827]" : i < word ? "text-white" : "text-white/40")}
            >
              {text}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {["Reframed to 9:16", "Speaker kept in frame", "Animated captions", "Strongest moments first"].map((label, i) => (
          <motion.span
            key={label}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.08, duration: 0.3, ease: "easeOut" }}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-white/80"
          >
            <Check aria-hidden="true" className="size-3 text-[#5EEAD4]" />
            {label}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function WhatsAppDemo() {
  return (
    <div className="w-full max-w-[300px] rounded-2xl border border-white/5 bg-[#0B141A] p-3">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-[#25D366]">
          <MessageCircle aria-hidden="true" className="size-3.5 text-white" />
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold text-white">Grace Chapel</p>
          <p className="text-[10px] text-white/45">WhatsApp Channel</p>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.3, ease: "easeOut" }}
        className="rounded-xl rounded-tl-sm bg-[#1F2C34] p-2"
      >
        <div className="mb-2 grid h-14 place-items-center rounded-lg bg-[#231E4A]">
          <span className="grid size-7 place-items-center rounded-full bg-white/20">
            <span className="ml-0.5 border-y-[5px] border-l-[9px] border-y-transparent border-l-white" />
          </span>
        </div>
        <p className="px-1 text-[11px] leading-snug text-white/85">This week's message in 3 minutes, plus a reading plan for every day 🙏</p>
        <p className="mt-1 px-1 text-right text-[9px] text-white/40">9:41</p>
      </motion.div>
    </div>
  );
}

const week = [
  { day: "Mon", posts: ["#E1306C", "#25D366"] },
  { day: "Tue", posts: ["#1877F2"] },
  { day: "Wed", posts: ["#E1306C", "#A79BFF"] },
  { day: "Thu", posts: ["#25D366"] },
  { day: "Fri", posts: ["#25F4EE", "#1877F2"] },
  { day: "Sat", posts: ["#E1306C"] },
  { day: "Sun", posts: ["#6D5EF5"] },
];

function CalendarDemo() {
  return (
    <div className="grid w-full grid-cols-7 gap-1.5">
      {week.map(({ day, posts }, dayIndex) => (
        <div key={day} className="min-h-[96px] rounded-xl border border-white/5 bg-white/[0.04] p-1.5">
          <p className="mb-1.5 text-center text-[10px] text-white/40">{day}</p>
          <div className="space-y-1">
            {posts.map((color, i) => (
              <motion.div
                key={i}
                className="h-3.5 rounded-md"
                style={{ background: color }}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 0.85, y: 0 }}
                transition={{ delay: 0.1 + dayIndex * 0.06 + i * 0.04, duration: 0.3, ease: "easeOut" }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const growth = [28, 36, 33, 47, 55, 68, 84];

function InsightsDemo() {
  return (
    <div className="w-full">
      <div className="flex h-28 items-end gap-2">
        {growth.map((value, i) => (
          <div key={i} className="flex h-full flex-1 items-end">
            <motion.div
              className={cn("w-full origin-bottom rounded-t-md", i === growth.length - 1 ? "bg-[#8B7CFF]" : "bg-white/15")}
              style={{ height: `${value}%` }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.5, ease: "easeOut" }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] text-white/45">
        <span>Week 1</span>
        <span className="inline-flex items-center gap-1 font-semibold text-[#6EE7B7]">
          <TrendingUp aria-hidden="true" className="size-3.5" />
          More of what works
        </span>
        <span>Week 7</span>
      </div>
    </div>
  );
}

/* ---------- The cards ---------- */

interface Feature {
  short: string;
  title: string;
  text: string;
  status: Status;
  icon: ComponentType<{ className?: string }>;
  Demo: ComponentType;
}

const features: Feature[] = [
  {
    short: "Transcripts",
    title: "Every word, timestamped",
    text: "Accurate transcripts you can search, copy, and click to replay any moment.",
    status: "live",
    icon: Captions,
    Demo: TranscriptDemo,
  },
  {
    short: "Your voice",
    title: "Sounds like you",
    text: "Mindra learns from your past posts, and every draft gets a voice-match score before you approve it.",
    status: "next",
    icon: AudioLines,
    Demo: VoiceDemo,
  },
  {
    short: "Clips",
    title: "Clips that stop the scroll",
    text: "Your strongest moments, cut into vertical clips with animated captions and framed on the speaker.",
    status: "soon",
    icon: Clapperboard,
    Demo: ClipsDemo,
  },
  {
    short: "WhatsApp",
    title: "WhatsApp-ready",
    text: "Share packs for Status and Channels, and summaries for people who missed it.",
    status: "soon",
    icon: MessageCircle,
    Demo: WhatsAppDemo,
  },
  {
    short: "Calendar",
    title: "Plan the whole month",
    text: "Drop posts onto a calendar and publish to every channel on schedule.",
    status: "soon",
    icon: CalendarDays,
    Demo: CalendarDemo,
  },
  {
    short: "Insights",
    title: "Gets smarter every week",
    text: "Mindra learns which hooks and formats your audience loves, and does more of what works.",
    status: "soon",
    icon: TrendingUp,
    Demo: InsightsDemo,
  },
];

/** The dark window at the top of an open card: a ribbon of light behind the feature's demo. */
function DemoWindow({ Demo }: { Demo: ComponentType }) {
  return (
    <div className="relative flex h-[230px] items-center justify-center overflow-hidden rounded-2xl bg-[#0B1312] px-5">
      <Ribbon
        position="absolute"
        className="inset-0 opacity-35"
        colors={["#0F766E", "#2DD4BF", "#99F6E4", "#6D5EF5"]}
        strands={30}
        amplitude={0.9}
        periods={1}
        twist={2}
        duration={16}
      />
      <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_50%,rgba(11,19,18,0.7),transparent)]" />
      <div className="relative flex w-full justify-center">
        <Demo />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS[status].className}`}>{STATUS[status].label}</span>;
}

/** Large screens: a row of cards; the one you point at opens wide, the rest show their number. */
function CardRow({ active, setActive }: { active: number; setActive: (index: number) => void }) {
  return (
    <div className="flex h-[540px] gap-3">
      {features.map((feature, i) => {
        const isOpen = i === active;
        const Icon = feature.icon;
        return (
          // `layout` animates the resize with transforms (FLIP) rather than animating the flex size itself.
          <motion.div
            key={feature.short}
            id={`feature-card-${i}`}
            layout
            onMouseEnter={() => setActive(i)}
            transition={{ duration: 0.2, ease: "easeOut" }}
            style={{ flexGrow: isOpen ? 3.6 : 1, flexBasis: 0, borderRadius: 22 }}
            className={cn("relative min-w-0 overflow-hidden bg-white text-left ring-1", isOpen ? "shadow-lg ring-black/5" : "ring-black/[0.06]")}
          >
            <AnimatePresence initial={false} mode="popLayout">
              {isOpen ? (
                <motion.div
                  key="open"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="absolute inset-0 flex min-w-[360px] flex-col p-3"
                >
                  <DemoWindow Demo={feature.Demo} />
                  <div className="flex flex-1 flex-col px-3 pt-5 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="grid size-8 place-items-center rounded-lg bg-[#F4F4F5] ring-1 ring-black/5">
                        <Icon aria-hidden="true" className="size-4 text-[#18181B]" />
                      </span>
                      <StatusPill status={feature.status} />
                    </div>
                    <h3 className="mt-4 text-[1.9rem] leading-[1.08] font-medium text-balance text-[#0B0B0F]">{feature.title}</h3>
                    <p className="mt-auto max-w-sm text-[14.5px] leading-relaxed text-pretty text-[#52525B]">{feature.text}</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="closed"
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.2 } }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="absolute inset-0 flex flex-col p-5"
                >
                  <span className="text-[3.4rem] leading-none font-medium text-[#D4D4D8] tabular-nums">0{i + 1}.</span>
                  <span className="mt-auto grid size-8 place-items-center rounded-lg bg-[#F4F4F5] ring-1 ring-black/5">
                    <Icon aria-hidden="true" className="size-4 text-[#18181B]" />
                  </span>
                  <span className="mt-3 text-[17px] leading-tight font-medium text-[#18181B]">{feature.short}</span>
                </motion.div>
              )}
            </AnimatePresence>
            <button
              type="button"
              onFocus={() => setActive(i)}
              onClick={() => setActive(i)}
              aria-expanded={isOpen}
              aria-controls={`feature-card-${i}`}
              aria-label={feature.title}
              className="absolute inset-0 z-10 rounded-[1.4rem] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6D5EF5]"
            />
          </motion.div>
        );
      })}
    </div>
  );
}

/** Smaller screens: the same cards as an accordion. */
function CardStack({ active, setActive }: { active: number; setActive: (index: number) => void }) {
  return (
    <div className="space-y-3">
      {features.map((feature, i) => {
        const isOpen = i === active;
        const Icon = feature.icon;
        return (
          <div key={feature.short} className="overflow-hidden rounded-[1.4rem] bg-white ring-1 ring-black/[0.06]">
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-expanded={isOpen}
              aria-controls={`feature-panel-${i}`}
              className="flex w-full items-center gap-4 p-4 text-left"
            >
              <span className="w-10 text-2xl font-medium text-[#D4D4D8] tabular-nums">0{i + 1}.</span>
              <span className="grid size-8 place-items-center rounded-lg bg-[#F4F4F5] ring-1 ring-black/5">
                <Icon aria-hidden="true" className="size-4 text-[#18181B]" />
              </span>
              <span className="flex-1 text-[17px] font-medium text-[#18181B]">{isOpen ? feature.title : feature.short}</span>
            </button>
            {/* Opens in place: the panel fades in rather than animating its height. */}
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={`feature-panel-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0 } }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  <div className="px-3 pb-4">
                    <DemoWindow Demo={feature.Demo} />
                    <div className="mt-4 flex items-start justify-between gap-3 px-1">
                      <p className="text-[14.5px] leading-relaxed text-pretty text-[#52525B]">{feature.text}</p>
                      <StatusPill status={feature.status} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

export default function FeatureBento() {
  const [active, setActive] = useState(0);
  const wide = useMediaQuery("(min-width: 1024px)");
  const section = useRef<HTMLElement>(null);
  const onScreen = useInView(section);

  return (
    <section ref={section} id="features" className="relative scroll-mt-16 overflow-hidden bg-[#F5F5F3] px-4 py-24 sm:px-6 lg:py-32">
      {/* Faint grid behind the header */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[linear-gradient(rgba(0,0,0,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.045)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:linear-gradient(to_bottom,black,transparent)]"
      />
      <div className="relative mx-auto max-w-7xl">
        <Reveal className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <SectionLabel icon={Layers}>Features</SectionLabel>
            <h2 className="mt-6 text-[2.6rem] leading-[1.02] font-medium text-balance text-[#0B0B0F] sm:text-6xl lg:text-[4.2rem]">
              One upload.
              <br />
              <span className="text-[#A3A3AB]">A whole content team.</span>
            </h2>
          </div>
          <div className="max-w-sm lg:pb-2">
            <p className="text-[15px] leading-relaxed text-[#52525B]">
              Everything between “we just finished recording” and “it's posted everywhere”, in one place that learns how you speak.
            </p>
            <a
              href="#roadmap"
              className="group mt-5 inline-flex items-center gap-2 rounded-full bg-[#0B0B0F] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#27272A]"
            >
              See what's live
              <ArrowUpRight aria-hidden="true" className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </Reveal>

        <Reveal delay={150} className="mt-14">
          <PlaybackContext.Provider value={onScreen}>
            {wide ? <CardRow active={active} setActive={setActive} /> : <CardStack active={active} setActive={setActive} />}
          </PlaybackContext.Provider>
        </Reveal>
      </div>
    </section>
  );
}
