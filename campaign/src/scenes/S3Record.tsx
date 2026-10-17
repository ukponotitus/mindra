import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { blurIn, easeIn, easeInOut, lerp, ramp } from "../anim";
import GlowField from "../components/GlowField";
import MicPill from "../components/MicPill";
import Waveform from "../components/Waveform";
import { C, GRADIENT, gradientText } from "../theme";

const FS = 230;
const LINE_Y = 800;
const CAPTION = ["Fear", "is", "loud,", "but", "faith", "is", "louder."];

/**
 * 11.5–17.5s. "Rec◯rd once." The O is a live recording window (pins 1 and 11) that pushes the letters
 * apart, opens into the recording, then shrinks into the listening pill the next scene starts with.
 */
export default function S3Record() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wipe = ramp(f, 0, 22, easeInOut);
  const pillPop = spring({ frame: f - 8, fps, config: { damping: 15, stiffness: 170 } });
  const letters = ramp(f, 12, 22);
  const once = ramp(f, 20, 24);
  const widen = ramp(f, 38, 30, easeInOut);
  const grow = ramp(f, 74, 30, easeInOut);
  const lettersGone = ramp(f, 76, 22, easeIn);
  const card = ramp(f, 92, 14) * (1 - ramp(f, 144, 10, easeIn));
  const paper = ramp(f, 142, 26, easeInOut);
  const shrink = ramp(f, 146, 26, easeInOut);
  const micIn = ramp(f, 160, 12);

  // The window: an "o" → a wide pill → the recording → the listening pill.
  let w = lerp(150, 440, widen);
  let h = 166;
  let cy = LINE_Y;
  w = lerp(w, 860, grow);
  h = lerp(h, 1180, grow);
  cy = lerp(cy, 960, grow);
  w = lerp(w, 560, shrink);
  h = lerp(h, 128, shrink);
  cy = lerp(cy, 560, shrink);
  const radius = Math.min(h / 2, lerp(lerp(83, 64, grow), 64, shrink));

  const push = lettersGone * 700;
  const letterStyle = {
    position: "absolute" as const,
    top: LINE_Y - FS * 0.5,
    fontSize: FS,
    lineHeight: `${FS}px`,
    fontWeight: 700,
    letterSpacing: "-0.055em",
    color: "#fff",
    whiteSpace: "nowrap" as const,
  };
  const seconds = 48 * 60 + 12 + Math.floor(f / fps);
  const timer = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      {/* The dot from the last scene floods the frame with purple */}
      <div
        style={{
          position: "absolute",
          left: 540 - (15 + wipe * 2300),
          top: 960 - (15 + wipe * 2300),
          width: (15 + wipe * 2300) * 2,
          height: (15 + wipe * 2300) * 2,
          borderRadius: "50%",
          background: C.purple,
        }}
      />

      <div style={{ ...letterStyle, ...blurIn(letters * (1 - lettersGone), 30, 14), right: 1080 - (540 - w / 2 - 14) + push }}>Rec</div>
      <div style={{ ...letterStyle, ...blurIn(letters * (1 - lettersGone), 30, 14), left: 540 + w / 2 + 14 + push }}>rd</div>
      <div
        style={{
          ...letterStyle,
          top: LINE_Y + FS * 0.55,
          left: 0,
          right: 0,
          textAlign: "center",
          ...blurIn(once * (1 - lettersGone), 40, 16),
        }}
      >
        <span style={gradientText(`linear-gradient(90deg, #fff 0%, ${C.lavender} 45%, ${C.mint} 100%)`)}>once.</span>
      </div>

      {/* Paper rises back in from the bottom */}
      <div
        style={{
          position: "absolute",
          left: -60,
          right: -60,
          top: 0,
          height: 2300,
          background: C.paper,
          borderRadius: `${(1 - paper) * 420}px ${(1 - paper) * 420}px 0 0`,
          transform: `translateY(${(1 - paper) * 2300}px)`,
        }}
      />

      {/* The window */}
      <div
        style={{
          position: "absolute",
          left: 540 - w / 2,
          top: cy - h / 2,
          width: w,
          height: h,
          borderRadius: radius,
          background: C.ink,
          overflow: "hidden",
          transform: `scale(${pillPop})`,
          boxShadow: `0 40px 120px -30px rgba(11,11,26,${0.25 + 0.35 * grow})`,
        }}
      >
        <GlowField
          frame={f}
          opacity={1 - shrink}
          glows={[
            { x: w * 0.25, y: h * 0.3, r: Math.max(w, h) * 0.7, color: "rgba(109,94,245,0.75)", drift: 40 },
            { x: w * 0.85, y: h * 0.8, r: Math.max(w, h) * 0.6, color: "rgba(62,207,206,0.45)", drift: 40 },
          ]}
        />

        {/* Small and wide: just the voice */}
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: 1 - ramp(f, 84, 12) }}>
          <Waveform frame={f} count={17} barWidth={12} gap={9} height={100} color="#fff" />
        </div>
        <div
          style={{
            position: "absolute",
            left: 34,
            top: h / 2 - 9,
            width: 18,
            height: 18,
            borderRadius: 9,
            background: C.rec,
            opacity: widen * (1 - grow) * (0.5 + 0.5 * Math.abs(Math.sin(f * 0.15))),
          }}
        />

        {/* Open: the recording itself */}
        <div style={{ position: "absolute", left: w / 2 - 430, top: h / 2 - 590, width: 860, height: 1180, opacity: card }}>
          <div style={{ position: "absolute", left: 56, top: 56, display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                background: C.rec,
                opacity: 0.45 + 0.55 * Math.abs(Math.sin(f * 0.15)),
              }}
            />
            <span style={{ color: "#fff", fontSize: 34, fontWeight: 600, letterSpacing: "0.08em" }}>REC</span>
          </div>
          <div
            style={{
              position: "absolute",
              right: 56,
              top: 50,
              color: "#fff",
              fontSize: 36,
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
              opacity: 0.85,
            }}
          >
            {timer}
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, top: 300, display: "flex", justifyContent: "center" }}>
            <Waveform frame={f} count={21} barWidth={16} gap={14} height={330} color="#fff" seed={2} />
          </div>
          <div
            style={{
              position: "absolute",
              left: 70,
              right: 70,
              top: 760,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: "8px 18px",
            }}
          >
            {CAPTION.map((word, i) => {
              const start = 102 + i * 4;
              const seen = ramp(f, start, 6);
              const active = f >= start && f < start + 4;
              return (
                <span
                  key={i}
                  style={{
                    fontSize: 72,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: "#fff",
                    opacity: 0.35 + 0.65 * seen,
                    padding: "0 14px",
                    borderRadius: 18,
                    background: active ? C.purple : "transparent",
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
          <div style={{ position: "absolute", left: 56, right: 56, bottom: 120, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.16)" }}>
            <div style={{ height: "100%", width: `${20 + ramp(f, 90, 60) * 30}%`, borderRadius: 4, background: GRADIENT }} />
          </div>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 52, textAlign: "center", color: "rgba(255,255,255,0.6)", fontSize: 32, fontWeight: 500 }}>
            Sunday service · 48 min
          </div>
        </div>

        {/* Closed again: the listening pill */}
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", opacity: micIn }}>
          <MicPill frame={f} />
        </div>
      </div>
    </AbsoluteFill>
  );
}
