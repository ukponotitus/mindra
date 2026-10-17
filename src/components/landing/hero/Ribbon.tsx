import { useId, useMemo, type CSSProperties } from "react";

interface Props {
  /** Colours the light passes through along one loop. */
  colors: string[];
  strands?: number;
  /** Height of the wave as a share of the box (0 to 1). */
  amplitude?: number;
  /** Number of wave crests in one loop. */
  periods?: number;
  /** Seconds for one full loop. */
  duration?: number;
  /** How far apart the strands' phases are: higher twists the ribbon more. */
  twist?: number;
  strokeWidth?: number;
  /** "absolute" to lay the ribbon over its parent; position it with className. */
  position?: "relative" | "absolute";
  className?: string;
}

const W = 800;
const H = 240;
const STEPS = 120;

/**
 * One strand drawn across two loops. Everything in the formula repeats every W units, so sliding the
 * drawing left by exactly one loop (half its width) lands on an identical picture: an endless flow.
 */
function strandPath(index: number, strands: number, amplitude: number, periods: number, twist: number) {
  const share = strands > 1 ? index / (strands - 1) : 0.5;
  const phase = share * Math.PI * twist;
  const height = (H / 2) * amplitude * (0.45 + 0.55 * Math.sin(share * Math.PI));
  let path = "";
  for (let step = 0; step <= STEPS * 2; step++) {
    const x = (step / STEPS) * W;
    const t = (x / W) * Math.PI * 2;
    const envelope = 0.6 + 0.4 * Math.sin(t * 2 + phase);
    const y = H / 2 + height * envelope * Math.sin(t * periods + phase);
    path += `${step === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return path;
}

/** A glowing ribbon of sound: many thin waves drifting past, softly blurred for light. */
export default function Ribbon({
  colors,
  strands = 16,
  amplitude = 0.75,
  periods = 2,
  duration = 10,
  twist = 0.85,
  strokeWidth = 1.2,
  position = "relative",
  className = "",
}: Props) {
  const gradientId = `ribbon-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const paths = useMemo(
    () => Array.from({ length: strands }, (_, i) => strandPath(i, strands, amplitude, periods, twist)),
    [strands, amplitude, periods, twist],
  );
  // Ending on the first colour keeps the repeating gradient seamless too.
  const stops = [...colors, colors[0]];

  return (
    <div aria-hidden="true" className={`${position} overflow-hidden ${className}`}>
      <svg
        viewBox={`0 0 ${W * 2} ${H}`}
        preserveAspectRatio="none"
        className="absolute inset-y-0 left-0 h-full w-[200%] animate-ribbon"
        style={{ "--ribbon-duration": `${duration}s` } as CSSProperties}
      >
        <defs>
          <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={W} y2="0" spreadMethod="repeat">
            {stops.map((color, i) => (
              <stop key={i} offset={i / (stops.length - 1)} stopColor={color} />
            ))}
          </linearGradient>
        </defs>
        <g stroke={`url(#${gradientId})`} fill="none" strokeWidth={strokeWidth * 6} opacity={0.3} style={{ filter: "blur(7px)" }}>
          {paths.map((d, i) => (
            <path key={i} d={d} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        <g stroke={`url(#${gradientId})`} fill="none" strokeWidth={strokeWidth}>
          {paths.map((d, i) => (
            <path key={i} d={d} vectorEffect="non-scaling-stroke" opacity={0.3 + 0.7 * Math.sin((i / Math.max(1, strands - 1)) * Math.PI)} />
          ))}
        </g>
      </svg>
    </div>
  );
}
