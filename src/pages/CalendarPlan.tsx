import { useState } from "react";
import { Check, ChevronRight, LoaderCircle, PenLine, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router";
import PlatformBadge from "../components/content/PlatformBadge";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { STRATEGY_FIELDS, useApprovePlan, useBriefActions, usePlan, useUpdateStrategy, useWritePlan, type Brief, type PlanItem, type Strategy } from "../lib/briefs";
import { formatLabel, useCalendar } from "../lib/calendars";
import { cn } from "../lib/cn";

// A calendar's content plan (Phase 4): the strategy for its dates, and how each approved item is made. Written by AI,
// changed here, then approved; approved briefs go to the Content Studio.

const crumbLink = "rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden";

function when(item: PlanItem) {
  return new Date(item.scheduled_for).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function StrategyCard({ calendarId, strategy }: { calendarId: string; strategy: Strategy }) {
  const update = useUpdateStrategy(calendarId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Strategy>>({});

  const start = () => {
    setDraft(Object.fromEntries(STRATEGY_FIELDS.map((field) => [field.id, strategy[field.id]])));
    setEditing(true);
  };

  return (
    <section aria-labelledby="strategy" className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id="strategy" className="font-semibold text-foreground">
          The strategy
        </h3>
        {!editing && (
          <button type="button" onClick={start} className={buttonStyles({ variant: "ghost", size: "sm" })}>
            <PenLine aria-hidden="true" className="size-4" />
            Edit
          </button>
        )}
      </div>
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            update.mutate(draft, { onSuccess: () => setEditing(false) });
          }}
          className="space-y-3"
        >
          {STRATEGY_FIELDS.map((field) => (
            <div key={field.id}>
              <label htmlFor={`strategy-${field.id}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                {field.label}
              </label>
              <textarea
                id={`strategy-${field.id}`}
                rows={2}
                value={String(draft[field.id] ?? "")}
                onChange={(event) => setDraft((current) => ({ ...current, [field.id]: event.target.value }))}
                className={inputClass}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button type="submit" disabled={update.isPending} className={buttonStyles({ size: "sm" })}>
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className={buttonStyles({ variant: "ghost", size: "sm" })}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="grid gap-4 sm:grid-cols-2">
          {STRATEGY_FIELDS.map((field) => (
            <div key={field.id} className="min-w-0">
              <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
              <dd className="mt-0.5 text-sm whitespace-pre-wrap text-foreground">{String(strategy[field.id] || "—")}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

const BRIEF_TEXT: { id: keyof Brief; label: string; long?: boolean }[] = [
  { id: "hook", label: "Hook" },
  { id: "main_message", label: "Main message" },
  { id: "objective", label: "Objective" },
  { id: "audience", label: "Audience" },
  { id: "angle", label: "Angle", long: true },
  { id: "outline", label: "Script or outline", long: true },
  { id: "visual_direction", label: "Visual direction", long: true },
  { id: "cta", label: "Call to action" },
  { id: "link", label: "Link" },
  { id: "production_notes", label: "Production notes", long: true },
];

function BriefCard({ calendarId, item }: { calendarId: string; item: PlanItem }) {
  const { save, regenerate, approve } = useBriefActions(calendarId);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Brief>>({});
  const [error, setError] = useState("");
  const brief = item.brief;
  const locked = !["calendar_approved", "plan_generated", "plan_approved"].includes(item.status);

  const run = async (work: () => Promise<unknown>) => {
    setError("");
    try {
      await work();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong. Try again.");
    }
  };

  const startEditing = () => {
    setDraft({ ...(brief ?? {}), talking_points: brief?.talking_points ?? [] });
    setEditing(true);
  };

  return (
    <li className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{when(item)}</span>
        <PlatformBadge platform={item.platform} />
        <span>{formatLabel(item.format)}</span>
        <span className={cn("rounded-full px-2 py-0.5 font-medium", item.status === "plan_approved" ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-secondary-foreground")}>
          {item.status_label}
        </span>
      </div>
      <p className="mt-1.5 font-medium text-foreground">{item.topic}</p>

      {!brief ? (
        <p className="mt-2 text-sm text-muted-foreground">Waiting for its brief.</p>
      ) : editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await save.mutateAsync({ itemId: item.id, brief: draft });
              setEditing(false);
            });
          }}
          className="mt-3 space-y-3"
        >
          {BRIEF_TEXT.map((field) => (
            <div key={field.id}>
              <label htmlFor={`brief-${item.id}-${field.id}`} className="mb-1 block text-xs font-medium text-muted-foreground">
                {field.label}
              </label>
              {field.long ? (
                <textarea
                  id={`brief-${item.id}-${field.id}`}
                  rows={field.id === "outline" ? 5 : 2}
                  value={String(draft[field.id] ?? "")}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.id]: event.target.value }))}
                  className={inputClass}
                />
              ) : (
                <input
                  id={`brief-${item.id}-${field.id}`}
                  value={String(draft[field.id] ?? "")}
                  onChange={(event) => setDraft((current) => ({ ...current, [field.id]: event.target.value }))}
                  className={inputClass}
                />
              )}
            </div>
          ))}
          <div>
            <label htmlFor={`brief-${item.id}-points`} className="mb-1 block text-xs font-medium text-muted-foreground">
              Talking points, one a line
            </label>
            <textarea
              id={`brief-${item.id}-points`}
              rows={4}
              value={(draft.talking_points ?? []).join("\n")}
              onChange={(event) => setDraft((current) => ({ ...current, talking_points: event.target.value.split("\n") }))}
              className={inputClass}
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={save.isPending} className={buttonStyles({ size: "sm" })}>
              Save
            </button>
            <button type="button" onClick={() => setEditing(false)} className={buttonStyles({ variant: "ghost", size: "sm" })}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <dl className="mt-3 grid gap-3 sm:grid-cols-2">
          {BRIEF_TEXT.filter((field) => brief[field.id]).map((field) => (
            <div key={field.id} className={cn("min-w-0", field.long && "sm:col-span-2")}>
              <dt className="text-xs font-medium text-muted-foreground">{field.label}</dt>
              <dd className="mt-0.5 text-sm break-words whitespace-pre-wrap text-foreground">{String(brief[field.id])}</dd>
            </div>
          ))}
          {brief.talking_points.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">Talking points</dt>
              <dd>
                <ul className="mt-0.5 list-disc pl-5 text-sm text-foreground">
                  {brief.talking_points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </dd>
            </div>
          )}
          {brief.assets.length > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium text-muted-foreground">Assets</dt>
              <dd className="mt-0.5 flex flex-wrap gap-1.5">
                {brief.assets.map((asset) => (
                  <span key={asset.name} className={cn("rounded-full px-2 py-0.5 text-xs", asset.have ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800")}>
                    {asset.name}
                    {asset.have ? " (have)" : " (to make)"}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}

      {!locked && !editing && (
        <div className="mt-4 flex flex-wrap gap-2">
          {brief && (
            <button type="button" onClick={startEditing} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              <PenLine aria-hidden="true" className="size-4" />
              Edit
            </button>
          )}
          <button type="button" onClick={() => run(() => regenerate.mutateAsync({ itemId: item.id }))} disabled={regenerate.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <RefreshCw aria-hidden="true" className="size-4" />
            {regenerate.isPending ? "Writing…" : brief ? "Write again" : "Write its brief"}
          </button>
          {item.status === "plan_generated" && (
            <button type="button" onClick={() => run(() => approve.mutateAsync(item.id))} disabled={approve.isPending} className={buttonStyles({ size: "sm" })}>
              <Check aria-hidden="true" className="size-4" />
              Approve
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </li>
  );
}

export default function CalendarPlan() {
  const { calendarId = "" } = useParams();
  const calendar = useCalendar(calendarId);
  const plan = usePlan(calendarId);
  const write = useWritePlan(calendarId);
  const approve = useApprovePlan(calendarId);
  const [request, setRequest] = useState("");
  const [error, setError] = useState("");

  const run = async (work: () => Promise<unknown>) => {
    setError("");
    try {
      await work();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong. Try again.");
    }
  };

  const strategy = plan.data?.plan ?? null;
  const items = plan.data?.items ?? [];
  const waitingBriefs = items.filter((item) => !item.brief).length;
  const waitingApproval = items.filter((item) => item.status === "plan_generated").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/content-calendar" className={crumbLink}>
          Content calendar
        </Link>
        <ChevronRight aria-hidden="true" className="size-4" />
        <Link to={`/content-calendar/${calendarId}`} className={cn(crumbLink, "truncate")}>
          {calendar.data?.name ?? "Calendar"}
        </Link>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span aria-current="page" className="text-foreground">
          Plan
        </span>
      </nav>
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">The content plan</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          How each approved item is made: the strategy for these dates, and a brief for each post with its hook, talking points, script
          and visuals. Change anything, then approve; approved briefs go to the Content Studio.
        </p>
      </div>

      {plan.isPending ? (
        <p className="text-sm text-muted-foreground">Loading the plan…</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
          Approve the calendar first: the plan is written for its approved items.{" "}
          <Link to={`/content-calendar/${calendarId}`} className="font-medium text-primary hover:underline">
            Open the calendar
          </Link>
        </p>
      ) : (
        <>
          {strategy?.status === "writing" ? (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
              Writing the plan. This takes a minute or two for a full month.
            </p>
          ) : !strategy ? (
            <section className="rounded-xl border border-primary/30 bg-primary/5 p-5">
              <p className="text-sm text-foreground">
                {items.length} approved item{items.length === 1 ? "" : "s"} wait for their briefs. Add anything the plan should know (optional), then write it.
              </p>
              <label htmlFor="plan-request" className="sr-only">
                What the plan should know
              </label>
              <textarea
                id="plan-request"
                rows={2}
                value={request}
                onChange={(event) => setRequest(event.target.value)}
                placeholder="e.g. Keep the scripts under 30 seconds; show the product in every visual"
                className={cn(inputClass, "mt-3")}
              />
              <button type="button" onClick={() => run(() => write.mutateAsync({ request }))} disabled={write.isPending} className={buttonStyles({ className: "mt-3" })}>
                Write the plan
              </button>
            </section>
          ) : (
            <>
              {strategy.status === "failed" && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  {strategy.error || "The plan couldn't be written."}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-4">
                <p className="mr-auto text-sm text-foreground">
                  {strategy.status === "approved" && waitingApproval === 0
                    ? "Approved. The Content Studio makes each post from its brief."
                    : `${waitingApproval} brief${waitingApproval === 1 ? "" : "s"} waiting for approval${waitingBriefs ? `, ${waitingBriefs} still to write` : ""}.`}
                </p>
                {waitingBriefs > 0 && (
                  <button type="button" onClick={() => run(() => write.mutateAsync({}))} disabled={write.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                    Write the missing briefs
                  </button>
                )}
                {strategy.status === "approved" && (
                  <Link to="/content-studio" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                    Open the Content Studio
                  </Link>
                )}
                {waitingApproval > 0 && (
                  <button type="button" onClick={() => run(() => approve.mutateAsync())} disabled={approve.isPending} className={buttonStyles({ size: "sm" })}>
                    <Check aria-hidden="true" className="size-4" />
                    Approve the plan
                  </button>
                )}
              </div>
              <StrategyCard calendarId={calendarId} strategy={strategy} />
            </>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <section aria-labelledby="briefs">
            <h3 id="briefs" className="mb-3 font-semibold text-foreground">
              Briefs
            </h3>
            <ul className="space-y-3">
              {items.map((item) => (
                <BriefCard key={item.id} calendarId={calendarId} item={item} />
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
