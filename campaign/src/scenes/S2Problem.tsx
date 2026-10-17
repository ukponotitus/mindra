import type { LucideIcon } from "lucide-react";
import { BookOpen, Captions, Clapperboard, Film, Image, Mail, MessageCircle, Newspaper, Quote } from "lucide-react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { blurIn, easeIn, easeInOut, life, ramp } from "../anim";
import { C } from "../theme";

type Item = { word: string; x: number; y: number; Icon: LucideIcon; thumbLeft: boolean; tint: [string, string]; at: number };

/** Everything that has to happen by hand after Sunday, scattered like the editorial layout in pin 2. */
const ITEMS: Item[] = [
  { word: "Clips", x: 90, y: 300, Icon: Clapperboard, thumbLeft: true, tint: [C.purple, C.cyan], at: 6 },
  { word: "Captions", x: 580, y: 268, Icon: Captions, thumbLeft: false, tint: [C.periwinkle, C.lavender], at: 12 },
  { word: "Reels", x: 400, y: 458, Icon: Film, thumbLeft: true, tint: ["#E1306C", "#FFB86B"], at: 18 },
  { word: "Quote cards", x: 70, y: 628, Icon: Quote, thumbLeft: false, tint: [C.ink, C.purple], at: 24 },
  { word: "Thumbnails", x: 610, y: 650, Icon: Image, thumbLeft: true, tint: ["#FF8A5B", C.purple], at: 30 },
  { word: "WhatsApp", x: 96, y: 1170, Icon: MessageCircle, thumbLeft: false, tint: ["#25D366", C.cyan], at: 36 },
  { word: "Newsletter", x: 590, y: 1200, Icon: Mail, thumbLeft: true, tint: [C.lavender, C.periwinkle], at: 42 },
  { word: "Blog posts", x: 240, y: 1370, Icon: Newspaper, thumbLeft: true, tint: [C.cyan, C.mint], at: 48 },
  { word: "Devotionals", x: 540, y: 1530, Icon: BookOpen, thumbLeft: false, tint: [C.purple, "#E1306C"], at: 54 },
];

const PIXELS: [number, number, string][] = [
  [300, 220, "#E1306C"],
  [950, 400, "#25D366"],
  [190, 500, "#1877F2"],
  [560, 590, "#FF0033"],
  [900, 820, C.purple],
  [120, 860, "#25F4EE"],
  [960, 1080, "#FFB020"],
  [70, 1080, C.ink],
  [480, 1300, C.cyan],
  [940, 1360, "#E1306C"],
  [170, 1560, C.lavender],
  [880, 1660, "#25D366"],
];

const GLYPHS = ["/", "|", "/", "—", "|"];

const itemCentre = (item: Item) => ({ x: item.x + (132 + 18 + item.word.length * 23) / 2, y: item.y + 42 });

function Thumb({ Icon, tint }: { Icon: LucideIcon; tint: [string, string] }) {
  return (
    <div
      style={{
        width: 132,
        height: 84,
        borderRadius: 16,
        background: `radial-gradient(circle at 25% 30%, ${tint[0]} 0%, transparent 70%), radial-gradient(circle at 80% 85%, ${tint[1]} 0%, transparent 72%), #1B1B2A`,
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={36} color="#fff" strokeWidth={2} />
    </div>
  );
}

/** 5.5–11.5s. The work after Sunday piles up, gets struck out, then collapses into a single dot. */
export default function S2Problem() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const implode = ramp(f, 144, 26, easeIn);
  const bracket = life(f, 4, 86, 20, 12);
  const spread = ramp(f, 6, 30, easeInOut);
  const headline = life(f, 92, 144, 22, 12);
  const sub = life(f, 102, 144, 22, 12);
  const dot = ramp(f, 158, 12);

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {/* Coloured pixels, like the confetti squares in pin 2 */}
      {PIXELS.map(([x, y, color], i) => {
        const pop = spring({ frame: f - 8 - i * 5, fps, config: { damping: 12, stiffness: 200 } });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x + (540 - x) * implode,
              top: y + (960 - y) * implode,
              width: 24,
              height: 24,
              background: color,
              transform: `scale(${pop * (1 - implode)})`,
            }}
          />
        );
      })}

      {/* The scattered jobs */}
      {ITEMS.map((item, i) => {
        const pop = spring({ frame: f - item.at, fps, config: { damping: 14, stiffness: 160 } });
        const strike = ramp(f, 104 + i * 4, 12);
        const centre = itemCentre(item);
        return (
          <div
            key={item.word}
            style={{
              position: "absolute",
              left: item.x,
              top: item.y,
              display: "flex",
              flexDirection: item.thumbLeft ? "row" : "row-reverse",
              alignItems: "center",
              gap: 18,
              opacity: Math.min(1, pop) * (1 - 0.55 * strike) * (1 - implode * 0.6),
              filter: implode > 0 ? `blur(${implode * 10}px)` : undefined,
              transform: `translate(${(540 - centre.x) * implode}px, ${(960 - centre.y) * implode}px) scale(${(0.6 + 0.4 * pop) * (1 - implode)})`,
            }}
          >
            <Thumb Icon={item.Icon} tint={item.tint} />
            <span style={{ position: "relative", fontSize: 42, fontWeight: 500, color: C.ink, letterSpacing: "-0.02em", whiteSpace: "nowrap" }}>
              {item.word}
              <span
                style={{
                  position: "absolute",
                  left: -4,
                  top: "54%",
                  height: 4,
                  width: `calc((100% + 8px) * ${strike})`,
                  background: C.ink,
                  borderRadius: 2,
                }}
              />
            </span>
          </div>
        );
      })}

      {/* "< after Sunday >" with stray glyphs orbiting (pin 14) */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...blurIn(bracket, 0, 10), position: "relative", fontSize: 46, fontWeight: 500, color: C.ink, letterSpacing: "-0.01em" }}>
          <span style={{ position: "absolute", right: "100%", marginRight: 30 + spread * 120 }}>&lt;</span>
          after Sunday
          <span style={{ position: "absolute", left: "100%", marginLeft: 30 + spread * 120 }}>&gt;</span>
        </div>
        {GLYPHS.map((glyph, i) => {
          const angle = (i / GLYPHS.length) * Math.PI * 2 + f * 0.025;
          const radius = 230 + 90 * Math.sin(f * 0.04 + i);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: 540 + Math.cos(angle) * radius * 1.3,
                top: 960 + Math.sin(angle) * radius,
                fontSize: 60,
                fontWeight: 300,
                color: i === 2 ? C.purple : C.ink,
                opacity: bracket,
                transform: `rotate(${f * (i % 2 ? 2 : -1.5)}deg)`,
              }}
            >
              {glyph}
            </div>
          );
        })}
      </AbsoluteFill>

      {/* The cost */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center" }}>
        <div
          style={{
            ...blurIn(headline, 40, 18),
            fontSize: 150,
            fontWeight: 700,
            letterSpacing: "-0.055em",
            lineHeight: 0.95,
            color: C.ink,
          }}
        >
          Hours of
          <br />
          editing.
        </div>
        <div style={{ ...blurIn(sub), fontSize: 52, fontWeight: 500, color: C.muted, marginTop: 30, letterSpacing: "-0.02em" }}>
          Every single week.
        </div>
      </AbsoluteFill>

      {/* Everything collapses into one point: the recording */}
      <div
        style={{
          position: "absolute",
          left: 540 - 15,
          top: 960 - 15,
          width: 30,
          height: 30,
          borderRadius: 15,
          background: C.purple,
          transform: `scale(${dot})`,
        }}
      />
    </AbsoluteFill>
  );
}
