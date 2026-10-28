import { useId, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { ArrowRight, AudioLines, CloudUpload, PenLine, Route, Send, TrendingUp } from "lucide-react";
import { cn } from "../../lib/cn";
import Ribbon from "./hero/Ribbon";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";
import { useMediaQuery } from "../../lib/useMediaQuery";

// The last step isn't built yet, so it says so.
const steps = [
  {
    icon: CloudUpload,
    title: "Add your content",
    text: "Upload a video, an audio recording, photos or a flyer, paste text, or import a content plan. Start with whatever you already have.",
    soon: false,
  },
  {
    icon: AudioLines,
    title: "Let AI do the heavy lifting",
    text: "Mindra transcribes recordings, finds the moments worth sharing and turns your material into captions, posts and short videos.",
    soon: false,
  },
  {
    icon: PenLine,
    title: "Make it sound like you",
    text: "Review what Mindra wrote, adjust the tone, edit captions and keep every post in your brand voice.",
    soon: false,
  },
  {
    icon: Send,
    title: "Plan and publish",
    text: "Put posts on your content calendar and schedule them to publish through supported platforms. Where that isn't available yet, Mindra reminds you and you share in one tap.",
    soon: false,
  },
  {
    icon: TrendingUp,
    title: "Improve your strategy",
    text: "See how each post performs and get AI recommendations for what to publish next.",
    soon: true,
  },
];

const STEP_SECONDS = 5;
const RING = 2 * Math.PI * 23;

/** The step's icon in a white circle; on the active step a ring fills up, then the next step takes over. */
function StepIcon({
  index,
  active,
  running,
  onDone,
}: {
  index: number;
  active: boolean;
  running: boolean;
  onDone: () => void;
}) {
  const Icon = steps[index].icon;
  return (
    <span className="relative grid size-12 place-items-center">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-full bg-white shadow-sm ring-1 transition-colors duration-200",
          active ? "ring-[#6D5EF5]/30" : "ring-black/5",
        )}
      >
        <Icon aria-hidden="true" className={cn("size-[18px] transition-colors duration-200", active ? "text-[#6D5EF5]" : "text-[#71717A]")} />
      </span>
      {active && (
        <svg viewBox="0 0 50 50" className="absolute inset-0 -rotate-90" aria-hidden="true">
          <motion.circle
            key={`${index}-${running}`}
            cx="25"
            cy="25"
            r="23"
            fill="none"
            stroke="#6D5EF5"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING}
            initial={{ strokeDashoffset: running ? RING : 0 }}
            animate={{ strokeDashoffset: 0 }}
            transition={running ? { duration: STEP_SECONDS, ease: "linear" } : { duration: 0 }}
            onAnimationComplete={() => running && onDone()}
          />
        </svg>
      )}
    </span>
  );
}

/** The dashed half-circle under each step, filled with light on the active one. */
function Arc({ active }: { active: boolean }) {
  const fillId = `arc-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  return (
    <div className="relative aspect-[2/1] w-full">
      <svg viewBox="0 0 200 100" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6D5EF5" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6D5EF5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d="M 0 100 A 100 100 0 0 1 200 100 Z"
          fill={`url(#${fillId})`}
          initial={false}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
        <path
          d="M 0 100 A 100 100 0 0 1 200 100"
          fill="none"
          stroke={active ? "#6D5EF5" : "#A1A1AA"}
          strokeWidth="1.25"
          strokeDasharray="3 4"
          vectorEffect="non-scaling-stroke"
          className="transition-[stroke] duration-200"
        />
      </svg>
      <span className={`absolute -bottom-[3px] -left-[3px] h-1.5 w-1.5 rounded-full ${active ? "bg-[#6D5EF5]" : "bg-[#A1A1AA]"}`} />
      <span className={`absolute -bottom-[3px] -right-[3px] h-1.5 w-1.5 rounded-full ${active ? "bg-[#6D5EF5]" : "bg-[#A1A1AA]"}`} />
    </div>
  );
}

