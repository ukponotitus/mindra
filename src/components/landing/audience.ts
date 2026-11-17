import { useLocation } from "react-router";

// Who the landing page's first screen speaks to: a link with ?for=business, ?for=church or ?for=creator (each ad or
// post links to its own) changes the headline and the words in the demo phones, so a shop owner sees a product launch
// and a church sees its service. Without one the headline speaks to everyone and the phones show a small business.
// The choice is kept for the visit.

export type Audience = "general" | "business" | "church" | "creator";

export interface AudienceCopy {
  /** The headline's two lines: what you start from, then what you get. */
  headline: [string, string];
  /** The first sentence under it (shown on phones too) and the second (computers only). */
  lead: string;
  more: string;
  /** The demo phones: what's being recorded, who's speaking, the transcript, the sentences the recording phone
   * shows (a hook, a quote and a clip), and the posts made from it. */
  recordingTitle: string;
  speaker: string;
  transcript: [string, string][];
  sentences: [string, string, string];
  reel: [string, string, string];
  whatsapp: string;
  card: string;
  cardLabel: string;
}

const BUSINESS_DEMO = {
  recordingTitle: "New arrivals live",
  speaker: "Ada Okafor, Glow by Ada",
  transcript: [
    ["0:05", "Hi everyone, welcome to our live!"],
    ["1:12", "Today I'm showing you our new sunscreen."],
    ["2:03", "It's called Daily Glow, SPF 50."],
    ["3:45", "No white cast, even on deep skin tones."],
    ["4:20", "Use it every morning, even indoors."],
    ["5:02", "Order on WhatsApp for delivery this week."],
  ] as [string, string][],
  sentences: ["No white cast, even on deep skin tones.", "Use it every morning, even indoors.", "Order on WhatsApp and we deliver this week."] as [string, string, string],
  reel: ["No white cast. ", "Just", " glow."] as [string, string, string],
  whatsapp: "New in: Daily Glow SPF 50, ₦12,500. Watch the 40-second demo, then order here.",
  card: "Use it every morning, even indoors.",
  cardLabel: "Tip card · Facebook",
};

const COPY: Record<Audience, AudienceCopy> = {
  general: {
    headline: ["Turn one video", "into a week of posts."],
    lead: "Mindra writes posts for Instagram, Facebook, TikTok and WhatsApp in your voice, makes the clips and graphics, and posts them for you.",
    more: "Start from a video, a flyer, a few photos or the plan you already have.",
    ...BUSINESS_DEMO,
  },
  business: {
    headline: ["Turn your product video", "into a week of posts."],
    lead: "Mindra writes posts for Instagram, Facebook, TikTok and WhatsApp in your brand's voice, makes the clips and graphics, and posts them for you.",
    more: "Start from a video, a flyer, a few product photos or your price list.",
    ...BUSINESS_DEMO,
  },
  church: {
    headline: ["Turn Sunday's service", "into a week of posts."],
    lead: "Mindra writes posts for Instagram, Facebook, TikTok and WhatsApp in your church's voice, cuts the clips and quote cards, and posts them for you.",
    more: "Start from the service recording, a programme flyer or your weekly plan.",
    recordingTitle: "Sunday Service",
    speaker: "Pastor David Okon",
    transcript: [
      ["0:05", "Good morning, church! You can be seated."],
      ["1:12", "Today I want to talk about waiting."],
      ["2:03", "The title of my message is “Waiting Without Worry.”"],
      ["3:45", "Has your worrying moved that email one inch closer?"],
      ["4:20", "Worry empties today of its strength."],
      ["5:02", "Turn with me to Philippians chapter four."],
    ],
    sentences: ["Worry does not empty tomorrow of its trouble.", "It empties today of its strength.", "So pray about it, then trust God with the timing."],
    reel: ["Fear is loud. ", "Faith", " is louder."],
    whatsapp: "Missed Sunday? Three lessons on waiting without worry, plus a 40-second clip.",
    card: "Worry empties today of its strength.",
    cardLabel: "Quote card · Facebook",
  },
  creator: {
    headline: ["Turn one video", "into a week of content."],
    lead: "Mindra cuts the clips, writes the captions for every platform in your voice, and posts them for you.",
    more: "Start from a video, a podcast episode or a few photos.",
    recordingTitle: "Episode 12",
    speaker: "Tobi, The Side Hustle Show",
    transcript: [
      ["0:05", "Welcome back to the show!"],
      ["1:12", "Today: how I got my first 1,000 followers."],
      ["2:03", "I posted every single day for 30 days."],
      ["3:45", "Most people quit in week two."],
      ["4:20", "Consistency beats talent online."],
      ["5:02", "Here's the system I use every Sunday."],
    ],
    sentences: ["Most people quit in week two.", "Consistency beats talent online.", "Here's the system I use every Sunday."],
    reel: ["Consistency ", "beats", " talent."],
    whatsapp: "New episode: how I got my first 1,000 followers, plus a 40-second clip.",
    card: "Consistency beats talent online.",
    cardLabel: "Quote card · Facebook",
  },
};

const KEPT = "mindra.visit.for";

function kept(): string {
  try {
    return sessionStorage.getItem(KEPT) ?? "";
  } catch {
    return "";
  }
}

/** The audience the address names (?for=), else the one kept for the visit, else everyone. */
export function useAudience(): AudienceCopy {
  const { search } = useLocation();
  const asked = new URLSearchParams(search).get("for")?.toLowerCase() ?? "";
  if (asked in COPY) {
    try {
      sessionStorage.setItem(KEPT, asked);
    } catch {
      // Private windows: the choice holds for this page only.
    }
  }
  const audience = (asked in COPY ? asked : typeof window === "undefined" ? "" : kept()) as Audience;
  return COPY[audience in COPY ? audience : "general"];
}
