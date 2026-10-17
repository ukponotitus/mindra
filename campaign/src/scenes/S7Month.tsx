import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { blurIn, easeIn, easeInOut, lerp, life, ramp } from "../anim";
import GlowField, { type Glow } from "../components/GlowField";
import { C, GRADIENT, GRADIENT_TILE, gradientText } from "../theme";

const CARD_W = 620;
const CARD_H = 880;
const PITCH = 660;

type Slide = { word: string; background: string; glows: Glow[]; style: CSSProperties };

/** Five cards that read "Record once. Post all month." as they pass, in mixed type styles (pin 13). */
const SLIDES: Slide[] = [
  {
    word: "Record",
    background: "#16162A",
    glows: [
      { x: 160, y: 200, r: 520, color: "rgba(109,94,245,0.95)", drift: 50 },
      { x: 520, y: 720, r: 480, color: "rgba(62,207,206,0.7)", drift: 50 },
    ],
    style: { fontSize: 160, fontWeight: 800, color: "#fff", letterSpacing: "-0.05em" },
  },
  {
    word: "once.",
    background: "#F5F4F0",
    glows: [
      { x: 500, y: 180, r: 460, color: "rgba(201,193,255,0.95)", drift: 50 },
      { x: 120, y: 700, r: 420, color: "rgba(134,227,225,0.8)", drift: 50 },
    ],
    style: { fontSize: 200, fontWeight: 800, color: C.ink, letterSpacing: "-0.06em" },
  },
  {
    word: "Post",
    background: C.purple,
    glows: [
      { x: 520, y: 220, r: 520, color: "rgba(147,168,255,0.95)", drift: 60 },
      { x: 100, y: 760, r: 460, color: "rgba(225,48,108,0.55)", drift: 60 },
    ],
    style: { fontSize: 240, fontWeight: 800, color: "transparent", WebkitTextStroke: "5px #fff", letterSpacing: "-0.05em" },
  },
  {
    word: "all",
    background: "#15151F",
    glows: [
      { x: 140, y: 140, r: 480, color: "rgba(62,207,206,0.75)", drift: 50 },
      { x: 560, y: 820, r: 420, color: "rgba(109,94,245,0.85)", drift: 50 },
    ],
    style: { fontSize: 320, fontWeight: 800, letterSpacing: "-0.06em", ...gradientText(`linear-gradient(90deg, ${C.lavender}, ${C.mint})`) },
  },
  {
    word: "month.",
    background: "#1E1A4D",
    glows: [
      { x: 520, y: 200, r: 560, color: "rgba(62,207,206,0.9)", drift: 60 },
      { x: 120, y: 520, r: 520, color: "rgba(109,94,245,0.95)", drift: 60 },
      { x: 420, y: 860, r: 360, color: "rgba(225,48,108,0.45)", drift: 60 },
    ],
    style: { fontSize: 168, fontWeight: 800, color: "#fff", letterSpacing: "-0.055em" },
  },
];

const FILL_COLOURS = ["#E1306C", "#25D366", C.purple, "#1877F2", C.cyan, "#FF0033", C.lavender, "#25F4EE", "#FFB020"];

