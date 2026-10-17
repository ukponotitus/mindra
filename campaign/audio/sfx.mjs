// The reel's sound effects: every sound is synthesized here and placed on the frame where its animation happens,
// panned to where it sits on screen.
import { easeOut, ramp } from "../src/anim.ts";
import { RIBBON_COVERED, SCENE, WIPE_COVERED } from "../src/timeline.ts";
import { Bus, FPS, TAU, attack, decay, noise, osc, random, render, svf } from "./dsp.mjs";

// ---------------------------------------------------------------- the sounds

/** Soft UI pop: a sine that drops in pitch, with a tiny click on top. */
function pop(pitch = 1) {
  const body = osc();
  const overtone = osc();
  const hp = svf();
  return render(0.18, (t) => {
    const f = 520 * pitch * (1 + 1.4 * decay(t, 0.007));
    const tone = (body(f) + 0.18 * overtone(f * 2)) * attack(t, 0.001) * decay(t, 0.035);
    const click = hp(noise(), 3000, 0.7).high * decay(t, 0.0015) * 0.5;
    return (tone + click) * 0.8;
  });
}

/** Tiny tick for words appearing and numbers counting. */
function tick(pitch = 1) {
  const tone = osc();
  const bp = svf();
  return render(0.05, (t) => tone(2400 * pitch) * decay(t, 0.0045) * 0.6 + bp(noise(), 5200 * pitch, 2).band * decay(t, 0.002) * 0.8);
}

/** Keyboard key: press and release. */
function key(pitch = 1) {
  const down = svf();
  const up = svf();
  const thock = osc();
  const centre = 2200 * pitch;
  return render(0.12, (t) => {
    const press = down(noise(), centre, 1.8).band * decay(t, 0.006) * 1.4 + thock(190 * pitch) * decay(t, 0.018) * 0.35;
    const later = t - 0.055;
    const release = later > 0 ? up(noise(), centre * 1.3, 2).band * decay(later, 0.004) * 0.6 : 0;
    return press + release;
  });
}

/** Wheel notch: a short, low tick. */
function notch() {
  const tone = osc();
  const bp = svf();
  return render(0.08, (t) => tone(900) * decay(t, 0.006) * 0.5 + bp(noise(), 1600, 3).band * decay(t, 0.004) * 1.2);
}

/** Mouse click: down and up. */
function click() {
  const hp = svf();
  const tone = osc();
  const hit = (t) => (t >= 0 ? decay(t, 0.0018) : 0);
  return render(0.12, (t) => hp(noise(), 2500, 0.8).high * (hit(t) + 0.6 * hit(t - 0.06)) * 0.9 + tone(3400) * hit(t) * 0.5);
}

/** High blip for the confetti pixels. */
function blip(pitch = 1) {
  const tone = osc();
  return render(0.08, (t) => tone(1700 * pitch) * attack(t, 0.001) * decay(t, 0.016) * 0.6);
}

/** Filtered-noise whoosh. The band sweeps exponentially from `from` to `to` Hz; loudest at `peak` (0–1). */
function whoosh({ dur = 0.55, from = 250, to = 3200, q = 1.4, peak = 0.55, air = 0.3 } = {}) {
  const bp = svf();
  const hp = svf();
  const shape = Math.log(0.5) / Math.log(peak);
  return render(dur, (t) => {
    const u = t / dur;
    const env = Math.sin(Math.PI * Math.pow(u, shape)) ** 2;
    const n = noise();
    const body = bp(n, from * Math.pow(to / from, u), q).band;
    const hiss = hp(n, 6500, 0.7).high * air;
    return (body * 1.6 + hiss) * env;
  });
}

/** Rising air that ends exactly when something lands (like a reversed cymbal, softer). */
function swell(dur = 0.6) {
  const bp = svf();
  const hp = svf();
  return render(dur, (t) => {
    const u = t / dur;
    const env = Math.pow(u, 2.6) * (u > 0.94 ? (1 - u) / 0.06 : 1);
    const n = noise();
    return (bp(n, 900 + 5000 * u * u, 0.9).band * 0.9 + hp(n, 7000, 0.7).high * 0.4) * env;
  });
}

