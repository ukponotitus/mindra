import { useEffect, useState } from "react";
import { ArrowLeft, CircleAlert, Copy, LoaderCircle, Pause, Pencil, Play, Sparkles, Trash2 } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router";
import Timeline from "../components/automations/Timeline";
import { ErrorNote, Panel, PlatformMarks, RunRow, StatTile, StatusPill } from "../components/automations/parts";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import {
  AUTOMATION_STATUS,
  KINDS,
  LANGUAGES,
  MODES,
  PLATFORM_LABELS,
  PRIVACY,
  runStatus,
  scheduleSummary,
  useAutomation,
  useAutomationAction,
  useAutomationsEnabled,
  useDeleteAutomation,
  useRun,
  useStartRun,
  type AutomationDetail as Detail,
  type RunStatus,
} from "../lib/automations";
import { formatScheduled } from "../lib/calendar";
import { cn } from "../lib/cn";

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : error ? "That didn't go through. Try again." : "";
}

/** What the automation does, in five plain lines, each with where to change it. */
function Summary({ automation }: { automation: Detail }) {
  const config = automation.config;
  const create = automation.kind === "create";
  const waiting = automation.topics.filter((item) => !item.used_at);
  const rows = [
    {
      step: "content",
      title: "What it makes",
      text: create
        ? `A ${config.content.minutes}-minute ${config.content.tone} video in ${LANGUAGES[config.content.language] ?? config.content.language} on ${
            config.topics.source === "ai" ? "a new AI topic each time" : `the next of ${waiting.length} topics${config.topics.source === "both" ? ", then AI ideas" : ""}`
          }.`
        : automation.kind === "repurpose"
          ? config.source.clips === "newest"
            ? "Your newest made clip each time, with a title and caption written for it."
            : `The next of ${waiting.length} clips you chose, with a title and caption written for each.`
          : `The next of ${waiting.length} videos on its list, with a title and caption written for each.`,
    },
    {
      step: "video",
      title: "How it's put together",
      text: create
        ? `${config.voice.voice_name || "No voice chosen"} reads the script over ${config.visuals.use_all ? "all your photos and clips" : `${config.visuals.assets.length} photos and clips`}${
            config.music.tracks.length ? ", with music" : ""
          }${config.captions.on ? " and captions" : ""}, ${config.content.shape === "16:9" ? "landscape" : "vertical"}, in Motion Studio.`
        : "Posted as it is.",
    },
    {
      step: "platforms",
      title: "Where it goes",
      text: config.publishing.platforms.length
        ? config.publishing.platforms
            .map((platform) => {
              const account = platform === "youtube" ? automation.account : automation.tiktok_account;
              return `${PLATFORM_LABELS[platform]} (${account ? account.name : "no account chosen"}${platform === "youtube" ? `, ${PRIVACY[config.publishing.privacy].toLowerCase()}` : ""})`;
            })
            .join(" and ") + ", and the Content Library."
        : "No platform chosen.",
    },
    { step: "schedule", title: "When", text: `${scheduleSummary(automation)}, ${automation.time_zone.replace(/_/g, " ")}.` },
    { step: "schedule", title: "Approval", text: MODES[automation.mode].description },
  ];
  return (
    <section className="divide-y divide-border rounded-xl border border-border bg-card">
      {rows.map((row) => (
        <div key={row.title} className="flex items-start gap-4 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-medium text-muted-foreground">{row.title}</h3>
            <p className="mt-0.5 text-sm text-pretty text-foreground">{row.text}</p>
          </div>
          <Link to={`/automations/${automation.id}/settings?step=${row.step}`} className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Change
          </Link>
        </div>
      ))}
    </section>
  );
}

