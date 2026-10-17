import { ChevronDown } from "lucide-react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { blurIn, easeInOut, easeOut, lerp, ramp } from "../anim";
import { LogoMark } from "../components/Bits";
import { C, gradientText } from "../theme";

const WHO = ["Pastors", "Podcasters", "Coaches", "Teachers", "Creators"];
const ROW = 200;
const AVATARS: [string, string][] = [
  ["AO", "#FFB86B"],
  ["TK", C.periwinkle],
  ["NE", C.mint],
  ["BF", "#F9A8D4"],
];

/** A wave that rises inside the card. */
function WaveFill({ frame, level }: { frame: number; level: number }) {
  const width = 600;
  const height = 300;
  const top = height * (1 - level);
  const points: string[] = [];
  for (let x = 0; x <= width; x += 20) {
    const y = top + Math.sin(x / 70 + frame * 0.12) * 14 + Math.sin(x / 33 - frame * 0.08) * 6;
    points.push(`${x},${y.toFixed(1)}`);
  }
  return (
    <svg width={width} height={height} style={{ position: "absolute", left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="wave" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={C.purple} />
          <stop offset="1" stopColor={C.cyan} />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points.join(" ")} ${width},${height}`} fill="url(#wave)" />
    </svg>
  );
}

/** 51.5–56s. Written in your voice: huge rolling words (pin 19), a voice-match card and the team approving (pin 5). */
export default function S8Voice() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const index = ramp(f, 30, 16, easeInOut) + ramp(f, 66, 16, easeInOut) + ramp(f, 100, 16, easeInOut);
  const cardIn = spring({ frame: f - 14, fps, config: { damping: 16, stiffness: 150 } });
  const match = Math.round(interpolate(f, [24, 92], [0, 94], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut }));
  const team = spring({ frame: f - 46, fps, config: { damping: 14, stiffness: 170 } });

  return (
    <AbsoluteFill style={{ background: C.mintPaper, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 92, top: 290, fontSize: 104, fontWeight: 700, letterSpacing: "-0.055em", lineHeight: 1.0 }}>
        <div style={{ ...blurIn(ramp(f, 4, 22)), color: C.ink }}>Written in</div>
        <div style={blurIn(ramp(f, 10, 22))}>
          <span style={gradientText()}>your voice.</span>
        </div>
      </div>

      {/* Who it's for, rolling past */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 560, height: ROW * 3, overflow: "hidden", opacity: ramp(f, 6, 20) }}>
        {WHO.map((word, i) => {
          const distance = i - index;
          const away = Math.min(Math.abs(distance), 1.5);
          return (
            <div
              key={word}
              style={{
                position: "absolute",
                left: 70,
                top: ROW + distance * ROW,
                height: ROW,
                display: "flex",
                alignItems: "center",
                fontSize: 196,
                fontWeight: 800,
                letterSpacing: "-0.06em",
                whiteSpace: "nowrap",
                color: away < 0.5 ? C.ink : "#BFD3CF",
                opacity: lerp(1, 0.8, Math.min(away, 1)),
              }}
            >
              {word}
            </div>
          );
        })}
      </div>

      {/* Voice match */}
      <div
        style={{
          position: "absolute",
          left: 548,
          top: 620,
          width: 600,
          height: 560,
          borderRadius: "44px 0 0 44px",
          background: C.ink,
          overflow: "hidden",
          boxShadow: "0 50px 100px -40px rgba(11,11,26,0.6)",
          transformOrigin: "center bottom",
          transform: `translateY(${(1 - cardIn) * 160}px) scale(${0.92 + 0.08 * cardIn})`,
          opacity: Math.min(1, cardIn * 1.4),
        }}
      >
        <WaveFill frame={f} level={lerp(0.05, 0.42, ramp(f, 24, 70, easeOut))} />
        <div style={{ position: "absolute", left: 36, top: 34, right: 104 }}>
          <div style={{ display: "flex", gap: 10, whiteSpace: "nowrap" }}>
            <span style={{ padding: "8px 18px", borderRadius: 999, background: "rgba(255,255,255,0.12)", color: "#fff", fontSize: 24, fontWeight: 600 }}>Brand voice</span>
            <span style={{ padding: "8px 18px", borderRadius: 999, background: C.lavender, color: C.ink, fontSize: 24, fontWeight: 600 }}>Warm and hopeful</span>
          </div>
          <div style={{ marginTop: 42, fontSize: 30, fontWeight: 500, color: "rgba(255,255,255,0.6)" }}>Voice match</div>
          <div style={{ fontSize: 150, fontWeight: 700, letterSpacing: "-0.06em", color: "#fff", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {match}
            <span style={{ fontSize: 80 }}>%</span>
          </div>
        </div>
      </div>

      {/* The team signs off (pin 5's avatar pill) */}
      <div
        style={{
          position: "absolute",
          left: 92,
          top: 1218,
          display: "flex",
          alignItems: "center",
          gap: 18,
          padding: "14px 26px 14px 14px",
          borderRadius: 999,
          background: "#fff",
          boxShadow: "0 24px 50px -24px rgba(11,11,26,0.35)",
          transformOrigin: "left center",
          transform: `scale(${team})`,
          opacity: Math.min(1, team),
        }}
      >
        <LogoMark size={64} style={{ boxShadow: "none" }} />
        <div style={{ display: "flex" }}>
          {AVATARS.map(([initials, colour], i) => (
            <div
              key={initials}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                background: colour,
                border: "4px solid #fff",
                marginLeft: i ? -18 : 0,
                display: "grid",
                placeItems: "center",
                fontSize: 26,
                fontWeight: 700,
                color: C.ink,
              }}
            >
              {initials}
            </div>
          ))}
        </div>
        <span style={{ fontSize: 32, fontWeight: 600, color: C.inkSoft }}>Reviewed</span>
        <span style={{ fontSize: 30, fontWeight: 500, color: C.muted, display: "flex", alignItems: "center" }}>
          +3 <ChevronDown size={28} />
        </span>
      </div>
    </AbsoluteFill>
  );
}
