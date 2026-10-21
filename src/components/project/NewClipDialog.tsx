import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { LoaderCircle, Play, X } from "lucide-react";
import { buttonStyles } from "../ui/button";
import { cn } from "../../lib/cn";
import { CLIP_SHAPES, SHORTEST_CLIP_SECONDS, formatClipTime, parseClipTime, useCreateClip, type Clip } from "../../lib/clips";
import { formatDuration } from "../../lib/format";
import type { ClipShape, Project } from "../../lib/types";

// A new clip starts as the first half minute (or the whole recording, if shorter), to be marked from there.
const DEFAULT_SECONDS = 30;
// The API's longest clip (three times CLIP_MAX_SECONDS by default); it checks again on save.
const LONGEST_SECONDS = 180;

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-sm text-foreground tabular-nums transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden aria-invalid:border-red-400";

function timingProblem(start: number | null, end: number | null, total: number) {
  if (start == null) return "Enter where it starts as minutes and seconds, like 1:05.";
  if (end == null) return "Enter where it ends as minutes and seconds, like 1:35.";
  if (total && end > total + 0.5) return `The recording ends at ${formatDuration(total)}.`;
  if (end - start < SHORTEST_CLIP_SECONDS) return `A clip needs to be at least ${SHORTEST_CLIP_SECONDS} seconds long.`;
  if (end - start > LONGEST_SECONDS) return `A clip can be at most ${LONGEST_SECONDS / 60} minutes long.`;
  return "";
}

function NewClipForm({ project, onCreated }: { project: Project; onCreated: (clip: Clip) => void }) {
  const total = project.duration_seconds ?? 0;
  const video = useRef<HTMLVideoElement>(null);
  // Where "Play this part" should pause.
  const stopAt = useRef<number | null>(null);
  const [startText, setStartText] = useState(formatClipTime(0));
  const [endText, setEndText] = useState(formatClipTime(total ? Math.min(DEFAULT_SECONDS, total) : DEFAULT_SECONDS));
  const [title, setTitle] = useState("");
  const [shape, setShape] = useState<ClipShape>("vertical");
  const create = useCreateClip(project.id);

  const start = parseClipTime(startText);
  const end = parseClipTime(endText);
  const problem = timingProblem(start, end, total);

  const markNow = (edge: "start" | "end") => {
    const text = formatClipTime(Math.round((video.current?.currentTime ?? 0) * 10) / 10);
    if (edge === "start") setStartText(text);
    else setEndText(text);
  };

  const playPart = () => {
    const media = video.current;
    if (!media || start == null || end == null) return;
    media.currentTime = start;
    stopAt.current = end;
    void media.play();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (problem || start == null || end == null) return;
    create.mutate({ start, end, shape, ...(title.trim() ? { title: title.trim() } : {}) }, { onSuccess: onCreated });
  };

  const edges = [
    { edge: "start" as const, label: "Starts at", value: startText, set: setStartText, bad: start == null },
    { edge: "end" as const, label: "Ends at", value: endText, set: setEndText, bad: end == null },
  ];

  return (
    <form onSubmit={submit} noValidate className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        {project.source_url ? (
          <video
            ref={video}
            src={project.source_url}
            controls
            playsInline
            preload="metadata"
            aria-label={`The recording: ${project.name}`}
            onTimeUpdate={(event) => {
              if (stopAt.current != null && event.currentTarget.currentTime >= stopAt.current) {
                event.currentTarget.pause();
                stopAt.current = null;
              }
            }}
            onPause={() => (stopAt.current = null)}
            className="max-h-[50dvh] w-full rounded-lg bg-black object-contain"
          />
        ) : (
          <p className="rounded-lg bg-secondary px-4 py-6 text-sm text-pretty text-muted-foreground">
            The recording can't be played here, but you can still type the times.
          </p>
        )}
      </div>

      <div className="min-w-0 space-y-4">
        {edges.map(({ edge, label, value, set, bad }) => (
          <div key={edge}>
            <label htmlFor={`new-clip-${edge}`} className="text-sm font-medium text-foreground">
              {label}
            </label>
            <div className="mt-1.5 flex gap-2">
              <input
                id={`new-clip-${edge}`}
                value={value}
                onChange={(event) => set(event.target.value)}
                inputMode="decimal"
                autoComplete="off"
                spellCheck={false}
                aria-invalid={bad || undefined}
                aria-describedby="new-clip-time-hint"
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => markNow(edge)}
                disabled={!project.source_url}
                className={buttonStyles({ variant: "secondary" })}
              >
                Use current time
              </button>
            </div>
          </div>
        ))}
        <p id="new-clip-time-hint" className="text-xs text-pretty text-muted-foreground">
          Minutes and seconds, like 1:05.5. Pause the video where you want an edge and press "Use current time".
        </p>

        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground tabular-nums">
          <span>{start != null && end != null && end > start ? `Length ${(end - start).toFixed(1)}s` : "Length —"}</span>
          <button
            type="button"
            onClick={playPart}
            disabled={!project.source_url || Boolean(problem)}
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            <Play aria-hidden="true" className="size-4" />
            Play this part
          </button>
        </div>
        <p aria-live="polite" className={cn("text-sm text-pretty text-red-600", !problem && "sr-only")}>
          {problem}
        </p>

        <div>
          <label htmlFor="new-clip-title" className="text-sm font-medium text-foreground">
            Name <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id="new-clip-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            placeholder="Named after what's said at the start"
            className={cn(fieldClass, "mt-1.5 placeholder:text-muted-foreground")}
          />
        </div>

        <fieldset>
          <legend className="text-sm font-medium text-foreground">Shape</legend>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-2">
            {CLIP_SHAPES.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "cursor-pointer rounded-lg border px-3 py-2 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                  shape === option.id ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground/40",
                )}
              >
                <input
                  type="radio"
                  name="new-clip-shape"
                  value={option.id}
                  checked={shape === option.id}
                  onChange={() => setShape(option.id)}
                  className="sr-only"
                />
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="block text-xs text-pretty text-muted-foreground">{option.description}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {create.isError && (
          <p role="alert" className="text-sm text-pretty text-red-600">
            {create.error.message}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Dialog.Close className={buttonStyles({ variant: "secondary" })}>Cancel</Dialog.Close>
          <button type="submit" disabled={create.isPending || Boolean(problem)} className={buttonStyles()}>
            {create.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {create.isPending ? "Creating…" : "Create clip"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** Make a clip by choosing where it starts and ends in the recording. */
export default function NewClipDialog({ project, trigger, onCreated }: { project: Project; trigger: ReactElement; onCreated: (clip: Clip) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger render={trigger} />
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(52rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-5 shadow-xl transition-[opacity,scale] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-balance text-foreground">New clip</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pretty text-muted-foreground">
                Mark where your clip starts and ends, and choose short or long form. You can trim it and pick captions
                after.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon" })}>
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <NewClipForm
            project={project}
            onCreated={(clip) => {
              setOpen(false);
              onCreated(clip);
            }}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
