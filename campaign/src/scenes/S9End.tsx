import { ArrowRight } from "lucide-react";
import { AbsoluteFill, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { blurIn, easeInOut, lerp, ramp } from "../anim";
import { LogoBars } from "../components/Bits";
import GlowField from "../components/GlowField";
import { C, gradientText } from "../theme";

const MARK = 230;
const UNIT = MARK / 36;
const LOCKUP_Y = 640;

/** 56–60s. The wave settles into the Mindra mark, the wordmark slides out (pin 10), then the promise and the CTA. */
export default function S9End() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bars = ramp(f, 4, 12);
  const settle = ramp(f, 30, 16, easeInOut);
  const levels = [0, 1, 2, 3].map((i) => {
    const talking = 0.55 + 0.75 * Math.abs(Math.sin(f * 0.32 + i * 1.4));
    return lerp(talking, 1, settle);
  });
  const tile = spring({ frame: f - 34, fps, config: { damping: 14, stiffness: 160 } });
  const slide = ramp(f, 50, 22, easeInOut);
  const word = ramp(f, 54, 22);
  const lockupWidth = MARK + 44 + 560;
  const markX = lerp(540 - MARK / 2, 540 - lockupWidth / 2, slide);
  const wordLeft = 540 - lockupWidth / 2 + MARK + 44;
  // Only the part of the wordmark to the right of the moving mark is visible, so it slides out from behind it.
  const hidden = Math.max(0, markX + MARK + 24 - wordLeft);
  const glow = ramp(f, 0, 60);

  return (
    <AbsoluteFill style={{ background: C.paper, overflow: "hidden" }}>
      <GlowField
        frame={f}
        opacity={glow}
        glows={[
          { x: 300, y: 1700, r: 820, color: "rgba(201,193,255,0.9)", drift: 60 },
          { x: 860, y: 1560, r: 700, color: "rgba(134,227,225,0.7)", drift: 60 },
          { x: 540, y: 1900, r: 640, color: "rgba(109,94,245,0.45)", drift: 50 },
        ]}
      />

      {/* The mark */}
      <div
        style={{
          position: "absolute",
          left: markX,
          top: LOCKUP_Y - MARK / 2,
          width: MARK,
          height: MARK,
          display: "grid",
          placeItems: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: MARK * 0.3,
            background: C.brand,
            transform: `scale(${tile})`,
            boxShadow: `0 40px 90px -30px rgba(91,77,224,${0.6 * Math.min(1, tile)})`,
          }}
        />
        <div style={{ position: "relative", opacity: bars, transform: `scale(${lerp(1.5, 1, settle)})` }}>
          <LogoBars unit={UNIT} color={interpolateColors(ramp(f, 36, 10), [0, 1], [C.ink, "#fff"])} levels={levels} />
        </div>
      </div>

      {/* The wordmark, revealed from behind the mark */}
      <div
        style={{
          position: "absolute",
          left: wordLeft,
          top: LOCKUP_Y - 100,
          width: 600,
          height: 200,
          clipPath: `inset(0 0 0 ${hidden}px)`,
        }}
      >
        <div
          style={{
            fontSize: 172,
            fontWeight: 600,
            letterSpacing: "-0.025em",
            lineHeight: "200px",
            color: C.ink,
            transform: `translateX(${(1 - word) * -45}%)`,
          }}
        >
          Mindra
        </div>
      </div>

      <div style={{ position: "absolute", top: 860, left: 0, right: 0, textAlign: "center", fontSize: 100, fontWeight: 700, letterSpacing: "-0.055em", lineHeight: 1.05 }}>
        <div style={{ ...blurIn(ramp(f, 66, 22)), color: C.ink }}>Record once.</div>
        <div style={blurIn(ramp(f, 72, 22))}>
          <span style={gradientText()}>Post all month.</span>
        </div>
      </div>

      <div style={{ position: "absolute", top: 1124, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", ...blurIn(ramp(f, 84, 20)) }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "30px 60px",
            borderRadius: 999,
            background: C.ink,
            color: "#fff",
            fontSize: 46,
            fontWeight: 600,
            boxShadow: "0 0 70px -10px rgba(167,155,255,0.95)",
          }}
        >
          Start free
          <ArrowRight size={44} strokeWidth={2.4} />
        </div>
        <div style={{ marginTop: 24, fontSize: 32, fontWeight: 500, color: C.muted }}>Now in private beta · No credit card</div>
      </div>
    </AbsoluteFill>
  );
}
