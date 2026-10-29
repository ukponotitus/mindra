import { useId, useState } from "react";
import { ArrowLeft, Check, CircleAlert, CircleDashed, ExternalLink, LoaderCircle, RotateCcw, X } from "lucide-react";
import { Link, Navigate, useParams } from "react-router";
import { ErrorNote, StatusPill } from "../components/automations/parts";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import {
  PRIVACY,
  REVISABLE,
  runIsWorking,
  runStatus,
  TRIGGER_LABELS,
  useAutomationsEnabled,
  useEditRun,
  useRun,
  useRunAction,
  type RunDetail,
  type RunStep,
  type StepStatus,
} from "../lib/automations";
import { combine, dayKey, formatScheduled, timeValue, toOffsetIso } from "../lib/calendar";
import { cn } from "../lib/cn";
import { formatDuration } from "../lib/format";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

const STEP_LOOK: Record<StepStatus, { icon: typeof Check; tone: string; label: string }> = {
  pending: { icon: CircleDashed, tone: "text-muted-foreground", label: "Not started" },
  running: { icon: LoaderCircle, tone: "text-primary animate-spin", label: "Working" },
  waiting: { icon: CircleDashed, tone: "text-amber-700", label: "Waiting" },
  done: { icon: Check, tone: "text-emerald-700", label: "Done" },
  skipped: { icon: X, tone: "text-muted-foreground", label: "Skipped" },
  failed: { icon: CircleAlert, tone: "text-red-700", label: "Stopped" },
};

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : error ? "That didn't go through. Check your connection and try again." : "";
}

function took(step: RunStep): string {
  if (!step.started_at || !step.finished_at) return "";
  const seconds = Math.max(0, (new Date(step.finished_at).getTime() - new Date(step.started_at).getTime()) / 1000);
  return seconds < 1 ? "under a second" : formatDuration(seconds);
}

