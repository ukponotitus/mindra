import { Clock, Pause, Pencil, Play, Plus } from "lucide-react";
import { Link, Navigate } from "react-router";
import { ErrorNote } from "../components/automations/parts";
import { ProgressBar, Tag, TEMPLATE_ICONS, Thumb } from "../components/automations/widgets";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import {
  nextVideoState,
  runIsWorking,
  scheduleSummary,
  stageStates,
  useAutomationAction,
  useAutomations,
  useAutomationsEnabled,
  useAutomationSummary,
  usePresets,
  useRuns,
  type Automation,
  type Run,
} from "../lib/automations";
import { formatScheduled } from "../lib/calendar";
import { cn } from "../lib/cn";

function reviewKind(run: Run): { tag: string; tone: "cost_mid" | "cost_high" | "plain"; thumb: string; thumbTone: "primary" | "failed" | "muted"; detail: string; button: string } {
  if (run.status === "failed") {
    return {
      tag: "Needs a retry",
      tone: "cost_high",
      thumb: "Failed",
      thumbTone: "failed",
      detail: `${run.step_label || "A step"} stopped · Nothing was charged for the failed try`,
      button: "See what happened",
    };
  }
  if (run.waiting_for === "script") {
    return { tag: "Script", tone: "plain", thumb: "Script", thumbTone: "muted", detail: "Script ready · Approve to start making the video", button: "Review" };
  }
  if (run.waiting_for === "tiktok") {
    return { tag: "TikTok post", tone: "plain", thumb: run.shape, thumbTone: "primary", detail: "TikTok asks you to approve each post", button: "Review" };
  }
  const when = run.publish_at ? ` · Posts ${formatScheduled(run.publish_at)} if approved` : "";
  return { tag: "Final video", tone: "cost_mid", thumb: run.shape, thumbTone: "primary", detail: `Video ready${when}`, button: "Review" };
}