function AutomaticPosting({ automation }: { automation: Detail }) {
  const action = useAutomationAction(automation.id);
  const on = automation.mode === "automatic";
  const tiktok = automation.config.publishing.platforms.includes("tiktok");
  const youtube = automation.config.publishing.platforms.includes("youtube");
  if (automation.mode === "draft") {
    return (
      <section className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Posting</h3>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Each video is saved in your Content Library as a draft. Nothing is posted until you post it.</p>
        <Link to={`/automations/${automation.id}/settings?step=schedule`} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })}>
          Change
        </Link>
      </section>
    );
  }
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">Posting</h3>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        {on
          ? `${youtube ? "Mindra uploads each video to your YouTube channel at its time without asking you each time" : "Videos go out at their time"} when every check passes; one that doesn't waits for you${tiktok ? ", and TikTok posts always wait for your approval" : ""}. On since ${
              automation.automatic_since ? formatScheduled(automation.automatic_since) : "recently"
            }.`
          : automation.approved_once
            ? "You approve each video. Now that you've approved one, it can post on its own."
            : "You approve each video. Once you've approved one, it can post on its own."}
      </p>
      <div className="mt-3">
        {on ? (
          <button type="button" onClick={() => action.mutate({ action: "automatic", body: { on: false } })} disabled={action.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Go back to approving each video
          </button>
        ) : (
          <ConfirmDialog
            tone="primary"
            trigger={
              <button type="button" disabled={!automation.approved_once || !automation.can_post_automatically || action.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                Post automatically
              </button>
            }
            title="Post without your approval?"
            description={`${
              youtube
                ? "Mindra will upload each video to your YouTube channel at its time without asking you each time, and without you seeing it first"
                : `Videos will go to ${automation.config.publishing.platforms.map((platform) => PLATFORM_LABELS[platform]).join(" and ")} at their time without you seeing them first`
            }, as long as every quality check passes. One that doesn't pass still waits for you.${tiktok ? " TikTok posts still wait for your approval." : ""} You can switch back at any time.`}
            confirmLabel="Post automatically"
            onConfirm={() => action.mutate({ action: "automatic", body: { on: true, confirm: true } })}
          />
        )}
        {!on && !automation.can_post_automatically && <p className="mt-2 text-xs text-muted-foreground">Only the workspace&apos;s owner or an admin can turn this on.</p>}
      </div>
      {action.error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {errorText(action.error)}
        </p>
      )}
    </section>
  );
}

const FILTERS: { id: string; label: string; statuses: RunStatus[] }[] = [
  { id: "all", label: "All", statuses: [] },
  { id: "waiting", label: "Waiting for you", statuses: ["waiting"] },
  { id: "posted", label: "Posted", statuses: ["published", "scheduled"] },
  { id: "stopped", label: "Stopped", statuses: ["failed"] },
];

