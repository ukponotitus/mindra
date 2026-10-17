import { useEffect, useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Ribbon from "./hero/Ribbon";

// The canvas is this much wider than the eclipse, so the corona has room to reach out.
const CANVAS_SCALE = 1.44;
// The bright disc's radius, as a share of the eclipse's width.
const SUN = 0.34;

/**
 * Draws the corona as a halftone: dots on a grid, full size against the bright disc and shrinking
 * as they reach out, with a few uneven lobes so it looks like light rather than a ring.
 */
function drawCorona(canvas: HTMLCanvasElement) {
  const size = canvas.clientWidth;
  if (!size) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = size * ratio;
  canvas.height = size * ratio;
  const context = canvas.getContext("2d");
  if (!context) return;
  context.scale(ratio, ratio);
  context.clearRect(0, 0, size, size);
  context.fillStyle = "#FFFFFF";

  const centre = size / 2;
  const sun = SUN * (size / CANVAS_SCALE);
  const step = Math.max(6, size / 92);
  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      const distance = Math.hypot(x - centre, y - centre);
      if (distance < sun * 0.97) continue;
      const angle = Math.atan2(y - centre, x - centre);
      const reach =
        sun *
        (0.3 +
          0.4 * Math.pow(Math.max(0, Math.sin(2 * angle + 0.9)), 3) +
          0.24 * Math.pow(Math.max(0, Math.sin(3 * angle - 0.4)), 2) +
          0.05 * Math.sin(9 * angle));
      const strength = 1 - (distance - sun) / reach;
      if (strength <= 0) continue;
      const radius = (step / 2) * Math.min(1, Math.pow(strength, 0.7)) * 0.96;
      if (radius < 0.35) continue;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
  }
}

/** A total eclipse that completes as it scrolls into view: the moon slides over a bright disc and the corona flares. */
export default function Eclipse() {
  const ref = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();

  // From the eclipse's top entering the screen until all of it is showing: a range the browser's view timeline can
  // run, so each value below is a single useTransform that Framer can hand to it.
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end end"] });
  const moon = useTransform(scrollYProgress, [0, 0.9], ["translate(-36%, 12%)", "translate(0%, 0%)"]);
  const coronaOpacity = useTransform(scrollYProgress, [0.35, 0.9], [0.1, 1]);
  const coronaScale = useTransform(scrollYProgress, [0, 0.9], ["scale(0.85)", "scale(1)"]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    drawCorona(element);
    const observer = new ResizeObserver(() => drawCorona(element));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} aria-hidden="true" className="relative mx-auto aspect-square w-[min(600px,84vw)]">
      <motion.div className="absolute -inset-[22%]" style={reduce ? undefined : { opacity: coronaOpacity, transform: coronaScale }}>
        {/* A slow CSS turn, paused with the rest of the page's loops when off-screen. */}
        <canvas ref={canvas} className="size-full animate-spin-slower" />
      </motion.div>

      {/* The bright disc and its glow. The glow is a gradient, not a box-shadow: shadows this large render in visible tiles. */}
      <div className="absolute -inset-[6%] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.95)_38%,rgba(236,232,255,0.55)_47%,rgba(226,220,255,0.18)_58%,transparent_70%)]" />
      <div className="absolute inset-[16%] rounded-full bg-white shadow-[0_0_36px_8px_rgba(255,255,255,0.8)]" />

      {/* The moon, with a dusk landscape inside and a ribbon of sound across its sky */}
      <motion.div
        className="absolute inset-[21%] overflow-hidden rounded-full bg-[linear-gradient(180deg,#6F6AAE_0%,#A99BCB_36%,#E3B5C8_54%,#2A2D57_55%,#141633_100%)]"
        style={reduce ? undefined : { transform: moon }}
      >
        <Ribbon
          position="absolute"
          className="inset-x-0 top-[14%] h-[34%] opacity-80"
          colors={["#FFFFFF", "#C9C1FF", "#86E3E1", "#F5D0FE"]}
          strands={22}
          amplitude={0.8}
          periods={1}
          twist={1.8}
          duration={12}
        />
        <svg viewBox="0 0 400 400" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          {/* Far hills, near hills, then their reflection in still water */}
          <path d="M0 232 L48 196 L92 214 L150 160 L206 208 L252 182 L300 210 L352 176 L400 204 L400 222 L0 222 Z" fill="#3F3F78" opacity="0.85" />
          <path d="M0 222 L36 204 L84 220 L136 186 L188 214 L238 196 L290 218 L338 194 L400 214 L400 222 L0 222 Z" fill="#232551" />
          <path d="M0 222 L36 240 L84 224 L136 258 L188 230 L238 248 L290 226 L338 250 L400 230 L400 222 Z" fill="#1B1D45" opacity="0.6" />
          <rect x="0" y="262" width="400" height="2" fill="#B8A9D9" opacity="0.18" />
          <rect x="60" y="292" width="280" height="1.5" fill="#B8A9D9" opacity="0.12" />
        </svg>
      </motion.div>
    </div>
  );
}