function ReviewRow({ run }: { run: Run }) {
  const kind = reviewKind(run);
  return (
    <li className="flex flex-wrap items-center gap-4 border-t border-amber-200/70 px-4 py-3 first:border-t-0 sm:flex-nowrap">
      {run.thumbnail_url ? (
        <img src={run.thumbnail_url} alt="" className="h-14 w-24 shrink-0 rounded-lg object-cover" />
      ) : (
        <Thumb label={kind.thumb} tone={kind.thumbTone} className="h-14 w-24" />
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{run.title || run.topic || "A new video"}</span>
        <span className="block text-sm text-muted-foreground tabular-nums">
          {run.automation_name} · {kind.detail}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3">
        <Tag label={kind.tag} tone={kind.tone} />
        <Link to={`/automations/approvals?run=${run.id}`} className={buttonStyles({ variant: run.status === "failed" ? "secondary" : "primary", size: "sm" })}>
          {kind.button}
        </Link>
      </span>
    </li>
  );
}

function AutomationCard({ automation, presetName }: { automation: Automation; presetName: string }) {
  const action = useAutomationAction(automation.id);
  const last = automation.last_run;
  const details = [
    presetName,
    automation.minutes ? `${automation.minutes} min, ${automation.shape === "9:16" ? "vertical" : "landscape"}` : automation.shape === "9:16" ? "vertical" : "",
    automation.platforms.map((platform) => (platform === "youtube" ? "YouTube" : "TikTok")).join(" and ") || "No platform chosen",
    scheduleSummary(automation),
  ].filter(Boolean);

  if (automation.status === "draft") {
    const missing = automation.queue.count === 0 ? "what to make" : "";
    return (
      <li className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-dashed border-border bg-card p-5">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
            <Link to={`/automations/${automation.id}`} className="hover:underline">
              {automation.name}
            </Link>
            <Tag label="Not switched on" />
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {details.join(" · ")}
            {missing ? ` · Still needed: ${missing}` : ""}
          </p>
        </div>
        <Link to={`/automations/${automation.id}/setup`} className={buttonStyles({ variant: "secondary" })}>
          Finish setting up
        </Link>
      </li>
    );
  }

  const next = last && !["published", "done", "cancelled", "rejected", "expired"].includes(last.status) ? last : null;
  const state = next ? nextVideoState(next) : null;
  return (
    <li className="rounded-xl border border-border bg-card p-5">
      {action.error && <ErrorNote>{action.error instanceof ApiError ? action.error.message : "Mindra couldn't change this. Try again."}</ErrorNote>}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex flex-wrap items-center gap-2 text-lg font-semibold text-foreground">
            <Link to={`/automations/${automation.id}`} className="hover:underline">
              {automation.name}
            </Link>
            <Tag label={automation.status === "active" ? "On" : "Paused"} tone={automation.status === "active" ? "cost_low" : "plain"} />
            {automation.preset === "kids" && <Tag label="Made for kids" />}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{details.join(" · ")}</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link to={`/automations/${automation.id}/setup`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Pencil aria-hidden="true" className="size-4" />
            Edit
          </Link>
          <button
            type="button"
            disabled={action.isPending}
            onClick={() => action.mutate({ action: automation.status === "active" ? "pause" : "activate" })}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            {automation.status === "active" ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
            {automation.status === "active" ? "Pause" : "Resume"}
          </button>
        </div>
      </div>

      {next && state ? (
        <Link to={`/automations/runs/${next.id}`} className="mt-4 block rounded-lg bg-secondary/60 p-4 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="text-foreground">
              <span className="font-medium">Next video:</span> {next.title || "Choosing what to make"}
            </p>
            <p className={cn("font-medium", state.tone === "waiting" ? "text-amber-800" : state.tone === "failed" ? "text-red-700" : "text-primary")}>{state.text}</p>
          </div>
          <div className="mt-3">
            <ProgressBar steps={stageStates(next)} />
          </div>
        </Link>
      ) : (
        <p className="mt-4 rounded-lg bg-secondary/60 p-4 text-sm text-muted-foreground tabular-nums">
          {automation.next_slot ? `Next video: ${formatScheduled(automation.next_slot)}` : "No video planned"}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground tabular-nums">
        <span className={cn(automation.queue.low && "text-amber-800")}>
          <span className="font-semibold text-foreground">{automation.queue.count}</span> {automation.queue.what} in the queue
          {automation.queue.low ? " · running low" : ""}
        </span>
        <span>
          <span className="font-semibold text-foreground">{automation.made}</span> made, <span className="font-semibold text-foreground">{automation.posted}</span> posted
        </span>
        {automation.kind === "create" && (
          <span>
            About <span className="font-semibold text-foreground">{automation.credits_per_video} credits</span> per video
          </span>
        )}
        <Link to={`/automations/${automation.id}/setup#queue`} className="ml-auto font-medium text-primary hover:underline">
          {automation.preset === "kids" ? "Characters and stories" : "Manage queue"}
        </Link>
      </div>
    </li>
  );
}

/** The template gallery shown instead of the list when nothing has been set up: no zeroed numbers. */
function EmptyGallery() {
  const presets = usePresets();
  const templates = (presets.data ?? []).filter((preset) => !preset.hidden);
  return (
    <section className="rounded-xl border border-dashed border-border bg-card p-6">
      <h3 className="font-semibold text-foreground">Choose what Mindra should make</h3>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">Every template runs the same steps. You can change the look, voice and schedule next.</p>
      {presets.isPending ? (
        <div aria-busy="true" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-lg border border-border" />
          ))}
        </div>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => {
            const Icon = TEMPLATE_ICONS[template.id] ?? Plus;
            return (
              <li key={template.id}>
                <Link to={`/automations/new?template=${template.id}`} className="flex h-full gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-foreground">{template.name}</span>
                    <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">{template.description}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const ACTIVITY_DOTS = { posted: "bg-emerald-500", review: "bg-amber-500", failed: "bg-red-500", note: "bg-primary", working: "bg-primary/50" };

/** A recent run as one line of activity. */
function activityOf(run: Run): { kind: keyof typeof ACTIVITY_DOTS; strong: string; text: string; when: string } {
  const title = `“${run.title || run.topic || "A new video"}”`;
  const platforms = run.platforms.map((platform) => (platform === "youtube" ? "YouTube" : "TikTok")).join(" and ");
  const when = formatScheduled(run.finished_at ?? run.updated_at);
  if (run.status === "published") return { kind: "posted", strong: "Posted", text: `${title}${platforms ? ` to ${platforms}` : ""}`, when };
  if (run.status === "failed") return { kind: "failed", strong: `${run.step_label || "A step"} failed`, text: `on ${title}`, when };
  if (run.status === "waiting") return { kind: "review", strong: run.waiting_for === "script" ? "Script ready for review" : "Ready for review", text: title, when };
  if (run.status === "rejected") return { kind: "note", strong: "You sent back", text: title, when };
  if (run.status === "scheduled") return { kind: "posted", strong: "Approved and scheduled", text: title, when };
  if (runIsWorking(run)) return { kind: "working", strong: run.step_label ? `Working on ${run.step_label.toLowerCase()}` : "Being made", text: title, when };
  return { kind: "note", strong: run.trigger === "test" ? "Sample made" : "Finished", text: title, when };
}

/** The Automations page: what needs a review, each automation with its next video, and the month's numbers. */
export default function Automations() {
  const enabled = useAutomationsEnabled();
  const automations = useAutomations();
  const summary = useAutomationSummary(enabled);
  const review = useRuns({ status: ["waiting", "failed"] });
  const presets = usePresets();

  if (!enabled) return <Navigate to="/dashboard" replace />;

  const list = automations.data ?? [];
  const data = summary.data;
  const presetNames = new Map((presets.data ?? []).map((preset) => [preset.id, preset.name]));
  const waiting = [...(review.data?.results ?? [])].sort((a, b) => (a.slot ?? a.created_at).localeCompare(b.slot ?? b.created_at));
  const on = list.filter((automation) => automation.status === "active").length;
  const drafts = list.filter((automation) => automation.status === "draft").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-balance text-foreground">Automations</h2>
          <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
            Mindra writes or takes your script, makes the visuals and voiceover, puts it together, and waits for you before posting.
          </p>
        </div>
        <Link to="/automations/new" className={buttonStyles()}>
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
          <div className="h-24 animate-pulse rounded-xl border border-border bg-card" />
          <div className="h-48 animate-pulse rounded-xl border border-border bg-card" />
        </div>
      ) : list.length === 0 ? (
        <EmptyGallery />
      ) : (
        <>
          {waiting.length > 0 && (
            <section aria-labelledby="review-heading" className="overflow-hidden rounded-xl border border-amber-200 bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-9 place-items-center rounded-full bg-amber-100 text-amber-800">
                    <Clock aria-hidden="true" className="size-4" />
                  </span>
                  <div>
                    <h3 id="review-heading" className="font-semibold text-foreground tabular-nums">
                      {waiting.length} {waiting.length === 1 ? "thing needs" : "things need"} your review
                    </h3>
                    <p className="text-sm text-amber-800">Nothing posts until you approve it.</p>
                  </div>
                </div>
                <Link to="/automations/approvals" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  Open review queue
                </Link>
              </div>
              <ul>
                {waiting.slice(0, 5).map((run) => (
                  <ReviewRow key={run.id} run={run} />
                ))}
              </ul>
            </section>
          )}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <section aria-labelledby="yours-heading" className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id="yours-heading" className="text-lg font-semibold text-foreground">
                  Your automations
                </h3>
                <p className="text-sm text-muted-foreground tabular-nums">
                  {on} on{drafts ? ` · ${drafts} ${drafts === 1 ? "needs" : "need"} setup` : ""}
                </p>
              </div>
              <ul className="mt-3 space-y-3">
                {list.map((automation) => (
                  <AutomationCard key={automation.id} automation={automation} presetName={presetNames.get(automation.preset) ?? ""} />
                ))}
              </ul>
            </section>

            <div className="min-w-0 space-y-4">
              <section className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground">Last {data?.stats.days ?? 30} days</h3>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-4">
                  {[
                    ["Videos made", data?.stats.made],
                    ["Posted", data?.stats.posted],
                    ["You rejected", data?.stats.rejected],
                    ["Credits used", data?.stats.credits_used],
                  ].map(([label, value]) => (
                    <div key={String(label)}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="text-2xl font-semibold text-foreground tabular-nums">{value ?? "–"}</dd>
                    </div>
                  ))}
                </dl>
                {data && (
                  <p className="mt-4 border-t border-border pt-3 text-sm text-pretty text-muted-foreground tabular-nums">
                    At this schedule you&apos;ll use about <span className="font-semibold text-foreground">{data.credits.month_estimate} credits</span> this month.{" "}
                    {data.credits.limit === null ? "Your plan doesn't limit them." : `You have ${data.credits.left} of ${data.credits.limit} left.`}
                  </p>
                )}
              </section>

              <section className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground">Recent activity</h3>
                {data?.recent.length ? (
                  <ul className="mt-3 space-y-3">
                    {data.recent.slice(0, 6).map((run) => {
                      const event = activityOf(run);
                      return (
                        <li key={run.id} className="flex gap-3 text-sm">
                          <span aria-hidden="true" className={cn("mt-1.5 size-2 shrink-0 rounded-full", ACTIVITY_DOTS[event.kind])} />
                          <Link to={`/automations/runs/${run.id}`} className="min-w-0 hover:underline">
                            <span className="text-pretty text-foreground">
                              <span className="font-medium">{event.strong}</span> {event.text}
                            </span>
                            <span className="block text-xs text-muted-foreground tabular-nums">{event.when}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">Nothing yet. Make a sample from an automation&apos;s setup to see what it makes.</p>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
