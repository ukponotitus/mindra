// Builds the reel's soundtrack: the voice-over (voiceover.mjs, generated into audio/voice/ by `npm run voice`), the
// sound effects (sfx.mjs) and soft music (music.mjs). The voice leads; effects and music dip while it speaks, and the
// music also dips under every big effect. The mix is levelled for social video and written to
// public/audio/mindra-reel.wav, which MindraReel.tsx plays. Run `npm run audio` after changing any timing, then
// `npm run render`. Without generated voice lines it builds effects and music only; `-- --no-music` drops the music.
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Bus, FPS, LENGTH, SR, db, decode, speechEnd } from "./dsp.mjs";
import { buildMusic } from "./music.mjs";
import { buildSfx } from "./sfx.mjs";
import { LINES } from "./voiceover.mjs";

const CEILING_DB = -1.5;
// Levels compare the integrated loudness of each layer.
/** With a voice-over: voice-led, like most social ads. */
const TARGET_WITH_VOICE_LUFS = -14;
const SFX_UNDER_VOICE_LU = 3;
const MUSIC_UNDER_VOICE_LU = 12;
/** Without one: effects lead. */
const TARGET_LUFS = -16;
const MUSIC_UNDER_SFX_LU = 6;
/** How far the music dips while an effect is sounding. */
const DUCK_DB = 5;
/** How far effects and music dip while the narrator speaks. */
const SFX_DUCK_UNDER_VOICE_DB = 4;
const MUSIC_DUCK_UNDER_VOICE_DB = 6;
/** Seconds each voice line keeps after its last word, fading out. */
const VOICE_TAIL = 0.12;
const here = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT = path.join(here, "../public/audio/mindra-reel.wav");
const withMusic = !process.argv.includes("--no-music");
const work = mkdtempSync(path.join(tmpdir(), "mindra-audio-"));

function writeWav(file, L, R, gain = 1) {
  const data = Buffer.alloc(LENGTH * 4);
  const to16 = (v) => Math.max(-32768, Math.min(32767, Math.round(v * gain * 32767)));
  for (let i = 0; i < LENGTH; i++) {
    data.writeInt16LE(to16(L[i]), i * 4);
    data.writeInt16LE(to16(R[i]), i * 4 + 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(2, 22);
  header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([header, data]));
}

/** Integrated loudness (LUFS) and sample peak (dBFS) of a file, from ffmpeg's EBU R128 meter. */
function measure(file) {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=sample", "-f", "null", "-"], {
    encoding: "utf8",
  });
  const summary = run.stderr.slice(run.stderr.lastIndexOf("Summary:"));
  return {
    lufs: Number(/I:\s+(-?[\d.]+) LUFS/.exec(summary)?.[1]),
    peak: Number(/Peak:\s+(-?[\d.]+) dBFS/.exec(summary)?.[1]),
  };
}

