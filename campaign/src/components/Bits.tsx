import type { CSSProperties } from "react";
import { AbsoluteFill } from "remotion";
import { C } from "../theme";

/** Paper grain over the whole reel. */
export function Grain({ opacity = 0.06 }: { opacity?: number }) {
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity }}>
      <svg width="1080" height="1920">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

/** A plain arrow pointer. */
export function Cursor({ size = 58, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 20 24" style={style}>
      <path
        d="M2 1.5 L2 19 L6.6 14.8 L9.6 21.6 L12.6 20.3 L9.7 13.6 L16 13.4 Z"
        fill={C.ink}
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const BAR_HEIGHTS = [6, 14, 9, 4];

/**
 * The four bars of the Mindra mark, drawn the way Logo.tsx draws them (an 18-unit grid).
 * `levels` scales each bar so the mark can move like a live waveform before it settles.
 */
export function LogoBars({ unit, color, levels }: { unit: number; color: string; levels?: number[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 1.8 * unit, height: 16 * unit }}>
      {BAR_HEIGHTS.map((h, i) => (
        <div
          key={i}
          style={{
            width: 2.6 * unit,
            height: Math.max(2.6 * unit, h * unit * (levels?.[i] ?? 1)),
            borderRadius: 1.3 * unit,
            background: color,
          }}
        />
      ))}
    </div>
  );
}

/** The Mindra mark: the sound wave on the brand tile, as in the app's BrandMark. */
export function LogoMark({ size, style }: { size: number; style?: CSSProperties }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        background: C.brand,
        display: "grid",
        placeItems: "center",
        boxShadow: `0 ${size * 0.14}px ${size * 0.42}px -${size * 0.12}px rgba(91,77,224,0.5)`,
        flexShrink: 0,
        ...style,
      }}
    >
      <LogoBars unit={size / 36} color="#fff" />
    </div>
  );
}

/** Figma-style selection frame with corner handles. */
export function SelectionBox({ t, inset = -18 }: { t: number; inset?: number }) {
  const handle: CSSProperties = {
    position: "absolute",
    width: 18,
    height: 18,
    background: "#fff",
    border: `3px solid ${C.purple}`,
    borderRadius: 3,
  };
  return (
    <div
      style={{
        position: "absolute",
        inset,
        border: `3px solid ${C.purple}`,
        borderRadius: 8,
        background: `rgba(109,94,245,${0.09 * t})`,
        opacity: t,
        transform: `scale(${1.05 - 0.05 * t})`,
      }}
    >
      <div style={{ ...handle, left: -11, top: -11 }} />
      <div style={{ ...handle, right: -11, top: -11 }} />
      <div style={{ ...handle, left: -11, bottom: -11 }} />
      <div style={{ ...handle, right: -11, bottom: -11 }} />
    </div>
  );
}
