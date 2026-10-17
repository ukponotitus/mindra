import type { CSSProperties } from "react";
import { Easing, interpolate } from "remotion";

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1);
export const easeIn = Easing.bezier(0.55, 0, 1, 0.45);

/** 0 → 1 between `start` and `start + duration`, clamped at both ends. */
export function ramp(frame: number, start: number, duration: number, easing = easeOut) {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

/** Visible from `enter` until `exit`: fades in, holds, then fades out. */
export function life(frame: number, enter: number, exit: number, enterDuration = 22, exitDuration = 14) {
  return ramp(frame, enter, enterDuration) * (1 - ramp(frame, exit, exitDuration, easeIn));
}

export const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/** The blur-in used across the reel: soft, low and transparent at 0; sharp and in place at 1. */
export function blurIn(t: number, rise = 36, blur = 16): CSSProperties {
  return {
    opacity: t,
    filter: t < 0.999 ? `blur(${(1 - t) * blur}px)` : undefined,
    transform: `translateY(${(1 - t) * rise}px)`,
  };
}

/** Deterministic pseudo-random number in [0, 1) for a given seed. */
export function rand(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
