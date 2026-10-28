import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircleQuestion, Plus } from "lucide-react";
import { cn } from "../../lib/cn";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

// Answers describe what Mindra does today; anything still to come says so.
const questions = [
  {
    q: "What exactly does Mindra do?",
    a: "Mindra turns what you already have (videos, audio, text, photos, event flyers and content plans) into posts, captions and short videos for 11 platforms, written in your brand voice. You review everything, plan it on a calendar, and Mindra reminds you when each post is due or publishes it for you where that's available.",
  },
  {
    q: "Can I use Mindra without uploading a video?",
    a: "Yes. You can upload audio, paste text or a transcript, add photos or a flyer, or import a content plan. A video is only needed for clips.",
  },
  {
    q: "What can I upload?",
    a: "Video (MP4, MOV, AVI, MKV, WEBM) and audio (MP3, WAV, AAC, M4A, FLAC) up to 2 GB, a transcript you already have (including SRT and WebVTT captions), photos, and event flyers.",
  },
  {
    q: "Can Mindra create posts from images and flyers?",
    a: "Yes. Photo posts get captions written from what's in the pictures. For a flyer, Mindra reads every word on it (names, dates, times, venues and phone numbers) and writes announcements from it. You can check and correct what it read.",
  },
  {
    q: "Which social media platforms does Mindra support?",
    a: "Mindra writes for Instagram, Facebook, TikTok, YouTube Shorts, YouTube, WhatsApp, X, LinkedIn, newsletters, blogs and quote cards. It publishes automatically to YouTube, LinkedIn and WordPress today; Facebook, Instagram, TikTok and X are built and waiting on each platform's approval. Everywhere else, you share in one tap from your phone or copy the post.",
  },
  {
    q: "Can Mindra publish posts automatically?",
    a: "Yes, to connected YouTube channels, LinkedIn profiles and WordPress sites, at the time you schedule. Where automatic posting isn't available yet, Mindra reminds you when a post is due so you can share it.",
  },
  {
    q: "Is my content published without my approval?",
    a: "No. Nothing is posted unless you schedule it or choose Post now, and only to an account you've connected and picked for that post. You can change or unschedule a post at any time before it goes out.",
  },
  {
    q: "Can I edit content before publishing?",
    a: "Yes. Every post opens in an editor where you can change the text, ask for suggestions or have it written again. Clips can be trimmed and their caption style changed.",
  },
  {
    q: "Does Mindra support my brand voice?",
    a: "Yes. In Brand Voice you set your tone, your audience, the words you use and avoid, and sample posts. Everything Mindra writes follows them.",
  },
  {
    q: "Can I import an existing content calendar?",
    a: "Yes. Paste your plan, or upload a spreadsheet (.xlsx), a CSV or text file, or a photo of it. Mindra reads it into posts and writes each one, and the ones you approve go on your calendar.",
  },
  {
    q: "Can I use Mindra for my church or business?",
    a: "Yes. Mindra is for anyone who makes content regularly: churches and ministries, podcasters and creators, coaches and educators, and businesses and marketing teams.",
  },
  {
    q: "Will Mindra provide analytics and performance reports?",
    a: "Yes, the basics. Mindra counts the clicks on its links in any post, on any platform, and shows the views, likes and comments of your YouTube posts, with the days and times that work best. Facebook, Instagram and X posts get theirs once Mindra can post there, and reach and watch time come as each platform gives access.",
  },
  {
    q: "Is Mindra free during the beta?",
    a: "Yes. Everything that's live is free while Mindra is in beta, with no credit card needed. While the beta is private, sign-up may ask for an invite code.",
  },
  {
    q: "What happens when the beta ends?",
    a: "The beta ends on 1 December 2026. After that, workspaces that haven't chosen a paid plan move to the Free plan, and paid plans start at ₦5,000 a month. Nothing you've made is removed, and you'll hear from us before anything changes.",
  },
  {
    q: "Who owns the content I upload?",
    a: "You do. Your recordings, transcripts and posts are private to your workspace, and you can delete them at any time.",
  },
  {
    q: "Which languages does it support?",
    a: "Transcription works in many languages, including English. Better support for Yoruba, Hausa, Igbo, Swahili and Pidgin is a priority on our roadmap.",
  },
  {
    q: "Can my whole team use it?",
    a: "Inviting teammates with their own sign-in, roles and approval before publishing are planned.",
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