/** Sub thump with a soft transient. */
function thump({ base = 52, length = 0.2, punch = 1 } = {}) {
  const tone = osc();
  const lp = svf();
  return render(Math.max(0.6, length * 5), (t) => {
    const f = base * (1 + 2.2 * decay(t, 0.028));
    const body = Math.tanh(1.6 * tone(f) * decay(t, length)) * attack(t, 0.0015);
    const transient = lp(noise(), 2400, 0.7).low * decay(t, 0.004) * 0.9 * punch;
    return (body + transient) * 0.9;
  });
}

/** Bell-like chime: inharmonic partials per note, notes staggered like a strum. */
function chime({ notes = [1046.5, 1318.5, 1568, 2093], stagger = 0.045, dur = 1.8, ring = 0.55, bright = 1 } = {}) {
  const partials = [
    [1, 1, 1],
    [2.756, 0.28 * bright, 0.32],
    [5.404, 0.1 * bright, 0.12],
  ];
  const voices = notes.map((freq, n) => ({
    start: n * stagger,
    freq: freq * (1 + (random() - 0.5) * 0.003),
    oscs: partials.map(() => osc()),
  }));
  return render(dur, (t) => {
    let s = 0;
    for (const voice of voices) {
      const local = t - voice.start;
      if (local < 0) continue;
      for (let p = 0; p < partials.length; p++) {
        const [ratio, gain, length] = partials[p];
        s += voice.oscs[p](voice.freq * ratio) * gain * decay(local, ring * length) * attack(local, 0.002);
      }
    }
    return (s / notes.length) * 1.1;
  });
}

const success = () => chime({ notes: [1318.5, 1975.5], stagger: 0.09, dur: 1.2, ring: 0.45 });
const sparkle = () => chime({ notes: [2093, 2637, 3136, 3951, 4186], stagger: 0.032, dur: 1.4, ring: 0.35, bright: 0.6 });

/** Two short record beeps. */
function recBeep() {
  const tone = osc();
  return render(0.3, (t) => {
    const local = t < 0.1 ? t : t - 0.13;
    const on = local >= 0 && local < 0.07;
    const env = on ? attack(local, 0.004) * Math.min(1, (0.07 - local) / 0.006) : 0;
    return tone(1320) * env * 0.45;
  });
}

/** Pen strike-through: a short, grainy scratch. */
function strike() {
  const bp = svf();
  return render(0.2, (t) => {
    const u = t / 0.2;
    const env = u < 0.87 ? Math.sin((Math.PI * u) / 0.87) ** 1.5 : 0;
    const grain = 0.6 + 0.4 * Math.sin(TAU * 70 * t + 3 * Math.sin(TAU * 13 * t));
    return bp(noise(), 2600 + 1800 * u, 2.5).band * env * grain * 1.5;
  });
}

/** Water-drop "bloop" for the dot. */
function drop() {
  const tone = osc();
  return render(0.25, (t) => tone(380 + 1100 * (1 - decay(t, 0.03))) * attack(t, 0.002) * decay(t, 0.05) * 0.8);
}

// ---------------------------------------------------------------- the cues

/** Screen x (0–1080) to a gentle stereo position. */
const panX = (x) => ((x - 540) / 540) * 0.7;

