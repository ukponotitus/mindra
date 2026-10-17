import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, Play, Search, Share } from "lucide-react";
import { cn } from "../../../lib/cn";
import { useLoop } from "../playback";

const lines = [
  ["0:05", "Good morning, church! You can be seated."],
  ["1:12", "Today I want to talk about waiting."],
  ["2:03", "The title of my message is “Waiting Without Worry.”"],
  ["3:45", "Has your worrying moved that email one inch closer?"],
  ["4:20", "Worry empties today of its strength."],
  ["5:02", "Turn with me to Philippians chapter four."],
];

/** The left phone: the timestamped transcript, with the highlight gliding to the line being played. */
export default function TranscriptScreen() {
  const [active, setActive] = useState(3);
  useLoop(
    useCallback(() => setActive((i) => (i + 1) % lines.length), []),
    1800,
  );

  return (
    <div className="relative flex h-full flex-col pt-12 text-white">
      <div className="flex items-center justify-between px-5">
        <ChevronLeft aria-hidden="true" className="size-5 text-white/80" />
        <span className="text-[13px] font-semibold">Transcript</span>
        <Share aria-hidden="true" className="size-4 text-white/80" />
      </div>
      <div className="mx-4 mt-4 flex items-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2 text-[11px] text-white/45">
        <Search aria-hidden="true" className="size-3.5" />
        Search transcript
      </div>
      <p className="mt-4 px-5 text-[10px] font-medium text-white/40">Pastor David Okon</p>
      <div className="mt-2 flex-1 space-y-1 px-3">
        {lines.map(([time, text], i) => (
          <div key={time} className="relative flex gap-2.5 rounded-xl px-2.5 py-2">
            {i === active && (
              <motion.span layoutId="transcript-highlight" transition={{ duration: 0.3, ease: "easeOut" }} className="absolute inset-0 rounded-xl bg-white/10" />
            )}
            <span
              className={cn(
                "relative w-8 shrink-0 pt-0.5 font-mono text-[10px] tabular-nums transition-colors duration-200",
                i === active ? "font-bold text-[#A79BFF]" : "text-white/35",
              )}
            >
              {time}
            </span>
            <span className={cn("relative text-[12px] leading-snug transition-colors duration-200", i === active ? "text-white" : "text-white/50")}>
              {text}
            </span>
          </div>
        ))}
      </div>
      <div className="mx-4 mb-9 rounded-2xl bg-white/[0.08] p-3">
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full origin-left rounded-full bg-[#8B7CFF]"
            initial={false}
            animate={{ scaleX: (18 + active * 9) / 100 }}
            transition={{ duration: 1.6, ease: "linear" }}
          />
        </div>
        <div className="mt-2.5 flex items-center justify-between text-[10px] text-white/55">
          <span className="font-mono tabular-nums">{lines[active][0]}</span>
          <span className="grid size-7 place-items-center rounded-full bg-white">
            <Play aria-hidden="true" className="size-3.5 translate-x-px fill-black text-black" />
          </span>
          <span className="font-mono tabular-nums">52:14</span>
        </div>
      </div>
    </div>
  );
}
