// Generates the voice-over lines with ElevenLabs text-to-speech and saves them in audio/voice/.
// Needs ELEVENLABS_API_KEY in campaign/.env. Lines whose text, voice and settings haven't changed are kept, so
// re-running only pays for what changed. Then run `npm run audio` and `npm run render`.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FPS, decode, speechEnd } from "./dsp.mjs";
import { LINES, MODEL_ID, VOICE_ID, VOICE_SETTINGS } from "./voiceover.mjs";
import { END } from "../src/timeline.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const folder = path.join(here, "voice");
const manifestFile = path.join(folder, "manifest.json");

process.loadEnvFile(path.join(here, "../.env"));
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("Set ELEVENLABS_API_KEY in campaign/.env");

mkdirSync(folder, { recursive: true });
const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : {};

async function speak(line, index) {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      text: line.text,
      model_id: MODEL_ID,
      voice_settings: VOICE_SETTINGS,
      // Neighbouring lines keep the delivery consistent from one line to the next.
      previous_text: LINES[index - 1]?.text,
      next_text: LINES[index + 1]?.text,
    }),
  });
  if (!response.ok) throw new Error(`ElevenLabs ${response.status} for "${line.id}": ${await response.text()}`);
  return Buffer.from(await response.arrayBuffer());
}

let spent = 0;
for (const [index, line] of LINES.entries()) {
  const file = path.join(folder, `${line.id}.mp3`);
  const signature = JSON.stringify({ text: line.text, VOICE_ID, MODEL_ID, VOICE_SETTINGS });
  if (existsSync(file) && manifest[line.id] === signature) continue;
  writeFileSync(file, await speak(line, index));
  manifest[line.id] = signature;
  writeFileSync(manifestFile, JSON.stringify(manifest, null, 2));
  spent += line.text.length;
}

// Report each line's timing and flag any that would run into the next one.
for (const [index, line] of LINES.entries()) {
  const start = line.frame / FPS;
  const end = start + speechEnd(decode(path.join(folder, `${line.id}.mp3`)));
  const limit = (LINES[index + 1]?.frame ?? END) / FPS;
  const status = end <= limit - 0.15 ? "ok" : "TOO LONG";
  console.log(`${line.id.padEnd(13)} ${start.toFixed(2)}s → ${end.toFixed(2)}s (next at ${limit.toFixed(2)}s) ${status}`);
}
console.log(`Generated ${spent} characters this run.`);
