import { useState } from "react";
import { ChartColumn, Link2, Send } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import { ResultsLine } from "../components/content/ContentCard";
import PlatformBadge from "../components/content/PlatformBadge";
import { buttonStyles } from "../components/ui/button";
import { cn } from "../lib/cn";
import { formatDate } from "../lib/format";
import { platformInfo } from "../lib/projects";
import {
  countryName,
  engagement,
  formatCount,
  NUMBER_LABELS,
  NUMBER_NAMES,
  PERIODS,
  useResultsSummary,
  type ResultPost,
  type ResultsSummary,
} from "../lib/results";

// Best days and times need this many posts with numbers, or one lucky post decides them.
const BEST_TIMES_MIN_POSTS = 5;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Hours in the browser's time zone: [from, to).
const TIMES_OF_DAY = [
  { label: "Morning", hint: "5 am to noon", from: 5, to: 12 },
  { label: "Afternoon", hint: "noon to 5 pm", from: 12, to: 17 },
  { label: "Evening", hint: "5 pm to 9 pm", from: 17, to: 21 },
  { label: "Night", hint: "9 pm to 5 am", from: 21, to: 29 },
];
const card = "rounded-xl border border-border bg-white p-5";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className={cn(card, "px-4 py-3")}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

/** A clean top for the scale: 1, 2 or 5 times a power of ten. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((step) => step * power).find((step) => step >= value) ?? value;
}

type Column = { label: string; long: string; clicks: number };

/** Days as they are, or a year as weeks (52 columns, not 365). */
function columns(summary: ResultsSummary): Column[] {
  const day = (iso: string, options: Intl.DateTimeFormatOptions) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, options);
  if (summary.days <= 90) {
    return summary.clicks_by_day.map((entry) => ({
      label: day(entry.day, { day: "numeric", month: "short" }),
      long: day(entry.day, { weekday: "short", day: "numeric", month: "short" }),
      clicks: entry.clicks,
    }));
  }
  const weeks: Column[] = [];
  for (let start = 0; start < summary.clicks_by_day.length; start += 7) {
    const week = summary.clicks_by_day.slice(start, start + 7);
    const first = day(week[0].day, { day: "numeric", month: "short" });
    weeks.push({
      label: first,
      long: `Week of ${first}`,
      clicks: week.reduce((total, entry) => total + entry.clicks, 0),
    });
  }
  return weeks;
}

