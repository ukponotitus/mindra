import { useCallback, useReducer, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bookmark, ChevronLeft, Flag, Mic, Quote, Scissors, Settings2, SlidersHorizontal } from "lucide-react";
import { useLoop } from "../playback";
import Ribbon from "./Ribbon";

// Each sentence, and the moment Mindra flags once it has been said.
const sentences = [
  { text: "Worry does not empty tomorrow of its trouble.", moment: { icon: Flag, label: "Hook", at: "12:31" } },
  { text: "It empties today of its strength.", moment: { icon: Quote, label: "Quote", at: "12:40" } },
  { text: "So pray about it, then trust God with the timing.", moment: { icon: Scissors, label: "Clip", at: "12:52" } },
];

const PAUSE_WORDS = 5; // How long a finished sentence stays before the next begins, in word-ticks.

interface Speech {
  sentence: number;
  shown: number;
  /** The last two flagged moments, newest first. */
  moments: { id: number; index: number }[];
  nextId: number;
}

/** One word-tick: show the next word, flag the moment when a sentence ends, move on after a pause. */
function speak(state: Speech): Speech {
  const words = sentences[state.sentence].text.split(" ").length;
  if (state.shown >= words + PAUSE_WORDS) return { ...state, sentence: (state.sentence + 1) % sentences.length, shown: 0 };
  const shown = state.shown + 1;
  if (shown !== words) return { ...state, shown };
  return {
    ...state,
    shown,
    moments: [{ id: state.nextId, index: state.sentence }, ...state.moments].slice(0, 2),
    nextId: state.nextId + 1,
  };
}

function clock(seconds: number) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`;
}

/** The centre phone: a sermon being recorded, the words appearing as they're spoken and the best moments flagged. */
export default function RecordScreen() {
  const [speech, tick] = useReducer(speak, { sentence: 0, shown: 0, moments: [], nextId: 0 });
  const [seconds, setSeconds] = useState(768);
  useLoop(tick, 230);
  useLoop(
    useCallback(() => setSeconds((s) => s + 1), []),
    1000,
  );

  const words = sentences[speech.sentence].text.split(" ");
  const previous = sentences[(speech.sentence - 1 + sentences.length) % sentences.length].text;

  return (
    <div className="relative flex h-full flex-col pt-12 text-white">
      <div className="flex items-center justify-between px-5">
        <ChevronLeft aria-hidden="true" className="size-5 text-white/80" />
        <span className="text-[13px] font-semibold">Sunday Service</span>
        <Settings2 aria-hidden="true" className="size-[18px] text-white/80" />
      </div>
      <div className="mt-2 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-white/80 tabular-nums">
          <span className="size-1.5 animate-pulse rounded-full bg-[#FF453A]" />
          LIVE · {clock(seconds)}
        </span>
      </div>

      <Ribbon
        className="mt-3 h-40 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
        colors={["#6D5EF5", "#3B82F6", "#3ECFCE", "#A78BFA"]}
        strands={18}
        amplitude={0.85}
        periods={1}
        twist={1.7}
        duration={8}
      />

      <div className="flex-1 px-6 pt-2">
        <p className="min-h-[32px] text-[12px] leading-snug text-white/35">{previous}</p>
        <p className="mt-2 min-h-[78px] text-[21px] leading-[1.22] font-semibold">
          {words.slice(0, speech.shown).map((word, i) => (
            <motion.span
              key={`${speech.sentence}-${i}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="inline-block whitespace-pre"
            >
              {word}{" "}
            </motion.span>
          ))}
          <span className="inline-block h-5 w-0.5 translate-y-[3px] animate-pulse bg-[#8B7CFF]" />
        </p>

        {/* Moments Mindra flags while you speak */}
        <div className="mt-3 hidden sm:block">
          <p className="text-[10px] font-medium text-white/40">Moments found</p>
          <div className="mt-2 flex h-7 gap-1.5">
            <AnimatePresence initial={false} mode="popLayout">
              {speech.moments.map(({ id, index }) => {
                const { icon: Icon, label, at } = sentences[index].moment;
                return (
                  <motion.span
                    key={id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#6D5EF5]/20 px-2.5 text-[11px] font-semibold text-[#D4CEFF] ring-1 ring-[#8B7CFF]/40"
                  >
                    <Icon aria-hidden="true" className="size-3" />
                    {label}
                    <span className="font-mono text-[10px] font-normal text-white/50 tabular-nums">{at}</span>
                  </motion.span>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-8 pb-10">
        <span className="grid size-11 place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/10">
          <SlidersHorizontal aria-hidden="true" className="size-[18px] text-white/80" />
        </span>
        <span className="relative grid size-[70px] place-items-center">
          <span className="absolute inset-0 animate-ping-soft rounded-full bg-[#6D5EF5]/50" />
          <span className="relative grid size-[70px] place-items-center rounded-full bg-[#6D5EF5] ring-1 ring-white/25">
            <Mic aria-hidden="true" className="size-7" />
          </span>
        </span>
        <span className="grid size-11 place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/10">
          <Bookmark aria-hidden="true" className="size-[18px] text-white/80" />
        </span>
      </div>
    </div>
  );
}
