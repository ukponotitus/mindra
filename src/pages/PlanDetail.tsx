import { useId, useRef, useState, type FormEvent } from "react";
import { Check, ChevronRight, ClipboardList, LoaderCircle, PenLine, Plus, RotateCw, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import EmptyState from "../components/EmptyState";
import EntryCard from "../components/plans/EntryCard";
import EntryForm from "../components/plans/EntryForm";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { dayKey, formatDayLong, parseDayKey, timeZoneName } from "../lib/calendar";
import { cn } from "../lib/cn";
import { formatDate } from "../lib/format";
import { PLAN_TEXT_MAX, useDeletePlan, usePlan, usePlanAction, useRenamePlan, useSourceChoices } from "../lib/plans";
import type { ContentPlanDetail, PlanEntry } from "../lib/types";

const crumbLink =
  "rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** A plan holds up to this many posts (planner/rules.py). */
const PLAN_MAX_ENTRIES = 60;
const NO_DAY = "none";

/** Entries by the day they go out (in the browser's time zone), in time order; those without a time last. */
function byDay(entries: PlanEntry[]): [string, PlanEntry[]][] {
  const days = new Map<string, PlanEntry[]>();
  const sorted = [...entries].sort((a, b) => {
    if (a.scheduled_at && b.scheduled_at) return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime() || a.position - b.position;
    if (a.scheduled_at || b.scheduled_at) return a.scheduled_at ? -1 : 1;
    return a.position - b.position;
  });
  for (const entry of sorted) {
    const key = entry.scheduled_at ? dayKey(new Date(entry.scheduled_at)) : NO_DAY;
    days.set(key, [...(days.get(key) ?? []), entry]);
  }
  return [...days.entries()];
}

function browserTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "";
  }
}

/** The plan's name, which can be changed in place: Enter or clicking away saves, Escape cancels. */
function PlanName({ plan }: { plan: ContentPlanDetail }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(plan.name);
  const rename = useRenamePlan(plan.id);
  const errorId = useId();
  // Enter submits and then the input loses focus; only the first of the two may save.
  const finished = useRef(false);

  const start = () => {
    finished.current = false;
    rename.reset();
    setName(plan.name);
    setEditing(true);
  };
  const cancel = () => {
    finished.current = true;
    setEditing(false);
  };
  const save = (event?: FormEvent) => {
    event?.preventDefault();
    if (finished.current) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === plan.name) return cancel();
    finished.current = true;
    rename.mutate(trimmed, { onSuccess: () => setEditing(false), onError: () => (finished.current = false) });
  };

  if (editing) {
    return (
      <form onSubmit={save} className="min-w-0 flex-1">
        <input
          autoFocus
          value={name}
          maxLength={120}
          disabled={rename.isPending}
          aria-label="Plan name"
          aria-invalid={rename.isError || undefined}
          aria-describedby={rename.isError ? errorId : undefined}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => save()}
          onKeyDown={(event) => event.key === "Escape" && cancel()}
          className={cn(
            "w-full max-w-xl rounded-lg border border-primary bg-white px-3 py-1.5 text-xl font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
            rename.isError && "border-red-600",
          )}
        />
        {rename.isError && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
            {rename.error.message}
          </p>
        )}
      </form>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-1">
      <h2 className="min-w-0 truncate text-2xl font-semibold text-balance text-foreground">{plan.name}</h2>
      <button type="button" onClick={start} aria-label="Rename plan" title="Rename" className={buttonStyles({ variant: "ghost", size: "icon" })}>
        <PenLine aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}

