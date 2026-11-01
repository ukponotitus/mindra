import { ChevronRight, CircleAlert, History, Inbox, LoaderCircle, Pause, Pencil, Play, Plus, Workflow } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router";
import { buttonStyles } from "../components/ui/button";
import { ErrorNote, Panel, PlatformMarks, RunRow, StatTile, StatusPill } from "../components/automations/parts";
import { ApiError } from "../lib/api";
import {
  AUTOMATION_STATUS,
  KINDS,
  runStatus,
  scheduleSummary,
  useAutomationAction,
  useAutomations,
  useAutomationsEnabled,
  useAutomationSummary,
  useStartRun,
  type Automation,
} from "../lib/automations";
import { formatScheduled } from "../lib/calendar";

function AutomationCard({ automation }: { automation: Automation }) {
  const navigate = useNavigate();
  const action = useAutomationAction(automation.id);
  const start = useStartRun(automation.id);
  const status = AUTOMATION_STATUS[automation.status];
  const last = automation.last_run;
  const busy = action.isPending || start.isPending;
  const working = last ? last.status === "queued" || last.status === "working" : false;
  const error = action.error || start.error;
  const details =
    automation.kind === "create"
      ? `${automation.minutes} min, ${automation.shape === "9:16" ? "vertical" : "landscape"}`
      : KINDS[automation.kind].label;

  return (
    <li className="flex min-w-0 flex-col rounded-xl border border-border bg-white">
      <Link
        to={`/automations/${automation.id}`}
        className="flex flex-1 items-start gap-3 rounded-t-xl p-4 transition-colors hover:bg-secondary/40 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Workflow aria-hidden="true" className="size-5" />
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-foreground">{automation.name}</span>
            <StatusPill {...status} />
            {automation.mode === "automatic" && <StatusPill label="Posts automatically" tone="bg-primary/10 text-primary" />}
            {automation.mode === "draft" && <StatusPill label="Drafts only" tone="bg-secondary text-muted-foreground" />}
          </span>
          <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <PlatformMarks platforms={automation.platforms} />
            <span className="truncate">{details}</span>
          </span>
          <span className="block text-sm text-muted-foreground tabular-nums">
            {scheduleSummary(automation)}
            {automation.status === "active" && automation.next_slot ? ` · Next: ${formatScheduled(automation.next_slot)}` : ""}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground tabular-nums">
            {last ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                Latest: <StatusPill {...runStatus(last)} />
                <span className="truncate">{last.title}</span>
              </span>
            ) : (
              <span>No videos yet</span>
            )}
            <span>{automation.posted} posted</span>
            {automation.waiting > 0 && <span className="font-medium text-amber-800">{automation.waiting} waiting for you</span>}
            {automation.failed > 0 && <span className="font-medium text-red-700">{automation.failed} stopped</span>}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted-foreground" />
      </Link>
      <div className="flex flex-wrap items-center gap-1 border-t border-border px-2 py-1.5">
        <Link to={`/automations/${automation.id}/setup`} className={buttonStyles({ variant: "ghost", size: "sm" })}>
          <Pencil aria-hidden="true" className="size-4" />
          Edit
        </Link>
        <Link to={`/automations/${automation.id}#history`} className={buttonStyles({ variant: "ghost", size: "sm" })}>
          <History aria-hidden="true" className="size-4" />
          History
        </Link>
        {automation.status === "active" && (
          <button
            type="button"
            disabled={busy || working}
            onClick={() => start.mutate({ kind: "run-now" }, { onSuccess: (run) => navigate(`/automations/runs/${run.id}`) })}
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            {start.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Play aria-hidden="true" className="size-4" />}
            Run now
          </button>
        )}
        <span className="ml-auto">
          {automation.status === "active" ? (
            <button type="button" disabled={busy} onClick={() => action.mutate({ action: "pause" })} className={buttonStyles({ variant: "ghost", size: "sm" })}>
              <Pause aria-hidden="true" className="size-4" />
              Pause
            </button>
          ) : automation.status === "paused" ? (
            <button type="button" disabled={busy} onClick={() => action.mutate({ action: "activate" })} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              {action.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Play aria-hidden="true" className="size-4" />}
              Resume
            </button>
          ) : (
            <Link to={`/automations/${automation.id}/setup?step=review`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Finish setting up
            </Link>
          )}
        </span>
      </div>
      {error && (
        <p role="alert" className="border-t border-border px-4 py-2 text-sm text-pretty text-red-700">
          {error instanceof ApiError ? error.message : "That didn't go through. Try again."}
        </p>
      )}
    </li>
  );
}

