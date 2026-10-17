// The voice-over: one line per scene, read by an ElevenLabs narrator.
// `frame` is where each line starts. It only claims what Mindra does today (transcripts, and posts written for each
// platform); clips, the calendar and publishing are still coming soon.
import { SCENE } from "../src/timeline.ts";

/**
 * ElevenLabs premade voice "George – Warm, Captivating Storyteller" (British), which the free plan allows from code.
 * The free plan is for non-commercial use only. On a paid plan, switch to the Nigerian library voice "Dayo – Clear,
 * Direct and Natural" (zwbf3iHXH6YGoTCPStfx), add "No wahala." back to the end of line 5, and run `npm run voice`.
 */
export const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb";
export const MODEL_ID = "eleven_multilingual_v2";
export const VOICE_SETTINGS = { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true, speed: 1 };

export const LINES = [
  {
    id: "1-hook",
    frame: SCENE.hook + 6,
    text: "Pastor, you preached for forty-eight minutes on Sunday. It was heard once.",
  },
  {
    id: "2-problem",
    frame: SCENE.problem + 8,
    text: "Then the real work begins: captions, clips, quote cards. Hours of editing, every week.",
  },
  {
    id: "3-record",
    frame: SCENE.record + 14,
    text: "With Mindra, you simply upload the recording. Video, audio, or even a transcript.",
  },
  {
    id: "4-listens",
    frame: SCENE.listens + 14,
    text: "In about three minutes, Mindra transcribes every word, with timestamps… and finds the moments worth sharing.",
  },
  {
    id: "5-make-it",
    frame: SCENE.makeIt + 10,
    text: "Then it writes your captions, posts, WhatsApp updates and newsletters, in your own voice. You review, you approve.",
  },
  {
    id: "6-everywhere",
    frame: SCENE.everywhere + 12,
    text: "Written for Facebook, Instagram, TikTok, WhatsApp, LinkedIn and more.",
  },
  {
    id: "7-month",
    frame: SCENE.month + 12,
    text: "One sermon can give you thirty posts. That's a whole month of content, from one recording.",
  },
  {
    id: "8-who",
    frame: SCENE.voice + 10,
    text: "Built for pastors, podcasters, coaches and teachers.",
  },
  {
    id: "9-end",
    frame: SCENE.end + 18,
    text: "Mindra. Record once, post all month.",
  },
];