/** What was given to Mindra, and reading it again (optionally corrected) while no post is written from it. */
function PlanSource({ plan, canReadAgain, open = false }: { plan: ContentPlanDetail; canReadAgain: boolean; open?: boolean }) {
  const [text, setText] = useState(plan.text);
  const [editing, setEditing] = useState(false);
  const read = usePlanAction(plan.id);
  const ids = useId();
  const textError = read.error instanceof ApiError ? read.error.fieldErrors.text?.[0] : undefined;

  const readAgain = (event: FormEvent) => {
    event.preventDefault();
    if (read.isPending) return;
    const corrected = editing && text.trim() && text !== plan.text;
    read.mutate({ action: "read", body: corrected ? { text } : {} }, { onSuccess: () => setEditing(false) });
  };

  return (
    <details open={open} className="group rounded-xl border border-border bg-white">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-5 py-4 text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 transition-transform duration-150 ease-out group-open:rotate-90" />
        What you gave Mindra
        {plan.source_filename && <span className="min-w-0 truncate font-normal text-muted-foreground">· {plan.source_filename}</span>}
      </summary>
      <form onSubmit={readAgain} className="space-y-3 border-t border-border px-5 py-4">
        {plan.has_picture && (
          <p className="text-sm text-pretty text-muted-foreground">
            A picture of your plan{plan.text ? ", with this note:" : "."}
          </p>
        )}
        {editing ? (
          <>
            <label htmlFor={`${ids}-text`} className="sr-only">
              The plan
            </label>
            <textarea
              id={`${ids}-text`}
              value={text}
              rows={10}
              maxLength={PLAN_TEXT_MAX}
              disabled={read.isPending}
              aria-invalid={textError ? true : undefined}
              onChange={(event) => setText(event.target.value)}
              className="w-full resize-y rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm leading-relaxed text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 aria-invalid:border-red-400"
            />
          </>
        ) : (
          plan.text && (
            <p className="max-h-80 overflow-y-auto rounded-lg bg-background p-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-gray-700">
              {plan.text}
            </p>
          )
        )}
        {canReadAgain ? (
          <>
            {plan.entries.length > 0 && (
              <p className="text-xs text-pretty text-muted-foreground">Reading it again replaces the posts below.</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={read.isPending} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
                {read.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <RotateCw aria-hidden="true" className="size-4" />}
                Read it again
              </button>
              {!editing && (
                <button
                  type="button"
                  onClick={() => {
                    setText(plan.text);
                    setEditing(true);
                  }}
                  className={buttonStyles({ variant: "ghost", size: "sm", className: "h-9" })}
                >
                  <PenLine aria-hidden="true" className="size-4" />
                  {plan.text ? "Correct it first" : "Add a note first"}
                </button>
              )}
              {editing && (
                <button type="button" onClick={() => setEditing(false)} disabled={read.isPending} className={buttonStyles({ variant: "ghost", size: "sm", className: "h-9" })}>
                  Cancel
                </button>
              )}
            </div>
          </>
        ) : (
          plan.status === "ready" && (
            <p className="text-xs text-pretty text-muted-foreground">
              Posts were written from this plan, so it can&apos;t be read again. Change its posts below, or start a new plan.
            </p>
          )
        )}
        {read.isError && (
          <p role="alert" className="text-sm text-pretty text-red-600">
            {textError ?? read.error.message}
          </p>
        )}
      </form>
    </details>
  );
}

/** Write every post that isn't written yet, and approve every written one, with what's left to do. */
function PlanActions({ plan, onSkipped }: { plan: ContentPlanDetail; onSkipped: (skipped: Record<string, string>) => void }) {
  const write = usePlanAction(plan.id);
  const approve = usePlanAction(plan.id);
  const open = plan.entries.filter((entry) => !entry.gone_out && !entry.approved);
  const toWrite = open.filter((entry) => entry.status !== "writing" && entry.status !== "written").length;
  const ready = open.filter((entry) => entry.status === "written" && entry.problems.length === 0);
  const { total, written, approved, needs, writing } = plan.counts;
  const error = write.error ?? approve.error;

  const approveAll = () => {
    onSkipped({});
    approve.mutate(
      { action: "approve", body: { entries: ready.map((entry) => entry.id) } },
      { onSuccess: (result) => onSkipped(Object.fromEntries((result.skipped ?? []).map((item) => [item.id, item.problem]))) },
    );
  };

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground">
            {total} {total === 1 ? "post" : "posts"}
          </span>
          {" · "}
          {written} written · {approved} approved
          {writing > 0 && <span className="text-primary"> · {writing} being written</span>}
          {needs > 0 && <span className="text-amber-800"> · {needs} need you</span>}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={toWrite === 0 || write.isPending || plan.status !== "ready"}
            onClick={() => write.mutate({ action: "write" })}
            className={buttonStyles({ variant: ready.length > 0 ? "secondary" : "primary" })}
          >
            {write.isPending || (toWrite === 0 && writing > 0) ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <PenLine aria-hidden="true" className="size-4" />
            )}
            {toWrite > 0 ? `Write ${toWrite} ${toWrite === 1 ? "post" : "posts"}` : writing > 0 ? "Writing…" : "All written"}
          </button>
          <button type="button" disabled={ready.length === 0 || approve.isPending} onClick={approveAll} className={buttonStyles({ variant: ready.length > 0 ? "primary" : "secondary" })}>
            {approve.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}
            {ready.length > 0 ? `Approve ${ready.length}` : "Approve"}
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-pretty text-muted-foreground">
        Approved posts go on your{" "}
        <Link to="/calendar" className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          calendar
        </Link>
        . Facebook and Instagram posts go out by themselves when that account is connected in{" "}
        <Link to="/settings#accounts" className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          Settings
        </Link>
        ; for the rest, Mindra reminds you at their time.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-pretty text-red-600">
          {error.message}
        </p>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" className="sr-only">
        Loading the plan
      </p>
      <div className="h-4 w-40 animate-pulse rounded bg-secondary" />
      <div className="h-7 w-72 animate-pulse rounded bg-secondary" />
      {[0, 1, 2].map((item) => (
        <div key={item} className="space-y-3 rounded-xl border border-border bg-white p-5">
          <div className="h-4 w-1/3 animate-pulse rounded bg-secondary" />
          <div className="h-3.5 w-3/4 animate-pulse rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}

/** A content plan: reading it, then its posts by day to check, write and approve onto the calendar. */
export default function PlanDetail() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const query = usePlan(planId);
  const plan = query.data;
  const sources = useSourceChoices(plan?.status === "ready");
  const remove = useDeletePlan();
  const [adding, setAdding] = useState(false);
  const [skipped, setSkipped] = useState<Record<string, string>>({});

  if (query.isPending) return <Loading />;
  if (query.isError || !plan) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <EmptyState
        icon={ClipboardList}
        title={missing ? "This plan isn't here" : "Couldn't load this plan"}
        description={missing ? "It may have been deleted." : (query.error?.message ?? "Try again in a moment.")}
        action={
          <Link to="/plans" className={buttonStyles({ variant: "secondary" })}>
            Back to Content Plans
          </Link>
        }
      />
    );
  }

  const entries = plan.entries;
  const projects = sources.data?.results ?? [];
  const canReadAgain = plan.status !== "reading" && entries.every((entry) => !entry.piece && entry.status !== "writing");
  const skippedCount = Object.keys(skipped).filter((id) => entries.some((entry) => entry.id === id && !entry.approved)).length;
  const zone = browserTimeZone();
  const otherZone = plan.time_zone && zone && plan.time_zone !== zone;
  const startsOn = parseDayKey(plan.starts_on);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <li className="shrink-0">
              <Link to="/plans" className={crumbLink}>
                Content Plans
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-4 shrink-0" />
            </li>
            <li className="min-w-0 truncate">{plan.name}</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <PlanName key={plan.name} plan={plan} />
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              Added {formatDate(plan.created_at)}
              {startsOn && ` · starts ${formatDayLong(startsOn)}`}
            </p>
          </div>
          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={remove.isPending}
                className={buttonStyles({ variant: "danger-outline", size: "sm", className: "h-9" })}
              >
                <Trash2 aria-hidden="true" className="size-4" />
                Delete plan
              </button>
            }
            title={`Delete "${plan.name}"?`}
            description="The plan and the posts it wrote are deleted, and they come off your calendar. Posts that already went out stay in your Content Library. This can't be undone."
            confirmLabel="Delete plan"
            onConfirm={() => remove.mutate(plan.id, { onSuccess: () => navigate("/plans", { replace: true }) })}
          />
        </div>
        {remove.isError && (
          <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
            {remove.error.message}
          </p>
        )}
      </div>

      {plan.status === "reading" ? (
        <>
          <div role="status" className="flex items-start gap-3 rounded-xl border border-border bg-white p-5">
            <LoaderCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 animate-spin text-primary" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Mindra is reading your plan</p>
              <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
                It finds each post&apos;s day, time, platform and what it&apos;s about. This usually takes under a minute;
                you can leave this page.
              </p>
            </div>
          </div>
          <PlanSource plan={plan} canReadAgain={false} />
        </>
      ) : plan.status === "failed" ? (
        <>
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-pretty text-red-800">
            <p className="font-semibold">Mindra couldn&apos;t read this plan</p>
            <p className="mt-0.5">{plan.error || "Something went wrong. Read it again."}</p>
          </div>
          <PlanSource key={plan.updated_at} plan={plan} canReadAgain={canReadAgain} open />
        </>
      ) : (
        <>
          {entries.length > 0 ? (
            <PlanActions plan={plan} onSkipped={setSkipped} />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="No posts found in this plan"
              description="Correct the plan and read it again below, or add its posts one by one."
            />
          )}

          {skippedCount > 0 && (
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-pretty text-amber-900">
              {skippedCount === 1 ? "One post couldn't be approved." : `${skippedCount} posts couldn't be approved.`} Each one says why below.
            </p>
          )}

          {otherZone && (
            <p className="text-xs text-pretty text-muted-foreground">
              Times are shown in your time zone ({timeZoneName()}). The plan was read in {plan.time_zone.replace(/_/g, " ")} time.
            </p>
          )}

          {byDay(entries).map(([key, dayEntries]) => {
            const date = key === NO_DAY ? null : parseDayKey(key);
            return (
              <section key={key} aria-labelledby={`day-${key}`} className="space-y-3">
                <h3 id={`day-${key}`} className="text-sm font-semibold text-foreground">
                  {date ? formatDayLong(date) : "No day yet"}
                </h3>
                {dayEntries.map((entry) => (
                  <EntryCard
                    key={entry.id}
                    planId={plan.id}
                    entry={entry}
                    projects={projects}
                    projectsLoading={sources.isPending}
                    planReady={plan.status === "ready"}
                    skipped={skipped[entry.id]}
                  />
                ))}
              </section>
            );
          })}

          {adding ? (
            <div className="rounded-xl border border-border bg-white p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">Add a post</h3>
              <EntryForm
                planId={plan.id}
                projects={projects}
                projectsLoading={sources.isPending}
                day={plan.starts_on ?? undefined}
                onDone={() => setAdding(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              disabled={entries.length >= PLAN_MAX_ENTRIES}
              title={entries.length >= PLAN_MAX_ENTRIES ? `A plan can have up to ${PLAN_MAX_ENTRIES} posts` : undefined}
              onClick={() => setAdding(true)}
              className={buttonStyles({ variant: "secondary" })}
            >
              <Plus aria-hidden="true" className="size-4" />
              Add a post
            </button>
          )}

          <PlanSource key={plan.updated_at} plan={plan} canReadAgain={canReadAgain} />
        </>
      )}
    </div>
  );
}
