// Small synthesis toolkit shared by the sound effects (sfx.mjs), the music (music.mjs) and the voice-over scripts.
import { spawnSync } from "node:child_process";
import { END } from "../src/timeline.ts";

export const SR = 48000;
export const FPS = 30;
export const TAU = Math.PI * 2;
/** Samples in the whole reel. */
export const LENGTH = Math.round((END / FPS) * SR);

let seed = 20261014;
/** Deterministic random in [0, 1), so every build sounds the same. */
export const random = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
export const noise = () => random() * 2 - 1;
export const decay = (t, tau) => Math.exp(-t / tau);
export const attack = (t, time) => (t < time ? t / time : 1);
export const db = (value) => Math.pow(10, value / 20);
export const hz = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/** Decodes an audio file to mono samples at SR (needs ffmpeg). */
export function decode(file) {
  const run = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(SR), "-"], { maxBuffer: 1 << 28 });
  return new Float32Array(run.stdout.buffer, run.stdout.byteOffset, run.stdout.length / 4);
}

/**
 * Seconds until the last word of a voice line ends. Skips trailing silence and any breath after the last word: a
 * sound that follows a pause of at least 150 ms and stays 20 dB under the line's loudest moment.
 */
export function speechEnd(samples) {
  const size = Math.round(SR * 0.01);
  const levels = [];
  for (let i = 0; i < samples.length; i += size) {
    let level = 0;
    for (let j = i; j < Math.min(samples.length, i + size); j++) level = Math.max(level, Math.abs(samples[j]));
    levels.push(level);
  }
  const loudest = levels.reduce((a, b) => Math.max(a, b), 0);
  const silent = (k) => levels[k] < db(-45);
  let end = levels.length;
  for (;;) {
    while (end > 0 && silent(end - 1)) end--;
    let start = end;
    let quiet = 0;
    let level = 0;
    while (start > 0 && quiet < 15) {
      start--;
      quiet = silent(start) ? quiet + 1 : 0;
      level = Math.max(level, levels[start]);
    }
    if (start === 0 || level > loudest * db(-20)) return (end * size) / SR;
    end = start;
  }
}

/** Sine oscillator whose frequency can change every sample without clicks. */
export function osc() {
  let phase = 0;
  return (freq) => {
    phase += (TAU * freq) / SR;
    return Math.sin(phase);
  };
}

/** Zavalishin's TPT state-variable filter: stays stable while the cutoff sweeps. */
export function svf() {
  let ic1 = 0;
  let ic2 = 0;
  return (x, cutoff, q) => {
    const g = Math.tan((Math.PI * Math.min(cutoff, SR * 0.45)) / SR);
    const k = 1 / q;
    const a1 = 1 / (1 + g * (g + k));
    const a2 = g * a1;
    const a3 = g * a2;
    const v3 = x - ic2;
    const v1 = a1 * ic1 + a2 * v3;
    const v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1;
    ic2 = 2 * v2 - ic2;
    return { low: v2, band: v1, high: x - k * v1 - v2 };
  };
}

/** Renders `seconds` of mono sound, sample by sample, with a 4 ms fade at the end so a cut-off tail can't click. */
export function render(seconds, fn) {
  const out = new Float32Array(Math.round(seconds * SR));
  const fade = Math.round(0.004 * SR);
  for (let i = 0; i < out.length; i++) out[i] = fn(i / SR) * Math.min(1, (out.length - i) / fade);
  return out;
}

/** Linear automation through [seconds, value] points. */
export function automation(points) {
  return (t) => {
    if (t <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      const [t1, v1] = points[i];
      if (t <= t1) {
        const [t0, v0] = points[i - 1];
        return v0 + ((v1 - v0) * (t - t0)) / (t1 - t0);
      }
    }
    return points[points.length - 1][1];
  };
}

/** Freeverb: eight damped combs into four allpasses. `spread` offsets the right channel's delays for width. */
export function freeverb(input, spread, room = 0.84) {
  const scale = SR / 44100;
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => ({
    buf: new Float32Array(Math.round((d + spread) * scale)),
    i: 0,
    store: 0,
  }));
  const allpasses = [556, 441, 341, 225].map((d) => ({ buf: new Float32Array(Math.round((d + spread) * scale)), i: 0 }));
  const out = new Float32Array(input.length);
  for (let n = 0; n < input.length; n++) {
    const x = input[n] * 0.015;
    let y = 0;
    for (const c of combs) {
      const o = c.buf[c.i];
      c.store = o * 0.75 + c.store * 0.25;
      c.buf[c.i] = x + c.store * room;
      if (++c.i >= c.buf.length) c.i = 0;
      y += o;
    }
    for (const a of allpasses) {
      const b = a.buf[a.i];
      a.buf[a.i] = y + b * 0.5;
      y = b - y;
      if (++a.i >= a.buf.length) a.i = 0;
    }
    out[n] = y * 3;
  }
  return out;
}

/** A stereo mix bus with a reverb send. */
export class Bus {
  constructor() {
    this.L = new Float32Array(LENGTH);
    this.R = new Float32Array(LENGTH);
    this.send = new Float32Array(LENGTH);
  }

  /** Adds a mono sound at `seconds`. `pan` runs -1 (left) to 1 (right); `panTo` sweeps it; `send` feeds the reverb. */
  add(seconds, sound, { gain = -12, pan = 0, panTo, send = 0.12 } = {}) {
    const g = db(gain);
    const start = Math.round(seconds * SR);
    const angle = ((pan + 1) * Math.PI) / 4;
    let left = Math.cos(angle);
    let right = Math.sin(angle);
    for (let i = 0; i < sound.length; i++) {
      const j = start + i;
      if (j < 0 || j >= LENGTH) continue;
      if (panTo !== undefined) {
        const sweep = ((pan + (panTo - pan) * (i / sound.length) + 1) * Math.PI) / 4;
        left = Math.cos(sweep);
        right = Math.sin(sweep);
      }
      const s = sound[i] * g;
      this.L[j] += s * left;
      this.R[j] += s * right;
      this.send[j] += s * send;
    }
  }

  /** The dry signal plus its reverb. */
  mixdown(room = 0.84) {
    const wetL = freeverb(this.send, 0, room);
    const wetR = freeverb(this.send, 23, room);
    for (let i = 0; i < LENGTH; i++) {
      this.L[i] += wetL[i];
      this.R[i] += wetR[i];
    }
    return { L: this.L, R: this.R };
  }
}
