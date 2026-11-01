import { Check, Circle, CircleAlert, ExternalLink, LoaderCircle, Minus } from "lucide-react";
import { Link } from "react-router";
import { formatScheduled } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { formatDuration } from "../../lib/format";
import { STEPS, stepsFor, type PostState, type RunDetail, type RunStep } from "../../lib/automations";

const linkClass = "inline-flex items-center gap-1 font-medium text-primary underline-offset-2 hover:underline";

function StepIcon({ step }: { step: RunStep }) {
  const base = "grid size-7 shrink-0 place-items-center rounded-full";
  switch (step.status) {
    case "done":
      return (
        <span className={cn(base, "bg-emerald-50 text-emerald-700")}>
          <Check aria-hidden="true" className="size-4" />
        </span>
      );
    case "running":
    case "waiting":
      return (
        <span className={cn(base, "bg-primary/10 text-primary")}>
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        </span>
      );
    case "failed":
      return (
        <span className={cn(base, "bg-red-50 text-red-700")}>
          <CircleAlert aria-hidden="true" className="size-4" />
        </span>
      );
    case "skipped":
      return (
        <span className={cn(base, "bg-secondary text-muted-foreground")}>
          <Minus aria-hidden="true" className="size-4" />
        </span>
      );
    default:
      return (
        <span className={cn(base, "text-border")}>
          <Circle aria-hidden="true" className="size-5" />
        </span>
      );
  }
}

const STATE_WORDS: Record<RunStep["status"], string> = {
  pending: "Not started",
  running: "Working",
  waiting: "In progress",
  done: "Done",
  failed: "Stopped",
  skipped: "Skipped",
};

