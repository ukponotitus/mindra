import { useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Church,
  Clapperboard,
  FileText,
  GraduationCap,
  Layers,
  ListChecks,
  Mail,
  Megaphone,
  MessageCircle,
  Mic,
  Newspaper,
  Play,
  Quote,
  Users,
} from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../lib/cn";
import Ribbon from "./hero/Ribbon";
import Reveal from "./Reveal";
import { useCtaLinks } from "./useCtaLinks";

const audiences = [
  {
    id: "churches",
    label: "Churches & ministries",
    icon: Church,
    source: "Sunday sermon",
    length: "48 min",
    noun: "sermon",
    headline: "Keep Sunday's message going all week.",
    text: "Members who missed the service catch up on WhatsApp, the whole church shares clips from the message, and your media team gets its weekends back.",
    outputs: [
      { icon: Clapperboard, label: "Captioned clips" },
      { icon: BookOpen, label: "Daily devotionals" },
      { icon: MessageCircle, label: "WhatsApp summary" },
      { icon: Users, label: "Small-group guide" },
      { icon: Quote, label: "Scripture quote cards" },
      { icon: Megaphone, label: "Facebook & Instagram posts" },
    ],
    // Left panel, right backdrop and the ribbon that runs through it.
    panel: "#1C1B20",
    accent: "#E8C27A",
    backdrop: "radial-gradient(120% 90% at 70% 20%,#F4F2EC 0%,#E9E6DD 55%,#DCD8CC 100%)",
    ribbon: ["#121318", "#4A5162", "#C9CDD8", "#2A2E38"],
  },
  {
    id: "podcasters",
    label: "Podcasters",
    icon: Mic,
    source: "Episode 42",
    length: "63 min",
    noun: "episode",
    headline: "Every episode becomes a week of promotion.",
    text: "Promote each episode on every platform without hiring an editor, and turn casual listeners into subscribers.",
    outputs: [
      { icon: AudioLines, label: "Audiogram clips" },
      { icon: FileText, label: "Show notes with timestamps" },
      { icon: Mail, label: "Newsletter recap" },
      { icon: Megaphone, label: "LinkedIn & X posts" },
      { icon: Quote, label: "Guest quote cards" },
      { icon: Newspaper, label: "Blog post" },
    ],
    panel: "#16132A",
    accent: "#F0ABFC",
    backdrop: "radial-gradient(90% 80% at 30% 85%,#FF8A65 0%,transparent 55%),radial-gradient(90% 90% at 80% 30%,#C4B5FD 0%,transparent 60%),linear-gradient(160deg,#B9A7E8,#E7A7D8 55%,#9FB2EE)",
    ribbon: ["#FFFFFF", "#F5D0FE", "#FDBA74", "#C4B5FD"],
  },
  {
    id: "coaches",
    label: "Coaches & educators",
    icon: GraduationCap,
    source: "Live masterclass",
    length: "72 min",
    noun: "class",
    headline: "Turn every class into your next clients.",
    text: "Teach once, then let the best moments find new students all week across social media, email and your blog.",
    outputs: [
      { icon: Clapperboard, label: "Teaching clips" },
      { icon: Layers, label: "Carousel of key lessons" },
      { icon: Mail, label: "Email sequence" },
      { icon: Newspaper, label: "Blog article" },
      { icon: ListChecks, label: "Lead-magnet checklist" },
      { icon: Users, label: "Community post" },
    ],
    panel: "#0F1C19",
    accent: "#5EEAD4",
    backdrop: "radial-gradient(110% 90% at 60% 20%,#EAF6F2 0%,#D3ECE5 55%,#B9DDD3 100%)",
    ribbon: ["#0F766E", "#2DD4BF", "#99F6E4", "#115E59"],
  },
];

const ROTATE_SECONDS = 7;

