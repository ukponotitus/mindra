import { useCallback, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, Copy, MessageCircle, Play, Quote } from "lucide-react";
import { useLoop } from "../playback";

const card = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 1.6 + i * 0.2, duration: 0.5, ease: "easeOut" as const },
  }),
};

/** The right phone: what one sermon became, ready to post. */
export default function PostsScreen() {
  // Counts seconds; for the last two of every six the button shows it has copied, as if someone just tapped it.
  const [seconds, setSeconds] = useState(0);
  useLoop(
    useCallback(() => setSeconds((s) => s + 1), []),
    1000,
  );
  const copied = seconds % 6 >= 4;

  return (
    <div className="relative flex h-full flex-col pt-12 text-white">
      <div className="flex items-center justify-between px-5">
        <ChevronLeft aria-hidden="true" className="size-5 text-white/80" />
        <span className="text-[13px] font-semibold">Ready to post</span>
        <span className="rounded-full bg-[#6D5EF5]/25 px-2 py-0.5 text-[10px] font-semibold text-[#C4BBFF] tabular-nums">18</span>
      </div>

      <motion.div initial="hidden" animate="show" className="mt-4 flex-1 space-y-2.5 px-4">
        <motion.div custom={0} variants={card} className="rounded-2xl bg-white/[0.07] p-2.5">
          <div className="mb-2 flex items-center gap-2 px-0.5">
            <span className="grid size-5 place-items-center rounded-md bg-[#E1306C] text-[8px] font-bold">IG</span>
            <span className="text-[11px] font-semibold">Instagram Reel · 0:42</span>
          </div>
          <div className="relative h-28 overflow-hidden rounded-xl bg-[#221E48]">
            <div className="absolute top-4 left-1/2 size-9 -translate-x-1/2 rounded-full bg-white/20" />
            <div className="absolute top-[52px] left-1/2 h-14 w-20 -translate-x-1/2 rounded-t-[2rem] bg-white/10" />
            <p className="absolute inset-x-2 bottom-2 text-center text-[11px] leading-tight font-extrabold">
              Fear is loud. <span className="rounded bg-[#FACC15] px-0.5 text-black">Faith</span> is louder.
            </p>
            <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-black/40">
              <Play aria-hidden="true" className="size-3 translate-x-px fill-white" />
            </span>
          </div>
        </motion.div>

        <motion.div custom={1} variants={card} className="rounded-2xl bg-white/[0.07] p-2.5">
          <div className="mb-2 flex items-center gap-2 px-0.5">
            <span className="grid size-5 place-items-center rounded-full bg-[#25D366]">
              <MessageCircle aria-hidden="true" className="size-3" />
            </span>
            <span className="text-[11px] font-semibold">WhatsApp broadcast</span>
          </div>
          <p className="rounded-xl rounded-tl-sm bg-[#005C4B] px-2.5 py-2 text-[10.5px] leading-snug text-white/90">
            Missed Sunday? Three lessons on waiting without worry, plus a 40-second clip 🙏
          </p>
        </motion.div>

        <motion.div custom={2} variants={card} className="rounded-2xl bg-[#6D5EF5] p-3">
          <Quote aria-hidden="true" className="mb-1.5 size-4 text-white/70" />
          <p className="text-[12px] leading-snug font-bold">Worry empties today of its strength.</p>
          <p className="mt-1.5 text-[9px] font-medium text-white/75">Quote card · Facebook</p>
        </motion.div>
      </motion.div>

      <div className="px-4 pt-3 pb-9">
        <div className="relative flex h-9 items-center justify-center overflow-hidden rounded-full bg-white text-[12px] font-semibold text-black">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? "copied" : "copy"}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex items-center gap-1.5"
            >
              {copied ? <Check aria-hidden="true" className="size-3.5 text-[#10B981]" strokeWidth={3} /> : <Copy aria-hidden="true" className="size-3.5" />}
              {copied ? "Copied 18 posts" : "Copy all posts"}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