function postLine(post: PostState, platform: string) {
  switch (post.status) {
    case "published":
    case "posted":
      return (
        <>
          Posted{post.published_at ? ` ${formatScheduled(post.published_at)}` : ""}.{" "}
          {post.published_url && (
            <a href={post.published_url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              View on {platform}
              <ExternalLink aria-hidden="true" className="size-3.5" />
            </a>
          )}
        </>
      );
    case "publishing":
      return <>Posting to {post.account || platform} now…</>;
    case "planned":
    case "reminded":
      return (
        <>
          Scheduled for {post.scheduled_at ? formatScheduled(post.scheduled_at) : "its time"}
          {post.account ? ` on ${post.account}` : ""}.
        </>
      );
    case "failed":
    case "missed":
      return <>{post.publish_error || "It wasn't posted."}</>;
    default:
      return <>Saved in the Content Library, not scheduled.</>;
  }
}

/** What a step did or is doing, from the run's own records. */
function StepDetail({ step, run }: { step: RunStep; run: RunDetail }) {
  const detail = step.detail as Record<string, unknown>;
  if (step.status === "failed") return <p className="text-sm text-pretty text-red-700">{step.error}</p>;
  if (step.status === "pending" && step.error) {
    return (
      <p className="text-sm text-pretty text-amber-800">
        {step.error} Trying again{step.retry_at ? ` at ${new Date(step.retry_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}` : " shortly"}.
      </p>
    );
  }
  if (step.status === "skipped") return <p className="text-sm text-pretty text-muted-foreground">{String(detail.reason ?? "Not needed for this video.")}</p>;
  if (step.status === "pending") return null;
  switch (step.name) {
    case "topic":
      return run.topic ? <p className="text-sm text-pretty text-muted-foreground">{run.topic}</p> : null;
    case "script":
      if (run.kind !== "create") return run.title ? <p className="text-sm text-pretty text-muted-foreground">“{run.title}”</p> : null;
      return typeof detail.words === "number" ? (
        <p className="text-sm text-muted-foreground tabular-nums">
          {detail.words} words{typeof detail.target === "number" ? ` (about ${detail.target} asked for)` : ""}
          {run.waiting_for === "script" ? ". Waiting for your approval." : "."}
        </p>
      ) : null;
    case "voice":
      return step.status === "done" ? (
        <p className="text-sm text-muted-foreground tabular-nums">
          {formatDuration(Number(detail.seconds ?? run.narration_seconds ?? 0))} of narration
          {detail.voice ? `, read by ${String(detail.voice)}` : ""}.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">Reading the script…</p>
      );
    case "visuals":
      return step.status === "done" ? (
        <p className="text-sm text-pretty text-muted-foreground tabular-nums">
          {String(detail.scenes ?? "")} scenes over {formatDuration(Number(detail.seconds ?? 0))}
          {detail.music ? `, with “${String(detail.music)}”` : ", no music"}
          {detail.captions ? ", captions" : ""}.{" "}
          {run.project && (
            <Link to={`/studio/${run.project}`} className={linkClass}>
              Open in Motion Studio
            </Link>
          )}
        </p>
      ) : null;
    case "render":
      if (step.status === "done") return <p className="text-sm text-muted-foreground">The video is made.</p>;
      return (
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground tabular-nums">Making the video{run.render ? `: ${run.render.progress}%` : "…"} This can take a while for a long video.</p>
          {run.render && (
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Making the video" aria-valuenow={run.render.progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${run.render.progress}%` }} />
            </div>
          )}
        </div>
      );
    case "review":
      if (step.status === "waiting") return <p className="text-sm text-amber-800">Waiting for your approval.</p>;
      return <p className="text-sm text-muted-foreground">{run.approved_at ? `Approved ${formatScheduled(run.approved_at)}.` : "Every check passed, so it went on by itself."}</p>;
    case "library": {
      const first = Object.values(run.posts).find(Boolean);
      return (
        <p className="text-sm text-muted-foreground">
          Saved with {Object.keys(run.posts).length === 1 ? "its post" : "its posts"}.{" "}
          {first && (
            <Link to={`/library/${first.id}`} className={linkClass}>
              Open in the Content Library
            </Link>
          )}
        </p>
      );
    }
    case "youtube":
    case "tiktok":
      if (step.status === "waiting") return <p className="text-sm text-amber-800">TikTok asks you to approve each post before it goes out.</p>;
      return step.post ? <p className="text-sm text-pretty text-muted-foreground">{postLine(step.post, step.name === "youtube" ? "YouTube" : "TikTok")}</p> : null;
    case "monitor":
      return <p className="text-sm text-muted-foreground">{step.status === "done" ? "Every post went out." : "Waiting for the posts to go out at their time."}</p>;
    default:
      return null;
  }
}

/** A run's steps, each with its real state and what it made. Steps the kind of automation never uses are left out. */
export default function Timeline({ run }: { run: RunDetail }) {
  const known = new Set(stepsFor(run.kind).map((step) => step.name));
  const descriptions = Object.fromEntries(stepsFor(run.kind).map((step) => [step.name, step.description]));
  const shown = run.steps.filter((step) => known.has(step.name) || !STEPS.some((item) => item.name === step.name));
  return (
    <ol className="space-y-0">
      {shown.map((step, index) => (
        <li key={step.name} className="relative flex gap-3 pb-5 last:pb-0">
          {index + 1 < shown.length && <span aria-hidden="true" className="absolute top-8 bottom-0 left-3.5 w-px bg-border" />}
          <StepIcon step={step} />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="flex flex-wrap items-baseline gap-x-2 text-sm">
              <span className="font-medium text-foreground">{step.label}</span>
              <span className={cn("text-xs", step.status === "failed" ? "text-red-700" : "text-muted-foreground")}>{STATE_WORDS[step.status]}</span>
            </p>
            {step.status === "pending" && !step.error && descriptions[step.name] && (
              <p className="text-sm text-pretty text-muted-foreground">{descriptions[step.name]}</p>
            )}
            <StepDetail step={step} run={run} />
          </div>
        </li>
      ))}
    </ol>
  );
}
