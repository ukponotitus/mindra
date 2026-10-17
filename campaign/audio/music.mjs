// Soft background music, composed in code: a warm pad, a plucked arpeggio, sub bass, and light drums in the middle.
// C major (in tune with the effect chimes) at 120 BPM, so every scene starts on a beat; the last chord lands with
// the logo sting.
import { SCENE } from "../src/timeline.ts";
import { Bus, FPS, LENGTH, SR, TAU, attack, automation, decay, hz, noise, osc, random, render, svf } from "./dsp.mjs";

const BEAT = 60 / 120;
const BAR = BEAT * 4;
const sec = (frame) => frame / FPS;
const barAfter = (seconds) => Math.ceil(seconds / BAR - 1e-9) * BAR;
const barBefore = (seconds) => Math.floor(seconds / BAR) * BAR;

/** IV – V – iii – vi, one chord per bar (MIDI notes). */
const LOOP = [
  { pad: [53, 57, 60, 64, 67], arp: [65, 69, 72, 76, 79], bass: 41 }, // Fmaj9
  { pad: [55, 59, 62, 64, 69], arp: [67, 71, 74, 76, 79], bass: 43 }, // G6/9
  { pad: [52, 55, 59, 62, 67], arp: [64, 67, 71, 74, 76], bass: 40 }, // Em7
  { pad: [57, 60, 64, 67, 71], arp: [69, 72, 76, 79, 81], bass: 45 }, // Am9
];
/** Cmaj9: home, struck together with the logo sting. */
const HOME = { pad: [48, 52, 55, 59, 62, 64], bass: 36 };

// The arrangement follows the scenes, snapped to bar lines.
const PULSE_IN = barAfter(sec(SCENE.problem)); // 6 s: sparse plucks
const ARP_IN = barAfter(sec(SCENE.record)); // 12 s: the purple flood opens the music up
const GROOVE_IN = barBefore(sec(SCENE.makeIt)); // 26 s: a gentle beat under "Make it"
const PEAK_IN = barAfter(sec(SCENE.month)); // 44 s: the dark carousel and the calendar
const BREAK_IN = barAfter(sec(SCENE.voice)); // 52 s: drums out for "your voice"
const OUTRO = sec(SCENE.end); // 56 s
const STING = sec(SCENE.end + 34); // the logo lands
const SONG_END = LENGTH / SR;

const chordAt = (seconds) => LOOP[Math.floor(seconds / BAR) % LOOP.length];

// ---------------------------------------------------------------- instruments

const TABLE = 4096;

/** One cycle of a waveform built from harmonic amplitudes, normalized to ±1. */
function wavetable(harmonics) {
  const table = new Float32Array(TABLE + 1);
  let peak = 0;
  for (let i = 0; i <= TABLE; i++) {
    let v = 0;
    for (let h = 0; h < harmonics.length; h++) v += harmonics[h] * Math.sin((TAU * (h + 1) * i) / TABLE);
    table[i] = v;
    peak = Math.max(peak, Math.abs(v));
  }
  for (let i = 0; i <= TABLE; i++) table[i] /= peak;
  return table;
}

function tableOsc(table, phase) {
  return (freq) => {
    phase += freq / SR;
    phase -= Math.floor(phase);
    const x = phase * TABLE;
    const i = x | 0;
    return table[i] + (table[i + 1] - table[i]) * (x - i);
  };
}

/** A soft, saw-ish tone with the top rolled off; the pad bus filters it further. */
const PAD_WAVE = wavetable([1, 0.5, 0.28, 0.16, 0.09, 0.05, 0.03]);

/** One pad voice: slow attack, long release, a little drift and shimmer so it breathes. */
function padVoice(freq, length, cents) {
  const read = tableOsc(PAD_WAVE, random());
  const f = freq * Math.pow(2, cents / 1200);
  const rate = 0.12 + random() * 0.2;
  const offset = random() * TAU;
  return render(length + 2, (t) => {
    const env = Math.min(1, t / 0.9) * (t < length ? 1 : decay(t - length, 0.45));
    const drift = 1 + 0.0015 * Math.sin(TAU * 0.3 * t + offset);
    const shimmer = 1 + 0.12 * Math.sin(TAU * rate * t + offset);
    return read(f * drift) * env * shimmer;
  });
}

