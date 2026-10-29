import { useState } from "react";
import { ArrowLeft, Check, CircleAlert, CircleDashed, Copy, LoaderCircle, Pause, Pencil, Play, TestTube, Trash2, X } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { ErrorNote, Panel, RunRow, StatusPill } from "../components/automations/parts";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import {
  AUTOMATION_STATUS,
  EFFECTS,
  LANGUAGES,
  PRIVACY,
  scheduleSummary,
  STEPS,
  TRANSITIONS,
  TRANSLATIONS,
  useAutomation,
  useAutomationAction,
  useAutomationsEnabled,
  useDeleteAutomation,
  useRun,
  useStartRun,
  type AutomationDetail as Detail,
  type StepStatus,
} from "../lib/automations";
import { formatScheduled } from "../lib/calendar";
import { cn } from "../lib/cn";

// Where each step's settings are changed in the setup.
const SETUP_FOR: Record<string, string | null> = {
  trigger: "schedule",
  topic: "script",
  script: "script",
  voice: "voice",
  music: "look",
  visuals: "look",
  render: "look",
  details: "basics",
  thumbnail: "look",
  review: null,
  upload: "schedule",
  monitor: null,
};

/** What each step is set to, in a line or two. */
function stepSettings(name: string, automation: Detail): string[] {
  const config = automation.config;
  switch (name) {
    case "trigger":
      return [scheduleSummary(automation), automation.time_zone.replace(/_/g, " ")];
    case "topic": {
      const waiting = automation.topics.filter((topic) => !topic.used_at).length;
      const source = { list: "From your list", both: "Your list, then AI ideas", ai: "AI ideas" }[config.topics.source];
      return [`${source}: ${waiting} topics waiting`, `A topic can come back after ${config.topics.repeat_after_days} days`];
    }
    case "script":
      return [
        `${config.content.minutes} minutes, ${config.content.tone}, ${LANGUAGES[config.content.language] ?? config.content.language}`,
        `${config.script.approve_first ? "You approve it before the voice-over" : "Not approved separately"}${config.script.scripture ? `; Scripture from the ${TRANSLATIONS[config.script.translation]}` : ""}`,
      ];
    case "voice":
      return [config.voice.voice_name || "No voice chosen yet", `Speed ${config.voice.speed.toFixed(2)}×, ${config.voice.pronunciations.length} pronunciations`];
    case "music":
      return [`${config.music.tracks.length} ${config.music.tracks.length === 1 ? "track" : "tracks"}`, `${Math.round(config.music.volume * 100)}% under the voice${config.music.fade ? ", faded" : ""}`];
    case "visuals":
      return [
        config.visuals.use_all ? "All your photos and clips" : `${config.visuals.assets.length} photos and clips`,
        `${TRANSITIONS[config.visuals.transition]} transitions, ${EFFECTS[config.visuals.effect].toLowerCase()} filter`,
      ];
    case "render":
      return [`${config.content.shape === "16:9" ? "Landscape 16:9" : "Vertical 9:16"}, 1080p`, `Captions ${config.captions.on ? "on" : "off"}, ${config.branding.logo ? "with your logo" : "no logo"}`];
    case "details":
      return ["Title, description and tags written for each video", "The music's credit goes in the description"];
    case "thumbnail":
      return [config.thumbnail.on ? "Made for each video" : "YouTube picks one"];
    case "review":
      return [automation.mode === "automatic" ? "Posts on its own when every check passes" : "Waits for your approval"];
    case "upload":
      return [automation.account?.name ?? "No channel chosen", PRIVACY[config.publishing.privacy]];
    case "monitor":
      return ["Checks it went out, then Analytics follows it"];
    default:
      return [];
  }
}

const STEP_ICON: Record<StepStatus, { icon: typeof Check; tone: string; label: string }> = {
  pending: { icon: CircleDashed, tone: "text-muted-foreground", label: "Not reached" },
  running: { icon: LoaderCircle, tone: "text-primary animate-spin", label: "Working" },
  waiting: { icon: CircleDashed, tone: "text-amber-700", label: "Waiting" },
  done: { icon: Check, tone: "text-emerald-700", label: "Done" },
  skipped: { icon: X, tone: "text-muted-foreground", label: "Skipped" },
  failed: { icon: CircleAlert, tone: "text-red-700", label: "Stopped" },
};

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : error ? "That didn't go through. Try again." : "";
}

