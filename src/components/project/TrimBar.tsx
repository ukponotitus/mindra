import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "../../lib/cn";
import { SHORTEST_CLIP_SECONDS, formatClipTime, type ClipWord } from "../../lib/clips";

// A clip's part of the recording as a bar, with a handle at each end to drag (or move with the arrow keys) and the
// words said there drawn on it, so a clip can start as a word starts and end as one ends.

type Edge = "start" | "end";

/** How close (in pixels) a dragged handle has to come to a word's start or end to land on it. */
const SNAP_PIXELS = 10;
/** An arrow key moves a handle this much when there are no words to move between. */
const STEP_SECONDS = 0.5;
/** Shift and an arrow key move a handle this much, without landing on a word. */
const FINE_SECONDS = 0.1;
/** Page Up and Page Down move a handle this much. */
const PAGE_SECONDS = 5;

/** The times a handle can land on: where words start (for the start) or end (for the end). */
function landings(words: ClipWord[], edge: Edge) {
  return words.map((word) => (edge === "start" ? word.start : word.end));
}

/** "“Worry does not empty…”": the first or last few words of the clip. */
function quoteOf(words: ClipWord[], edge: Edge) {
  const few = edge === "start" ? words.slice(0, 5) : words.slice(-5);
  if (!few.length) return "";
  const text = few.map((word) => word.text).join(" ");
  if (words.length <= 5) return `“${text}”`;
  // An ellipsis takes the place of the punctuation next to it.
  return edge === "start" ? `“${text.replace(/[.,;:!?]+$/, "")}…”` : `“…${text}”`;
}

