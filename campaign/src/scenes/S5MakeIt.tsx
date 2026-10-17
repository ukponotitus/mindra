import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { AudioLines, BookOpen, Captions, Clapperboard, Mail, MessageCircle, Play, Quote } from "lucide-react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { blurIn, easeIn, easeInOut, easeOut, lerp, life, ramp } from "../anim";
import { C, GRADIENT, gradientText } from "../theme";

const WORDS = ["a clip.", "a caption.", "a quote card.", "a WhatsApp update.", "a devotional.", "a newsletter.", "yours."];
const WHEEL_START = 40;
const STEP = 36;
const ROW = 124;
const EXIT = 312;

/** Wheel position: steps one row every STEP frames, easing between rows. */
function wheelIndex(f: number) {
  let index = 0;
  for (let k = 0; k < WORDS.length - 1; k++) index += ramp(f, WHEEL_START + STEP * k + 24, 12, easeInOut);
  return index;
}

type Card = { Icon: LucideIcon; label: string; meta: string; color: string; body: ReactNode };

const quoteBody = (
  <div style={{ background: "#EFEDFF", borderRadius: 24, padding: "26px 30px", fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15, color: C.ink }}>
    “Fear is loud, but faith is louder.”
  </div>
);

const CARDS: Card[] = [
  {
    Icon: Clapperboard,
    label: "Reel · 0:42",
    meta: "Coming soon",
    color: "#E1306C",
    body: (
      <div style={{ position: "relative", height: 150, borderRadius: 24, background: `radial-gradient(circle at 20% 30%, rgba(109,94,245,0.9), transparent 60%), radial-gradient(circle at 90% 90%, rgba(62,207,206,0.6), transparent 60%), ${C.ink}`, display: "flex", alignItems: "center", gap: 24, padding: "0 30px" }}>
        <div style={{ width: 70, height: 70, borderRadius: 35, background: "rgba(255,255,255,0.18)", display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Play size={32} fill="#fff" color="#fff" />
        </div>
        <div style={{ color: "#fff", fontSize: 38, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.1 }}>Fear is loud, but faith is louder.</div>
        <div style={{ position: "absolute", left: 30, right: 30, bottom: 16, height: 6, borderRadius: 3, background: "rgba(255,255,255,0.2)" }}>
          <div style={{ width: "62%", height: "100%", borderRadius: 3, background: GRADIENT }} />
        </div>
      </div>
    ),
  },
  {
    Icon: Captions,
    label: "Caption",
    meta: "Facebook",
    color: "#1877F2",
    body: (
      <div style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.35, color: C.inkSoft, letterSpacing: "-0.01em" }}>
        Fear shouts. Faith answers. Sunday's message on courage, in 42 seconds.{" "}
        <span style={{ color: C.purple, fontWeight: 600 }}>#Courage #Joshua1</span>
      </div>
    ),
  },
  { Icon: Quote, label: "Quote card", meta: "Ready to share", color: C.purple, body: quoteBody },
  {
    Icon: MessageCircle,
    label: "WhatsApp update",
    meta: "Channel",
    color: "#25D366",
    body: (
      <div style={{ background: "#E3F7EA", borderRadius: "28px 28px 28px 8px", padding: "22px 28px", fontSize: 35, fontWeight: 500, lineHeight: 1.3, color: C.ink }}>
        This week's message in 3 minutes, plus a reading plan for every day.
        <div style={{ textAlign: "right", fontSize: 24, color: "#5B8F6E", marginTop: 6 }}>9:41 ✓✓</div>
      </div>
    ),
  },
  {
    Icon: BookOpen,
    label: "Daily devotional",
    meta: "Day 1 of 7",
    color: C.cyan,
    body: (
      <div style={{ fontSize: 36, fontWeight: 500, lineHeight: 1.35, color: C.inkSoft }}>
        <span style={{ display: "inline-block", padding: "4px 16px", borderRadius: 999, background: "#E0F7F6", color: "#118C8B", fontSize: 28, fontWeight: 700, marginRight: 12 }}>
          Joshua 1:9
        </span>
        Be strong and courageous. When fear is loud, let faith be louder.
      </div>
    ),
  },
  {
    Icon: Mail,
    label: "Newsletter",
    meta: "Email",
    color: "#A79BFF",
    body: (
      <div>
        <div style={{ fontSize: 38, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em" }}>Courage when fear is loud</div>
        {[92, 78, 54].map((width) => (
          <div key={width} style={{ height: 16, width: `${width}%`, borderRadius: 8, background: "#ECEAE4", marginTop: 18 }} />
        ))}
      </div>
    ),
  },
];

function PostCard({ card }: { card: Card }) {
  const { Icon } = card;
  return (
    <div
      style={{
        width: 860,
        borderRadius: 44,
        background: "#fff",
        border: "1.5px solid #ECEAE4",
        boxShadow: "0 40px 90px -40px rgba(11,11,26,0.35)",
        padding: 34,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 26 }}>
        <div style={{ width: 66, height: 66, borderRadius: 20, background: `${card.color}22`, display: "grid", placeItems: "center" }}>
          <Icon size={34} color={card.color} strokeWidth={2.2} />
        </div>
        <div style={{ fontSize: 36, fontWeight: 700, color: C.ink, letterSpacing: "-0.02em", flex: 1 }}>{card.label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 28, fontWeight: 500, color: C.muted }}>
          <span style={{ width: 14, height: 14, borderRadius: 7, background: card.color }} />
          {card.meta}
        </div>
      </div>
      {card.body}
    </div>
  );
}

/** 26.5–37.5s. "Make it ___": the last word rolls like a wheel (pins 17, 19, 15) while the posts stack up (pin 6). */
export default function S5MakeIt() {
  const f = useCurrentFrame();
  const out = 1 - ramp(f, EXIT, 18, easeIn);
  const typed = Math.floor(ramp(f, 4, 24, (t) => t) * "Make it".length);
  const caret = f < WHEEL_START ? (Math.floor(f / 8) % 2 === 0 ? 1 : 0) : 0;
  const index = wheelIndex(f);
  const wheel = ramp(f, WHEEL_START - 8, 18);
  const cardsGone = ramp(f, 250, 20, easeIn);
  const finale = life(f, 262, EXIT, 22, 18);

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <div style={{ ...blurIn(out, -30, 16) }}>
        {/* "Make it", typed with a caret */}
        <div style={{ position: "absolute", left: 92, top: 280, display: "flex", alignItems: "center", fontSize: 136, fontWeight: 700, letterSpacing: "-0.055em", color: C.ink }}>
          {"Make it".slice(0, typed)}
          <span style={{ width: 8, height: 130, background: C.purple, marginLeft: 8, opacity: caret, borderRadius: 4 }} />
        </div>

        {/* The wheel */}
        <div
          style={{
            position: "absolute",
            left: 92,
            right: 0,
            top: 440,
            height: ROW * 3,
            overflow: "hidden",
            opacity: wheel,
            WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, transparent 14%, #000 44%, #000 72%, transparent 100%)",
          }}
        >
          {WORDS.map((word, i) => {
            const distance = i - index;
            const away = Math.min(Math.abs(distance), 2);
            const isLast = i === WORDS.length - 1;
            return (
              <div
                key={word}
                style={{
                  position: "absolute",
                  left: 0,
                  top: ROW + distance * ROW,
                  height: ROW,
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  fontSize: 104,
                  fontWeight: 700,
                  letterSpacing: "-0.05em",
                  whiteSpace: "nowrap",
                  color: away < 0.5 ? C.ink : C.faint,
                  opacity: lerp(1, 0.32, Math.min(away, 1)) * (away > 1 ? 2 - away : 1),
                  transformOrigin: "left center",
                  transform: `scale(${1 - 0.1 * Math.min(away, 1)})`,
                  filter: away > 0.05 ? `blur(${Math.min(away, 1) * 2}px)` : undefined,
                }}
              >
                {isLast ? <span style={gradientText()}>{word}</span> : word}
                {isLast && (
                  <AudioLines size={86} color={C.purple} strokeWidth={2} style={{ opacity: ramp(f, 258, 14), transform: `rotate(${(1 - ramp(f, 258, 20)) * -40}deg)` }} />
                )}
              </div>
            );
          })}
        </div>

        {/* The posts, stacking like notifications */}
        {CARDS.map((card, k) => {
          const enter = ramp(f, WHEEL_START + STEP * k + 22, 18, easeOut);
          let depth = 0;
          for (let j = k + 1; j < CARDS.length; j++) depth += ramp(f, WHEEL_START + STEP * j + 22, 18, easeOut);
          if (enter <= 0 || depth >= 3) return null;
          // Cards behind stay opaque (only their top edge shows) and fade under a paper veil.
          const fade = depth < 2 ? 1 : 3 - depth;
          return (
            <div
              key={card.label}
              style={{
                position: "absolute",
                left: 110,
                top: 900,
                zIndex: 10 - Math.round(depth),
                opacity: enter * fade * (1 - cardsGone),
                transformOrigin: "center top",
                transform: `translateY(${(1 - enter) * 220 - depth * 40 + cardsGone * 260}px) scale(${1 - 0.06 * depth})`,
              }}
            >
              <PostCard card={card} />
              <div style={{ position: "absolute", inset: 0, borderRadius: 44, background: C.paper, opacity: Math.min(depth, 1.6) * 0.45 }} />
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: 92,
            right: 92,
            top: 930,
            fontSize: 54,
            fontWeight: 500,
            lineHeight: 1.25,
            letterSpacing: "-0.02em",
            color: C.inkSoft,
            ...blurIn(finale),
          }}
        >
          Clips, captions and posts,
          <br />
          written the way you speak.
        </div>
      </div>
    </AbsoluteFill>
  );
}
