import { useRef, type PointerEvent, type ReactNode } from "react";
import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Captions, ChevronRight, PenLine, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import Phone from "./hero/Phone";
import PostsScreen from "./hero/PostsScreen";
import RecordScreen from "./hero/RecordScreen";
import TranscriptScreen from "./hero/TranscriptScreen";
import { PlaybackContext } from "./playback";
import { useCtaLinks } from "./useCtaLinks";

/** Props for the staggered entrance: each piece of text rises in a little after the one before. */
const enter = (step: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: 0.1 + step * 0.1, duration: 0.7, ease: "easeOut" as const },
});

/** One scroll-linked transform: from where it starts to where it ends while the hero scrolls away. */
function useScrollTransform(progress: MotionValue<number>, from: string, to: string) {
  // A single useTransform to a full `transform` string lets Framer run it on the browser's scroll timeline.
  return useTransform(progress, [0, 0.42], [from, to]);
}

/** A frosted card that floats over the phones and says what each screen is doing. */
function GlassCard({ icon: Icon, label, title, children }: { icon: LucideIcon; label: string; title: string; children?: ReactNode }) {
  return (
    <div className="w-[236px] animate-float rounded-2xl bg-[#121218]/70 p-4 shadow-xl ring-1 ring-white/15 backdrop-blur-xl">
      <span className="grid size-9 place-items-center rounded-xl bg-white/[0.08] ring-1 ring-white/15">
        <Icon aria-hidden="true" className="size-[18px] text-[#C9C1FF]" />
      </span>
      <p className="mt-3 text-xs font-medium text-white/50">{label}</p>
      <p className="mt-1 text-[15px] leading-snug font-medium text-pretty text-white">{title}</p>
      {children}
    </div>
  );
}

interface StageProps {
  progress: MotionValue<number>;
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
}