const peakOf = (L, R) => {
  let peak = 1e-9;
  for (let i = 0; i < LENGTH; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  return peak;
};

/** Loudness of a buffer, measured on a peak-normalized copy so nothing clips in the 16-bit file. */
function loudnessOf(L, R) {
  const peak = peakOf(L, R);
  const file = path.join(work, "measure.wav");
  writeWav(file, L, R, 1 / peak);
  return measure(file).lufs + 20 * Math.log10(peak);
}

/** A gain that follows `source` (fast attack, slow release) and dips by up to `depth` dB while it sounds. */
function ducking(source, depth, { threshold = 0.3, release = 0.35 } = {}) {
  const peak = peakOf(source.L, source.R);
  const rise = Math.exp(-1 / (0.004 * SR));
  const fall = Math.exp(-1 / (release * SR));
  const gain = new Float32Array(LENGTH);
  let level = 0;
  for (let i = 0; i < LENGTH; i++) {
    const x = Math.max(Math.abs(source.L[i]), Math.abs(source.R[i])) / peak;
    level = x + (level - x) * (x > level ? rise : fall);
    gain[i] = db(-depth * Math.min(1, level / threshold));
  }
  return gain;
}

/** The narrator's lines on their frames, or null until `npm run voice` has generated all of them. */
function loadVoice() {
  const files = LINES.map((line) => path.join(here, "voice", `${line.id}.mp3`));
  if (!files.every(existsSync)) return null;
  const bus = new Bus();
  LINES.forEach((line, i) => {
    // Ends each line just after its last word, so a trailing breath can't sound over the next line.
    const samples = decode(files[i]);
    const keep = Math.min(samples.length, Math.round((speechEnd(samples) + VOICE_TAIL) * SR));
    const fade = Math.round(VOICE_TAIL * SR);
    const trimmed = samples.slice(0, keep).map((v, j) => v * Math.min(1, (keep - j) / fade));
    bus.add(line.frame / FPS, trimmed, { gain: 0, send: 0.04 });
  });
  return bus.mixdown(0.7);
}

/**
 * Look-ahead peak limiter: never lets a sample pass the ceiling and recovers smoothly. Returns the share of samples it
 * turns down by more than 1 dB.
 */
function limit(L, R, ceiling) {
  const look = Math.round(0.003 * SR);
  const release = Math.exp(-1 / (0.12 * SR));
  const need = new Float32Array(LENGTH);
  for (let i = 0; i < LENGTH; i++) {
    const peak = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    need[i] = peak > ceiling ? ceiling / peak : 1;
  }
  let gain = 1;
  let touched = 0;
  for (let i = 0; i < LENGTH; i++) {
    let target = 1;
    for (let j = i; j < Math.min(LENGTH, i + look); j++) target = Math.min(target, need[j]);
    gain = target < gain ? target : target + (gain - target) * release;
    if (gain < db(-1)) touched++;
    L[i] *= gain;
    R[i] *= gain;
  }
  return touched / LENGTH;
}

const L = new Float32Array(LENGTH);
const R = new Float32Array(LENGTH);
/** Adds a layer at `level`, optionally shaped by per-sample gains. */
function add(layer, level, ...gains) {
  for (let i = 0; i < LENGTH; i++) {
    let g = level;
    for (const gain of gains) g *= gain[i];
    L[i] += layer.L[i] * g;
    R[i] += layer.R[i] * g;
  }
}

const sfx = buildSfx();
const voice = loadVoice();
const music = withMusic ? buildMusic() : null;
const sfxLufs = loudnessOf(sfx.L, sfx.R);
const layers = [];
let target = TARGET_LUFS;
if (voice) {
  const voiceLufs = loudnessOf(voice.L, voice.R);
  const underVoice = (depth) => ducking(voice, depth, { threshold: 0.12, release: 0.45 });
  add(voice, 1);
  add(sfx, db(voiceLufs - SFX_UNDER_VOICE_LU - sfxLufs), underVoice(SFX_DUCK_UNDER_VOICE_DB));
  if (music) {
    const level = db(voiceLufs - MUSIC_UNDER_VOICE_LU - loudnessOf(music.L, music.R));
    add(music, level, ducking(sfx, DUCK_DB), underVoice(MUSIC_DUCK_UNDER_VOICE_DB));
  }
  target = TARGET_WITH_VOICE_LUFS;
  layers.push("voice-over", `effects ${SFX_UNDER_VOICE_LU} LU under it`);
  if (music) layers.push(`music ${MUSIC_UNDER_VOICE_LU} LU under it`);
} else {
  add(sfx, 1);
  if (music) add(music, db(sfxLufs - MUSIC_UNDER_SFX_LU - loudnessOf(music.L, music.R)), ducking(sfx, DUCK_DB));
  layers.push("no voice-over yet (run npm run voice)", "effects");
  if (music) layers.push(`music ${MUSIC_UNDER_SFX_LU} LU under them`);
}
const note = layers.join(", ");

const gain = db(target - loudnessOf(L, R));
for (let i = 0; i < LENGTH; i++) {
  L[i] *= gain;
  R[i] *= gain;
}
const touched = limit(L, R, db(CEILING_DB));
const fade = Math.round(0.5 * SR);
for (let i = 0; i < fade; i++) {
  L[LENGTH - 1 - i] *= i / fade;
  R[LENGTH - 1 - i] *= i / fade;
}

mkdirSync(path.dirname(OUTPUT), { recursive: true });
writeWav(OUTPUT, L, R);
rmSync(work, { recursive: true, force: true });
const result = measure(OUTPUT);
console.log(
  `Wrote ${path.relative(process.cwd(), OUTPUT)}: ${result.lufs} LUFS, peak ${result.peak} dBFS ` +
    `(${note}; limiter over 1 dB on ${(touched * 100).toFixed(1)}% of samples)`,
);
