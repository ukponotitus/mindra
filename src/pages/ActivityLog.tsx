import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  CalendarClock,
  CalendarPlus,
  CalendarX,
  CheckCheck,
  Clock,
  ExternalLink,
  Film,
  Link2,
  RefreshCw,
  Search,
  Send,
  TriangleAlert,
  Unlink,
  type LucideIcon,
} from "lucide-react";
import { Link, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import { buttonStyles } from "../components/ui/button";
import { ACTIVITY_PERIODS, ACTIVITY_TYPES, useActivity, useActivitySummary, type ActivityFilters, type ActivityPeriod } from "../lib/activity";
import { dayKey, formatDayLong, formatScheduled, formatTime } from "../lib/calendar";
import { cn } from "../lib/cn";
import type { ActivityEvent, ActivityKind, ActivityType } from "../lib/types";

// The Activity log: what Mindra and the people in the workspace did, newest first, grouped by day. Filters are kept in
// the address (?days=, ?type=, ?search=).

const fieldClass =
  "h-11 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden sm:h-10";

type Look = { icon: LucideIcon; tone: "plain" | "good" | "bad" | "warn" };

const LOOKS: Record<ActivityKind, Look> = {
  published: { icon: Send, tone: "good" },
  publish_failed: { icon: TriangleAlert, tone: "bad" },
  marked_posted: { icon: CheckCheck, tone: "good" },
  reminder_sent: { icon: Bell, tone: "plain" },
  scheduled: { icon: CalendarPlus, tone: "plain" },
  moved: { icon: CalendarClock, tone: "plain" },
  unscheduled: { icon: CalendarX, tone: "plain" },
  approved: { icon: BadgeCheck, tone: "plain" },
  calendar_approved: { icon: CalendarCheck, tone: "plain" },
  calendar_rejected: { icon: CalendarX, tone: "plain" },
  video_made: { icon: Film, tone: "good" },
  video_failed: { icon: Film, tone: "bad" },
  account_connected: { icon: Link2, tone: "plain" },
  account_disconnected: { icon: Unlink, tone: "plain" },
  account_needs_reconnect: { icon: RefreshCw, tone: "warn" },
};

const TONES: Record<Look["tone"], string> = {
  plain: "bg-secondary text-foreground",
  good: "bg-emerald-50 text-emerald-700",
  bad: "bg-red-50 text-red-700",
  warn: "bg-amber-50 text-amber-800",
};

/** "Mindra on LinkedIn", or just "LinkedIn" without an account name. */
function place(account: string, platform: string): string {
  if (account && platform) return `${account} on ${platform}`;
  return account || platform || "the account";
}

/** The event as one plain sentence. */
function sentence(event: ActivityEvent): string {
  const who = event.by_you ? "You" : event.actor_name || "Mindra";
  const post = event.platform ? `this ${event.platform} post` : "this post";
  const when = event.at ? formatScheduled(event.at) : "";
  switch (event.kind) {
    case "published":
      return `Posted to ${place(event.account, event.platform)} automatically`;
    case "publish_failed":
      return `Couldn't post to ${place(event.account, event.platform)}`;
    case "marked_posted":
      return `${who} marked ${post} as posted`;
    case "reminder_sent":
      return `Reminder sent${event.detail ? ` to ${event.detail}` : ""} to post on ${event.platform || "its platform"}`;
    case "scheduled":
      return `${who} scheduled ${post}${when ? ` for ${when}` : ""}`;
    case "moved":
      return `${who} moved ${post}${when ? ` to ${when}` : ""}`;
    case "unscheduled":
      return `${who} took ${post} off the Planner`;
    case "approved":
      return `${who} approved ${post}${when ? ` for ${when}` : ""}`;
    case "calendar_approved":
      return `${who} approved the content calendar “${event.subject}”${event.detail ? ` (${event.detail})` : ""}`;
    case "calendar_rejected":
      return `${who} rejected the content calendar “${event.subject}”${event.detail ? ` (${event.detail})` : ""}`;
    case "video_made":
      return `Mindra made the video “${event.subject}”`;
    case "video_failed":
      return `Couldn't make the video “${event.subject}”`;
    case "account_connected":
      return `${who} connected ${place(event.subject, event.platform)}`;
    case "account_disconnected":
      return `${who} disconnected ${place(event.subject, event.platform)}`;
    case "account_needs_reconnect":
      return `${place(event.subject, event.platform)} needs reconnecting`;
  }
}

const POST_KINDS: ActivityKind[] = ["published", "publish_failed", "marked_posted", "reminder_sent", "scheduled", "moved", "unscheduled", "approved"];
const REASON_KINDS: ActivityKind[] = ["publish_failed", "video_failed", "account_needs_reconnect"];

function linkClass() {
  return "inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:min-h-0";
}

/** Where to go from an event: the post, the post on its platform, the calendar or video, or Connected accounts. */
function EventLinks({ event }: { event: ActivityEvent }) {
  const links: ReactNode[] = [];
  if (event.post) {
    links.push(
      <Link key="post" to={`/library/${event.post}`} className={linkClass()}>
        View post
      </Link>,
    );
  }
  if (event.link.startsWith("https://") || event.link.startsWith("http://")) {
    links.push(
      <a key="out" href={event.link} target="_blank" rel="noreferrer" className={linkClass()}>
        {event.platform ? `Open on ${event.platform}` : "Open it"}
        <ExternalLink aria-hidden="true" className="size-3.5" />
      </a>,
    );
  } else if (event.link.startsWith("/")) {
    links.push(
      <Link key="in" to={event.link} className={linkClass()}>
        {event.type === "videos" ? "Open the video" : "Open the calendar"}
      </Link>,
    );
  }
  if (event.kind === "account_needs_reconnect") {
    links.push(
      <Link key="accounts" to="/settings#accounts" className={linkClass()}>
        Reconnect it
      </Link>,
    );
  }
  if (links.length === 0) return null;
  return <div className="mt-2 flex flex-wrap gap-x-4">{links}</div>;
}

function EventCard({ event }: { event: ActivityEvent }) {
  const look = LOOKS[event.kind] ?? { icon: Clock, tone: "plain" as const };
  const who = event.by_you ? "You" : event.actor_name || "Mindra";
  return (
    <li className="flex gap-3 rounded-xl border border-border bg-card p-4">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", TONES[look.tone])}>
        <look.icon aria-hidden="true" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-pretty text-foreground">{sentence(event)}</p>
        {POST_KINDS.includes(event.kind) && event.subject && (
          <p className="mt-0.5 truncate text-sm text-muted-foreground">“{event.subject}”</p>
        )}
        {REASON_KINDS.includes(event.kind) && event.detail && (
          <p className="mt-1 text-sm text-pretty text-red-600">{event.detail}</p>
        )}
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {who} · <time dateTime={event.created_at}>{formatTime(event.created_at)}</time>
        </p>
        <EventLinks event={event} />
      </div>
    </li>
  );
}

function Tile({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-2xl font-semibold text-foreground tabular-nums">{value ?? "–"}</p>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

/** Events by day, newest day first, in the browser's time zone. */
function byDay(events: ActivityEvent[]): [day: string, events: ActivityEvent[]][] {
  const days = new Map<string, ActivityEvent[]>();
  for (const event of events) {
    const key = dayKey(new Date(event.created_at));
    days.set(key, [...(days.get(key) ?? []), event]);
  }
  return [...days.entries()];
}

export default function ActivityLog() {
  const [params, setParams] = useSearchParams();
  const days = (ACTIVITY_PERIODS.some((period) => period.id === params.get("days")) ? params.get("days") : "") as ActivityPeriod;
  const type = (ACTIVITY_TYPES.some((item) => item.id === params.get("type")) ? params.get("type") : "") as ActivityType | "";
  const search = params.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(search);
  const filters: ActivityFilters = { days, type, search };

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  // Search after the person pauses typing.
  useEffect(() => {
    if (searchInput.trim() === search) return;
    const id = window.setTimeout(() => update({ search: searchInput.trim() }), 300);
    return () => window.clearTimeout(id);
  });

  const activity = useActivity(filters);
  const summary = useActivitySummary(days);
  const events = useMemo(() => activity.data?.pages.flatMap((page) => page.results) ?? [], [activity.data]);
  const groups = useMemo(() => byDay(events), [events]);
  const filtered = Boolean(type || search);
  const period = ACTIVITY_PERIODS.find((item) => item.id === days)?.label ?? "All time";

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Activity log</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Everything Mindra and your team did: posts that went out, failed or were reminded, plans approved, videos made and accounts connected.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label htmlFor="activity-period" className="sr-only">
          Period
        </label>
        <select
          id="activity-period"
          value={days}
          onChange={(event) => update({ days: event.target.value })}
          className={cn(fieldClass, "min-w-0 flex-1 basis-36 sm:flex-none sm:basis-auto")}
        >
          {ACTIVITY_PERIODS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <label htmlFor="activity-type" className="sr-only">
          Activity
        </label>
        <select
          id="activity-type"
          value={type}
          onChange={(event) => update({ type: event.target.value })}
          className={cn(fieldClass, "min-w-0 flex-1 basis-36 sm:flex-none sm:basis-auto")}
        >
          {ACTIVITY_TYPES.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="relative min-w-0 flex-1 basis-full sm:basis-56">
          <label htmlFor="activity-search" className="sr-only">
            Search the activity log
          </label>
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="activity-search"
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search posts, accounts or people…"
            className={cn(fieldClass, "w-full pl-9 placeholder:text-muted-foreground")}
          />
        </div>
      </div>

      <section aria-labelledby="activity-insights">
        <h3 id="activity-insights" className="mb-3 text-base font-semibold text-foreground">
          Insights <span className="font-normal text-muted-foreground">· {period}</span>
        </h3>
        {summary.isError ? (
          <p className="text-sm text-red-600">Couldn't load the counts: {summary.error.message}</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile label="Posted automatically" value={summary.data?.published} />
            <Tile label="Posted by your team" value={summary.data?.marked_posted} />
            <Tile label="Couldn't post" value={summary.data?.failed} />
            <Tile label="Reminders sent" value={summary.data?.reminders} />
          </div>
        )}
      </section>

      <section aria-labelledby="activity-events" className="space-y-5">
        <h3 id="activity-events" className="sr-only">
          Events
        </h3>
        {activity.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading the activity log…
          </p>
        ) : activity.isError ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p>Couldn't load the activity log: {activity.error.message}</p>
            <button type="button" onClick={() => activity.refetch()} className={buttonStyles({ variant: "secondary", className: "mt-3" })}>
              Try again
            </button>
          </div>
        ) : events.length === 0 ? (
          filtered || days ? (
            <EmptyState
              icon={Search}
              title="Nothing matches these filters"
              description="Try another period or kind of activity, or clear the search."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("");
                    update({ days: "", type: "", search: "" });
                  }}
                  className={buttonStyles({ variant: "secondary" })}
                >
                  Clear filters
                </button>
              }
            />
          ) : (
            <EmptyState
              icon={Clock}
              title="Nothing here yet"
              description="Posts that go out, fail or get a reminder, posts you schedule or approve, videos Mindra makes and accounts you connect will show here."
            />
          )
        ) : (
          <>
            {groups.map(([day, dayEvents]) => (
              <div key={day}>
                <h4 className="mb-2 text-sm font-semibold text-muted-foreground">{formatDayLong(new Date(dayEvents[0].created_at))}</h4>
                <ul className="space-y-2">
                  {dayEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </ul>
              </div>
            ))}
            {activity.hasNextPage && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => activity.fetchNextPage()}
                  disabled={activity.isFetchingNextPage}
                  className={buttonStyles({ variant: "secondary", className: "min-h-11 sm:min-h-0" })}
                >
                  {activity.isFetchingNextPage ? "Loading…" : "Show more"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
