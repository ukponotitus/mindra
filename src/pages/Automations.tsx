import { CalendarClock, ChevronRight, CircleAlert, Inbox, Plus, Workflow } from "lucide-react";
import { Link, Navigate } from "react-router";
import EmptyState from "../components/EmptyState";
import { buttonStyles } from "../components/ui/button";
import { ErrorNote, Panel, RunRow, StatusPill } from "../components/automations/parts";
import Templates from "../components/automations/Templates";
import {
  AUTOMATION_STATUS,
  runStatus,
  scheduleSummary,
  useAutomations,
  useAutomationsEnabled,
  useAutomationSummary,
  type Automation,
} from "../lib/automations";
import { formatScheduled } from "../lib/calendar";

function AutomationCard({ automation }: { automation: Automation }) {
  const status = AUTOMATION_STATUS[automation.status];
  const last = automation.last_run;
  const shape = automation.shape === "9:16" ? "vertical" : "landscape";
  return (
    <li>
      <Link
        to={`/automations/${automation.id}`}
        className="flex items-start gap-4 rounded-xl border border-border bg-white p-4 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 text-primary">
          {automation.account?.picture_url ? (
            <img src={automation.account.picture_url} alt="" className="size-full object-cover" />
          ) : (
            <Workflow aria-hidden="true" className="size-5" />
          )}
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-foreground">{automation.name}</span>
            <StatusPill {...status} />
            {automation.mode === "automatic" && <StatusPill label="Posts automatically" tone="bg-primary/10 text-primary" />}
          </span>
          <span className="block truncate text-sm text-muted-foreground">
            {automation.account?.name ?? "No channel chosen"}
            {automation.minutes ? ` · ${automation.minutes} min ${shape}` : ""}
          </span>
          <span className="block text-sm text-muted-foreground tabular-nums">
            {scheduleSummary(automation)}
            {automation.status === "active" && automation.next_slot ? ` · Next: ${formatScheduled(automation.next_slot)}` : ""}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs text-muted-foreground tabular-nums">
            {last ? (
              <span className="inline-flex items-center gap-1.5">
                Last run: <StatusPill {...runStatus({ ...last, trigger: "schedule" })} />
              </span>
            ) : (
              <span>No runs yet</span>
            )}
            <span>
              {automation.posted} posted
            </span>
            {automation.waiting > 0 && <span className="font-medium text-amber-800">{automation.waiting} waiting for you</span>}
          </span>
        </span>
        <ChevronRight aria-hidden="true" className="mt-2.5 size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

function Counts({ counts, waiting }: { counts: Record<string, number>; waiting: number }) {
  const items = [
    { label: "Active", value: counts.active ?? 0 },
    { label: "Paused", value: counts.paused ?? 0 },
    { label: "Drafts", value: counts.draft ?? 0 },
    { label: "Waiting for you", value: waiting, to: "/automations/approvals" },
  ];
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => {
        const body = (
          <>
            <dt className="text-xs font-medium text-muted-foreground">{item.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{item.value}</dd>
          </>
        );
        return item.to ? (
          <Link
            key={item.label}
            to={item.to}
            className="rounded-xl border border-border bg-white px-4 py-3 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div>{body}</div>
          </Link>
        ) : (
          <div key={item.label} className="rounded-xl border border-border bg-white px-4 py-3">
            {body}
          </div>
        );
      })}
    </dl>
  );
}

/** Every automation, what's waiting for the person, what stopped, and what's coming. */
export default function Automations() {
  const enabled = useAutomationsEnabled();
  const automations = useAutomations();
  const summary = useAutomationSummary(enabled);

  if (!enabled) return <Navigate to="/dashboard" replace />;

  const list = automations.data ?? [];
  const data = summary.data;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-balance text-foreground">Automations</h2>
          <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
            Set it up once and Mindra makes your videos on a schedule: a topic, an original script, a voice-over, your
            photos and music, captions and a thumbnail. You approve each one before it goes to YouTube.
          </p>
        </div>
        {list.length > 0 && (
          <div className="flex gap-2">
            <Link to="/automations/new" className={buttonStyles({ variant: "primary" })}>
              <Plus aria-hidden="true" className="size-4" />
              Create automation
            </Link>
          </div>
        )}
      </div>

      {automations.isPending ? (
        <div aria-busy="true" className="space-y-3">
          <p role="status" className="sr-only">
            Loading automations
          </p>
          {[0, 1].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-xl border border-border bg-white" />
          ))}
        </div>
      ) : automations.isError ? (
        <ErrorNote>{automations.error.message}</ErrorNote>
      ) : list.length === 0 ? (
        <section aria-labelledby="start" className="space-y-4">
          <EmptyState
            icon={Workflow}
            title="No automations yet"
            description="Start from a template below. It's saved as a draft for you to set up, and nothing is made or posted until you switch it on."
          />
          <h3 id="start" className="text-lg font-semibold text-foreground">
            Templates
          </h3>
          <Templates />
        </section>
      ) : (
        <>
          {data && <Counts counts={data.counts} waiting={data.waiting} />}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <section aria-labelledby="automation-list" className="min-w-0 space-y-3">
              <h3 id="automation-list" className="text-lg font-semibold text-foreground">
                Your automations
              </h3>
              <ul className="space-y-3">
                {list.map((automation) => (
                  <AutomationCard key={automation.id} automation={automation} />
                ))}
              </ul>
            </section>
            <div className="space-y-4">
              {data && data.waiting > 0 && (
                <Link
                  to="/automations/approvals"
                  className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition-colors hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <Inbox aria-hidden="true" className="size-4 shrink-0" />
                  <span className="flex-1 font-medium">
                    {data.waiting} {data.waiting === 1 ? "video is" : "videos are"} waiting for your approval
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4" />
                </Link>
              )}
              {data && data.needs_attention.length > 0 && (
                <Panel title="Needs attention">
                  <ul>
                    {data.needs_attention.map((run) => (
                      <RunRow key={run.id} run={run} />
                    ))}
                  </ul>
                </Panel>
              )}
              <Panel title="Coming up">
                {data && data.coming_up.length > 0 ? (
                  <ul>
                    {data.coming_up.map((entry) => (
                      <li key={entry.automation}>
                        <Link
                          to={`/automations/${entry.automation}`}
                          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
                        >
                          <CalendarClock aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-foreground">{entry.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatScheduled(entry.slot)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-3 py-2.5 text-sm text-pretty text-muted-foreground">Nothing is scheduled. Switch an automation on to see its next video here.</p>
                )}
              </Panel>
            </div>
          </div>
          <section aria-labelledby="recent-runs" className="space-y-3">
            <h3 id="recent-runs" className="text-lg font-semibold text-foreground">
              Recent runs
            </h3>
            {summary.isError ? (
              <ErrorNote>{summary.error.message}</ErrorNote>
            ) : data && data.recent.length > 0 ? (
              <ul className="rounded-xl border border-border bg-white p-2">
                {data.recent.map((run) => (
                  <RunRow key={run.id} run={run} />
                ))}
              </ul>
            ) : (
              <p className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-white px-4 py-6 text-sm text-muted-foreground">
                <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
                No videos have been made yet. A test from an automation's page makes one without posting it.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