/** The three phones: rising out of a glowing horizon, curved around the viewer, opening flat as the page scrolls. */
function Stage({ progress, pointerX, pointerY }: StageProps) {
  const reduce = useReducedMotion();
  const leftPhone = useScrollTransform(progress, "perspective(1600px) translateX(0px) rotateY(24deg)", "perspective(1600px) translateX(-50px) rotateY(0deg)");
  const rightPhone = useScrollTransform(progress, "perspective(1600px) translateX(0px) rotateY(-24deg)", "perspective(1600px) translateX(50px) rotateY(0deg)");
  const lift = useScrollTransform(progress, "translateY(0px)", "translateY(-40px)");
  const leftCard = useScrollTransform(progress, "translate(0px, 0px)", "translate(-50px, -120px)");
  const rightCard = useScrollTransform(progress, "translate(0px, 0px)", "translate(50px, -120px)");
  // The pointer tilt is driven by the pointer itself, so it stays in JavaScript.
  const tiltY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-5, 5]), { stiffness: 70, damping: 20 });
  const tiltX = useSpring(useTransform(pointerY, [-0.5, 0.5], [4, -4]), { stiffness: 70, damping: 20 });

  return (
    // --offset: how far each side phone sits from the centre. On phones they only peek out from behind.
    // The stage is an illustration, so screen readers skip its mock screens.
    <div aria-hidden="true" className="relative mt-16 h-[540px] [--offset:50vw] sm:h-[640px] md:[--offset:clamp(250px,23vw,340px)]">
      {/* The horizon: the rim of a dark planet, lit from behind, fading out towards the edges. */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 bottom-0 [mask-image:radial-gradient(ellipse_62%_75%_at_50%_42%,black_40%,transparent_78%)]"
        initial={{ opacity: 0, scaleX: 0.7 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ delay: 0.4, duration: 1.2, ease: "easeOut" }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(36%_48%_at_50%_44%,rgba(124,108,255,0.3),transparent_70%)]" />
        <div
          className="absolute top-[44%] left-1/2 aspect-square w-[260vw] max-w-[2600px] -translate-x-1/2 animate-breathe rounded-full bg-black sm:w-[170vw]"
          style={{
            boxShadow: "0 -1px 0 0 rgba(226,221,255,0.95), 0 -14px 50px -8px rgba(139,124,255,0.85), 0 -60px 160px -20px rgba(91,141,255,0.4)",
          }}
        />
      </motion.div>

      <motion.div className="absolute inset-0" style={reduce ? undefined : { rotateX: tiltX, rotateY: tiltY, transformPerspective: 2400 }}>
        <motion.div className="absolute inset-0" style={reduce ? undefined : { transform: lift }}>
          {/* Transcript, on the left */}
          <div className="absolute top-[88px] left-1/2 z-10 ml-[calc(-131px-var(--offset))] scale-80 md:scale-100">
            <motion.div style={reduce ? undefined : { transform: leftPhone }}>
              <motion.div
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 1.1, ease: "easeOut" }}
                className="relative"
              >
                <Phone className="h-[540px] w-[262px]">
                  <TranscriptScreen />
                </Phone>
                <div className="pointer-events-none absolute inset-0 rounded-[3.1rem] bg-black/35" />
              </motion.div>
            </motion.div>
          </div>

          {/* Posts, on the right */}
          <div className="absolute top-[88px] left-1/2 z-10 ml-[calc(-131px+var(--offset))] scale-80 md:scale-100">
            <motion.div style={reduce ? undefined : { transform: rightPhone }}>
              <motion.div
                initial={{ opacity: 0, y: 120 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 1.1, ease: "easeOut" }}
                className="relative"
              >
                <Phone className="h-[540px] w-[262px]">
                  <PostsScreen />
                </Phone>
                <div className="pointer-events-none absolute inset-0 rounded-[3.1rem] bg-black/35" />
              </motion.div>
            </motion.div>
          </div>

          {/* Recording, in the middle */}
          <div className="absolute top-0 left-1/2 z-20 -ml-[136px] sm:-ml-[155px]">
            <motion.div
              initial={{ opacity: 0, y: 140 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 1.2, ease: "easeOut" }}
            >
              <Phone className="h-[560px] w-[272px] sm:h-[640px] sm:w-[310px]">
                <RecordScreen />
              </Phone>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      {/* Frosted notes over the side phones, drifting a little faster than the phones on scroll.
          No filter animations around them: a filter on an ancestor would stop the frosted glass blurring the phones. */}
      <div className="absolute top-[300px] left-1/2 z-30 ml-[calc(-262px-var(--offset))] hidden min-[1180px]:block">
        <motion.div style={reduce ? undefined : { transform: leftCard }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.6, duration: 0.6, ease: "easeOut" }}>
            <GlassCard icon={Captions} label="Transcribed in 3 minutes" title="A 52-minute sermon, every word timestamped." />
          </motion.div>
        </motion.div>
      </div>
      <div className="absolute top-[150px] left-1/2 z-30 ml-[calc(-40px+var(--offset))] hidden min-[1180px]:block">
        <motion.div style={reduce ? undefined : { transform: rightCard }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.8, duration: 0.6, ease: "easeOut" }}>
            <GlassCard icon={PenLine} label="In your voice" title="18 posts for 6 platforms, ready to review.">
              <div className="mt-3 flex items-center gap-1.5">
                {["#E1306C", "#25F4EE", "#FF0033", "#1877F2", "#25D366", "#0A66C2"].map((color) => (
                  <span key={color} className="size-2 rounded-full" style={{ background: color }} />
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      </div>

      {/* The phones dissolve into the page below */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 z-40 h-28 bg-gradient-to-t from-black via-black/85 to-transparent sm:h-44" />
    </div>
  );
}

export default function Hero() {
  const { signedIn, startTo } = useCtaLinks();
  const section = useRef<HTMLElement>(null);
  const onScreen = useInView(section);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  const track = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    pointerX.set((event.clientX - box.left) / box.width - 0.5);
    pointerY.set((event.clientY - box.top) / box.height - 0.5);
  };

  return (
    <section
      ref={section}
      onPointerMove={track}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
      className="relative overflow-hidden bg-black text-white"
    >
      <div className="relative mx-auto max-w-5xl px-6 pt-32 text-center sm:pt-36">
        <motion.a
          {...enter(0)}
          href="#roadmap"
          className="group inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/[0.06] py-1.5 pr-3 pl-4 text-[13px] font-medium text-white/80 transition-colors hover:bg-white/10"
        >
          Now in private beta
          <ChevronRight aria-hidden="true" className="size-3.5 text-white/50 transition-transform group-hover:translate-x-0.5" />
        </motion.a>

        <h1 className="mt-7 text-[3.2rem] leading-[1.02] font-semibold text-balance sm:text-7xl lg:text-[6.1rem]">
          <motion.span {...enter(1)} className="block">
            Record once.
          </motion.span>
          <motion.span {...enter(2)} className="block text-white/50">
            Post all month.
          </motion.span>
        </h1>

        <motion.p {...enter(3)} className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-pretty text-white/60 sm:text-[21px]">
          Turn every sermon, podcast and class into clips, captions and posts for every platform. Written in your voice.
        </motion.p>

        <motion.div {...enter(4)} className="mt-9 flex flex-col items-center justify-center gap-5 sm:flex-row sm:gap-9">
          <Link to={startTo} className="rounded-full bg-white px-8 py-3.5 text-[15px] font-semibold text-black transition-colors hover:bg-white/85">
            {signedIn ? "Open your workspace" : "Start free"}
          </Link>
          <a href="#how" className="group inline-flex items-center gap-1 text-[15px] font-medium text-[#B4A9FF] transition-colors hover:text-white">
            See how it works
            <ChevronRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
          </a>
        </motion.div>
        <motion.p {...enter(5)} className="mt-5 text-xs text-white/40">
          Free during the beta · No credit card
        </motion.p>
      </div>

      {/* The demo screens only tick while the hero is on screen. */}
      <PlaybackContext.Provider value={onScreen}>
        <Stage progress={scrollYProgress} pointerX={pointerX} pointerY={pointerY} />
      </PlaybackContext.Provider>
    </section>
  );
}
