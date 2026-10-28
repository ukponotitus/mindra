import { useEffect, useState } from "react";
import {
  AlignLeft,
  AudioLines,
  Captions,
  Check,
  CircleAlert,
  CloudUpload,
  FileText,
  LoaderCircle,
  ScanSearch,
  Video,
  X,
  type LucideIcon,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import SeePlans from "../components/SeePlans";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { formatDuration } from "../lib/format";
import { useProject, useRetryProject } from "../lib/projects";
import type { Project } from "../lib/types";

type Step = { label: string; icon: LucideIcon; desc: string };

const MEDIA_STEPS: Step[] = [
  { label: "Upload Complete", icon: CloudUpload, desc: "Your file is stored securely" },
  { label: "Audio Extraction", icon: AudioLines, desc: "Pulling the audio track out of the recording" },
  { label: "Transcription", icon: Captions, desc: "Turning speech into timestamped text" },
  { label: "AI Analysis", icon: ScanSearch, desc: "Finding the summary, topics, quotes and hooks" },
  { label: "Ready", icon: Check, desc: "Ready to read and turn into posts" },
];

const TRANSCRIPT_STEPS: Step[] = [
  { label: "Transcript Received", icon: FileText, desc: "Your text is saved" },
  { label: "Reading Transcript", icon: AlignLeft, desc: "Splitting it into segments and timestamps" },
  { label: "AI Analysis", icon: ScanSearch, desc: "Finding the summary, topics, quotes and hooks" },
  { label: "Ready", icon: Check, desc: "Ready to read and turn into posts" },
];

/** The step running now (or the one that failed); steps.length once everything is done. */
function currentStep(project: Project, steps: Step[]): number {
  if (project.status === "completed") return steps.length;
  if (project.status === "analyzing") return steps.length - 2;
  if (project.source_type === "transcript") return 1;
  if (project.status === "transcribing") return 2;
  if (project.status === "failed") return project.progress >= 40 ? 2 : 1;
  return 1;
}

const STUCK_AFTER_MS = 20_000;

/** True once a project has waited in the queue longer than a job normally takes to start. */
function useStuckInQueue(project: Project | undefined): boolean {
  const queued = project?.status === "queued";
  const [queuedSince, setQueuedSince] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // Timed with the browser's clock from when this page first saw the project queued.
  useEffect(() => {
    setQueuedSince(queued ? Date.now() : null);
  }, [queued]);

  useEffect(() => {
    if (!queued) return;
    const id = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(id);
  }, [queued]);

  return queued && queuedSince !== null && now - queuedSince > STUCK_AFTER_MS;
}

export default function Processing() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { data: project, error, isPending } = useProject(projectId);
  const retry = useRetryProject();
  const stuck = useStuckInQueue(project);

  if (isPending) {
    return (
      <div aria-busy="true" className="mx-auto max-w-2xl py-8">
        <p role="status" className="sr-only">
          Loading project…
        </p>
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="size-14 animate-pulse rounded-full bg-secondary" />
          <div className="h-6 w-64 max-w-full animate-pulse rounded bg-secondary" />
          <div className="h-4 w-48 max-w-full animate-pulse rounded bg-secondary" />
        </div>
        <div className="mb-6 h-24 animate-pulse rounded-xl border border-border bg-white" />
        <div className="h-72 animate-pulse rounded-xl border border-border bg-white" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h2 className="mb-2 text-xl font-semibold text-balance text-foreground">We couldn't find that project</h2>
        <p className="mb-6 text-sm text-pretty text-muted-foreground">{!error || (error instanceof ApiError && error.status === 404) ? "It may have been deleted, or the link may be wrong." : error.message}</p>
        <Link to="/projects" className={buttonStyles({ variant: "secondary" })}>
          Back to projects
        </Link>
      </div>
    );
  }

  const steps = project.source_type === "transcript" ? TRANSCRIPT_STEPS : MEDIA_STEPS;
  const active = currentStep(project, steps);
  const done = project.status === "completed";
  const failed = project.status === "failed";
  const queued = project.status === "queued";
  const progress = done ? 100 : project.progress;
  const SourceIcon = project.source_type === "video" ? Video : project.source_type === "audio" ? AudioLines : FileText;
  const HeaderIcon = done ? Check : failed ? CircleAlert : SourceIcon;

  let subtitle = `${project.source_filename || project.name} · This usually takes a few minutes`;
  if (done) subtitle = `${project.segment_count} transcript segments · ${formatDuration(project.duration_seconds)} · ready for posts`;
  else if (failed) subtitle = project.error || "Something went wrong while processing this recording.";
  else if (queued) subtitle = `${project.source_filename || project.name} · Waiting for a free processing slot`;

  return (
    <div className="mx-auto max-w-2xl py-4 sm:py-8">
      <div aria-live="polite" className="mb-8 text-center sm:mb-10">
        <div
          className={cn(
            "mx-auto mb-5 grid size-14 place-items-center rounded-full",
            done ? "bg-emerald-50 text-emerald-600" : failed ? "bg-red-50 text-red-600" : "bg-primary/10 text-primary",
          )}
        >
          <HeaderIcon aria-hidden="true" className="size-6" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-balance break-words text-foreground">
          {done ? "Your transcript is ready" : failed ? "Processing stopped" : `Processing "${project.name}"`}
        </h2>
        <p className={cn("text-sm text-pretty break-words", failed ? "text-red-700" : "text-muted-foreground")}>
          {subtitle} {failed && <SeePlans text={project.error} />}
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-border bg-white p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <span id="overall-progress" className="text-sm font-medium text-foreground">
            Overall Progress
          </span>
          <span className={cn("text-sm font-semibold tabular-nums", failed ? "text-red-700" : "text-foreground")}>
            {progress}%
          </span>
        </div>
        <div
          role="progressbar"
          aria-labelledby="overall-progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-2 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className={cn("h-full w-full origin-left transition-transform duration-200 ease-out", failed ? "bg-red-400" : "bg-primary")}
            style={{ transform: `scaleX(${Math.max(progress, 3) / 100})` }}
          />
        </div>
      </div>

      <ol className="divide-y divide-border rounded-xl border border-border bg-white">
        {steps.map((step, i) => {
          const isDone = i < active;
          const isFailed = failed && i === active;
          const isActive = !failed && i === active;
          const Icon = isDone ? Check : isFailed ? X : isActive && !queued ? LoaderCircle : step.icon;
          return (
            <li key={step.label} aria-current={isActive ? "step" : undefined} className="flex items-center gap-4 p-4 sm:p-5">
              <span
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-lg",
                  isDone
                    ? "bg-emerald-50 text-emerald-600"
                    : isFailed
                      ? "bg-red-50 text-red-600"
                      : isActive
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground",
                )}
              >
                <Icon aria-hidden="true" className={cn("size-4", isActive && !queued && "animate-spin")} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-medium", isDone || isActive || isFailed ? "text-foreground" : "text-muted-foreground")}>
                  {step.label}
                </p>
                <p className="mt-0.5 text-xs text-pretty text-muted-foreground">{step.desc}</p>
              </div>
              <span className="shrink-0 text-xs font-medium">
                {isDone && <span className="text-emerald-700">Done</span>}
                {isFailed && <span className="text-red-700">Failed</span>}
                {isActive && (
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">{queued ? "Waiting" : "In progress"}</span>
                )}
                {!isDone && !isFailed && !isActive && <span className="text-muted-foreground">Pending</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {done && (
        <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
          <button
            type="button"
            onClick={() => navigate(`/projects/${project.id}`)}
            className={buttonStyles({ size: "lg", className: "sm:flex-1" })}
          >
            See what's next
          </button>
          <button
            type="button"
            onClick={() => navigate(`/projects/${project.id}?tab=transcript`)}
            className={buttonStyles({ variant: "secondary", size: "lg", className: "sm:flex-1" })}
          >
            View Transcript
          </button>
        </div>
      )}

      {failed && (
        <div className="mt-6 space-y-3">
          <button
            type="button"
            onClick={() => retry.mutate(project.id)}
            disabled={retry.isPending}
            className={buttonStyles({ size: "lg", className: "w-full" })}
          >
            {retry.isPending ? "Restarting…" : "Try Again"}
          </button>
          {retry.isError && (
            <p role="alert" className="text-center text-sm text-red-600">
              {retry.error.message}
            </p>
          )}
          <Link to="/projects" className={buttonStyles({ variant: "ghost", className: "w-full" })}>
            Back to projects
          </Link>
        </div>
      )}

      {stuck && (
        <div role="status" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-pretty text-amber-900">
          {import.meta.env.DEV ? (
            <>
              Processing hasn't started yet. Is the background worker running? Restart the backend with{" "}
              <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">python manage.py runserver</code>, which starts
              the worker in development, or run{" "}
              <code className="rounded bg-white/70 px-1.5 py-0.5 font-mono text-xs">python manage.py db_worker</code> next to it.
            </>
          ) : (
            "This is taking longer than usual to start. It will begin on its own, so you can leave this page and come back."
          )}
        </div>
      )}

      {!done && !failed && (
        <p className="mt-6 text-center text-xs text-pretty text-muted-foreground">
          You can leave this page.{" "}
          <Link
            to="/dashboard"
            className="rounded font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Go to the dashboard
          </Link>{" "}
          and Mindra will keep working.
        </p>
      )}
    </div>
  );
}
