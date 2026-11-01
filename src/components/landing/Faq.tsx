import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircleQuestion, Plus } from "lucide-react";
import { firstDays, freeAllowances, usePricingPlans, useOfferLastDay } from "../../lib/billing";
import { cn } from "../../lib/cn";
import Reveal from "./Reveal";
import SectionLabel from "./SectionLabel";

// Answers describe what Mindra does today; anything still to come says so. The offer's dates and the Free plan come
// from the API (billing/plans.py), so they're never out of date.
const questions = [
  {
    q: "What exactly does Mindra do?",
    a: "Mindra works like a social media team in one place. It learns your brand, plans with you (a content calendar, then a brief for each post), writes the posts and makes clips and short videos from what you already have (videos, audio, text, photos, event flyers and content plans), for 11 platforms in your brand voice. You approve each step, and Mindra publishes for you where that's available or reminds you when a post is due.",
  },
  {
    q: "Can Mindra plan my content for me?",
    a: "Yes. Ask the assistant (\"two posts a day for next week\") or fill in a content calendar, and Mindra drafts what goes out, when and where, from your brand profile. You approve the calendar, then a brief for each post (its hook, script and visuals), then each post itself. Only approved posts go out.",
  },
  {
    q: "Is there an AI assistant?",
    a: "Yes. It sits beside every page and knows your brand profile, your calendar and your results. Ask it to plan a month, rewrite a post or explain what worked. It suggests changes as cards you apply, and never posts or changes anything by itself. Each plan includes a number of assistant messages a month.",
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
    a: "Mindra writes for Instagram, Facebook, TikTok, YouTube Shorts, YouTube, WhatsApp, X, LinkedIn, newsletters, blogs and quote cards. It publishes automatically to YouTube and LinkedIn today; Facebook, Instagram, TikTok and X are built and waiting on each platform's approval. Everywhere else, you share in one tap from your phone or copy the post.",
  },
  {
    q: "Can Mindra publish posts automatically?",
    a: "Yes, to connected YouTube channels and LinkedIn profiles, at the time you schedule. Where automatic posting isn't available yet, Mindra reminds you when a post is due so you can share it.",
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
    a: "Yes. In your Brand profile you set what you offer and at what price, your audience, your tone, the words you use and avoid, and sample posts. Everything Mindra writes follows them.",
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

/** Is it free, and what happens after the launch offer, in the API's own dates and allowances. */
function offerQuestions(lastDay: string | null, plans: ReturnType<typeof usePricingPlans>["data"]) {
  const free = freeAllowances(plans?.plans.find((plan) => plan.id === "free"));
  const prices = (plans?.plans ?? []).map((plan) => plan.monthly_price).filter((price) => price > 0);
  const from = prices.length ? `₦${Math.min(...prices).toLocaleString("en-NG")} a month` : "a small monthly price";
  const newDays = plans?.new_account_days ?? 0;
  if (lastDay) {
    return [
      {
        q: "Is Mindra free?",
        a: `Yes. Everything is open to everyone, free, until ${lastDay}, with no credit card needed.`,
      },
      {
        q: `What happens after ${lastDay}?`,
        a: `Workspaces that haven't chosen a paid plan move to the Free plan: ${free}. Paid plans start at ${from}.${newDays ? ` Anyone who joins after that has everything open for their ${firstDays(newDays)}.` : ""} Nothing you've made is removed.`,
      },
    ];
  }
  return [
    {
      q: "Is Mindra free?",
      a: `There's a Free plan (${free}), and paid plans start at ${from}.${newDays ? ` New accounts have everything open for their ${firstDays(newDays)}.` : ""} No credit card is needed to start.`,
    },
  ];
}

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const lastDay = useOfferLastDay();
  const plans = usePricingPlans().data;
  // The offer's questions go before "Who owns the content I upload?".
  const owns = questions.findIndex((item) => item.q.startsWith("Who owns"));
  const shown = [...questions.slice(0, owns), ...offerQuestions(lastDay, plans), ...questions.slice(owns)];

  return (
    <section id="faq" className="scroll-mt-16 bg-card px-6 py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <Reveal className="lg:sticky lg:top-28 lg:self-start">
          <SectionLabel icon={MessageCircleQuestion}>FAQ</SectionLabel>
          <h2 className="mt-6 text-[2.6rem] leading-[1.02] font-medium text-balance text-[#0B0B0F] sm:text-6xl">
            Questions,
            <br />
            <span className="text-[#A3A3AB]">answered.</span>
          </h2>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-[#52525B]">
            The short version: {lastDay ? `it's free in full until ${lastDay}` : "you can start free"}, your content stays yours, and nothing is
            posted without your approval.
          </p>
        </Reveal>

        <Reveal delay={120}>
          <div className="border-t border-black/10">
            {shown.map((item, i) => {
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
