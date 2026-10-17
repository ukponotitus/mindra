import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircleQuestion, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

const questions = [
  {
    q: "Is Mindra really free right now?",
    a: "Yes. Everything that's live is free while Mindra is in beta. Paid plans start after the beta, and you'll hear from us before anything changes.",
  },
  {
    q: "What can I upload?",
    a: "Video (MP4, MOV, AVI, MKV, WEBM), audio (MP3, WAV, AAC, M4A, FLAC) up to 2 GB, or a transcript you already have, including SRT and WebVTT captions.",
  },
  {
    q: "Will the posts sound like me?",
    a: "That's the point. Mindra learns from your past posts, your preferred tone and the words you do and don't use. Nothing goes out until you've reviewed and approved it.",
  },
  {
    q: "Who owns my recordings and content?",
    a: "You do. Your recordings and transcripts are private to your workspace, and you can delete them at any time.",
  },
  {
    q: "Which languages does it support?",
    a: "Transcription works in many languages, including English. Better support for Yoruba, Hausa, Igbo, Swahili and Pidgin is a priority on our roadmap.",
  },
  {
    q: "Can my whole media team use it?",
    a: "Workspaces are built for teams. Inviting teammates, roles and approval before publishing are coming soon.",
  },
];

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-16 bg-white px-6 py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionLabel icon={MessageCircleQuestion}>FAQ</SectionLabel>
          <h2 className="mt-6 text-[2.6rem] leading-[1.02] font-medium text-balance text-[#0B0B0F] sm:text-6xl">
            Questions,
            <br />
            <span className="text-[#A3A3AB]">answered.</span>
          </h2>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[#52525B]">
            The short version: it's free during the beta, your content stays yours, and nothing is posted without your
            approval.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="border-t border-black/10">
            {questions.map((item, i) => {
              const isOpen = open === i;
              return (
                <div key={item.q} className="border-b border-black/10">
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    className="group flex w-full items-center justify-between gap-6 py-6 text-left"
                  >
                    <span className="text-lg font-medium text-balance text-[#0B0B0F] sm:text-xl">{item.q}</span>
                    <span
                      className={cn(
                        "grid size-9 shrink-0 place-items-center rounded-full transition-[background-color,rotate] duration-200 ease-out",
                        isOpen ? "rotate-45 bg-[#0B0B0F] text-white" : "bg-[#F4F4F5] text-[#18181B]",
                      )}
                    >
                      <Plus aria-hidden="true" className="size-4" />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      // The answer opens in place and fades in; its height isn't animated.
                      <motion.div
                        id={`faq-answer-${i}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, transition: { duration: 0 } }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                      >
                        <p className="max-w-2xl pr-14 pb-6 text-[15.5px] leading-relaxed text-pretty text-[#52525B]">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