/** 43.5–51.5s. A dark interlude: the slogan on passing cards, then a month of posts filling a calendar. */
export default function S7Month() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  let index = 0;
  for (let k = 0; k < SLIDES.length - 1; k++) index += ramp(f, 16 + k * 24, 14, easeInOut);
  const carouselIn = ramp(f, 2, 18);
  const carouselOut = ramp(f, 118, 18, easeIn);
  const labels = life(f, 4, 118, 18, 12);
  const calendar = ramp(f, 128, 20);
  const fillStart = 146;
  const filled = Math.max(0, Math.min(30, Math.floor((f - fillStart) / 2) + 1));

  return (
    <AbsoluteFill style={{ background: C.night, overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 262, left: 0, right: 0, textAlign: "center", fontSize: 28, fontWeight: 500, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em", opacity: labels }}>
        Mindra
      </div>
      <div style={{ position: "absolute", top: 1306, left: 0, right: 0, textAlign: "center", fontSize: 28, fontWeight: 500, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em", opacity: labels }}>
        One recording · thirty days
      </div>

      {/* The carousel */}
      {SLIDES.map((slide, i) => {
        const offset = i - index;
        const x = 540 + offset * PITCH;
        const near = 1 - Math.min(1, Math.abs(offset));
        return (
          <div
            key={slide.word}
            style={{
              position: "absolute",
              left: x - CARD_W / 2,
              top: 960 - CARD_H / 2 - 60,
              width: CARD_W,
              height: CARD_H,
              borderRadius: 56,
              overflow: "hidden",
              background: slide.background,
              opacity: carouselIn * (1 - carouselOut) * lerp(0.55, 1, near),
              transform: `scale(${lerp(0.9, 1, near) * (1 - 0.15 * carouselOut)}) translateY(${(1 - carouselIn) * 120 - carouselOut * 80}px)`,
              filter: carouselOut > 0 ? `blur(${carouselOut * 16}px)` : undefined,
            }}
          >
            <GlowField frame={f + i * 40} glows={slide.glows} />
            <div style={{ position: "absolute", left: 44, right: 20, bottom: 40, lineHeight: 1, whiteSpace: "nowrap", ...slide.style }}>{slide.word}</div>
            <div style={{ position: "absolute", left: 44, top: 40, fontSize: 26, fontWeight: 600, color: i === 1 ? C.inkSoft : "rgba(255,255,255,0.7)", letterSpacing: "0.04em" }}>
              0{i + 1}
            </div>
          </div>
        );
      })}

      {/* Thirty days, filling up */}
      <div style={{ position: "absolute", top: 300, left: 0, right: 0, textAlign: "center", ...blurIn(calendar) }}>
        <div style={{ fontSize: 96, fontWeight: 700, letterSpacing: "-0.05em", color: "#fff" }}>30 days of posts.</div>
        <div style={{ fontSize: 46, fontWeight: 500, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>From one recording.</div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 183,
          top: 570,
          width: 714,
          display: "grid",
          gridTemplateColumns: "repeat(6, 104px)",
          gap: 18,
          opacity: calendar,
          transform: `translateY(${(1 - calendar) * 60}px)`,
        }}
      >
        {Array.from({ length: 30 }, (_, day) => {
          const order = (day * 7) % 30;
          const pop = spring({ frame: f - fillStart - order * 2, fps, config: { damping: 11, stiffness: 220 } });
          const colour = FILL_COLOURS[(day * 5) % FILL_COLOURS.length];
          return (
            <div
              key={day}
              style={{
                position: "relative",
                height: 104,
                borderRadius: 24,
                background: "#17171F",
                border: "1.5px solid #262632",
                display: "grid",
                placeItems: "center",
              }}
            >
              <span style={{ position: "absolute", left: 14, top: 10, fontSize: 21, fontWeight: 600, color: "rgba(255,255,255,0.35)" }}>{day + 1}</span>
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: colour,
                  boxShadow: `0 0 26px ${colour}`,
                  transform: `scale(${pop})`,
                  marginTop: 14,
                }}
              />
            </div>
          );
        })}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 1222,
          display: "flex",
          justifyContent: "center",
          opacity: ramp(f, fillStart - 6, 12),
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 34px", borderRadius: 999, background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.12)", color: "#fff", fontSize: 36, fontWeight: 600 }}>
          <span style={{ width: 44, height: 44, borderRadius: 22, background: GRADIENT_TILE, display: "grid", placeItems: "center" }}>
            <Check size={26} strokeWidth={3.4} color="#fff" />
          </span>
          <span style={{ fontVariantNumeric: "tabular-nums" }}>{filled}</span> posts ready
        </div>
      </div>
      <div style={{ position: "absolute", left: 183, top: 1188, width: 714, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.08)", opacity: calendar }}>
        <div style={{ width: `${(filled / 30) * 100}%`, height: "100%", borderRadius: 3, background: GRADIENT }} />
      </div>
    </AbsoluteFill>
  );
}