/** Plucked note: bright for an instant, then a soft sine tail. */
function pluck(freq, velocity) {
  return render(1, (t) => {
    const p = TAU * freq * t;
    const tone = Math.sin(p) * decay(t, 0.3) + 0.32 * Math.sin(2 * p) * decay(t, 0.1) + 0.08 * Math.sin(3 * p) * decay(t, 0.045);
    return tone * attack(t, 0.004) * velocity;
  });
}

/** Round sub bass with a touch of second harmonic so it reads on phone speakers. */
function bassNote(freq, length, velocity) {
  return render(length + 0.3, (t) => {
    const env = attack(t, 0.025) * (t < length ? 1 : decay(t - length, 0.07));
    const p = TAU * freq * t;
    return Math.tanh(1.4 * (Math.sin(p) + 0.22 * Math.sin(2 * p))) * env * velocity;
  });
}

function kick(velocity) {
  const tone = osc();
  const lp = svf();
  return render(0.5, (t) => {
    const body = Math.tanh(2 * tone(46 * (1 + 1.8 * decay(t, 0.025))) * decay(t, 0.16));
    return (body + lp(noise(), 3000, 0.7).low * decay(t, 0.003) * 0.4) * velocity;
  });
}

function rim(velocity) {
  const bp = svf();
  const tone = osc();
  return render(0.12, (t) => (bp(noise(), 1900, 2.5).band * 1.5 + tone(820) * 0.4) * decay(t, 0.03) * velocity);
}

function shaker(velocity) {
  const hp = svf();
  return render(0.08, (t) => hp(noise(), 7000, 0.7).high * attack(t, 0.006) * decay(t, 0.025) * velocity);
}

// ---------------------------------------------------------------- effects on the buses

/** Ping-pong echo at a dotted eighth, each repeat a little darker. */
function pingPong(L, R, { time = BEAT * 0.75, feedback = 0.34, mix = 0.3, tone = 0.35 } = {}) {
  const size = Math.round(time * SR);
  const left = new Float32Array(size);
  const right = new Float32Array(size);
  let i = 0;
  let darkL = 0;
  let darkR = 0;
  for (let n = 0; n < LENGTH; n++) {
    darkL += (left[i] - darkL) * tone;
    darkR += (right[i] - darkR) * tone;
    left[i] = (L[n] + R[n]) * 0.5 + darkR * feedback;
    right[i] = darkL;
    L[n] += darkL * mix;
    R[n] += darkR * mix;
    if (++i >= size) i = 0;
  }
}

// ---------------------------------------------------------------- the arrangement

function padPart() {
  const bus = new Bus();
  const chords = [];
  for (let start = 0; start < OUTRO; start += BAR) chords.push({ start, length: BAR, chord: chordAt(start) });
  chords.push({ start: OUTRO, length: STING - OUTRO, chord: LOOP[0] });
  chords.push({ start: STING, length: SONG_END - STING, chord: HOME });
  for (const { start, length, chord } of chords) {
    for (const note of chord.pad) {
      bus.add(start, padVoice(hz(note), length, -8), { gain: -20, pan: -0.6, send: 0.35 });
      bus.add(start, padVoice(hz(note), length, 0), { gain: -23, pan: 0, send: 0.35 });
      bus.add(start, padVoice(hz(note), length, 8), { gain: -20, pan: 0.6, send: 0.35 });
    }
  }
  const { L, R } = bus.mixdown(0.88);
  // Opens up as the reel builds, closes for the breakdown, blooms on the last chord.
  const cutoff = automation([
    [0, 500],
    [4, 900],
    [11.5, 1000],
    [12.5, 2000],
    [GROOVE_IN, 2400],
    [PEAK_IN, 3600],
    [BREAK_IN - 0.5, 3600],
    [BREAK_IN + 0.5, 1700],
    [OUTRO, 2200],
    [STING, 3400],
    [SONG_END, 1500],
  ]);
  const level = automation([
    [0, 0],
    [2, 0.75],
    [11.5, 0.75],
    [12.5, 1],
    [STING - 0.3, 1],
    [STING + 0.3, 1.25],
    [SONG_END, 1],
  ]);
  const lowL = svf();
  const lowR = svf();
  for (let i = 0; i < LENGTH; i++) {
    const t = i / SR;
    const c = cutoff(t);
    const g = level(t);
    L[i] = lowL(L[i], c, 0.6).low * g;
    R[i] = lowR(R[i], c, 0.6).low * g;
  }
  return { L, R };
}