/** Every effect on its frame, mixed with its reverb. */
export function buildSfx() {
  const bus = new Bus();
  /** Places a sound at a (possibly fractional) frame. */
  const cue = (frame, sound, options) => bus.add(frame / FPS, sound, options);

  // 0–5.5s — "You spoke for 48 minutes. It was heard once."
  {
    const s = SCENE.hook;
    cue(s + 1, whoosh({ dur: 0.6, from: 2000, to: 7000, q: 0.8, peak: 0.35 }), { gain: -24 });
    cue(s + 9, thump({ base: 50 }), { gain: -9, send: 0.05 });
    let last = 0;
    for (let f = 8; f <= 56; f++) {
      const value = Math.round(48 * ramp(f, 8, 48, easeOut));
      if (value !== last) cue(s + f, tick(1 + (value / 48) * 0.6), { gain: -15, send: 0.04 });
      last = value;
    }
    cue(s + 56, pop(0.8), { gain: -15 });
    cue(s + 74, whoosh({ dur: 0.45, from: 800, to: 4000 }), { gain: -20 });
    cue(s + 82, swell(0.5), { gain: -15 });
    cue(s + 98, thump({ base: 44, length: 0.3 }), { gain: -5, send: 0.08 });
    cue(s + 100, sparkle(), { gain: -17, send: 0.35 });
    cue(s + 148, whoosh({ dur: 0.5, from: 3000, to: 400 }), { gain: -17 });
  }

  // 5.5–11.5s — the jobs after Sunday pile up, get struck out, collapse into a dot
  {
    const s = SCENE.problem;
    const items = [
      [6, 222, 1],
      [12, 747, 1.12],
      [18, 532, 0.9],
      [24, 271, 1.25],
      [30, 800, 0.95],
      [36, 263, 1.18],
      [42, 780, 1.05],
      [48, 430, 0.85],
      [54, 741, 1.3],
    ];
    for (const [at, x, pitch] of items) cue(s + at, pop(pitch), { gain: -11, pan: panX(x) });
    [300, 950, 190, 560, 900, 120, 960, 70, 480, 940, 170, 880].forEach((x, i) =>
      cue(s + 8 + i * 5, blip(1.2 + random() * 0.8), { gain: -22, pan: panX(x), send: 0.2 }),
    );
    cue(s + 4, notch(), { gain: -18 });
    cue(s + 80, swell(0.4), { gain: -16 });
    cue(s + 92, thump({ base: 58 }), { gain: -8, send: 0.06 });
    items.forEach(([, x], i) => cue(s + 104 + i * 4, strike(), { gain: -15, pan: panX(x), send: 0.05 }));
    cue(s + 144, whoosh({ dur: 0.9, from: 5000, to: 250, q: 1.2, peak: 0.93 }), { gain: -11, send: 0.15 });
    cue(s + 158, drop(), { gain: -10, send: 0.2 });
  }

  // 11.5–17.5s — "Rec◯rd once." and the recording
  {
    const s = SCENE.record;
    cue(s, thump({ base: 40, length: 0.3 }), { gain: -6, send: 0.08 });
    cue(s, whoosh({ dur: 0.7, from: 150, to: 1800, q: 1, peak: 0.3 }), { gain: -12 });
    cue(s + 8, pop(0.75), { gain: -8 });
    cue(s + 12, whoosh({ dur: 0.35, from: 1200, to: 5000 }), { gain: -20 });
    cue(s + 38, recBeep(), { gain: -14, send: 0.15 });
    cue(s + 38, whoosh({ dur: 1.0, from: 300, to: 1200, q: 3, peak: 0.6, air: 0 }), { gain: -16 });
    cue(s + 74, whoosh({ dur: 1.0, from: 200, to: 3000, q: 1.2, peak: 0.6 }), { gain: -9 });
    cue(s + 100, thump({ base: 55 }), { gain: -12, send: 0.06 });
    for (let i = 0; i < 7; i++) cue(s + 102 + i * 4, tick(0.8), { gain: -18 });
    cue(s + 142, whoosh({ dur: 0.8, from: 400, to: 3500, peak: 0.5 }), { gain: -12 });
    cue(s + 164, pop(0.6), { gain: -14 });
  }

  // 17.5–26.5s — "Mindra listens.": the transcript writes itself, the best moment is picked
  {
    const s = SCENE.listens;
    cue(s, whoosh({ dur: 1.1, from: 3000, to: 9000, q: 4, peak: 0.5, air: 0 }), { gain: -26 });
    cue(s + 4, whoosh({ dur: 0.5, from: 1500, to: 6000, peak: 0.6 }), { gain: -21 });
    const lines = [8, 7, 7, 8];
    lines.forEach((words, li) => {
      const start = 26 + li * 28;
      for (let wi = 0; wi < words; wi++) cue(s + start + wi * 2.6, tick(0.9 + random() * 0.25), { gain: -20, send: 0.04 });
      if (li !== 1) cue(s + start + words * 2.6 + 12, pop(1.2), { gain: -15 });
    });
    cue(s + 140, success(), { gain: -11, send: 0.3 });
    cue(s + 156, whoosh({ dur: 0.3, from: 2000, to: 5000, air: 0.5 }), { gain: -25, pan: 0.5, panTo: 0.3 });
    cue(s + 180, click(), { gain: -8, pan: 0.3 });
    cue(s + 182, blip(1.4), { gain: -17 });
    cue(s + 188, pop(1.3), { gain: -10, pan: -0.2 });
    cue(s + 190, sparkle(), { gain: -22, send: 0.35 });
    cue(s + 246, whoosh({ dur: 0.5, from: 3000, to: 500 }), { gain: -17 });
  }

  // 26.5–37.5s — "Make it ___"
  {
    const s = SCENE.makeIt;
    for (let k = 1; k <= 7; k++) cue(s + 4 + (24 * k) / 7, key(0.9 + random() * 0.25), { gain: -10, pan: -0.4 + k * 0.06 });
    cue(s + 32, whoosh({ dur: 0.45, from: 600, to: 3000 }), { gain: -19 });
    for (let k = 0; k < 6; k++) {
      const step = s + 40 + 36 * k;
      cue(step + 22, whoosh({ dur: 0.4, from: 300, to: 1600, q: 1, peak: 0.55 }), { gain: -14 });
      cue(step + 34, pop(0.7), { gain: -17 });
      cue(step + 24, notch(), { gain: -10, pan: -0.3 });
      cue(step + 24, whoosh({ dur: 0.35, from: 800, to: 2500, q: 2 }), { gain: -21, pan: -0.3 });
    }
    cue(s + 250, whoosh({ dur: 0.6, from: 1500, to: 300 }), { gain: -16 });
    cue(s + 258, sparkle(), { gain: -9, send: 0.35 });
    cue(s + 312, whoosh({ dur: 0.5, from: 3000, to: 500 }), { gain: -17 });
  }

  // 37.5–43.5s — "One upload. Every channel."
  {
    const s = SCENE.everywhere;
    cue(s, swell(0.5), { gain: -22 });
    cue(s + 8, thump({ base: 60 }), { gain: -10, send: 0.06 });
    cue(s + 8, pop(0.65), { gain: -12 });
    [270, 810, 140, 950, 250, 790, 250, 540, 820].forEach((x, i) => {
      const pitch = 0.85 + random() * 0.4;
      cue(s + 26 + i * 4, whoosh({ dur: 0.24, from: 900 * pitch, to: 7000 * pitch, q: 3, peak: 0.35, air: 0.4 }), {
        gain: -13,
        pan: 0,
        panTo: panX(x),
      });
      cue(s + 36 + i * 4, pop(1.05 + i * 0.05), { gain: -18, pan: panX(x) });
    });
    // The threads reach each channel: a rising pentatonic pluck per thread.
    [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98].forEach((note, i) =>
      cue(s + 52 + i * 4, chime({ notes: [note], dur: 0.9, ring: 0.3, bright: 0.5 }), { gain: -21, pan: (i % 2 ? 0.4 : -0.4), send: 0.3 }),
    );
    const ribbon = SCENE.month - RIBBON_COVERED - 2;
    cue(ribbon - 36, swell(1.25), { gain: -14, send: 0.1 });
    cue(ribbon, whoosh({ dur: 1.1, from: 150, to: 3000, q: 0.9, peak: 0.6, air: 0.5 }), { gain: -6, pan: -0.7, panTo: 0.7 });
    cue(ribbon + 24, thump({ base: 42, length: 0.35 }), { gain: -8, send: 0.1 });
  }

  // 43.5–51.5s — the slogan carousel, then thirty days fill up
  {
    const s = SCENE.month;
    cue(s + 2, whoosh({ dur: 0.5, from: 300, to: 2500 }), { gain: -14 });
    for (let k = 0; k < 4; k++) {
      cue(s + 16 + 24 * k, whoosh({ dur: 0.42, from: 300, to: 2400, q: 1.2, peak: 0.45 }), { gain: -11, pan: 0.5, panTo: -0.5 });
      cue(s + 28 + 24 * k, notch(), { gain: -18 });
    }
    cue(s + 118, whoosh({ dur: 0.5, from: 2500, to: 400 }), { gain: -14 });
    cue(s + 120, swell(0.3), { gain: -18 });
    for (let order = 0; order < 30; order++) {
      const day = (order * 13) % 30;
      const x = 183 + (day % 6) * 122 + 52;
      cue(s + 146 + order * 2, pop(0.9 + (order / 29) * 0.7), { gain: -15, pan: panX(x) });
    }
    cue(s + 206, success(), { gain: -10, send: 0.3 });
    cue(SCENE.voice - WIPE_COVERED - 2, whoosh({ dur: 0.6, from: 300, to: 4000, peak: 0.6 }), { gain: -9 });
  }

  // 51.5–56s — "Written in your voice."
  {
    const s = SCENE.voice;
    cue(s + 14, whoosh({ dur: 0.45, from: 300, to: 2000, peak: 0.6 }), { gain: -14 });
    cue(s + 22, thump({ base: 60 }), { gain: -13, send: 0.06 });
    for (const at of [30, 66, 100]) cue(s + at, whoosh({ dur: 0.55, from: 120, to: 1100, q: 0.8, peak: 0.5 }), { gain: -10 });
    let last = 0;
    let lastFrame = -9;
    for (let f = 24; f <= 92; f++) {
      const value = Math.round(94 * ramp(f, 24, 68, easeOut));
      if (value !== last && f - lastFrame >= 2) {
        cue(s + f, tick(1 + (value / 94) * 0.7), { gain: -20, pan: 0.4, send: 0.04 });
        lastFrame = f;
      }
      last = value;
    }
    cue(s + 92, pop(1.4), { gain: -15, pan: 0.4 });
    cue(s + 46, pop(0.9), { gain: -10, pan: -0.5 });
    const ribbon = SCENE.end - RIBBON_COVERED - 2;
    cue(ribbon, whoosh({ dur: 1.1, from: 150, to: 3000, q: 0.9, peak: 0.6, air: 0.5 }), { gain: -6, pan: -0.7, panTo: 0.7 });
  }

  // 56–60s — the mark, the promise, the button
  {
    const s = SCENE.end;
    cue(s + 4, blip(0.8), { gain: -16 });
    cue(s + 18, swell(0.55), { gain: -12 });
    cue(s + 34, thump({ base: 44, length: 0.4 }), { gain: -4, send: 0.1 });
    cue(s + 34, chime({ notes: [523.25, 659.25, 783.99, 987.77, 1174.66], stagger: 0.025, dur: 2.6, ring: 0.9 }), { gain: -8, send: 0.35 });
    cue(s + 50, whoosh({ dur: 0.6, from: 500, to: 2500 }), { gain: -16, pan: -0.3, panTo: 0.3 });
    cue(s + 84, pop(1), { gain: -10 });
    cue(s + 86, sparkle(), { gain: -16, send: 0.35 });
  }

  return bus.mixdown();
}
