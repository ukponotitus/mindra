import { useMemo, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { Check, ChevronLeft, ChevronRight, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import ItemDialog from "../components/calendars/ItemDialog";
import PlatformBadge from "../components/content/PlatformBadge";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { useBrandProfile } from "../lib/brand";
import { addDays, addMonths, dayKey, formatDayLong, monthGrid, parseDayKey, startOfMonth, weekDays } from "../lib/calendar";
import {
  formatLabel,
  useCalendar,
  useDecideVersion,
  useDeleteCalendar,
  useGenerateVersion,
  useVersionItems,
  VERSION_LABELS,
  type CalendarItem,
  type CalendarVersion,
} from "../lib/calendars";
import { cn } from "../lib/cn";
import type { Platform } from "../lib/types";

type View = "list" | "month" | "week";
const VIEWS: { id: View; label: string }[] = [
  { id: "list", label: "List" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
];
const crumbLink = "rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function formatDate(key: string) {
  const day = parseDayKey(key);
  return day ? day.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) : key;
}

function time(item: CalendarItem) {
  return new Date(item.scheduled_for).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** The version to show: the one in the address, else the newest draft (or one being drafted), else the newest. */
function chosenVersion(versions: CalendarVersion[], wanted: string | null) {
  return (
    versions.find((version) => version.id === wanted) ??
    versions.find((version) => version.status === "draft" || version.status === "generating") ??
    versions[0]
  );
}

function ItemCard({ item, onOpen, compact = false }: { item: CalendarItem; onOpen: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-lg border border-border bg-card text-left transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
        compact ? "px-1.5 py-1" : "px-3 py-2.5",
      )}
    >
      {compact ? (
        <span className="flex min-w-0 items-center gap-1 text-[11px] text-foreground">
          <PlatformBadge platform={item.platform} withLabel={false} />
          <span className="truncate">{item.topic}</span>
        </span>
      ) : (
        <>
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground tabular-nums">{time(item)}</span>
            <PlatformBadge platform={item.platform} />
            <span>{formatLabel(item.format)}</span>
            {item.pillar && <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">{item.pillar}</span>}
            {item.status !== "proposed" && <span className="rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">{item.status_label}</span>}
          </span>
          <span className="mt-1 block text-sm font-medium text-foreground">{item.topic}</span>
          {item.angle && <span className="mt-0.5 block text-sm text-muted-foreground">{item.angle}</span>}
        </>
      )}
    </button>
  );
}

function groupByDay(items: CalendarItem[]) {
  const days = new Map<string, CalendarItem[]>();
  for (const item of items) {
    const key = dayKey(new Date(item.scheduled_for));
    days.set(key, [...(days.get(key) ?? []), item]);
  }
  return days;
}

function DayGrid({ days, items, month, onOpen, onAdd }: { days: Date[]; items: Map<string, CalendarItem[]>; month?: Date; onOpen: (item: CalendarItem) => void; onAdd?: (day: string) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div aria-hidden="true" className="grid grid-cols-7 border-b border-border">
        {days.slice(0, 7).map((day) => (
          <div key={day.getDay()} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {day.toLocaleDateString(undefined, { weekday: "short" })}
          </div>
        ))}
      </div>
      <ol className="grid grid-cols-7">
        {days.map((day, index) => {
          const key = dayKey(day);
          const list = items.get(key) ?? [];
          const outside = month !== undefined && day.getMonth() !== month.getMonth();
          return (
            <li key={key} className={cn("group min-h-28 min-w-0 border-b border-border p-1.5", index % 7 !== 6 && "border-r", outside && "bg-background")}>
              <p className="mb-1 flex items-center justify-between">
                <span className={cn("text-xs font-medium tabular-nums", outside ? "text-muted-foreground" : "text-foreground")}>{day.getDate()}</span>
                {onAdd && (
                  <button
                    type="button"
                    onClick={() => onAdd(key)}
                    aria-label={`Add an item on ${formatDayLong(day)}`}
                    className="grid size-5 place-items-center rounded text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-secondary focus-visible:opacity-100"
                  >
                    <Plus aria-hidden="true" className="size-3.5" />
                  </button>
                )}
                <span className="sr-only">
                  {formatDayLong(day)}, {list.length} item{list.length === 1 ? "" : "s"}
                </span>
              </p>
              <ul className="space-y-1">
                {list.map((item) => (
                  <li key={item.id}>
                    <ItemCard item={item} onOpen={() => onOpen(item)} compact />
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function ContentCalendarPage() {
  const { calendarId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const calendar = useCalendar(calendarId);
  const brand = useBrandProfile();
  const versions = calendar.data?.versions ?? [];
  const version = chosenVersion(versions, params.get("version"));
  const items = useVersionItems(version?.id, version?.status);
  const decide = useDecideVersion(calendarId ?? "");
  const generate = useGenerateVersion(calendarId ?? "");
  const remove = useDeleteCalendar();
  const [view, setView] = useState<View>("list");
  const [request, setRequest] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<{ item: CalendarItem | null; day: string } | null>(null);
  const [anchor, setAnchor] = useState<Date | null>(null);

  const byDay = useMemo(() => groupByDay(items.data ?? []), [items.data]);
  if (calendar.isPending) return <p className="text-sm text-muted-foreground">Loading the calendar…</p>;
  if (calendar.isError || !calendar.data) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h2 className="mb-2 text-xl font-semibold text-foreground">We couldn't find that calendar</h2>
        <Link to="/content-calendar" className={buttonStyles({ variant: "secondary" })}>
          Back to the calendars
        </Link>
      </div>
    );
  }
  const data = calendar.data;
  const platforms = Object.keys(data.cadence) as Platform[];
  const start = parseDayKey(data.starts_on) ?? new Date();
  const shown = anchor ?? start;
  const isDraft = version?.status === "draft";

  const act = async (work: () => Promise<unknown>) => {
    setError("");
    try {
      await work();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Something went wrong. Try again.");
    }
  };

  const askAgain = () =>
    act(async () => {
      const fresh = await generate.mutateAsync(request);
      setRequest("");
      setParams({ version: fresh.id }, { replace: true });
    });

  const open = (item: CalendarItem) => setDialog({ item, day: dayKey(new Date(item.scheduled_for)) });
  const add = (day: string) => setDialog({ item: null, day });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/content-calendar" className={crumbLink}>
          Content calendar
        </Link>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span aria-current="page" className="truncate text-foreground">
          {data.name}
        </span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-balance text-foreground">{data.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatDate(data.starts_on)} to {formatDate(data.ends_on)}
            {data.campaign_name && <> · for {data.campaign_name}</>} · {data.approved_items} approved
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {platforms.map((platform) => (
              <li key={platform} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <PlatformBadge platform={platform} />
                {data.wanted[platform]} posts
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2">
        {data.approved_items > 0 && (
          <Link to={`/content-calendar/${data.id}/plan`} className={buttonStyles({ size: "sm" })}>
            The plan: briefs for {data.approved_items} item{data.approved_items === 1 ? "" : "s"}
          </Link>
        )}
        <ConfirmDialog
          trigger={
            <button type="button" className={buttonStyles({ variant: "danger-outline", size: "sm" })}>
              <Trash2 aria-hidden="true" className="size-4" />
              Delete
            </button>
          }
          title="Delete this calendar?"
          description="Its versions and items go, and its approved items leave the Planner. Posts already made stay in the Content Library."
          confirmLabel="Delete"
          onConfirm={() => remove.mutate(data.id, { onSuccess: () => navigate("/content-calendar") })}
        />
        </div>
      </div>

      {versions.length > 0 && (
        <Tabs.Root value={version?.id} onValueChange={(value) => setParams({ version: String(value) }, { replace: true })}>
          <Tabs.List aria-label="Versions" className="inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1">
            {[...versions].reverse().map((item) => (
              <Tabs.Tab
                key={item.id}
                value={item.id}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary data-[active]:bg-card data-[active]:text-foreground data-[active]:shadow-sm"
              >
                Version {item.number} · {VERSION_LABELS[item.status]}
              </Tabs.Tab>
            ))}
          </Tabs.List>
        </Tabs.Root>
      )}

      {version?.request && <p className="text-sm text-muted-foreground">Asked for: “{version.request}”</p>}

      {version?.status === "generating" && (
        <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
          Drafting the calendar from your brand profile. This takes up to a minute.
        </p>
      )}
      {version?.status === "failed" && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          {version.error || "This version couldn't be drafted."}{" "}
          <button type="button" onClick={() => act(() => generate.mutateAsync(version.request))} className="font-medium underline">
            Try again
          </button>
        </div>
      )}

      {isDraft && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="mr-auto text-sm text-foreground">
            This is a draft. Change anything, ask for another version, or approve it: approved items go in the Planner as planned, ready
            for their brief.
          </p>
          <button type="button" onClick={() => act(() => decide.mutateAsync({ id: version.id, decision: "reject" }))} disabled={decide.isPending} className={buttonStyles({ variant: "ghost", size: "sm" })}>
            <X aria-hidden="true" className="size-4" />
            Reject
          </button>
          <button type="button" onClick={() => act(() => decide.mutateAsync({ id: version.id, decision: "approve" }))} disabled={decide.isPending} className={buttonStyles({ size: "sm" })}>
            <Check aria-hidden="true" className="size-4" />
            Approve this calendar
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {version && version.status !== "generating" && version.status !== "failed" && (
        <section aria-label={`Version ${version.number}`} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="radiogroup" aria-label="View" className="inline-flex gap-1 rounded-xl bg-muted p-1">
              {VIEWS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={view === option.id}
                  onClick={() => setView(option.id)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    view === option.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {view !== "list" && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={view === "month" ? "Previous month" : "Previous week"}
                  onClick={() => setAnchor(view === "month" ? addMonths(startOfMonth(shown), -1) : addDays(shown, -7))}
                  className={buttonStyles({ variant: "ghost", size: "icon" })}
                >
                  <ChevronLeft aria-hidden="true" className="size-4" />
                </button>
                <span className="min-w-36 text-center text-sm font-medium text-foreground">
                  {view === "month"
                    ? shown.toLocaleDateString(undefined, { month: "long", year: "numeric" })
                    : `Week of ${weekDays(shown)[0].toLocaleDateString(undefined, { day: "numeric", month: "short" })}`}
                </span>
                <button
                  type="button"
                  aria-label={view === "month" ? "Next month" : "Next week"}
                  onClick={() => setAnchor(view === "month" ? addMonths(startOfMonth(shown), 1) : addDays(shown, 7))}
                  className={buttonStyles({ variant: "ghost", size: "icon" })}
                >
                  <ChevronRight aria-hidden="true" className="size-4" />
                </button>
              </div>
            )}
            {isDraft && (
              <button type="button" onClick={() => add(data.starts_on)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                <Plus aria-hidden="true" className="size-4" />
                Add an item
              </button>
            )}
          </div>

          {items.isPending ? (
            <p className="text-sm text-muted-foreground">Loading its items…</p>
          ) : (items.data?.length ?? 0) === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing in this version.</p>
          ) : view === "list" ? (
            <ol className="space-y-5">
              {[...byDay.entries()].map(([day, list]) => (
                <li key={day}>
                  <h3 className="mb-2 text-sm font-semibold text-foreground">{formatDate(day)}</h3>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {list.map((item) => (
                      <li key={item.id}>
                        <ItemCard item={item} onOpen={() => open(item)} />
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          ) : view === "month" ? (
            <DayGrid days={monthGrid(shown)} month={startOfMonth(shown)} items={byDay} onOpen={open} onAdd={isDraft ? add : undefined} />
          ) : (
            <DayGrid days={weekDays(shown)} items={byDay} onOpen={open} onAdd={isDraft ? add : undefined} />
          )}
        </section>
      )}

      {versions.every((item) => item.status !== "generating") && (
        <section aria-labelledby="another-version" className="rounded-xl border border-border bg-card p-5">
          <h3 id="another-version" className="text-sm font-semibold text-foreground">
            Ask for another version
          </h3>
          <p className="mt-1 mb-3 text-sm text-muted-foreground">
            Say what to change, such as “two more review posts” or “move the giveaway to Friday”. The newest draft is the starting point;
            approved items stay as they are. You can also ask the assistant on this page.
          </p>
          <label htmlFor="version-request" className="sr-only">
            What to change
          </label>
          <textarea
            id="version-request"
            value={request}
            onChange={(event) => setRequest(event.target.value)}
            rows={2}
            maxLength={2000}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <button type="button" onClick={askAgain} disabled={generate.isPending} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-2" })}>
            {generate.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
            Draft another version
          </button>
        </section>
      )}

      <ItemDialog
        open={dialog !== null}
        onOpenChange={(value) => !value && setDialog(null)}
        item={dialog?.item ?? null}
        versionId={isDraft ? version?.id : undefined}
        defaultDay={dialog?.day ?? data.starts_on}
        platforms={platforms}
        pillars={brand.data?.pillars ?? []}
      />
    </div>
  );
}