/** The Automations page: what's running, what's waiting, what stopped, what's coming, and each automation. */
export default function Automations() {
  const enabled = useAutomationsEnabled();
  const automations = useAutomations();
  const summary = useAutomationSummary(enabled);

  if (!enabled) return <Navigate to="/dashboard" replace />;

  const list = automations.data ?? [];
  const data = summary.data;
  const next = data?.coming_up[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-balance text-foreground">Automations</h2>
          <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
            Set up once: for each day you choose, Mindra makes a video (or takes the next one you have), saves it in your Content Library, and posts it to YouTube and
            TikTok, with your approval when you want it.
          </p>
        </div>
        <Link to="/automations/new" className={buttonStyles({ variant: "primary" })}>
          <Plus aria-hidden="true" className="size-4" />
          New automation
        </Link>
      </div>

      {automations.isError && <ErrorNote>{automations.error.message}</ErrorNote>}

      {automations.isPending ? (
        <div aria-busy="true" className="space-y-3">
          <p role="status" className="sr-only">
            Loading automations
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[0, 1, 2, 3, 4].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-white" />
            ))}
          </div>
          <div className="h-40 animate-pulse rounded-xl border border-border bg-white" />
        </div>
      ) : list.length === 0 ? (
        <section className="rounded-xl border border-dashed border-border bg-white p-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="mx-auto grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <Workflow aria-hidden="true" className="size-5" />
            </span>
            <h3 className="mt-3 font-semibold text-foreground">No automations yet</h3>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">Choose what to automate. You&apos;ll see a sample before anything is posted.</p>
          </div>
          <ul className="mx-auto mt-5 grid max-w-3xl gap-3 sm:grid-cols-3">
            {(Object.keys(KINDS) as (keyof typeof KINDS)[]).map((kind) => (
              <li key={kind} className="rounded-lg border border-border p-4">
                <p className="text-sm font-semibold text-foreground">{KINDS[kind].label}</p>
                <p className="mt-1 text-xs text-pretty text-muted-foreground">{KINDS[kind].description}</p>
              </li>
            ))}
          </ul>
          <div className="mt-5 text-center">
            <Link to="/automations/new" className={buttonStyles({ variant: "primary" })}>
              <Plus aria-hidden="true" className="size-4" />
              Create an automation
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile label="Active automations" value={data ? data.counts.active : "–"} hint={data && data.counts.paused ? `${data.counts.paused} paused` : undefined} />
            <StatTile label="Videos made" value={data ? data.stats.made : "–"} hint={`Last ${data?.stats.days ?? 30} days`} />
            <StatTile label="Videos posted" value={data ? data.stats.posted : "–"} hint={`Last ${data?.stats.days ?? 30} days`} />
            <StatTile label="Stopped" value={data ? data.stats.failed : "–"} hint={data?.stats.failed ? "Open one to try again" : "Nothing stopped"} />
            <StatTile label="Next video" small value={next ? formatScheduled(next.slot) : "None planned"} hint={next?.name} />
          </div>

          {data && data.waiting > 0 && (
            <Link
              to="/automations/approvals"
              className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Inbox aria-hidden="true" className="size-4 shrink-0" />
              <span className="flex-1 font-medium tabular-nums">
                {data.waiting} {data.waiting === 1 ? "is" : "are"} waiting for your approval
              </span>
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <ul className="grid min-w-0 grid-cols-1 content-start gap-3 xl:grid-cols-2" aria-label="Your automations">
              {list.map((automation) => (
                <AutomationCard key={automation.id} automation={automation} />
              ))}
            </ul>
            <div className="min-w-0 space-y-4">
              {data && data.needs_attention.length > 0 && (
                <Panel title="Stopped" action={<CircleAlert aria-hidden="true" className="size-4 text-red-700" />}>
                  <ul>
                    {data.needs_attention.map((run) => (
                      <RunRow key={run.id} run={run} />
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel title="Recent activity">
                {data?.recent.length ? (
                  <ul>
                    {data.recent.map((run) => (
                      <RunRow key={run.id} run={run} />
                    ))}
                  </ul>
                ) : (
                  <p className="px-2 py-3 text-sm text-muted-foreground">Nothing yet. Make a sample from an automation&apos;s page to see what it makes.</p>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
