import { ChevronLeft, Inbox, LoaderCircle } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import { ErrorNote } from "../components/automations/parts";
import { Thumb } from "../components/automations/widgets";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { useAutomationsEnabled, useRun, useRunAction, useRuns, type Run, type RunDetail } from "../lib/automations";
import { formatScheduled } from "../lib/calendar";
import { cn } from "../lib/cn";
import { Player, ScriptApproval, TikTokApproval, VideoApproval } from "./AutomationRun";

function QueueList({ runs, current }: { runs: Run[]; current: string }) {
  return (
    <ol className="space-y-3" aria-label="Waiting for review">
      {runs.map((run) => {
        const active = run.id === current;
        const failed = run.status === "failed";
        const line = failed
          ? `${run.step_label || "A step"} failed · retry`
          : run.waiting_for === "script"
            ? `Script${run.publish_at ? ` · posts ${formatScheduled(run.publish_at)}` : ""}`
            : run.waiting_for === "tiktok"
              ? "TikTok post · approve to post"
              : `Final video${run.publish_at ? ` · posts ${formatScheduled(run.publish_at)}` : ""}`;
        const tone = failed ? "text-red-700" : run.waiting_for === "script" ? "text-primary" : "text-amber-800";
        return (
          <li key={run.id}>
            <Link
              to={`/automations/approvals?run=${run.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex gap-3 rounded-xl border bg-card p-3 transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40",
              )}
            >
              {run.thumbnail_url ? (
                <img src={run.thumbnail_url} alt="" className="h-14 w-20 shrink-0 rounded-lg object-cover" />
              ) : (
                <Thumb label="" tone={failed ? "failed" : run.waiting_for === "script" ? "muted" : "primary"} className="h-14 w-20" />
              )}
              <span className="min-w-0">
                <span className="block font-medium text-pretty text-foreground">{run.title || run.topic || "A new video"}</span>
                <span className={cn("block text-sm", tone)}>{line}</span>
                <span className="block text-xs text-muted-foreground">{run.automation_name}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** The video's scenes, when the run has them (the new pipeline makes them; older videos have none). Redoing one on
 * its own comes with the next phase. */
function Scenes({ run }: { run: RunDetail }) {
  if (!run.scenes.length) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold text-foreground">Scenes</h3>
        <p className="text-sm text-muted-foreground tabular-nums">Redoing one scene uses about {run.redo_credits} credits</p>
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Scenes">
        {run.scenes.map((scene) => (
          <li key={scene.id} className={cn("overflow-hidden rounded-lg border", scene.status === "redo" ? "border-amber-300" : scene.status === "failed" ? "border-red-300" : "border-border")}>
            {scene.picture_url ? <img src={scene.picture_url} alt="" className="h-14 w-full object-cover" /> : <span aria-hidden="true" className="block h-14 bg-secondary" />}
            <span className="block px-2 py-1.5 text-xs text-foreground tabular-nums">
              {scene.position + 1} · {scene.label || scene.on_screen_text || "Scene"}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A step that stopped: what went wrong, and Retry (nothing was charged for the failed try). */
function FailedReview({ run }: { run: RunDetail }) {
  const act = useRunAction(run.id);
  const failedStep = run.steps.find((step) => step.status === "failed");
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-4">
        <section className="rounded-xl border border-red-200 bg-card p-5">
          <h3 className="font-semibold text-foreground">{run.title || run.topic || "A new video"}</h3>
          <p className="mt-1 text-sm text-red-700">
            {failedStep?.label ?? run.step_label ?? "A step"} stopped: {run.error}
          </p>
          <p className="mt-3 text-sm text-pretty text-muted-foreground">
            Everything made before it is kept, so Try again picks up from there. No credits were charged for the try that failed.
          </p>
          <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {[
              ["Automation", run.automation_name],
              ["Was going to post", run.publish_at ? formatScheduled(run.publish_at) : "Not scheduled"],
              ["Stopped", failedStep?.finished_at ? formatScheduled(failedStep.finished_at) : formatScheduled(run.updated_at)],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
        {run.render?.video_url && <Player run={run} />}
      </div>
      <aside className="space-y-2 rounded-xl border border-border bg-card p-5 xl:self-start">
        {act.error && <ErrorNote>{act.error instanceof ApiError ? act.error.message : "Mindra couldn't do that. Try again."}</ErrorNote>}
        <button type="button" disabled={act.isPending} onClick={() => act.mutate({ action: "retry" })} className={buttonStyles({ className: "w-full" })}>
          {act.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Try again from {failedStep?.label?.toLowerCase() ?? "there"}
        </button>
        <button type="button" disabled={act.isPending} onClick={() => act.mutate({ action: "cancel" })} className={buttonStyles({ variant: "secondary", className: "w-full border-red-200 text-red-700 hover:bg-red-50" })}>
          Skip this video
        </button>
        <p className="pt-1 text-sm text-pretty text-muted-foreground">Skipping puts its topic back in the queue so it can be used later.</p>
        <Link to={`/automations/runs/${run.id}`} className="block pt-1 text-sm font-medium text-primary hover:underline">
          Every step of this video
        </Link>
      </aside>
    </div>
  );
}

function Current({ runId }: { runId: string }) {
  const run = useRun(runId);
  if (run.isPending) return <div aria-busy="true" className="h-96 animate-pulse rounded-xl border border-border bg-card" />;
  if (run.isError) return <ErrorNote>{run.error.message}</ErrorNote>;
  const data = run.data;
  if (data.status === "failed") return <FailedReview run={data} />;
  if (data.status !== "waiting") {
    return (
      <EmptyState
        icon={Inbox}
        title="Nothing to review here"
        description="This video isn't waiting for you any more."
        action={
          <Link to={`/automations/runs/${data.id}`} className={buttonStyles({ variant: "secondary" })}>
            See the video
          </Link>
        }
      />
    );
  }
  return (
    <div className="space-y-4">
      {data.waiting_for === "video" && <Scenes run={data} />}
      {data.waiting_for === "script" ? <ScriptApproval run={data} /> : data.waiting_for === "tiktok" ? <TikTokApproval run={data} /> : <VideoApproval run={data} />}
      <p className="text-sm text-muted-foreground">
        <Link to={`/automations/runs/${data.id}`} className="font-medium text-primary hover:underline">
          Every step of this video
        </Link>
      </p>
    </div>
  );
}

/** The review queue: every script, video and TikTok post waiting for someone, and every video that stopped, with
 * the chosen one open. */
export default function AutomationApprovals() {
  const enabled = useAutomationsEnabled();
  const [params] = useSearchParams();
  const runs = useRuns({ status: ["waiting", "failed"] });
  if (!enabled) return <Navigate to="/dashboard" replace />;
  const list = [...(runs.data?.results ?? [])].sort((a, b) => (a.slot ?? a.created_at).localeCompare(b.slot ?? b.created_at));
  const wanted = params.get("run");
  const current = list.find((run) => run.id === wanted)?.id ?? wanted ?? list[0]?.id ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/automations" aria-label="Back to Automations" className={buttonStyles({ variant: "secondary", size: "icon" })}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Link>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            Review queue
            {list.length > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 tabular-nums">{list.length}</span>}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">Nothing posts until you approve it</p>
      </div>

      {runs.isError && <ErrorNote>{runs.error.message}</ErrorNote>}
      {runs.isPending ? (
        <div aria-busy="true" className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <div className="h-40 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : list.length === 0 && !current ? (
        <EmptyState icon={Inbox} title="Nothing to review" description="When an automation has a script, a video or a TikTok post for you to check, or one of its videos stops, it appears here." />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <QueueList runs={list} current={current ?? ""} />
          <div className="min-w-0">{current && <Current key={current} runId={current} />}</div>
        </div>
      )}
    </div>
  );
}