export default function AudienceTabs() {
  const { startTo } = useCtaLinks();
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { amount: 0.4 });
  const running = auto && inView && !reduce;

  const audience = audiences[active];
  const choose = (index: number) => {
    setActive(index);
    setAuto(false);
  };

  return (
    <section className="bg-[#EDEDED] px-4 pb-24 sm:px-6 lg:pb-32">
      <Reveal className="mx-auto max-w-7xl">
        <div ref={cardRef} className="grid overflow-hidden rounded-[2rem] shadow-2xl lg:min-h-[640px] lg:grid-cols-2">
          {/* Left: the message, on a dark panel that changes tone with the audience */}
          <div className="relative flex flex-col overflow-hidden px-7 py-10 text-white transition-colors duration-200 sm:px-12 sm:py-14" style={{ background: audience.panel }}>
            <div className="relative flex flex-1 flex-col justify-center lg:pt-10">
              <p className="text-[13px] font-medium" style={{ color: audience.accent }}>
                Built for people who speak every week
              </p>
              <div className="relative mt-6 min-h-[250px] sm:min-h-[220px]">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={audience.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <h2 className="text-4xl leading-[1.06] font-medium text-balance sm:text-5xl">{audience.headline}</h2>
                    <p className="mt-5 max-w-md text-[15px] leading-relaxed text-pretty text-white/65">{audience.text}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a href="#pricing" className="rounded-full px-6 py-3 text-sm font-medium text-white ring-1 ring-white/25 transition-colors hover:bg-white/10">
                  See pricing
                </a>
                <Link
                  to={startTo}
                  className="group inline-flex items-center gap-3 rounded-full bg-[#F4F1E8] py-1.5 pr-1.5 pl-6 text-sm font-semibold text-[#111114] transition-colors hover:bg-white"
                >
                  Try it with your next {audience.noun}
                  <span className="grid size-9 place-items-center rounded-full bg-[#111114] text-[#F4F1E8]">
                    <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </div>
            </div>

            {/* Audience switcher, where a logo row would sit. Plain toggle buttons: Tab and Enter are all it needs. */}
            <div role="group" aria-label="Who Mindra is for" className="relative mt-12 flex flex-wrap gap-x-6 gap-y-1 lg:mt-16">
              {audiences.map((item, i) => {
                const Icon = item.icon;
                const selected = i === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => choose(i)}
                    className={cn(
                      "flex min-h-10 items-center gap-2 text-sm font-medium transition-colors",
                      selected ? "text-white" : "text-white/45 hover:text-white/75",
                    )}
                  >
                    <Icon aria-hidden="true" className="size-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: a themed backdrop, a ribbon of sound and a frosted card of what the recording becomes */}
          <div className="relative min-h-[520px] overflow-hidden">
            <AnimatePresence initial={false}>
              <motion.div
                key={audience.id}
                aria-hidden="true"
                className="absolute inset-0"
                style={{ background: audience.backdrop }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Ribbon
                  position="absolute"
                  className="-inset-x-[15%] top-[18%] h-[64%] -rotate-[10deg] [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]"
                  colors={audience.ribbon}
                  strands={44}
                  amplitude={0.95}
                  periods={1}
                  twist={2.2}
                  duration={14}
                  strokeWidth={1.6}
                />
              </motion.div>
            </AnimatePresence>

            <div className="relative flex h-full min-h-[520px] items-center justify-center px-6 py-14">
              <div className="relative w-full max-w-[330px]">
                {/* Two cards stacked behind, for depth */}
                <div aria-hidden="true" className="absolute inset-0 translate-x-4 translate-y-4 rotate-[3deg] rounded-[1.6rem] bg-[#15151A]/30 ring-1 ring-white/10 backdrop-blur-md" />
                <div aria-hidden="true" className="absolute inset-0 translate-x-2 translate-y-2 rotate-[1.5deg] rounded-[1.6rem] bg-[#15151A]/45 ring-1 ring-white/10 backdrop-blur-md" />
                <div className="relative rounded-[1.6rem] bg-[#15151A]/85 p-6 text-white shadow-2xl ring-1 ring-white/15 backdrop-blur-xl">
                  <span className="grid size-11 place-items-center rounded-xl bg-white/[0.06] ring-1 ring-white/15">
                    <Play aria-hidden="true" className="size-4 translate-x-px fill-white text-white" />
                  </span>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={audience.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <p className="mt-5 text-xs font-medium text-white/55 tabular-nums">
                        {audience.source} · {audience.length}
                      </p>
                      <p className="mt-1.5 text-[1.35rem] leading-snug font-medium text-balance">Becomes a week of content</p>
                      <ul className="mt-4 space-y-2.5">
                        {audience.outputs.map((output, i) => {
                          const Icon = output.icon;
                          return (
                            <motion.li
                              key={output.label}
                              initial={{ opacity: 0, x: -6 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.1 + i * 0.04, duration: 0.25, ease: "easeOut" }}
                              className="flex items-center gap-3 text-[13.5px] text-white/80"
                            >
                              <Icon aria-hidden="true" className="size-4 shrink-0" style={{ color: audience.accent }} />
                              {output.label}
                            </motion.li>
                          );
                        })}
                      </ul>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Pagination: the active track fills while it waits to move on. Each dot has a 24px-tall tap area. */}
            <div className="absolute inset-x-0 bottom-4 flex justify-center gap-1">
              {audiences.map((item, i) => (
                <button key={item.id} type="button" onClick={() => choose(i)} aria-label={`Show ${item.label}`} aria-pressed={i === active} className="group grid h-6 w-8 place-items-center">
                  <span className={cn("relative h-1.5 w-6 overflow-hidden rounded-full transition-colors", i === active ? "bg-black/20" : "bg-black/15 group-hover:bg-black/30")}>
                    {i === active && (
                      <motion.span
                        key={`${active}-${running}`}
                        className="absolute inset-0 origin-left rounded-full bg-black/70"
                        initial={{ scaleX: running ? 0 : 1 }}
                        animate={{ scaleX: 1 }}
                        transition={running ? { duration: ROTATE_SECONDS, ease: "linear" } : { duration: 0 }}
                        onAnimationComplete={() => running && setActive((current) => (current + 1) % audiences.length)}
                      />
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