/** Clicks on every Mindra link, day by day (week by week over a year): one series, so no legend. */
function ClicksChart({ summary }: { summary: ResultsSummary }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const data = columns(summary);
  const total = data.reduce((sum, column) => sum + column.clicks, 0);
  const top = niceMax(Math.max(...data.map((column) => column.clicks)));
  const unit = summary.days <= 90 ? "day" : "week";
  const busiest = data.reduce((best, column) => (column.clicks > best.clicks ? column : best), data[0]);

  return (
    <section aria-labelledby="clicks-heading" className={card}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 id="clicks-heading" className="text-sm font-semibold text-foreground">
            Link clicks, {unit} by {unit}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground tabular-nums">
            {total.toLocaleString()} {total === 1 ? "click" : "clicks"} on your Mindra links
          </p>
        </div>
        {total > 0 && (
          <button
            type="button"
            onClick={() => setAsTable((value) => !value)}
            aria-pressed={asTable}
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            {asTable ? "Show as chart" : "Show as table"}
          </button>
        )}
      </div>

      {total === 0 ? (
        <p className="mt-4 text-sm text-pretty text-muted-foreground">
          No clicks on your links in this time. In the post editor, “Count clicks” puts a Mindra link in place of a web
          address, which counts each click.
        </p>
      ) : asTable ? (
        <div className="mt-4 max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="py-1.5 font-medium">
                  {unit === "day" ? "Day" : "Week"}
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  Clicks
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((column) => (
                <tr key={column.long} className="border-t border-border">
                  <td className="py-1.5 text-foreground">{column.long}</td>
                  <td className="py-1.5 text-right text-foreground tabular-nums">{column.clicks.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <figure className="mt-4">
          <div className="flex gap-2">
            {/* The scale: three clean values, hairline gridlines behind the columns. */}
            <div aria-hidden="true" className="flex h-40 w-7 shrink-0 flex-col justify-between text-right text-[11px] text-muted-foreground tabular-nums">
              <span className="-translate-y-1/2">{formatCount(top)}</span>
              <span>{formatCount(top / 2)}</span>
              <span className="translate-y-1/2">0</span>
            </div>
            <div className="relative h-40 min-w-0 flex-1" onMouseLeave={() => setHovered(null)}>
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                <span className="border-t border-border" />
                <span className="border-t border-border" />
                <span className="border-t border-border" />
              </div>
              <div
                role="img"
                aria-label={`Link clicks by ${unit}: ${total} in all; most on ${busiest.long}, with ${busiest.clicks}.`}
                className="relative flex h-full items-end gap-[2px]"
              >
                {data.map((column, index) => (
                  // The whole column's height is the hover target, not just the bar.
                  <div
                    key={column.long}
                    onMouseEnter={() => setHovered(index)}
                    className="relative flex h-full min-w-0 flex-1 items-end justify-center"
                  >
                    <div
                      className={cn("w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity", hovered !== null && hovered !== index && "opacity-40")}
                      style={{ height: column.clicks ? `max(2px, ${(column.clicks / top) * 100}%)` : 0 }}
                    />
                    {hovered === index && (
                      <div
                        className={cn(
                          "pointer-events-none absolute bottom-full z-10 mb-1 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-white shadow-sm",
                          index < data.length / 3 ? "left-0" : index > (data.length * 2) / 3 ? "right-0" : "left-1/2 -translate-x-1/2",
                        )}
                      >
                        {column.long} · <span className="tabular-nums">{column.clicks.toLocaleString()}</span>{" "}
                        {column.clicks === 1 ? "click" : "clicks"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div aria-hidden="true" className="mt-1.5 ml-9 flex justify-between text-[11px] text-muted-foreground">
            <span>{data[0].label}</span>
            <span>{data[Math.floor(data.length / 2)].label}</span>
            <span>{data[data.length - 1].label}</span>
          </div>
        </figure>
      )}
    </section>
  );
}

/** One row of a ranked list: the name, a thin bar on its own track, the value at the end of the row. */
function BarRow({ label, hint, value, max, display }: { label: string; hint?: string; value: number; max: number; display: string }) {
  return (
    <li className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
      <span className="min-w-0 truncate text-foreground" title={hint}>
        {label}
      </span>
      <span className="h-2.5 min-w-0">
        <span
          className="block h-full rounded-r-[4px] bg-primary"
          style={{ width: `${max && value ? Math.max(2, (value / max) * 100) : 0}%` }}
        />
      </span>
      <span className="text-right text-muted-foreground tabular-nums">{display}</span>
    </li>
  );
}

type Group = { label: string; hint?: string; posts: number; average: number };

function groupBy(posts: ResultPost[], keyOf: (date: Date) => number, labels: { label: string; hint?: string }[]): Group[] {
  return labels.map((entry, index) => {
    const mine = posts.filter((post) => keyOf(new Date(post.posted_at)) === index);
    const total = mine.reduce((sum, post) => sum + engagement(post), 0);
    return { ...entry, posts: mine.length, average: mine.length ? total / mine.length : 0 };
  });
}

/** Which days and times of day got the most likes, comments and shares per post, in the browser's time zone, from the
 * newest posts (all of them, unless there are more than the server lists). */
function BestTimes({ posts, total }: { posts: ResultPost[]; total: number }) {
  const measured = posts.filter((post) => post.following && post.fetched_at);
  if (measured.length < BEST_TIMES_MIN_POSTS) {
    return (
      <section aria-labelledby="best-heading" className={card}>
        <h3 id="best-heading" className="text-sm font-semibold text-foreground">
          Best days and times
        </h3>
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          These show once {BEST_TIMES_MIN_POSTS} or more posts in this time have numbers ({measured.length} so far), so
          one lucky post doesn't decide them.
        </p>
      </section>
    );
  }
  const days = groupBy(measured, (date) => date.getDay(), WEEKDAYS.map((label) => ({ label })));
  const times = groupBy(
    measured,
    (date) => TIMES_OF_DAY.findIndex((time) => [date.getHours(), date.getHours() + 24].some((hour) => hour >= time.from && hour < time.to)),
    TIMES_OF_DAY,
  );
  const best = (groups: Group[]) => groups.reduce((top, group) => (group.average > top.average ? group : top), groups[0]);
  const bestDay = best(days);
  const bestTime = best(times);
  const dayMax = Math.max(...days.map((group) => group.average));
  const timeMax = Math.max(...times.map((group) => group.average));
  const display = (group: Group) =>
    group.posts ? `${formatCount(Math.round(group.average))} (${group.posts} ${group.posts === 1 ? "post" : "posts"})` : "No posts";

  return (
    <section aria-labelledby="best-heading" className={card}>
      <h3 id="best-heading" className="text-sm font-semibold text-foreground">
        Best days and times
      </h3>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        {bestDay.average > 0
          ? `Posts on ${bestDay.label}s and in the ${bestTime.label.toLowerCase()} got the most likes, comments and shares.`
          : "None of these posts has likes, comments or shares yet."}{" "}
        Averages per post, by the time they went out here
        {total > posts.length ? `, from the newest ${posts.length.toLocaleString()} posts` : ""}.
      </p>
      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        <ul aria-label="Likes, comments and shares per post, by day" className="space-y-2">
          {days.map((group) => (
            <BarRow key={group.label} label={group.label} value={group.average} max={dayMax} display={display(group)} />
          ))}
        </ul>
        <ul aria-label="Likes, comments and shares per post, by time of day" className="space-y-2">
          {times.map((group) => (
            <BarRow key={group.label} label={group.label} hint={group.hint} value={group.average} max={timeMax} display={display(group)} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function ByPlatform({ rows }: { rows: ResultsSummary["platforms"] }) {
  return (
    <section aria-labelledby="platforms-heading" className={card}>
      <h3 id="platforms-heading" className="text-sm font-semibold text-foreground">
        By platform
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[34rem] text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">
                Platform
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Posts
              </th>
              {NUMBER_NAMES.map((name) => (
                <th key={name} scope="col" className="py-2 pr-3 text-right font-medium">
                  {NUMBER_LABELS[name]}
                </th>
              ))}
              <th scope="col" className="py-2 text-right font-medium">
                Link clicks
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.platform} className="border-t border-border">
                <th scope="row" className="py-2 pr-3 text-left font-normal">
                  <PlatformBadge platform={row.platform} />
                </th>
                <td className="py-2 pr-3 text-right text-foreground tabular-nums">{row.posts.toLocaleString()}</td>
                {NUMBER_NAMES.map((name) => (
                  <td key={name} className="py-2 pr-3 text-right text-foreground tabular-nums">
                    {formatCount(row[name])}
                  </td>
                ))}
                <td className="py-2 text-right text-foreground tabular-nums">{formatCount(row.clicks)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-pretty text-muted-foreground">
        “—”: the platform doesn't share that number with Mindra, or none of its posts here is followed. YouTube and X
        share views; YouTube, X, Facebook and Instagram share likes and comments; Facebook and X say how often a post
        was shared. LinkedIn, TikTok, WhatsApp and the rest show clicks on Mindra links.
      </p>
    </section>
  );
}

/** The server's ranking: likes, comments and shares first, then link clicks, then views. */
function TopPosts({ ranked }: { ranked: ResultPost[] }) {
  return (
    <section aria-labelledby="top-heading" className={card}>
      <h3 id="top-heading" className="text-sm font-semibold text-foreground">
        Top posts
      </h3>
      {ranked.length === 0 ? (
        <p className="mt-2 text-sm text-pretty text-muted-foreground">No likes, comments, shares or clicks yet in this time.</p>
      ) : (
        <ol className="mt-3 divide-y divide-border">
          {ranked.map((post) => (
            <li key={post.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex min-w-0 items-center gap-2">
                <PlatformBadge platform={post.platform} withLabel={false} />
                <Link
                  to={`/library/${post.id}`}
                  className="min-w-0 flex-1 truncate rounded text-sm font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {post.title || post.excerpt || `${platformInfo(post.platform).label} post`}
                </Link>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{formatDate(post.posted_at)}</span>
              </div>
              <ResultsLine className="mt-1" numbers={{ ...post, clicks: post.clicks || null }} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Countries({ summary }: { summary: ResultsSummary }) {
  if (!summary.countries.length) return null;
  const max = Math.max(...summary.countries.map((row) => row.clicks));
  return (
    <section aria-labelledby="countries-heading" className={card}>
      <h3 id="countries-heading" className="text-sm font-semibold text-foreground">
        Where clicks came from
      </h3>
      <ul className="mt-3 space-y-2">
        {summary.countries.map((row) => (
          <BarRow key={row.country || "unknown"} label={countryName(row.country)} value={row.clicks} max={max} display={formatCount(row.clicks)} />
        ))}
      </ul>
    </section>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" className="sr-only">
        Loading results
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="h-[5.5rem] animate-pulse rounded-xl bg-secondary" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-xl bg-secondary" />
    </div>
  );
}

/** The Results page: how the posts that went out did, and the clicks on Mindra's links. */
export default function Results() {
  const [params, setParams] = useSearchParams();
  const asked = Number(params.get("days"));
  const days = PERIODS.some((period) => period.days === asked) ? asked : 30;
  const summary = useResultsSummary(days);
  const periodLabel = PERIODS.find((period) => period.days === days)?.label ?? `${days} days`;

  let body = null;
  if (summary.isPending) {
    body = <Skeleton />;
  } else if (summary.isError) {
    body = (
      <p role="alert" className="text-sm text-pretty text-red-600">
        {summary.error.message}
      </p>
    );
  } else {
    const data = summary.data;
    const { posts, totals } = data;
    const clicks = data.clicks_by_day.reduce((total, day) => total + day.clicks, 0);
    if (!totals.posts && !clicks && !data.links) {
      body = (
        <EmptyState
          icon={ChartColumn}
          title="No results yet"
          description="Results come from posts Mindra posts to YouTube, Facebook, Instagram and X, posts you share yourself and paste the link of, and clicks on Mindra links in any post. Count clicks in the post editor."
          action={
            <Link to="/calendar" className={buttonStyles()}>
              <Send aria-hidden="true" className="size-4" />
              Plan your posts
            </Link>
          }
        />
      );
    } else {
      body = (
        <div className="space-y-6">
          <div>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              <Tile label="Posts out" value={totals.posts.toLocaleString()} />
              {NUMBER_NAMES.map((name) => (
                <Tile key={name} label={NUMBER_LABELS[name]} value={formatCount(totals[name])} />
              ))}
              <Tile label="Link clicks" value={formatCount(clicks)} />
            </dl>
            <p className="mt-2 text-xs text-pretty text-muted-foreground">
              Views, likes, comments and shares are for the posts that went out in the last {periodLabel}, as their
              platforms count them. Link clicks are every click on your Mindra links in that time.
            </p>
          </div>
          <ClicksChart summary={data} />
          {totals.posts > 0 && (
            <>
              <div className="grid gap-6 xl:grid-cols-2">
                <TopPosts ranked={data.top_posts} />
                <BestTimes posts={posts} total={totals.posts} />
              </div>
              <ByPlatform rows={data.platforms} />
            </>
          )}
          <Countries summary={data} />
          <p className="flex items-start gap-2 text-xs text-pretty text-muted-foreground">
            <Link2 aria-hidden="true" className="mt-px size-3.5 shrink-0" />
            Mindra reads each post's numbers about 1 hour, 1 day, 3 days, 7 days and 30 days after it goes out. Clicks are
            counted as they happen; link previews and search engines aren't counted, and nothing about the people who
            click is kept.
          </p>
        </div>
      );
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-balance text-foreground">Results</h2>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            How your posts did: views, likes, comments, shares and clicks on your links.
          </p>
        </div>
        <div role="group" aria-label="Period" className="flex gap-1 rounded-lg bg-secondary p-1">
          {PERIODS.map((period) => {
            const active = period.days === days;
            return (
              <button
                key={period.days}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setParams(
                    (current) => {
                      const next = new URLSearchParams(current);
                      next.set("days", String(period.days));
                      return next;
                    },
                    { replace: true },
                  )
                }
                className={buttonStyles({
                  variant: "ghost",
                  size: "sm",
                  className: cn(active && "bg-white text-foreground shadow-sm hover:bg-white"),
                })}
              >
                {period.label}
              </button>
            );
          })}
        </div>
      </div>
      {body}
    </div>
  );
}
