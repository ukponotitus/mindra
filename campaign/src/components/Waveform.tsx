import type { CSSProperties } from "react";

type Props = {
  frame: number;
  count: number;
  barWidth: number;
  gap: number;
  height: number;
  color: string;
  /** 1 = talking, 0 = silent dots. */
  energy?: number;
  seed?: number;
  style?: CSSProperties;
};

/** Speech-like bars: two slow sines per bar, so neighbours move together but never in lockstep. */
export default function Waveform({ frame, count, barWidth, gap, height, color, energy = 1, seed = 0, style }: Props) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap, height, ...style }}>
      {Array.from({ length: count }, (_, i) => {
        const a = Math.sin(frame * 0.23 + i * 0.85 + seed);
        const b = Math.sin(frame * 0.11 + i * 0.41 + seed * 2.1);
        const envelope = Math.sin(((i + 0.5) / count) * Math.PI);
        const level = 0.16 + 0.84 * Math.abs(a * 0.6 + b * 0.4) * (0.45 + 0.55 * envelope);
        const barHeight = Math.max(barWidth, height * level * energy);
        return <div key={i} style={{ width: barWidth, height: barHeight, borderRadius: barWidth, background: color, flexShrink: 0 }} />;
      })}
    </div>
  );
}
