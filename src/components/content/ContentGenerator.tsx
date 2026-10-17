import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { buttonStyles } from "../ui/button";
import { ApiError } from "../../lib/api";
import { CLIP_PLATFORMS } from "../../lib/clips";
import { cn } from "../../lib/cn";
import { TONES, useBrandVoice, useGeneration, useStartGeneration } from "../../lib/content";
import { PLATFORMS } from "../../lib/projects";
import type { Platform, Project } from "../../lib/types";

const DEFAULT_PLATFORMS: Platform[] = ["instagram", "facebook", "whatsapp"];
const DEFAULT_CLIP_PLATFORMS: Platform[] = ["instagram", "tiktok", "whatsapp"];

interface Props {
  project: Project;
  /** Write captions to post with this clip, for the platforms that take video. */
  clipId?: string;
  onStart?: () => void;
  onDone?: () => void;
}

/** Pick platforms, a tone and how many versions, then watch the posts get written. */
export default function ContentGenerator({ project, clipId, onStart, onDone }: Props) {
  const voice = useBrandVoice().data;
  const choices = clipId ? PLATFORMS.filter((platform) => CLIP_PLATFORMS.includes(platform.id)) : PLATFORMS;
  const [platforms, setPlatforms] = useState<Platform[]>(() => {
    const chosen = project.target_platforms.filter((platform) => choices.some((choice) => choice.id === platform));
    return chosen.length > 0 ? chosen : clipId ? DEFAULT_CLIP_PLATFORMS : DEFAULT_PLATFORMS;
  });
  const [tone, setTone] = useState("");
  const [variations, setVariations] = useState(2);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const start = useStartGeneration();
  const generation = useGeneration(generationId).data;
  const ids = useId();

  const running = Boolean(generationId) && generation?.status !== "completed" && generation?.status !== "failed";
  const brandTone = voice?.tone || "Warm";

  // Tell the parent once per finished run, however often this re-renders.
  const reported = useRef<string | null>(null);
  useEffect(() => {
    if (generation?.status === "completed" && reported.current !== generationId) {
      reported.current = generationId;
      onDone?.();
    }
  }, [generation?.status, generationId, onDone]);

  const toggle = (platform: Platform) =>
    setPlatforms((current) => (current.includes(platform) ? current.filter((p) => p !== platform) : [...current, platform]));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    start.mutate(
      { project: project.id, platforms, variations, ...(clipId ? { clip: clipId } : {}), ...(tone ? { tone } : {}) },
      {
        onSuccess: (created) => {
          setGenerationId(created.id);
          onStart?.();
        },
      },
    );
  };

  const total = platforms.length * variations;
  const progress = generation?.progress ?? 0;
  const error =
    generation?.status === "failed"
      ? generation.error
      : start.error instanceof ApiError
        ? start.error.fieldErrors.platforms?.[0] ?? start.error.fieldErrors.project?.[0] ?? start.error.fieldErrors.clip?.[0] ?? start.error.message
        : "";

  return (
    <form onSubmit={submit} className="space-y-6 rounded-xl border border-border bg-white p-5">
      <fieldset aria-describedby={`${ids}-platforms-hint`}>
        <legend className="text-sm font-semibold text-foreground">Platforms</legend>
        <p id={`${ids}-platforms-hint`} className="mt-1 mb-3 text-sm text-pretty text-muted-foreground">
          {clipId ? "Each one gets a caption to post with this clip, in its own format." : "Each one gets posts written in its own format."}
        </p>
        <div className="flex flex-wrap gap-2">
          {choices.map((platform) => {
            const checked = platforms.includes(platform.id);
            return (
              <label
                key={platform.id}
                className={cn(
                  "flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors has-disabled:cursor-not-allowed has-disabled:opacity-60",
                  checked ? "border-primary bg-primary/10 text-foreground" : "border-border text-gray-700 hover:bg-secondary",
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked}
                  disabled={running}
                  onChange={() => toggle(platform.id)}
                />
                {platform.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-tone`} className="mb-1.5 block text-sm font-semibold text-foreground">
            Tone
          </label>
          <select
            id={`${ids}-tone`}
            value={tone}
            disabled={running}
            onChange={(e) => setTone(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-60"
          >
            <option value="">Your brand voice ({brandTone})</option>
            {TONES.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </div>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-foreground">Versions per platform</legend>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
            {[1, 2, 3].map((count) => (
              <label
                key={count}
                className={cn(
                  "grid h-8 cursor-pointer place-items-center rounded-md text-sm font-medium tabular-nums transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary has-disabled:cursor-not-allowed has-disabled:opacity-60",
                  variations === count ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <input
                  type="radio"
                  name={`${ids}-variations`}
                  value={count}
                  checked={variations === count}
                  disabled={running}
                  onChange={() => setVariations(count)}
                  className="sr-only"
                />
                {count}
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      {error && (
        <p role="alert" className="text-sm text-pretty text-red-600">
          {error}
        </p>
      )}
      {generation?.status === "completed" && !running && (
        <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          {clipId ? "Done. The captions are below, ready to copy with the clip." : "Done. Your new posts are below, ready to copy or edit."}
        </p>
      )}
      {generation?.status === "completed" && !running && generation.notice && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-pretty text-amber-900">{generation.notice}</p>
      )}

      {running ? (
        <div>
          <div className="mb-2 flex items-center justify-between gap-4 text-sm">
            <span role="status" className="flex items-center gap-2 font-medium text-foreground">
              <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              {generation?.status === "queued" ? "Waiting to start…" : "Writing your posts…"}
            </span>
            <span className="font-medium text-muted-foreground tabular-nums">{progress}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Writing posts"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-secondary"
          >
            <div
              className="h-full origin-left rounded-full bg-primary transition-transform duration-500 ease-out"
              style={{ transform: `scaleX(${Math.max(progress, 4) / 100})` }}
            />
          </div>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            {generation?.notice || "Posts appear below as each platform is finished."}
          </p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={platforms.length === 0 || start.isPending}
          className={buttonStyles({ size: "lg", className: "w-full" })}
        >
          {platforms.length === 0
            ? "Choose at least one platform"
            : start.isPending
              ? "Starting…"
              : `Write ${total} post${total === 1 ? "" : "s"}`}
        </button>
      )}
    </form>
  );
}
