import { useState } from "react";
import { Check, Clapperboard, Copy, Download, LoaderCircle, Minus, Plus, RefreshCw, Trash2 } from "lucide-react";
import EmptyState from "../EmptyState";
import ConfirmDialog from "../ui/ConfirmDialog";
import ShareButton from "../content/ShareButton";
import ClipPosts from "./ClipPosts";
import NewClipDialog from "./NewClipDialog";
import { buttonStyles } from "../ui/button";
import { cn } from "../../lib/cn";
import {
  CAPTION_STYLES,
  SHORTEST_CLIP_SECONDS,
  clipStatusLabel,
  formatClipTime,
  useDeleteClip,
  useFindClips,
  useProjectClips,
  useRenderClip,
  useUpdateClip,
  type Clip,
} from "../../lib/clips";
import { formatDuration } from "../../lib/format";
import type { Project } from "../../lib/types";

// Trimming moves a clip's start or end by this much at a time.
const NUDGE_SECONDS = 0.5;

/** The whole recording as a bar, with each clip's span marked on it. */
function ClipTimeline({ duration, clips, selectedId, onSelect }: { duration: number; clips: Clip[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div>
      <div className="relative h-10 rounded-lg bg-secondary">
        {clips.map((clip) => {
          const selected = clip.id === selectedId;
          return (
            <button
              key={clip.id}
              type="button"
              onClick={() => onSelect(clip.id)}
              aria-pressed={selected}
              aria-label={`${clip.title}, ${formatDuration(clip.start)} to ${formatDuration(clip.end)}`}
              style={{ left: `${(clip.start / duration) * 100}%`, width: `${Math.max((clip.duration / duration) * 100, 1)}%` }}
              className={cn(
                "absolute inset-y-1 rounded-md border transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                selected ? "border-primary bg-primary/40" : "border-primary/30 bg-primary/15 hover:bg-primary/25",
              )}
            />
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
        <span>0:00</span>
        <span>{formatDuration(duration)}</span>
      </div>
    </div>
  );
}

function ClipCard({ clip, selected, onSelect }: { clip: Clip; selected: boolean; onSelect: () => void }) {
  const status = clipStatusLabel(clip);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full gap-3 rounded-xl border bg-white p-3 text-left transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        selected ? "border-primary ring-1 ring-primary" : "border-border hover:border-muted-foreground/40",
      )}
    >
      <span className="relative grid h-24 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary text-muted-foreground">
        {clip.thumbnail_url ? (
          <img src={clip.thumbnail_url} alt="" className="size-full object-cover" />
        ) : (
          <Clapperboard aria-hidden="true" className="size-5" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="line-clamp-2 text-sm font-semibold text-balance text-foreground">{clip.title}</span>
          <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground tabular-nums">
            {clip.custom ? "Yours" : clip.score}
          </span>
        </span>
        <span className="mt-1 line-clamp-2 block text-xs text-pretty text-muted-foreground">{clip.hook}</span>
        <span className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
          {formatDuration(clip.start)}–{formatDuration(clip.end)} · {Math.round(clip.duration)}s
          <span className={cn("rounded-full px-2 py-0.5 font-medium", status.tone)}>{status.text}</span>
        </span>
      </span>
    </button>
  );
}

/** The selected clip: a vertical preview, its timing and caption style, and making or downloading the video. */
function ClipEditor({ clip, project }: { clip: Clip; project: Project }) {
  const update = useUpdateClip();
  const render = useRenderClip();
  const remove = useDeleteClip(project.id);
  const [draft, setDraft] = useState({ id: clip.id, start: clip.start, end: clip.end });
  const [copied, setCopied] = useState(false);
  // A different clip was selected: start from its saved times.
  if (draft.id !== clip.id) setDraft({ id: clip.id, start: clip.start, end: clip.end });
  const start = draft.id === clip.id ? draft.start : clip.start;
  const end = draft.id === clip.id ? draft.end : clip.end;
  const timingChanged = Math.abs(start - clip.start) > 0.01 || Math.abs(end - clip.end) > 0.01;
  const total = project.duration_seconds ?? clip.end;

  const nudge = (edge: "start" | "end", by: number) => {
    const next = { ...draft, id: clip.id, start, end };
    if (edge === "start") next.start = Math.min(Math.max(start + by, 0), end - SHORTEST_CLIP_SECONDS);
    else next.end = Math.max(Math.min(end + by, total), start + SHORTEST_CLIP_SECONDS);
    next.start = Math.round(next.start * 10) / 10;
    next.end = Math.round(next.end * 10) / 10;
    setDraft(next);
  };

  const rendered = clip.status === "ready" && clip.video_url && !clip.is_stale && !timingChanged;
  const rendering = clip.status === "rendering" || render.isPending;
  const copyCaption = async () => {
    await navigator.clipboard.writeText(clip.caption);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid gap-6 rounded-xl border border-border bg-white p-4 sm:p-6 md:grid-cols-[minmax(0,15rem)_1fr]">
      <div>
        {rendered ? (
          <video
            key={clip.video_url}
            src={clip.video_url ?? undefined}
            poster={clip.thumbnail_url ?? undefined}
            controls
            playsInline
            preload="metadata"
            aria-label={`Clip: ${clip.title}`}
            className="mx-auto aspect-[9/16] w-full max-w-60 rounded-xl bg-black"
          />
        ) : project.source_url ? (
          <>
            <video
              key={`${start}-${end}`}
              src={`${project.source_url}#t=${start},${end}`}
              controls
              playsInline
              preload="metadata"
              aria-label={`Preview of ${clip.title} from the recording`}
              className="mx-auto aspect-[9/16] w-full max-w-60 rounded-xl bg-black object-cover"
            />
            <p className="mx-auto mt-2 max-w-60 text-xs text-pretty text-muted-foreground">
              A preview from the recording. The finished clip is framed on the speaker and captioned.
            </p>
          </>
        ) : (
          <div className="mx-auto grid aspect-[9/16] w-full max-w-60 place-items-center rounded-xl bg-secondary text-muted-foreground">
            <Clapperboard aria-hidden="true" className="size-6" />
          </div>
        )}
      </div>

      <div className="min-w-0 space-y-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-balance text-foreground">{clip.title}</h3>
            <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-foreground tabular-nums">
              {clip.custom ? "Made by you" : `Score ${clip.score}`}
            </span>
          </div>
          {clip.hook && <p className="mt-1 text-sm text-pretty text-foreground">“{clip.hook}”</p>}
          {clip.reason && <p className="mt-1 text-sm text-pretty text-muted-foreground">{clip.reason}</p>}
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Timing</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {(["start", "end"] as const).map((edge) => (
              <div key={edge} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                <span className="text-sm text-muted-foreground">
                  {edge === "start" ? "Starts" : "Ends"}{" "}
                  <span className="font-medium text-foreground tabular-nums">{formatClipTime(edge === "start" ? start : end)}</span>
                </span>
                <span className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => nudge(edge, -NUDGE_SECONDS)}
                    aria-label={`${edge === "start" ? "Start" : "End"} half a second earlier`}
                    className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
                  >
                    <Minus aria-hidden="true" className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => nudge(edge, NUDGE_SECONDS)}
                    aria-label={`${edge === "start" ? "Start" : "End"} half a second later`}
                    className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                  </button>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground tabular-nums">
            <span>Length {(end - start).toFixed(1)}s</span>
            {timingChanged && (
              <>
                <button
                  type="button"
                  onClick={() => update.mutate({ id: clip.id, start, end })}
                  disabled={update.isPending}
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  {update.isPending ? "Saving…" : "Save timing"}
                </button>
                <button type="button" onClick={() => setDraft({ id: clip.id, start: clip.start, end: clip.end })} className={buttonStyles({ variant: "ghost", size: "sm" })}>
                  Undo
                </button>
              </>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Captions</legend>
          <div role="group" className="mt-2 grid gap-2 sm:grid-cols-3">
            {CAPTION_STYLES.map((style) => {
              const selected = clip.caption_style === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={update.isPending}
                  onClick={() => !selected && update.mutate({ id: clip.id, caption_style: style.id })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-left transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    selected ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <span className="block text-sm font-medium text-foreground">{style.label}</span>
                  <span className="block text-xs text-pretty text-muted-foreground">{style.description}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        {update.isError && (
          <p role="alert" className="text-sm text-red-600">
            {update.error.message}
          </p>
        )}

        {clip.caption && (
          <div>
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-sm font-medium text-foreground">Caption to post with it</h4>
              <button type="button" onClick={copyCaption} className={buttonStyles({ variant: "ghost", size: "sm" })}>
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">{clip.caption}</p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
          {rendered ? (
            <>
              <a href={clip.download_url ?? undefined} download className={buttonStyles()}>
                <Download aria-hidden="true" className="size-4" />
                Download clip
              </a>
              <ShareButton clipId={clip.id} downloadUrl={null} text={clip.caption} title={clip.title} size="md" />
            </>
          ) : (
            <button
              type="button"
              onClick={() => render.mutate(clip.id)}
              disabled={rendering || timingChanged}
              className={buttonStyles()}
            >
              {rendering ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Clapperboard aria-hidden="true" className="size-4" />}
              {rendering ? "Making clip…" : clip.video_url ? "Make it again" : "Make clip"}
            </button>
          )}
          <ConfirmDialog
            trigger={
              <button type="button" className={buttonStyles({ variant: "ghost", className: "text-red-600 hover:bg-red-50 hover:text-red-700" })}>
                <Trash2 aria-hidden="true" className="size-4" />
                Remove clip
              </button>
            }
            title="Remove this clip?"
            description="It's taken off this recording's suggestions, along with its video if it was made."
            confirmLabel="Remove clip"
            onConfirm={() => remove.mutate(clip.id)}
          />
          <p role="status" className="w-full text-sm text-pretty text-muted-foreground">
            {rendering && "Cutting, framing and captioning. This usually takes one to two minutes; you can leave this page."}
            {!rendering && timingChanged && "Save the new timing before making the clip."}
            {!rendering && !timingChanged && clip.is_stale && "You changed this clip since it was made. Make it again to update the video."}
          </p>
        </div>
        {(clip.status === "failed" || render.isError || remove.isError) && (
          <p role="alert" className="text-sm text-red-600">
            {clip.error || render.error?.message || remove.error?.message}
          </p>
        )}
      </div>
    </div>
  );
}

function ClipsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="h-10 animate-pulse rounded-lg bg-secondary" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-28 animate-pulse rounded-xl bg-secondary" />
        ))}
      </div>
    </div>
  );
}

/** The project's Clips tab. `initialClipId` (from a link such as the Clips page's) picks the clip shown first. */
export default function ProjectClips({ project, initialClipId }: { project: Project; initialClipId?: string | null }) {
  const isVideo = project.source_type === "video";
  const finished = project.status === "completed";
  const clips = useProjectClips(project.id, isVideo && finished);
  const find = useFindClips(project.id);
  const [selectedId, setSelectedId] = useState<string | null>(initialClipId ?? null);
  const [created, setCreated] = useState("");
  const newClipButton = (variant: "primary" | "secondary") => (
    <NewClipDialog
      project={project}
      onCreated={(clip) => {
        setSelectedId(clip.id);
        setCreated(`Created “${clip.title}”. Trim it, pick captions and make it below.`);
      }}
      trigger={
        <button type="button" className={buttonStyles({ variant })}>
          <Plus aria-hidden="true" className="size-4" />
          New clip
        </button>
      }
    />
  );

  if (!isVideo) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="Clips are cut from video recordings"
        description="This recording has no picture to make a clip from. Upload the video of the service or episode to get clips."
      />
    );
  }
  if (!finished) {
    return (
      <EmptyState
        icon={Clapperboard}
        title="Clips come once processing finishes"
        description="Mindra looks for the strongest moments as soon as the transcript and analysis are ready."
      />
    );
  }
  if (clips.isPending) return <ClipsSkeleton />;
  if (clips.isError) {
    return (
      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {clips.error.message}
      </p>
    );
  }

  const { search, clips: list } = clips.data;
  const finding = search.status === "finding" || find.isPending;
  const findButton = (variant: "primary" | "secondary") => (
    <button type="button" onClick={() => find.mutate()} disabled={finding} className={buttonStyles({ variant })}>
      {finding ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-4" />}
      {finding ? "Finding clips…" : list.length ? "Find clips again" : "Find clips"}
    </button>
  );
  const problem = (search.status === "failed" && search.error) || (find.isError && find.error.message);

  if (!list.length) {
    return (
      <div className="space-y-3" aria-busy={finding}>
        {finding ? (
          <>
            <p role="status" className="text-sm text-muted-foreground">
              Finding the strongest moments in this recording. This usually takes under a minute.
            </p>
            <ClipsSkeleton />
          </>
        ) : (
          <EmptyState
            icon={Clapperboard}
            title="No clips yet"
            description="Mindra finds the moments that work as short vertical videos, then frames and captions them. Or choose the times yourself."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {findButton("primary")}
                {newClipButton("secondary")}
              </div>
            }
          />
        )}
        {problem && (
          <p role="alert" className="text-sm text-red-600">
            {problem}
          </p>
        )}
      </div>
    );
  }

  const selected = list.find((clip) => clip.id === selectedId) ?? list[0];
  const duration = project.duration_seconds ?? Math.max(...list.map((clip) => clip.end));
  const anyCustom = list.some((clip) => clip.custom);

  return (
    <div className="space-y-6" aria-busy={finding}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold text-balance text-foreground">
            {list.length} clip{list.length === 1 ? "" : "s"} from this recording
          </h3>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            {anyCustom ? "Mindra's best first, then yours." : "Best first."} Pick one to preview, trim and make it.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {newClipButton("secondary")}
          {findButton("secondary")}
        </div>
      </div>
      <p role="status" className={cn("text-sm text-pretty text-muted-foreground", !created && "sr-only")}>
        {created}
      </p>
      {problem && (
        <p role="alert" className="text-sm text-red-600">
          {problem}
        </p>
      )}

      <ClipTimeline duration={duration} clips={list} selectedId={selected.id} onSelect={setSelectedId} />

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <ClipEditor clip={selected} project={project} />
        <ul aria-label="Clips" className="space-y-3">
          {list.map((clip) => (
            <li key={clip.id}>
              <ClipCard clip={clip} selected={clip.id === selected.id} onSelect={() => setSelectedId(clip.id)} />
            </li>
          ))}
        </ul>
      </div>

      <ClipPosts key={selected.id} clip={selected} project={project} />
    </div>
  );
}
