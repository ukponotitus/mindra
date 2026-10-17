import { Star } from "lucide-react";
import { AbsoluteFill, interpolateColors, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { blurIn, easeIn, easeInOut, lerp, life, ramp } from "../anim";
import { Cursor, SelectionBox } from "../components/Bits";
import MicPill from "../components/MicPill";
import { C, GRADIENT } from "../theme";

type Line = { time: string; text: string; tag?: { label: string; color: string }; best?: boolean };

const LINES: Line[] = [
  { time: "0:00", text: "Welcome, church. Today we're talking about courage.", tag: { label: "Intro", color: C.periwinkle } },
  { time: "0:42", text: "Fear is loud, but faith is louder.", best: true },
  { time: "1:15", text: "Turn with me to Joshua chapter one.", tag: { label: "Scripture", color: C.cyan } },
  { time: "2:03", text: "Be strong and courageous. Do not be afraid.", tag: { label: "Quote", color: C.lavender } },
];

const LINE_START = 26;
const LINE_GAP = 28;
const WORD_STEP = 2.6;
const EXIT = 246;

/** 17.5–26.5s. Mindra transcribes word by word (pin 15) and picks the best moment (selection frame from pins 9 and 17). */
export default function S4Listens() {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = 1 - ramp(f, EXIT, 18, easeIn);
  const grid = ramp(f, 0, 34, easeInOut);
  const focus = ramp(f, 168, 16, easeInOut);
  const done = ramp(f, 140, 14);
  const select = ramp(f, 182, 12);
  const tooltip = spring({ frame: f - 188, fps, config: { damping: 13, stiffness: 190 } });
  const cursorMove = ramp(f, 156, 26, easeInOut);
  const click = f >= 180 && f < 186 ? 0.86 : 1;

  return (
    <AbsoluteFill style={{ background: C.paper }}>
      {/* Thin layout guides, as in pins 3 and 15 */}
      {[72, 1008].map((x) => (
        <div key={x} style={{ position: "absolute", left: x, top: 0, width: 2, height: 1920 * grid, background: C.line, opacity: out }} />
      ))}
      {[660, 1300].map((y) => (
        <div key={y} style={{ position: "absolute", top: y, left: 0, height: 2, width: 1080 * grid, background: C.line, opacity: out }} />
      ))}

      <div style={{ position: "absolute", top: 262, left: 0, right: 0, textAlign: "center", ...blurIn(life(f, 4, EXIT, 20, 16)) }}>
        <div style={{ fontSize: 30, fontWeight: 500, color: C.muted, letterSpacing: "0.02em" }}>Every word, timestamped</div>
        <div style={{ fontSize: 110, fontWeight: 700, letterSpacing: "-0.05em", color: C.ink, marginTop: 6 }}>Mindra listens.</div>
      </div>

      {/* The pill carried over from the last scene */}
      <div
        style={{
          position: "absolute",
          left: 540 - 280,
          top: 560 - 64,
          width: 560,
          height: 128,
          borderRadius: 64,
          background: C.ink,
          display: "grid",
          placeItems: "center",
          boxShadow: "0 30px 80px -30px rgba(11,11,26,0.45)",
          opacity: out,
          filter: out < 1 ? `blur(${(1 - out) * 14}px)` : undefined,
        }}
      >
        <MicPill frame={f} done={done} />
      </div>

      {/* The transcript */}
      <div style={{ position: "absolute", left: 104, top: 720, width: 880, display: "flex", flexDirection: "column", gap: 34, ...blurIn(out, -30, 14) }}>
        {LINES.map((line, li) => {
          const start = LINE_START + li * LINE_GAP;
          const words = line.text.split(" ");
          const tagIn = spring({ frame: f - (start + words.length * WORD_STEP + 12), fps, config: { damping: 14, stiffness: 200 } });
          return (
            <div
              key={line.time}
              style={{
                position: "relative",
                display: "flex",
                gap: 26,
                marginTop: line.best ? 76 * focus : 0,
                opacity: line.best ? 1 : lerp(1, 0.26, focus),
              }}
            >
              <div
                style={{
                  width: 96,
                  flexShrink: 0,
                  paddingTop: 12,
                  fontSize: 30,
                  fontWeight: 500,
                  color: C.muted,
                  fontVariantNumeric: "tabular-nums",
                  opacity: ramp(f, start - 4, 10),
                }}
              >
                {line.time}
              </div>
              <div style={{ position: "relative", flex: 1, fontSize: 50, fontWeight: 500, lineHeight: 1.24, letterSpacing: "-0.02em" }}>
                {line.best && <SelectionBox t={select} />}
                {words.map((word, wi) => {
                  const t = ramp(f, start + wi * WORD_STEP, 10);
                  return (
                    <span
                      key={wi}
                      style={{
                        color: interpolateColors(t, [0, 1], [C.faint, C.ink]),
                        filter: t < 1 ? `blur(${(1 - t) * 6}px)` : undefined,
                        opacity: 0.2 + 0.8 * t,
                      }}
                    >
                      {word}{" "}
                    </span>
                  );
                })}
                {line.tag && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 10,
                      verticalAlign: "middle",
                      marginLeft: 4,
                      padding: "6px 18px",
                      borderRadius: 999,
                      background: "#fff",
                      border: `1.5px solid ${C.line}`,
                      fontSize: 26,
                      fontWeight: 600,
                      color: C.inkSoft,
                      transform: `scale(${tagIn})`,
                      opacity: Math.min(1, tagIn),
                    }}
                  >
                    <span style={{ width: 12, height: 12, borderRadius: 6, background: line.tag.color }} />
                    {line.tag.label}
                  </span>
                )}
                {line.best && (
                  <>
                    <div
                      style={{
                        position: "absolute",
                        left: -18,
                        top: -98,
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "12px 24px",
                        borderRadius: 999,
                        background: GRADIENT,
                        color: "#fff",
                        fontSize: 30,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        transformOrigin: "left bottom",
                        transform: `scale(${tooltip})`,
                        opacity: Math.min(1, tooltip),
                        boxShadow: "0 18px 40px -16px rgba(109,94,245,0.8)",
                      }}
                    >
                      <Star size={26} fill="#fff" strokeWidth={0} />
                      Best moment · 0:42
                    </div>
                    <Cursor
                      style={{
                        position: "absolute",
                        right: 40,
                        bottom: -54,
                        opacity: ramp(f, 154, 8) * (1 - ramp(f, 214, 12)),
                        transform: `translate(${(1 - cursorMove) * 260}px, ${(1 - cursorMove) * 520}px) scale(${click})`,
                      }}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