export default function HowItWorks() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const stepsRef = useRef<HTMLDivElement>(null);
  const inView = useInView(stepsRef, { amount: 0.35 });
  const running = auto && inView && !reduce;
  const wide = useMediaQuery("(min-width: 1024px)");

  const choose = (index: number) => {
    setActive(index);
    setAuto(false);
  };
  const next = () => setActive((current) => (current + 1) % steps.length);

  return (
    <section id="how" className="scroll-mt-16 bg-[#EDEDED] px-4 py-20 sm:px-6 lg:py-28">
      <div className="mx-auto max-w-7xl border border-black/10 px-6 pb-10 pt-14 sm:px-10 lg:px-14 lg:pb-14 lg:pt-20">
        <Reveal>
          <SectionLabel icon={Route}>How it works</SectionLabel>
          <h2 className="mt-7 text-[2.5rem] leading-[1.04] font-medium text-balance text-[#0B0B0F] sm:text-6xl lg:text-7xl">
            From what you have
            <br />
            to{" "}
            <span className="relative inline-block h-[0.78em] w-[2.1em] translate-y-[0.06em] overflow-hidden rounded-[0.16em] bg-[#0B0B10] align-baseline">
              <Ribbon
                position="absolute"
                className="inset-0"
                colors={["#6D5EF5", "#3B82F6", "#3ECFCE", "#A78BFA"]}
                strands={12}
                amplitude={0.7}
                periods={1}
                twist={1.6}
                duration={7}
              />
            </span>{" "}
            <span className="text-[#A3A3AB]">everywhere.</span>
          </h2>
          <p className="mt-6 text-lg text-pretty text-[#3F3F46]">Mindra does most of the work. The last step is on the way.</p>
        </Reveal>

        <div ref={stepsRef} className="mt-16 grid sm:grid-cols-2 lg:mt-24 lg:grid-cols-5">
          {steps.map((step, i) => {
            const isActive = i === active;
            return (
              <div key={step.title} className="flex flex-col border-l border-black/15 pb-10 lg:pb-0">
                <button
                  type="button"
                  onClick={() => choose(i)}
                  aria-pressed={isActive}
                  className="group flex items-center gap-3 px-4 text-left lg:pr-2"
                >
                  {!wide && <StepIcon index={i} active={isActive} running={running} onDone={next} />}
                  <span className={cn("text-[15px] transition-colors duration-200", isActive ? "text-[#0B0B0F]" : "text-[#71717A]")}>
                    0{i + 1}.{" "}
                    <span
                      className={cn(
                        "underline-offset-[5px] transition-colors duration-200",
                        isActive ? "underline decoration-[#0B0B0F] decoration-1" : "group-hover:text-[#0B0B0F]",
                      )}
                    >
                      {step.title}
                    </span>
                  </span>
                  <AnimatePresence>
                    {isActive && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.4 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.4 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="hidden size-7 shrink-0 place-items-center rounded-full bg-[#6D5EF5] text-white lg:grid"
                      >
                        <ArrowRight aria-hidden="true" className="size-3.5" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>

                <motion.p
                  animate={{ opacity: isActive ? 1 : 0.45 }}
                  transition={{ duration: 0.5 }}
                  className="mt-4 px-4 text-[15px] leading-relaxed text-[#3F3F46] lg:min-h-[176px] lg:pr-6"
                >
                  {step.soon && (
                    <span className="mb-2 block w-fit rounded-full bg-black/[0.07] px-2 py-0.5 text-[11px] font-semibold text-[#3F3F46]">Coming soon</span>
                  )}
                  {step.text}
                </motion.p>

                {wide && (
                  <div className="relative mt-10">
                    <Arc active={isActive} />
                    <span className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
                      <StepIcon index={i} active={isActive} running={running} onDone={next} />
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