function AutomaticPosting({ automation }: { automation: Detail }) {
  const action = useAutomationAction(automation.id);
  const on = automation.mode === "automatic";
  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <h3 className="text-sm font-semibold text-foreground">Posting</h3>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        {on
          ? `Videos go out on their own when every check passes. Any that doesn't pass waits for you. On since ${automation.automatic_since ? formatScheduled(automation.automatic_since) : "recently"}.`
          : automation.approved_once
            ? "You approve each video. You can let it post on its own now that you've approved one."
            : "You approve each video. Once you've approved one, you can let it post on its own."}
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
              <button type="button" disabled={!automation.approved_once || action.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                Post automatically
              </button>
            }
            title="Post without your approval?"
            description="Videos will go to YouTube at their time without you seeing them first, as long as every quality check passes. One that doesn't pass still waits for you. You can switch back at any time."
            confirmLabel="Post automatically"
            onConfirm={() => action.mutate({ action: "automatic", body: { on: true, confirm: true } })}
          />
        )}
      </div>
      {action.error && <p role="alert" className="mt-2 text-sm text-red-700">{errorText(action.error)}</p>}
    </section>
  );
}

/** One automation: its twelve steps and their settings, what's in the way, what's coming, and its runs. */
export default function AutomationDetail() {
  const enabled = useAutomationsEnabled();
  const { automationId = "" } = useParams();
  const navigate = useNavigate();
  const automation = useAutomation(automationId);
  const action = useAutomationAction(automationId);
  const start = useStartRun(automationId);
  const remove = useDeleteAutomation();
  const lastRunId = automation.data?.runs[0]?.id;
  const lastRun = useRun(lastRunId);
  const [chosen, setChosen] = useState("trigger");

  if (!enabled) return <Navigate to="/dashboard" replace />;
  if (automation.isPending) {
    return (
      <div aria-busy="true" className="space-y-4">
        <p role="status" className="sr-only">
          Loading the automation
        </p>
        <div className="h-24 animate-pulse rounded-xl border border-border bg-white" />
        <div className="h-96 animate-pulse rounded-xl border border-border bg-white" />
      </div>
    );
  }
  if (automation.isError) return <ErrorNote>{automation.error.message}</ErrorNote>;

  const data = automation.data;
  const status = AUTOMATION_STATUS[data.status];
  const stepStatus = new Map((lastRun.data?.steps ?? []).map((step) => [step.name, step.status]));
  const selected = STEPS.find((step) => step.name === chosen) ?? STEPS[0];
  const setupStep = SETUP_FOR[selected.name];
  const working = data.runs.some((run) => run.status === "queued" || run.status === "working");
  const problem = errorText(action.error || start.error || remove.error);

  const test = () => start.mutate("test", { onSuccess: (run) => navigate(`/automations/runs/${run.id}`) });
  const runNow = () => start.mutate("run-now", { onSuccess: (run) => navigate(`/automations/runs/${run.id}`) });
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
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {data.account?.name ?? "No channel chosen"} · {scheduleSummary(data)}
            {data.status === "active" && data.next_slot ? ` · Next: ${formatScheduled(data.next_slot)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={`/automations/${data.id}/setup`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit settings
          </Link>
          <button type="button" onClick={test} disabled={start.isPending || working || data.test_problems.length > 0} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <TestTube aria-hidden="true" className="size-4" />
            Make a test video
          </button>
          {data.status === "active" ? (
            <>
              <button type="button" onClick={runNow} disabled={start.isPending || working} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                Make one now
              </button>
              <button type="button" onClick={() => action.mutate({ action: "pause" })} disabled={action.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                <Pause aria-hidden="true" className="size-4" />
                Pause
              </button>
            </>
          ) : (
            <button type="button" onClick={() => action.mutate({ action: "activate" })} disabled={action.isPending || data.problems.length > 0} className={buttonStyles({ variant: "primary", size: "sm" })}>
              {action.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Play aria-hidden="true" className="size-4" />}
              {data.status === "paused" ? "Switch back on" : "Switch on"}
            </button>
          )}
        </div>
      </div>

      {problem && <ErrorNote>{problem}</ErrorNote>}
      {data.status !== "active" && data.problems.length > 0 && (
        <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">Before it can be switched on</h3>
          <ul className="space-y-1.5">
            {data.problems.map((item) => (
              <li key={`${item.field}-${item.message}`} className="flex gap-2 text-sm text-pretty text-amber-900">
                <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                {item.message}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-labelledby="steps" className="min-w-0 space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h3 id="steps" className="text-lg font-semibold text-foreground">
              Steps
            </h3>
            {lastRun.data && (
              <Link to={`/automations/runs/${lastRun.data.id}`} className="text-xs text-muted-foreground hover:text-foreground">
                Showing the last run
              </Link>
            )}
          </div>
          <ol className="rounded-xl border border-border bg-white p-2">
            {STEPS.map((step, index) => {
              const state = stepStatus.get(step.name);
              const look = state ? STEP_ICON[state] : null;
              const Icon = look?.icon;
              return (
                <li key={step.name} className="relative">
                  {index < STEPS.length - 1 && <span aria-hidden="true" className="absolute top-11 bottom-0 left-[1.6rem] w-px bg-border" />}
                  <button
                    type="button"
                    onClick={() => setChosen(step.name)}
                    aria-pressed={chosen === step.name}
                    className={cn(
                      "relative flex w-full items-start gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                      chosen === step.name ? "bg-primary/5" : "hover:bg-secondary",
                    )}
                  >
                    <span className={cn("grid size-7 shrink-0 place-items-center rounded-full border bg-white text-xs font-semibold tabular-nums", chosen === step.name ? "border-primary text-primary" : "border-border text-muted-foreground")}>
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{step.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">{stepSettings(step.name, data)[0]}</span>
                    </span>
                    {look && Icon && (
                      <span className="mt-1 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                        <Icon aria-hidden="true" className={cn("size-4", look.tone)} />
                        <span className="sr-only sm:not-sr-only">{look.label}</span>
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </section>

        <div className="space-y-4">
          <section aria-live="polite" className="rounded-xl border border-border bg-white p-4">
            <p className="text-xs font-medium text-muted-foreground tabular-nums">
              Step {STEPS.indexOf(selected) + 1} of {STEPS.length}
            </p>
            <h3 className="mt-0.5 font-semibold text-foreground">{selected.label}</h3>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">{selected.description}</p>
            <ul className="mt-3 space-y-1 border-t border-border pt-3">
              {stepSettings(selected.name, data).map((line) => (
                <li key={line} className="text-sm text-foreground">
                  {line}
                </li>
              ))}
            </ul>
            {setupStep && (
              <Link to={`/automations/${data.id}/setup?step=${setupStep}`} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-4" })}>
                Change
              </Link>
            )}
            {lastRun.data?.steps.find((step) => step.name === selected.name)?.error && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-pretty text-red-800">
                Last run: {lastRun.data.steps.find((step) => step.name === selected.name)?.error}
              </p>
            )}
          </section>
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
        <h3 id="history" className="text-lg font-semibold text-foreground">
          Runs
        </h3>
        {data.runs.length ? (
          <ul className="rounded-xl border border-border bg-white p-2">
            {data.runs.map((run) => (
              <RunRow key={run.id} run={run} showAutomation={false} />
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border border-dashed border-border bg-white px-4 py-6 text-sm text-pretty text-muted-foreground">
            No videos yet. Make a test video to see what this automation makes; it waits for your approval and isn&apos;t posted.
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
          description="No more videos will be made. Videos it already made stay in Motion Studio, and posts already scheduled still go out."
          confirmLabel="Delete automation"
          onConfirm={() => remove.mutate(data.id, { onSuccess: () => navigate("/automations") })}
        />
      </div>
    </div>
  );
}