function Steps({ run }: { run: RunDetail }) {
  return (
    <ol className="rounded-xl border border-border bg-white p-2">
      {run.steps.map((step, index) => {
        const look = STEP_LOOK[step.status];
        const Icon = look.icon;
        return (
          <li key={step.name} className="flex items-start gap-3 rounded-lg px-2.5 py-2">
            <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", look.tone)} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground">
                <span className="text-muted-foreground tabular-nums">{index + 1}.</span> {step.label}
                <span className="sr-only">: {look.label}</span>
              </p>
              {(step.error || step.retry_at || took(step) || step.attempt > 1) && (
                <p className={cn("mt-0.5 text-xs text-pretty", step.status === "failed" ? "text-red-700" : "text-muted-foreground")}>
                  {[
                    step.error,
                    step.retry_at && step.status === "pending" ? `Trying again at ${formatScheduled(step.retry_at)}` : "",
                    step.attempt > 1 ? `${step.attempt} tries` : "",
                    took(step) ? `Took ${took(step)}` : "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">{look.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** The script waits: approve it (as it is, or edited), have it written again, or reject the video. */
function ScriptApproval({ run }: { run: RunDetail }) {
  const act = useRunAction(run.id);
  const [script, setScript] = useState(run.script);
  const [note, setNote] = useState("");
  const noteId = useId();
  const scriptId = useId();
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  return (
    <section className="space-y-4 rounded-xl border border-amber-200 bg-white p-5">
      <div>
        <h3 className="font-semibold text-foreground">Approve the script</h3>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Nothing is voiced or made until you approve it. Change any words here first if you like.
        </p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={scriptId} className="block text-sm font-medium text-foreground">
          Script <span className="font-normal text-muted-foreground tabular-nums">({words} words, about {Math.max(1, Math.round(words / 140))} min spoken)</span>
        </label>
        <textarea id={scriptId} value={script} onChange={(event) => setScript(event.target.value)} rows={14} className={cn(inputClass, "leading-relaxed")} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={noteId} className="block text-sm font-medium text-foreground">
          Or say what to change, and Mindra writes it again
        </label>
        <input id={noteId} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Shorter opening, and pray for students too." className={inputClass} />
      </div>
      {act.error && <ErrorNote>{errorText(act.error)}</ErrorNote>}
      <div className="flex flex-wrap justify-end gap-2">
        <ConfirmDialog
          trigger={
            <button type="button" disabled={act.isPending} className={buttonStyles({ variant: "ghost" })}>
              Reject
            </button>
          }
          title="Reject this video?"
          description="Nothing more is made for it, and its topic goes back on the list."
          confirmLabel="Reject"
          onConfirm={() => act.mutate({ action: "reject" })}
        />
        <button type="button" onClick={() => act.mutate({ action: "revise", body: { part: "script", note } })} disabled={act.isPending} className={buttonStyles({ variant: "secondary" })}>
          Write it again
        </button>
        <button
          type="button"
          onClick={() => act.mutate({ action: "approve", body: script.trim() !== run.script.trim() ? { script } : {} })}
          disabled={act.isPending || !script.trim()}
          className={buttonStyles({ variant: "primary" })}
        >
          {act.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Approve script
        </button>
      </div>
    </section>
  );
}

/** The video waits: check it, edit its title and description, then approve, ask for changes, or reject. */
function VideoApproval({ run }: { run: RunDetail }) {
  const act = useRunAction(run.id);
  const edit = useEditRun(run.id);
  const [title, setTitle] = useState(run.title);
  const [description, setDescription] = useState(run.description);
  const slot = run.publish_at && new Date(run.publish_at).getTime() > Date.now() ? new Date(run.publish_at) : null;
  const [when, setWhen] = useState<"slot" | "now" | "later">(slot ? "slot" : "now");
  const [day, setDay] = useState(dayKey(slot ?? new Date(Date.now() + 3600_000)));
  const [time, setTime] = useState(timeValue(slot ?? new Date(Date.now() + 3600_000)));
  const [privacy, setPrivacy] = useState("public");
  const [part, setPart] = useState("visuals");
  const [note, setNote] = useState("");
  const ids = useId();
  const failed = run.checks.filter((check) => !check.passed);
  const changed = title !== run.title || description !== run.description;

  const approve = () => {
    const publish_at = when === "slot" ? run.publish_at : when === "now" ? null : (() => {
      const chosen = combine(day, time);
      return chosen ? toOffsetIso(chosen) : null;
    })();
    const send = () => act.mutate({ action: "approve", body: { publish_at, privacy } });
    if (changed) edit.mutate({ title, description }, { onSuccess: send });
    else send();
  };

  return (
    <section className="space-y-5 rounded-xl border border-amber-200 bg-white p-5">
      <div>
        <h3 className="font-semibold text-foreground">Approve the video</h3>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Watch it, check the title and description, then choose when it goes out.</p>
      </div>
      {failed.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">Checks that didn&apos;t pass</p>
          <ul className="space-y-1">
            {failed.map((check) => (
              <li key={check.name} className="flex gap-2 text-sm text-amber-900">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {check.message || check.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className={cn("overflow-hidden rounded-lg bg-black", run.shape === "9:16" ? "mx-auto aspect-[9/16] max-h-[28rem]" : "aspect-video")}>
          {run.render?.video_url ? (
            <video src={run.render.video_url} poster={run.render.thumbnail_url ?? undefined} controls className="size-full" />
          ) : (
            <p className="grid size-full place-items-center p-4 text-center text-sm text-white/70">The video isn&apos;t ready to watch.</p>
          )}
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-title`} className="block text-sm font-medium text-foreground">
              Title <span className="font-normal text-muted-foreground tabular-nums">({title.length}/100)</span>
            </label>
            <input id={`${ids}-title`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className={inputClass} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-description`} className="block text-sm font-medium text-foreground">
              Description
            </label>
            <textarea id={`${ids}-description`} value={description} onChange={(event) => setDescription(event.target.value)} rows={6} maxLength={5000} className={inputClass} />
          </div>
          {run.render?.thumbnail_url && (
            <div>
              <p className="text-sm font-medium text-foreground">Thumbnail</p>
              <img src={run.render.thumbnail_url} alt="The video's thumbnail" className="mt-1.5 aspect-video w-40 rounded-md object-cover" />
            </div>
          )}
          {run.project && (
            <Link to={`/studio/${run.project}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Edit in Motion Studio
            </Link>
          )}
        </div>
      </div>
      <fieldset className="space-y-3 border-t border-border pt-4">
        <legend className="text-sm font-medium text-foreground">When it goes out</legend>
        <div className="flex flex-wrap gap-2">
          {slot && (
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name={`${ids}-when`} checked={when === "slot"} onChange={() => setWhen("slot")} className="accent-[var(--color-primary)]" />
              At its time, {formatScheduled(slot)}
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name={`${ids}-when`} checked={when === "now"} onChange={() => setWhen("now")} className="accent-[var(--color-primary)]" />
            As soon as it&apos;s up
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name={`${ids}-when`} checked={when === "later"} onChange={() => setWhen("later")} className="accent-[var(--color-primary)]" />
            Another time
          </label>
        </div>
        {when === "later" && (
          <div className="flex flex-wrap gap-2">
            <input type="date" aria-label="Day" value={day} onChange={(event) => setDay(event.target.value)} className={cn(inputClass, "w-auto")} />
            <input type="time" aria-label="Time" value={time} onChange={(event) => setTime(event.target.value)} className={cn(inputClass, "w-auto")} />
          </div>
        )}
        <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium text-foreground">
          Visibility
          <select value={privacy} onChange={(event) => setPrivacy(event.target.value)} className={inputClass}>
            {Object.entries(PRIVACY).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
      <fieldset className="space-y-2 border-t border-border pt-4">
        <legend className="text-sm font-medium text-foreground">Or ask for a change</legend>
        <div className="flex flex-wrap gap-2">
          <select aria-label="What to make again" value={part} onChange={(event) => setPart(event.target.value)} className={cn(inputClass, "w-auto")}>
            {REVISABLE.map((item) => (
              <option key={item.part} value={item.part}>
                {item.label}
              </option>
            ))}
          </select>
          <input aria-label="What to change" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Use the sunrise photos" className={cn(inputClass, "min-w-48 flex-1")} />
          <button type="button" onClick={() => act.mutate({ action: "revise", body: { part, note } })} disabled={act.isPending} className={buttonStyles({ variant: "secondary" })}>
            Make it again
          </button>
        </div>
        <p className="text-xs text-muted-foreground">That part and everything after it is made again; what comes before is kept.</p>
      </fieldset>
      {(act.error || edit.error) && <ErrorNote>{errorText(act.error || edit.error)}</ErrorNote>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <ConfirmDialog
          trigger={
            <button type="button" disabled={act.isPending} className={buttonStyles({ variant: "ghost" })}>
              Reject
            </button>
          }
          title="Reject this video?"
          description="It isn't posted, and its topic goes back on the list. The video stays in Motion Studio."
          confirmLabel="Reject"
          onConfirm={() => act.mutate({ action: "reject" })}
        />
        <button type="button" onClick={approve} disabled={act.isPending || edit.isPending || !title.trim()} className={buttonStyles({ variant: "primary" })}>
          {(act.isPending || edit.isPending) && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {run.trigger === "test" ? "Approve (not posted)" : "Approve and schedule"}
        </button>
      </div>
    </section>
  );
}

/** One video an automation is making or made: where it's up to, what it made, and what's waiting for the person. */
export default function AutomationRun() {
  const enabled = useAutomationsEnabled();
  const { runId } = useParams();
  const run = useRun(runId);
  const act = useRunAction(runId ?? "");

  if (!enabled) return <Navigate to="/dashboard" replace />;
  if (run.isPending) {
    return (
      <div aria-busy="true" className="space-y-4">
        <p role="status" className="sr-only">
          Loading the run
        </p>
        <div className="h-20 animate-pulse rounded-xl border border-border bg-white" />
        <div className="h-96 animate-pulse rounded-xl border border-border bg-white" />
      </div>
    );
  }
  if (run.isError) return <ErrorNote>{run.error.message}</ErrorNote>;

  const data = run.data;
  const state = runStatus(data);
  const canCancel = ["queued", "working", "waiting", "failed", "scheduled"].includes(data.status);

  return (
    <div className="space-y-6">
      <Link to={`/automations/${data.automation}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {data.automation_name}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-balance text-foreground">{data.title || data.topic || "A new video"}</h2>
            <StatusPill {...state} />
            {data.trigger === "test" && <StatusPill label="Test: not posted" tone="bg-secondary text-muted-foreground" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {TRIGGER_LABELS[data.trigger]} · started {formatScheduled(data.created_at)}
            {data.slot ? ` · for ${formatScheduled(data.slot)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.status === "failed" && (
            <button type="button" onClick={() => act.mutate({ action: "retry" })} disabled={act.isPending} className={buttonStyles({ variant: "primary", size: "sm" })}>
              <RotateCcw aria-hidden="true" className="size-4" />
              Try again
            </button>
          )}
          {canCancel && (
            <ConfirmDialog
              trigger={
                <button type="button" disabled={act.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  Cancel
                </button>
              }
              title="Cancel this video?"
              description="Nothing more is made for it, and its topic goes back on the list."
              confirmLabel="Cancel video"
              cancelLabel="Keep it"
              onConfirm={() => act.mutate({ action: "cancel" })}
            />
          )}
        </div>
      </div>

      {act.error && <ErrorNote>{errorText(act.error)}</ErrorNote>}
      {data.status === "failed" && data.error && (
        <p role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Stopped at {data.step_label}: {data.error} Try again carries on from there, keeping everything made before it.
          </span>
        </p>
      )}
      {data.review_note && (
        <p className="rounded-xl border border-border bg-white px-4 py-3 text-sm text-pretty text-muted-foreground">
          <span className="font-medium text-foreground">Your note:</span> {data.review_note}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0 space-y-6">
          {data.status === "waiting" && data.waiting_for === "script" && <ScriptApproval key={data.updated_at} run={data} />}
          {data.status === "waiting" && data.waiting_for === "video" && <VideoApproval key={data.updated_at} run={data} />}
          {runIsWorking(data) && (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-primary" />
              {data.status === "queued" ? "Waiting to start." : `Working on: ${data.step_label}.`} This page updates by itself.
            </p>
          )}
          {data.post && (
            <section className="rounded-xl border border-border bg-white p-4 text-sm">
              <h3 className="font-semibold text-foreground">On YouTube</h3>
              <p className="mt-1 text-muted-foreground">
                {data.post.published_at
                  ? `Posted ${formatScheduled(data.post.published_at)}.`
                  : data.post.scheduled_at
                    ? `Scheduled for ${formatScheduled(data.post.scheduled_at)}.`
                    : "Not scheduled."}
                {data.post.publish_error ? ` ${data.post.publish_error}` : ""}
              </p>
              {data.post.published_url && (
                <a href={data.post.published_url} target="_blank" rel="noreferrer" className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })}>
                  <ExternalLink aria-hidden="true" className="size-4" />
                  Watch on YouTube
                </a>
              )}
            </section>
          )}
          {data.script && !(data.status === "waiting" && data.waiting_for === "script") && (
            <details className="rounded-xl border border-border bg-white p-4">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">Script</summary>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-foreground">{data.script}</p>
            </details>
          )}
        </div>
        <section aria-labelledby="run-steps" className="space-y-3">
          <h3 id="run-steps" className="text-lg font-semibold text-foreground">
            Steps
          </h3>
          <Steps run={data} />
        </section>
      </div>
    </div>
  );
}
