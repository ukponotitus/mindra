import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { blurIn, easeInOut, easeOut, life, ramp } from "../anim";
import GlowField from "../components/GlowField";
import { C, gradientText } from "../theme";

/** 0–5.5s. The hook: a 48-minute message, heard once. Blur-in type over a soft gradient (pins 16, 18). */
export default function S1Hook() {
  const f = useCurrentFrame();
  const intro = life(f, 2, 74, 20);
  const count = life(f, 8, 76, 26);
  const unit = life(f, 20, 78, 22);
  const minutes = Math.round(
    interpolate(f, [8, 56], [0, 48], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: easeOut }),
  );
  const heard = life(f, 88, 148, 22);
  const once = life(f, 98, 150, 30, 15);
  const glow = ramp(f, 0, 140, easeInOut);

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <GlowField
        frame={f}
        opacity={0.2 + 0.8 * glow}
        glows={[
          { x: 300, y: 1250, r: 760, color: "rgba(201,193,255,0.85)", drift: 90 },
          { x: 820, y: 1050, r: 640, color: "rgba(109,94,245,0.38)", drift: 80 },
          { x: 640, y: 1500, r: 620, color: "rgba(134,227,225,0.6)", drift: 70 },
          { x: 180, y: 700, r: 420, color: "rgba(147,168,255,0.35)", drift: 60 },
        ]}
      />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center" }}>
        <div style={{ ...blurIn(intro), fontSize: 60, fontWeight: 500, color: C.inkSoft, letterSpacing: "-0.02em" }}>
          You spoke for
        </div>
        <div
          style={{
            ...blurIn(count, 70, 26),
            fontSize: 460,
            fontWeight: 700,
            letterSpacing: "-0.065em",
            lineHeight: 0.92,
            color: C.ink,
            fontVariantNumeric: "tabular-nums",
            marginTop: 10,
          }}
        >
          {minutes}
        </div>
        <div style={{ ...blurIn(unit), fontSize: 124, fontWeight: 700, letterSpacing: "-0.05em", color: C.ink }}>
          minutes.
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center" }}>
        <div style={{ ...blurIn(heard), fontSize: 60, fontWeight: 500, color: C.inkSoft, letterSpacing: "-0.02em" }}>
          It was heard
        </div>
        <div
          style={{
            ...blurIn(once, 70, 30),
            fontSize: 310,
            fontWeight: 800,
            letterSpacing: "-0.065em",
            lineHeight: 1.05,
          }}
        >
          <span style={gradientText()}>once.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
