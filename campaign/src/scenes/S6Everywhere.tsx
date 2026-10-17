import { Mic } from "lucide-react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { blurIn, easeOut, life, ramp } from "../anim";
import GlowField from "../components/GlowField";
import Waveform from "../components/Waveform";
import { C, GRADIENT_TILE, PLATFORMS, gradientText } from "../theme";

const CARD = { x: 540, y: 900, w: 540, h: 320 };

const CHIPS = [
  { ...PLATFORMS.instagram, x: 270, y: 610 },
  { ...PLATFORMS.tiktok, x: 810, y: 600 },
  { ...PLATFORMS.x, x: 140, y: 900 },
  { ...PLATFORMS.blog, x: 950, y: 880 },
  { ...PLATFORMS.facebook, x: 250, y: 1180 },
  { ...PLATFORMS.shorts, x: 790, y: 1190 },
  { ...PLATFORMS.linkedin, x: 250, y: 1340 },
  { ...PLATFORMS.whatsapp, x: 540, y: 1460 },
  { ...PLATFORMS.newsletter, x: 820, y: 1340 },
];

function Chip({ name, color }: { name: string; color: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14,
        padding: "18px 30px",
        borderRadius: 999,
        background: "rgba(255,255,255,0.88)",
        border: "1.5px solid rgba(11,11,26,0.07)",
        boxShadow: "0 16px 40px -20px rgba(11,11,26,0.35)",
        fontSize: 36,
        fontWeight: 600,
        color: C.ink,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: 18, height: 18, borderRadius: 9, background: color, boxShadow: `0 0 16px ${color}` }} />
      {name}
    </div>
  );
}

/** 37.5–43.5s. One upload, every channel: the channels fly out of the recording with motion trails (pin 7). */
export default function S6Everywhere() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cardIn = spring({ frame: f - 8, fps, config: { damping: 16, stiffness: 140 } });
  const glow = ramp(f, 0, 40);

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <GlowField
        frame={f}
        opacity={glow}
        glows={[
          { x: 540, y: 1700, r: 980, color: "rgba(201,193,255,0.9)", drift: 60 },
          { x: 920, y: 260, r: 620, color: "rgba(134,227,225,0.55)", drift: 50 },
          { x: 120, y: 980, r: 520, color: "rgba(109,94,245,0.16)", drift: 50 },
        ]}
      />

      <div style={{ position: "absolute", top: 268, left: 0, right: 0, textAlign: "center", fontSize: 112, fontWeight: 700, letterSpacing: "-0.055em", lineHeight: 1.02 }}>
        <div style={{ ...blurIn(life(f, 4, 200)), color: C.ink }}>One upload.</div>
        <div style={blurIn(life(f, 12, 200))}>
          <span style={gradientText()}>Every channel.</span>
        </div>
      </div>

      {/* Threads from the recording to each channel */}
      <svg width={1080} height={1920} style={{ position: "absolute", inset: 0 }}>
        {CHIPS.map((chip, i) => {
          const landed = ramp(f, 52 + i * 4, 18);
          return (
            <line
              key={chip.name}
              x1={CARD.x}
              y1={CARD.y}
              x2={CARD.x + (chip.x - CARD.x) * landed}
              y2={CARD.y + (chip.y - CARD.y) * landed}
              stroke={C.purple}
              strokeOpacity={0.28}
              strokeWidth={2.5}
              strokeDasharray="2 12"
              strokeLinecap="round"
            />
          );
        })}
      </svg>

      {/* The recording */}
      <div
        style={{
          position: "absolute",
          left: CARD.x - CARD.w / 2,
          top: CARD.y - CARD.h / 2,
          width: CARD.w,
          height: CARD.h,
          borderRadius: 48,
          background: GRADIENT_TILE,
          boxShadow: "0 50px 100px -40px rgba(109,94,245,0.75)",
          padding: 40,
          color: "#fff",
          transform: `scale(${cardIn})`,
          opacity: Math.min(1, cardIn * 1.5),
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 76, height: 76, borderRadius: 22, background: "rgba(255,255,255,0.2)", display: "grid", placeItems: "center" }}>
            <Mic size={38} color="#fff" strokeWidth={2.2} />
          </div>
          <div>
            <div style={{ fontSize: 50, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.05 }}>Sunday sermon</div>
            <div style={{ fontSize: 28, fontWeight: 500, opacity: 0.78, marginTop: 6 }}>48 min · uploaded once</div>
          </div>
        </div>
        <Waveform frame={f} count={26} barWidth={7} gap={9} height={90} color="rgba(255,255,255,0.75)" energy={0.8} style={{ marginTop: 34 }} />
      </div>

      {/* Channels fly out, trailing ghosts for a motion-blur feel */}
      {CHIPS.map((chip, i) => {
        const start = 26 + i * 4;
        return [0.24, 0.12, 0].map((lag, g) => {
          const t = ramp(f, start + lag * 30, 24, easeOut);
          if (t <= 0) return null;
          const x = CARD.x + (chip.x - CARD.x) * t;
          const y = CARD.y + (chip.y - CARD.y) * t;
          const ghost = lag > 0;
          return (
            <div
              key={`${chip.name}-${g}`}
              style={{
                position: "absolute",
                left: x,
                top: y,
                transform: `translate(-50%, -50%) scale(${0.5 + 0.5 * t})`,
                opacity: ghost ? (1 - t) * 0.35 : Math.min(1, t * 2),
                filter: t < 0.98 ? `blur(${(1 - t) * 16}px)` : undefined,
              }}
            >
              <Chip name={chip.name} color={chip.color} />
            </div>
          );
        });
      })}
    </AbsoluteFill>
  );
}
