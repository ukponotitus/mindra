import { useEffect, useId, useMemo, useRef, useState, type SyntheticEvent } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatDuration } from "../../lib/format";
import type { Project, TranscriptSegment } from "../../lib/types";
import { buttonStyles } from "../ui/button";

/** The segment being spoken at `time`, assuming segments are in order. */
function segmentAt(segments: TranscriptSegment[], time: number): number {
  let found = -1;
  segments.forEach((segment, i) => {
    if (segment.start == null || segment.start > time) return;
    const end = segment.end ?? segments[i + 1]?.start ?? Infinity;
    if (time < end) found = i;
  });
  return found;
}

interface Props {
  project: Project;
  segments: TranscriptSegment[];
  /** Seconds to open at, e.g. when arriving from a quote on the Overview tab. */
  startAt?: number;
}

export default function TranscriptPanel({ project, segments, startAt }: Props) {
  const media = useRef<HTMLMediaElement | null>(null);
  const [currentTime, setCurrentTime] = useState(startAt ?? -1);

  // Bring the moment we were sent to into view.
  useEffect(() => {
    if (startAt == null) return;
    const index = segmentAt(segments, startAt);
    document.querySelector(`[data-segment="${segments[index]?.index}"]`)?.scrollIntoView({ block: "center" });
  }, [startAt, segments]);
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const searchId = useId();

  const activeIndex = useMemo(() => segmentAt(segments, currentTime), [segments, currentTime]);
  const hasTimestamps = segments.some((segment) => segment.start != null);
  const needle = query.trim().toLowerCase();
  const visible = needle ? segments.filter((segment) => segment.text.toLowerCase().includes(needle)) : segments;

  const jumpTo = (seconds: number) => {
    if (!media.current) return;
    media.current.currentTime = seconds;
    void media.current.play().catch(() => undefined);
  };

  const copyAll = async () => {
    const text = segments
      .map((segment) => (segment.start != null ? `[${formatDuration(segment.start)}] ${segment.text}` : segment.text))
      .join("\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const attachMedia = (element: HTMLMediaElement | null) => {
    media.current = element;
  };
  const playerProps = {
    ref: attachMedia,
    src: project.source_url ?? undefined,
    controls: true,
    preload: "metadata",
    onTimeUpdate: (event: SyntheticEvent<HTMLMediaElement>) => setCurrentTime(event.currentTarget.currentTime),
    onLoadedMetadata: (event: SyntheticEvent<HTMLMediaElement>) => {
      if (startAt != null) event.currentTarget.currentTime = startAt;
    },
  } as const;

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <section aria-labelledby={`${searchId}-title`} className="rounded-xl border border-border bg-white p-4 sm:p-5 lg:col-span-3">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 id={`${searchId}-title`} className="mr-auto font-semibold text-balance text-foreground">
            Transcript
          </h3>
          <label htmlFor={searchId} className="sr-only">
            Search transcript
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transcript…"
            className="order-last h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 sm:order-none sm:h-9 sm:w-48"
          />
          <button type="button" onClick={copyAll} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-10 sm:h-9" })}>
            {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
            {copied ? "Copied" : "Copy all"}
          </button>
          <span role="status" className="sr-only">
            {copied ? "Transcript copied" : ""}
          </span>
        </div>

        <div className="lg:max-h-150 lg:overflow-y-auto lg:pr-1">
          {visible.length === 0 && (
            <p role="status" className="py-6 text-center text-sm text-muted-foreground">
              No lines match "{query}".
            </p>
          )}
          <ol className="space-y-1">
            {visible.map((segment) => {
              const active = segment.index === segments[activeIndex]?.index;
              return (
                <li
                  key={segment.index}
                  data-segment={segment.index}
                  aria-current={active ? "true" : undefined}
                  className={cn("flex gap-3 rounded-lg px-2 py-2.5 transition-colors sm:px-3", active && "bg-primary/5")}
                >
                  {segment.start != null && (
                    <button
                      type="button"
                      onClick={() => jumpTo(segment.start ?? 0)}
                      disabled={!project.source_url}
                      title={project.source_url ? "Play from here" : undefined}
                      aria-label={project.source_url ? `Play from ${formatDuration(segment.start)}` : undefined}
                      className="h-fit w-14 shrink-0 rounded pt-0.5 text-left font-mono text-xs font-medium text-primary tabular-nums hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
                    >
                      {formatDuration(segment.start)}
                    </button>
                  )}
                  <div className="min-w-0">
                    {segment.speaker && <p className="mb-0.5 text-xs font-medium text-muted-foreground">{segment.speaker}</p>}
                    <p className="text-sm leading-relaxed text-pretty text-foreground">{segment.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      <div className="lg:col-span-2">
        <section aria-labelledby={`${searchId}-recording`} className="rounded-xl border border-border bg-white p-4 sm:p-5 lg:sticky lg:top-0">
          <h3 id={`${searchId}-recording`} className="mb-3 font-semibold text-balance text-foreground">
            Recording
          </h3>
          {project.source_url ? (
            project.source_type === "video" ? (
              <video {...playerProps} className="aspect-video w-full rounded-lg bg-black" />
            ) : (
              <audio {...playerProps} className="w-full" />
            )
          ) : (
            <p className="text-sm text-pretty text-muted-foreground">
              This project came from a pasted transcript, so there's no recording to play.
            </p>
          )}
          {project.source_url && hasTimestamps && (
            <p className="mt-3 text-xs text-pretty text-muted-foreground">Select any timestamp to play from that moment.</p>
          )}
        </section>
      </div>
    </div>
  );
}