export default function TrimBar({
  start,
  end,
  from,
  to,
  words,
  disabled = false,
  onChange,
  onScrub,
}: {
  start: number;
  end: number;
  /** The part of the recording the bar shows. */
  from: number;
  to: number;
  words: ClipWord[];
  disabled?: boolean;
  onChange: (edge: Edge, seconds: number) => void;
  /** Where a handle is while it moves, to show that moment in the preview. */
  onScrub?: (seconds: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const hintId = useId();
  // While a handle is dragged, the bar keeps the part it showed when the drag began, so it doesn't move underneath.
  const [held, setHeld] = useState<{ from: number; to: number } | null>(null);
  const view = held ?? { from, to };
  const span = Math.max(view.to - view.from, 0.1);
  const percent = (seconds: number) => `${((Math.min(Math.max(seconds, view.from), view.to) - view.from) / span) * 100}%`;

  /** Keep `seconds` inside the bar and the clip at least the shortest length. */
  const clamp = (edge: Edge, seconds: number) =>
    edge === "start"
      ? Math.min(Math.max(seconds, view.from), end - SHORTEST_CLIP_SECONDS)
      : Math.max(Math.min(seconds, view.to), start + SHORTEST_CLIP_SECONDS);

  const move = (edge: Edge, seconds: number) => {
    const at = clamp(edge, seconds);
    onChange(edge, at);
    onScrub?.(at);
  };

  /** The time under the pointer, on a word's start or end when one is close. */
  const timeAt = (edge: Edge, clientX: number) => {
    const rect = track.current?.getBoundingClientRect();
    if (!rect || !rect.width) return edge === "start" ? start : end;
    const seconds = view.from + Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * span;
    let best = seconds;
    let distance = (SNAP_PIXELS / rect.width) * span;
    for (const at of landings(words, edge)) {
      if (Math.abs(at - seconds) <= distance) {
        best = at;
        distance = Math.abs(at - seconds);
      }
    }
    return best;
  };

  /** The next place an arrow key takes a handle: the next word's start or end, or a step when there are none. */
  const stepFrom = (edge: Edge, current: number, direction: 1 | -1, fine: boolean) => {
    if (fine) return current + direction * FINE_SECONDS;
    const places = landings(words, edge).filter((at) => at >= view.from && at <= view.to);
    const next = direction > 0 ? places.find((at) => at > current + 0.02) : [...places].reverse().find((at) => at < current - 0.02);
    return next ?? current + direction * STEP_SECONDS;
  };

  const onKeyDown = (edge: Edge) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    const current = edge === "start" ? start : end;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowUp") next = stepFrom(edge, current, 1, event.shiftKey);
    else if (event.key === "ArrowLeft" || event.key === "ArrowDown") next = stepFrom(edge, current, -1, event.shiftKey);
    else if (event.key === "PageUp") next = current + PAGE_SECONDS;
    else if (event.key === "PageDown") next = current - PAGE_SECONDS;
    else if (event.key === "Home") next = edge === "start" ? view.from : start + SHORTEST_CLIP_SECONDS;
    else if (event.key === "End") next = edge === "start" ? end - SHORTEST_CLIP_SECONDS : view.to;
    if (next === null) return;
    event.preventDefault();
    move(edge, next);
  };

  const onPointerDown = (edge: Edge) => (event: PointerEvent<HTMLDivElement>) => {
    if (disabled || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    setHeld({ from, to });
  };
  const onPointerMove = (edge: Edge) => (event: PointerEvent<HTMLDivElement>) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    move(edge, timeAt(edge, event.clientX));
  };
  const onPointerEnd = () => setHeld(null);

  const inside = words.filter((word) => word.end > start + 0.02 && word.start < end - 0.02);
  const opening = quoteOf(inside, "start");
  const closing = quoteOf(inside, "end");

  return (
    <div className="select-none">
      <div ref={track} className="relative h-14 touch-none rounded-lg bg-secondary">
        {words.map((word, index) =>
          word.end < view.from || word.start > view.to ? null : (
            <span
              key={index}
              aria-hidden="true"
              style={{ left: percent(word.start), width: `max(1px, calc(${percent(word.end)} - ${percent(word.start)} - 1px))` }}
              className={cn(
                "absolute inset-y-4 rounded-[2px]",
                word.end > start && word.start < end ? "bg-primary/45" : "bg-muted-foreground/25",
              )}
            />
          ),
        )}
        <div
          aria-hidden="true"
          style={{ left: percent(start), width: `calc(${percent(end)} - ${percent(start)})` }}
          className="pointer-events-none absolute inset-y-0 rounded-md border-2 border-primary bg-primary/10"
        />
        {(["start", "end"] as const).map((edge) => {
          const value = edge === "start" ? start : end;
          const near = edge === "start" ? inside[0] : inside[inside.length - 1];
          return (
            <div
              key={edge}
              role="slider"
              tabIndex={disabled ? -1 : 0}
              aria-label={edge === "start" ? "Start of the clip" : "End of the clip"}
              aria-describedby={hintId}
              aria-disabled={disabled || undefined}
              aria-orientation="horizontal"
              aria-valuemin={Math.round((edge === "start" ? view.from : start + SHORTEST_CLIP_SECONDS) * 10) / 10}
              aria-valuemax={Math.round((edge === "start" ? end - SHORTEST_CLIP_SECONDS : view.to) * 10) / 10}
              aria-valuenow={Math.round(value * 10) / 10}
              aria-valuetext={`${formatClipTime(value)}${near ? `, ${edge === "start" ? "on" : "after"} “${near.text}”` : ""}`}
              style={{ left: percent(value) }}
              onPointerDown={onPointerDown(edge)}
              onPointerMove={onPointerMove(edge)}
              onPointerUp={onPointerEnd}
              onPointerCancel={onPointerEnd}
              onLostPointerCapture={onPointerEnd}
              onKeyDown={onKeyDown(edge)}
              className={cn(
                "absolute inset-y-0 z-10 flex w-8 -translate-x-1/2 touch-none items-center justify-center rounded-md",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-ew-resize",
              )}
            >
              <span className="h-9 w-2 rounded-full bg-primary ring-2 ring-card" />
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>{formatClipTime(view.from)}</span>
        <span>{formatClipTime(view.to)}</span>
      </div>
      {opening && (
        <p className="mt-1 text-xs text-pretty text-muted-foreground">
          Starts on <span className="text-foreground">{opening}</span> and ends on <span className="text-foreground">{closing}</span>
        </p>
      )}
      <p id={hintId} className="mt-1 text-xs text-pretty text-muted-foreground">
        {words.length
          ? "Drag a handle to trim; it lands on a word when it's close. The arrow keys move a handle a word at a time, or a tenth of a second with Shift."
          : "Drag a handle to trim, or use the arrow keys (half a second at a time, a tenth with Shift)."}
      </p>
    </div>
  );
}