const ARP_ORDER = [0, 2, 1, 3, 2, 4, 3, 1];
const ARP_ACCENT = [1, 0.62, 0.8, 0.62, 0.92, 0.62, 0.8, 0.62];

function arpPart() {
  const bus = new Bus();
  for (let bar = PULSE_IN; bar < OUTRO; bar += BAR) {
    const chord = chordAt(bar);
    for (let step = 0; step < 8; step++) {
      // Before the arp opens up, only quarter notes, quietly.
      if (bar < ARP_IN && step % 2) continue;
      const when = bar + (step * BEAT) / 2 + (random() - 0.5) * 0.008;
      const section = bar < ARP_IN ? 0.5 : bar >= BREAK_IN ? 0.75 : 1;
      const velocity = ARP_ACCENT[step] * (0.9 + random() * 0.2) * section;
      const note = hz(chord.arp[ARP_ORDER[step]]);
      const pan = step % 2 ? 0.35 : -0.35;
      bus.add(when, pluck(note, velocity), { gain: -17, pan, send: 0.3 });
      if (bar >= PEAK_IN && bar < BREAK_IN) bus.add(when, pluck(note * 2, velocity), { gain: -27, pan: -pan, send: 0.4 });
    }
  }
  const { L, R } = bus.mixdown();
  pingPong(L, R);
  return { L, R };
}

function bassPart() {
  const bus = new Bus();
  const play = (when, midi, length, velocity) => bus.add(when, bassNote(hz(midi), length, velocity), { gain: -10, send: 0 });
  for (let bar = PULSE_IN; bar < OUTRO; bar += BAR) {
    const root = chordAt(bar).bass;
    if (bar < ARP_IN || bar >= BREAK_IN) {
      play(bar, root, BAR - 0.05, 0.6);
    } else if (bar >= PEAK_IN) {
      for (let step = 0; step < 8; step++) play(bar + (step * BEAT) / 2, root, 0.2, step % 2 ? 0.7 : 1);
    } else {
      play(bar, root, 1.35, 0.9);
      play(bar + BEAT * 2.5, root, 0.4, 0.6);
    }
  }
  play(OUTRO, LOOP[0].bass, STING - OUTRO, 0.7);
  play(STING, HOME.bass, SONG_END - STING, 0.85);
  return bus.mixdown();
}

function drumPart() {
  const bus = new Bus();
  for (let bar = GROOVE_IN; bar < BREAK_IN; bar += BAR) {
    const peak = bar >= PEAK_IN;
    if (peak) {
      for (let beat = 0; beat < 4; beat++) bus.add(bar + beat * BEAT, kick(0.85), { gain: -11, send: 0.03 });
      for (const beat of [1, 3]) bus.add(bar + beat * BEAT, rim(0.8), { gain: -20, send: 0.2 });
      for (let step = 0; step < 16; step++) {
        bus.add(bar + (step * BEAT) / 4, shaker([0.35, 0.6, 0.45, 0.8][step % 4]), { gain: -24, pan: 0.3, send: 0.08 });
      }
    } else {
      // Half-time: kick on 1 and the "and" of 2, a soft rim on 3, shaker on the eighths.
      for (const beat of [0, 1.5]) bus.add(bar + beat * BEAT, kick(beat ? 0.6 : 0.8), { gain: -11, send: 0.03 });
      bus.add(bar + 2 * BEAT, rim(0.7), { gain: -20, send: 0.2 });
      for (let step = 0; step < 8; step++) {
        bus.add(bar + (step * BEAT) / 2, shaker(step % 2 ? 0.7 : 0.35), { gain: -24, pan: 0.3, send: 0.08 });
      }
    }
  }
  return bus.mixdown(0.8);
}

/** The whole piece as one stereo mix. */
export function buildMusic() {
  const parts = [padPart(), arpPart(), bassPart(), drumPart()];
  const L = new Float32Array(LENGTH);
  const R = new Float32Array(LENGTH);
  for (const part of parts) {
    for (let i = 0; i < LENGTH; i++) {
      L[i] += part.L[i];
      R[i] += part.R[i];
    }
  }
  return { L, R };
}
