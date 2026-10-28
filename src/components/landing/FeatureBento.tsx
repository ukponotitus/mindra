import { useCallback, useRef, useState, type ComponentType } from "react";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  ArrowUpRight,
  AudioLines,
  CalendarDays,
  Check,
  ClipboardList,
  Clapperboard,
  Heart,
  Layers,
  Library,
  MessageCircle,
  PenLine,
  Send,
  Sparkles,
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
  soon: { label: "Coming soon", className: "bg-[#F4F4F5] text-[#71717A]" },
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

const sources = [
  { kind: "Video", platform: "Instagram", color: "#E1306C", post: "Fear is loud. Faith is louder. The full message is on our page." },
  { kind: "Audio", platform: "LinkedIn", color: "#0A66C2", post: "Three lessons from this week's episode on building in public." },
  { kind: "Text", platform: "X", color: "#E5E7EB", post: "Most plans fail on day three. Here's how to get past it:" },
  { kind: "Photos", platform: "Facebook", color: "#1877F2", post: "What a night! Thank you to everyone who came out on Friday." },
  { kind: "Flyer", platform: "WhatsApp", color: "#25D366", post: "*Youth Conference 2026* Saturday 14 November, 10am. Bring a friend." },
];

function SourcesDemo() {
  const active = useTicker(sources.length, 1800);
  const source = sources[active];
  return (
    <div className="flex w-full max-w-[420px] items-center gap-4">
      <div className="flex shrink-0 flex-col gap-1.5">
        {sources.map((item, i) => (
          <span
            key={item.kind}
            className={cn(
              "rounded-full px-3 py-1 text-[11px] font-medium transition-colors duration-200",
              i === active ? "bg-white text-[#0B0B0F]" : "bg-white/[0.06] text-white/50",
            )}
          >
            {item.kind}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] p-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={source.kind} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease: "easeOut" }}>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/70">
              <span className="size-2 rounded-full" style={{ background: source.color }} />
              {source.platform}
            </p>
            <p className="mt-1.5 text-[12.5px] leading-snug text-white/85">{source.post}</p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function VoiceDemo() {
  return (
    <div className="flex w-full max-w-[420px] items-center gap-5">
      <dl className="shrink-0 space-y-2.5 text-xs">
        {[
          ["Tone", "Warm and hopeful"],
          ["Words you use", "“family”, “grace”"],
          ["Words you avoid", "“synergy”"],
        ].map(([term, detail]) => (
          <div key={term}>
            <dt className="text-white/40">{term}</dt>
            <dd className="font-medium text-white/85">{detail}</dd>
          </div>
        ))}
      </dl>
      <div className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.05] p-3">
        <p className="text-[11px] font-semibold text-white/50">Draft</p>
        <p className="mt-1.5 text-[12.5px] leading-snug text-white/85">
          Welcome to the <span className="rounded bg-[#8B7CFF]/30 px-0.5">family</span>. Whatever this week brings, there is{" "}
          <span className="rounded bg-[#8B7CFF]/30 px-0.5">grace</span> for it.
        </p>
      </div>
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
        {["Found for you", "Vertical 9:16", "Nothing cut off", "Captions as they speak"].map((label, i) => (
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

const planLines = ["Mon 9am · Instagram · quote from Sunday", "Wed 6pm · WhatsApp · midweek reminder", "Fri 12pm · TikTok · best clip", "Sat 10am · Facebook · event flyer"];

function PlanDemo() {
  const written = useTicker(planLines.length + 2, 900);
  return (
    <div className="w-full max-w-[400px] space-y-1.5">
      {planLines.map((line, i) => (
        <div key={line} className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/75">{line}</span>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors duration-200",
              i < written ? "bg-[#34D399]/15 text-[#6EE7B7]" : "bg-white/[0.06] text-white/40",
            )}
          >
            {i < written ? "Written" : "Waiting"}
          </span>
        </div>
      ))}
    </div>
  );
}

const libraryRows = [
  { title: "Fear is loud. Faith is louder.", platform: "#E1306C", status: "Published", tone: "bg-[#34D399]/15 text-[#6EE7B7]" },
  { title: "Youth Conference: 3 days to go", platform: "#25D366", status: "Planned", tone: "bg-[#8B7CFF]/20 text-[#C4BBFF]" },
  { title: "Three lessons from episode 42", platform: "#0A66C2", status: "Posted", tone: "bg-[#34D399]/15 text-[#6EE7B7]" },
  { title: "Small steps change everything", platform: "#25F4EE", status: "Reminded", tone: "bg-[#FBBF24]/15 text-[#FCD34D]" },
];

function LibraryDemo() {
  return (
    <div className="w-full max-w-[400px] space-y-1.5">
      {libraryRows.map((row, i) => (
        <motion.div
          key={row.title}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 + i * 0.06, duration: 0.25, ease: "easeOut" }}
          className="flex items-center gap-3 rounded-lg bg-white/[0.04] px-3 py-2"
        >
          <span className="size-2 shrink-0 rounded-full" style={{ background: row.platform }} />
          <span className="min-w-0 flex-1 truncate text-[12px] text-white/80">{row.title}</span>
          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", row.tone)}>{row.status}</span>
        </motion.div>
      ))}
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

/* ---------- The cards ---------- */

interface Feature {
  short: string;
  title: string;
  text: string;
  status: Status;
  icon: ComponentType<{ className?: string }>;
  Demo: ComponentType;
}

// What works today, each with a demo. What's still to come is listed below the cards, without one.
const features: Feature[] = [
  {
    short: "Content creation",
    title: "Posts from anything you have",
    text: "Platform-specific captions and posts for 11 platforms, written from your videos, audio, text, photos and flyers.",
    status: "live",
    icon: PenLine,
    Demo: SourcesDemo,
  },
  {
    short: "Video",
    title: "Clips that stop the scroll",
    text: "Mindra finds the strongest moments in a long recording and turns them into short vertical videos with captions. Landscape videos can be made 9:16 too.",
    status: "live",
    icon: Clapperboard,
    Demo: ClipsDemo,
  },
  {
    short: "Brand voice",
    title: "Sounds like you",
    text: "Give Mindra your tone, sample posts and the words you use and avoid, and every draft follows them. A voice-match score is on the way.",
    status: "live",
    icon: AudioLines,
    Demo: VoiceDemo,
  },
  {
    short: "Content plans",
    title: "Your plan, written for you",
    text: "Import your weekly or monthly plan (pasted, a spreadsheet or a photo of it) and Mindra turns each line into a draft ready for review.",
    status: "live",
    icon: ClipboardList,
    Demo: PlanDemo,
  },
  {
    short: "Library",
    title: "Everything in one place",
    text: "Every post and clip you make stays in one workspace, with what's planned, posted and published at a glance.",
    status: "live",
    icon: Library,
    Demo: LibraryDemo,
  },
  {
    short: "Publishing",
    title: "Plan the month, post on time",
    text: "Schedule posts on a calendar and publish automatically to YouTube and LinkedIn, with more platforms on the way. Everything else gets a reminder and one-tap sharing.",
    status: "live",
    icon: CalendarDays,
    Demo: CalendarDemo,
  },
];

const upcoming: { title: string; text: string; status: Status; icon: ComponentType<{ className?: string }> }[] = [
  {
    title: "Post results",
    text: "Views, likes and comments for your YouTube posts, clicks on Mindra links in any post, and which days and times work best. Facebook, Instagram and X follow once Mindra can post there.",
    status: "live",
    icon: TrendingUp,
  },
  {
    title: "AI recommendations and automation",
    text: "Suggestions for what to post next, based on what performed well, and smarter content workflows.",
    status: "soon",
    icon: Sparkles,
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
              Everything you need
              <br />
              <span className="text-[#A3A3AB]">to create and publish.</span>
            </h2>
          </div>
          <div className="max-w-sm lg:pb-2">
            <p className="text-[15px] leading-relaxed text-[#52525B]">
              Everything between “we have something to share” and “it's posted everywhere”, in one workspace that learns how you sound.
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

        <Reveal delay={200} className="mt-3 grid gap-3 sm:grid-cols-2">
          {upcoming.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="flex gap-4 rounded-[1.4rem] bg-white/60 p-5 ring-1 ring-black/[0.06]">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#F4F4F5] ring-1 ring-black/5">
                  <Icon aria-hidden="true" className="size-4 text-[#71717A]" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <h3 className="text-[17px] font-medium text-[#18181B]">{item.title}</h3>
                    <StatusPill status={item.status} />
                  </div>
                  <p className="mt-1.5 text-[14.5px] leading-relaxed text-pretty text-[#52525B]">{item.text}</p>
                </div>
              </div>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}
