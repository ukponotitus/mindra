import { AbsoluteFill } from "remotion";

export type Glow = { x: number; y: number; r: number; color: string; drift?: number; speed?: number };

/** Soft drifting light, like the blurred gradients behind the type in the references. */
export default function GlowField({ frame, glows, opacity = 1 }: { frame: number; glows: Glow[]; opacity?: number }) {
  return (
    <AbsoluteFill style={{ opacity, overflow: "hidden" }}>
      {glows.map((glow, i) => {
        const drift = glow.drift ?? 60;
        const speed = glow.speed ?? 1;
        const x = glow.x + Math.sin(frame * 0.012 * speed + i * 1.3) * drift;
        const y = glow.y + Math.cos(frame * 0.01 * speed + i * 2.1) * drift;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - glow.r,
              top: y - glow.r,
              width: glow.r * 2,
              height: glow.r * 2,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${glow.color} 0%, transparent 68%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}