/** One automation: what it does, the latest video's progress, what's coming, and every video it made. */
export default function AutomationDetail() {
  const enabled = useAutomationsEnabled();
  const { automationId = "" } = useParams();
  const navigate = useNavigate();
  const automation = useAutomation(automationId);
  const action = useAutomationAction(automationId);
  const start = useStartRun(automationId);
  const remove = useDeleteAutomation();
  const latest = useRun(automation.data?.runs[0]?.id);
  const [filter, setFilter] = useState("all");
  const { hash } = useLocation();
  const loaded = Boolean(automation.data);
  // "History" on the Automations page links here; the section is only there once the automation has loaded.
  useEffect(() => {
    if (loaded && hash === "#history") document.getElementById("history")?.scrollIntoView({ block: "start" });
  }, [loaded, hash]);

  if (!enabled) return <Navigate to="/dashboard" replace />;
  if (automation.isPending) {
    return (
      <div aria-busy="true" className="space-y-4">
        <p role="status" className="sr-only">
          Loading the automation
        </p>
        <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    );
  }
  if (automation.isError) return <ErrorNote>{automation.error.message}</ErrorNote>;

  const data = automation.data;
  const status = AUTOMATION_STATUS[data.status];
  const working = data.runs.some((run) => run.status === "queued" || run.status === "working");
  const problem = errorText(action.error || start.error || remove.error);
  const shown = FILTERS.find((item) => item.id === filter) ?? FILTERS[0];
  const runs = shown.statuses.length ? data.runs.filter((run) => shown.statuses.includes(run.status)) : data.runs;
  const goTo = (run: { id: string }) => navigate(`/automations/runs/${run.id}`);
  const sample = () => start.mutate({ kind: "test", length: data.kind === "create" ? "short" : "full" }, { onSuccess: goTo });
  const runNow = () => start.mutate({ kind: "run-now" }, { onSuccess: goTo });
  const duplicate = () => action.mutate({ action: "duplicate" }, { onSuccess: (copy) => navigate(`/automations/${copy.id}/setup`) });

  return (
    <div className="space-y-6">
      <Link to="/automations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Automations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-balance text-foreground">{data.name}</h2>
            <StatusPill {...status} />
            {data.mode === "automatic" && <StatusPill label="Posts automatically" tone="bg-primary/10 text-primary" />}
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground tabular-nums">
            <span>{KINDS[data.kind].label}</span>
            <span aria-hidden="true">·</span>
            <PlatformMarks platforms={data.platforms} drafts={data.mode === "draft"} />
            <span aria-hidden="true">·</span>
            <span>{scheduleSummary(data)}</span>
            {data.status === "active" && data.next_slot && (
              <>
                <span aria-hidden="true">·</span>
                <span>Next: {formatScheduled(data.next_slot)}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/automations/${data.id}/setup`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Link>
          <button type="button" onClick={sample} disabled={start.isPending || working || data.test_problems.length > 0} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Sparkles aria-hidden="true" className="size-4" />
            Make a sample
          </button>
          {data.status === "active" ? (
            <>
              <button type="button" onClick={runNow} disabled={start.isPending || working} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                Run now
              </button>
              <button type="button" onClick={() => action.mutate({ action: "pause" })} disabled={action.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                <Pause aria-hidden="true" className="size-4" />
                Pause
              </button>
            </>
          ) : (
            <button type="button" onClick={() => action.mutate({ action: "activate" })} disabled={action.isPending || data.problems.length > 0} className={buttonStyles({ variant: "primary", size: "sm" })}>
              {action.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Play aria-hidden="true" className="size-4" />}
              {data.status === "paused" ? "Resume" : "Switch on"}
            </button>
          )}
        </div>
      </div>

      {problem && <ErrorNote>{problem}</ErrorNote>}
      {data.problems.length > 0 && (
        <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">{data.status === "active" ? "This needs sorting out, or its next video will stop" : "Before it can be switched on"}</h3>
          <ul className="space-y-1.5">
            {data.problems.map((item) => (
              <li key={`${item.field}-${item.message}`} className="flex gap-2 text-sm text-pretty text-amber-900">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>
                  {item.message}{" "}
                  {item.field && (
                    <Link to={`/automations/${data.id}/settings?step=${item.field}`} className="font-medium underline underline-offset-2">
                      Fix it
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Videos made" value={data.made} hint="Saved in the Content Library" />
        <StatTile label="Posted" value={data.posted} />
        <StatTile label="Waiting for you" value={data.waiting} />
        <StatTile label="Stopped" value={data.failed} hint={data.failed ? "Open one to try again" : undefined} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          <Summary automation={data} />
          <section aria-labelledby="latest" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h3 id="latest" className="text-lg font-semibold text-foreground">
                Latest video
              </h3>
              {latest.data && (
                <Link to={`/automations/runs/${latest.data.id}`} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
                  Open
                </Link>
              )}
            </div>
            {latest.data ? (
              <div className="space-y-3 rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{latest.data.title || latest.data.topic || "Choosing what to make"}</p>
                  <StatusPill {...runStatus(latest.data)} />
                </div>
                <Timeline run={latest.data} />
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-sm text-pretty text-muted-foreground">
                No videos yet. Make a sample to see what this automation makes; it isn&apos;t saved or posted.
              </p>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <AutomaticPosting automation={data} />
          {data.status === "active" && (
            <Panel title="Coming up">
              {data.upcoming.length ? (
                <ul className="px-2 py-1">
                  {data.upcoming.map((slot) => (
                    <li key={slot} className="py-1 text-sm text-foreground tabular-nums">
                      {formatScheduled(slot)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-2 py-1 text-sm text-muted-foreground">No more days before the end date.</p>
              )}
            </Panel>
          )}
        </div>
      </div>

      <section aria-labelledby="history" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="history" className="text-lg font-semibold text-foreground">
            History
          </h3>
          <div role="group" aria-label="Show" className="flex flex-wrap gap-1">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={filter === item.id}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-primary",
                  filter === item.id ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        {runs.length ? (
          <ul className="rounded-xl border border-border bg-card p-2">
            {runs.map((run) => (
              <RunRow key={run.id} run={run} showAutomation={false} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-sm text-pretty text-muted-foreground">
            {data.runs.length ? "None of its recent videos are here." : "No videos yet."}
          </p>
        )}
      </section>

      <div className="flex flex-wrap gap-2 border-t border-border pt-6">
        <button type="button" onClick={duplicate} disabled={action.isPending} className={buttonStyles({ variant: "ghost", size: "sm" })}>
          <Copy aria-hidden="true" className="size-4" />
          Duplicate
        </button>
        <ConfirmDialog
          trigger={
            <button type="button" className={buttonStyles({ variant: "ghost", size: "sm", className: "text-red-700 hover:text-red-800" })}>
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </button>
          }
          title={`Delete ${data.name}?`}
          description="No more videos will be made. Videos it already made stay in Motion Studio and the Content Library, and posts already scheduled still go out."
          confirmLabel="Delete automation"
          onConfirm={() => remove.mutate(data.id, { onSuccess: () => navigate("/automations") })}
        />
      </div>
    </div>
  );
}
