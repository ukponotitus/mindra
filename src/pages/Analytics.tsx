import { useState, type ReactNode } from "react";
import { ChartColumn, ExternalLink, Info, Send } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import TimeChart, { type ChartPoint } from "../components/analytics/TimeChart";
import YouTubeSection from "../components/analytics/YouTubeSection";
import PlatformBadge from "../components/content/PlatformBadge";
import { buttonStyles } from "../components/ui/button";
import { cn } from "../lib/cn";
import { formatDate } from "../lib/format";
import { platformInfo } from "../lib/projects";
import {
  CONTENT_TYPE_LABELS,
  countryName,
  DEFAULT_PERIOD,
  formatCount,
  formatRelative,
  NUMBER_LABELS,
  NUMBER_NAMES,
  PERIODS,
  useResultsSummary,
  type AccountFollowers,
  type ContentType,
  type FollowStatus,
  type MetricName,
  type ResultPost,
  type ResultsSummary,
} from "../lib/results";
import { ACCOUNT_KINDS } from "../lib/social";
import type { ConnectedAccountKind } from "../lib/types";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "content", label: "Content" },
  { id: "engagement", label: "Engagement" },
  { id: "audience", label: "Audience" },
  { id: "trends", label: "Trends" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const METRIC_LABELS: Record<MetricName, string> = {
  ...NUMBER_LABELS,
  engagement: "Engagement",
  clicks: "Link clicks",
  posts: "Posts out",
};
const METRIC_UNITS: Record<MetricName, [string, string]> = {
  views: ["view", "views"],
  likes: ["like", "likes"],
  comments: ["comment", "comments"],
  shares: ["share", "shares"],
  engagement: ["like, comment or share", "likes, comments and shares"],
  clicks: ["click", "clicks"],
  posts: ["post out", "posts out"],
};
const SOURCE_LABELS: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  search: "Search engines",
  other: "Other websites",
  "": "Direct, WhatsApp or messages",
};
const DEVICE_LABELS: Record<string, string> = { mobile: "Phone", desktop: "Computer", tablet: "Tablet", "": "Unknown" };
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const STATUS: Record<FollowStatus, { label: string; className: string }> = {
  following: { label: "Following", className: "bg-emerald-50 text-emerald-800" },
  waiting: { label: "First numbers soon", className: "bg-secondary text-muted-foreground" },
  error: { label: "Couldn't update", className: "bg-amber-50 text-amber-800" },
  looking: { label: "Looking on your account", className: "bg-primary/10 text-primary" },
  paste: { label: "Paste its link", className: "bg-amber-50 text-amber-800" },
  connect: { label: "Connect the account", className: "bg-amber-50 text-amber-800" },
  clicks_only: { label: "Clicks only", className: "bg-secondary text-muted-foreground" },
};
// Best days and times need this many posts with numbers, or one lucky post decides them.
const BEST_TIMES_MIN_POSTS = 5;
const TIMES_OF_DAY = [
  { label: "Morning", hint: "5 am to noon", from: 5, to: 12 },
  { label: "Afternoon", hint: "noon to 5 pm", from: 12, to: 17 },
  { label: "Evening", hint: "5 pm to 9 pm", from: 17, to: 21 },
  { label: "Night", hint: "9 pm to 5 am", from: 21, to: 29 },
];
// What each connected account whose platform doesn't share followers with Mindra says instead (WordPress has none).
const NO_FOLLOWERS: Partial<Record<ConnectedAccountKind, string>> = {
  x: "X charges for every read, so Mindra doesn't read follower numbers there.",
  linkedin: "LinkedIn doesn't share follower numbers with apps yet.",
  tiktok: "TikTok doesn't share follower numbers with Mindra yet.",
};
const card = "rounded-xl border border-border bg-card p-5";
const linkClass = "rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

// Small pieces

function Card({ title, subtitle, children, className, id }: { title: string; subtitle?: string; children: ReactNode; className?: string; id: string }) {
  return (
    <section aria-labelledby={id} className={cn(card, className)}>
      <h3 id={id} className="text-base font-semibold text-foreground">
        {title}
      </h3>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function NotEnough({ children }: { children: ReactNode }) {
  return <p className="text-sm text-pretty text-muted-foreground">{children}</p>;
}

/** One row of a ranked list: the name, a thin bar on its own track, the value at the end. */
function BarRow({ label, hint, value, max, display }: { label: ReactNode; hint?: string; value: number; max: number; display: string }) {
  return (
    <li className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_auto] items-center gap-3 text-sm">
      <span className="min-w-0 truncate text-foreground" title={hint}>
        {label}
      </span>
      <span className="h-2.5 min-w-0">
        <span className="block h-full rounded-r-[4px] bg-primary" style={{ width: `${max && value ? Math.max(2, (value / max) * 100) : 0}%` }} />
      </span>
      <span className="text-right text-muted-foreground tabular-nums">{display}</span>
    </li>
  );
}

function Thumb({ post, className }: { post: ResultPost; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground", className)}>
      {post.thumbnail_url ? <img src={post.thumbnail_url} alt="" loading="lazy" className="size-full object-cover" /> : <PlatformBadge platform={post.platform} withLabel={false} />}
    </span>
  );
}

function postName(post: ResultPost) {
  return post.title || post.excerpt || `${platformInfo(post.platform).label} post`;
}

function StatusChip({ post }: { post: ResultPost }) {
  const status = STATUS[post.status];
  const updated = post.status === "following" && post.fetched_at ? `Updated ${formatRelative(post.fetched_at)}` : post.status_text;
  return (
    <span title={updated || undefined} className={cn("inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap", status.className)}>
      {status.label}
    </span>
  );
}

/** Under a chart of views, likes, comments and shares: those come from every platform but YouTube. */
function OtherPlatformsNote() {
  return (
    <p className="mt-2 text-xs text-pretty text-muted-foreground">
      Views, likes, comments and shares from Facebook, Instagram and X. YouTube's are in their own section, as YouTube's
      rules ask. Link clicks and posts include YouTube.
    </p>
  );
}

function percentChange(now: number | null, before: number | null) {
  if (now === null || before === null) return null;
  if (before === 0) return now > 0 ? "new" : null;
  return Math.round(((now - before) / before) * 100);
}

/** Against the period before, as Facebook's cards say it: "↑ 12%" in green, "↓ 56%" in red. */
function ChangeLine({ summary, name }: { summary: ResultsSummary; name: MetricName }) {
  const value = summary.metrics[name];
  const change = percentChange(value, summary.previous[name]);
  if (value === null) return null;
  if (change === null || change === "new") {
    if (!summary.previous.posts) return <>No earlier posts to compare</>;
    return change === "new" ? <>New in this period</> : null;
  }
  if (change === 0) return <>No change from the period before</>;
  return (
    <>
      <span className={cn("font-medium", change > 0 ? "text-emerald-700" : "text-red-600")}>
        <span aria-hidden="true">{change > 0 ? "↑" : "↓"}</span>
        <span className="sr-only">{change > 0 ? "Up" : "Down"}</span> {Math.abs(change)}%
      </span>{" "}
      vs the period before
    </>
  );
}

function signed(value: number) {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${formatCount(Math.abs(value))}`;
}

function dateRange(summary: ResultsSummary) {
  const from = new Date(summary.since);
  const to = new Date(summary.until);
  const sameYear = from.getFullYear() === to.getFullYear();
  const left = from.toLocaleDateString(undefined, { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" });
  const right = to.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
  return `${left} – ${right}`;
}

function points(summary: ResultsSummary, metric: MetricName): ChartPoint[] {
  const day = (iso: string, options: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, options);
  const daily = summary.series.map((entry) => ({
    label: day(entry.day, { day: "numeric", month: "short" }),
    long: day(entry.day, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    value: entry[metric] ?? 0,
    posts: entry.posts,
  }));
  if (summary.days <= 90) return daily;
  // A year as weeks: 53 points, not 365.
  const weeks: ChartPoint[] = [];
  for (let start = 0; start < daily.length; start += 7) {
    const week = daily.slice(start, start + 7);
    weeks.push({
      label: week[0].label,
      long: `Week of ${week[0].long}`,
      value: week.reduce((total, entry) => total + entry.value, 0),
      posts: week.reduce((total, entry) => total + (entry.posts ?? 0), 0),
    });
  }
  return weeks;
}

/**
 * YouTube Studio's big card: a tab for each number, with its total for the period and the change against the period
 * before; the chosen one is drawn day by day below.
 */
function MetricChart({ summary, metrics, id }: { summary: ResultsSummary; metrics: MetricName[]; id: string }) {
  const [chosen, setChosen] = useState<MetricName>(metrics[0]);
  const metric = metrics.includes(chosen) ? chosen : metrics[0];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div role="tablist" aria-label="What to show" className={cn("grid border-b border-border", metrics.length === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-4")}>
        {metrics.map((name) => {
          const value = summary.metrics[name];
          const active = name === metric;
          return (
            <button
              key={name}
              type="button"
              role="tab"
              id={`${id}-${name}`}
              aria-selected={active}
              aria-controls={`${id}-panel`}
              onClick={() => setChosen(name)}
              className={cn(
                "border-border px-4 py-4 text-center transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:border-r sm:last:border-r-0",
                active ? "bg-card" : "bg-secondary/70 hover:bg-secondary",
              )}
            >
              <span className="block text-xs font-medium text-muted-foreground">{METRIC_LABELS[name]}</span>
              <span className="mt-1 block text-2xl font-semibold text-foreground tabular-nums">{value === null ? "—" : formatCount(value)}</span>
              <span className="mt-0.5 block min-h-4 text-[11px] text-muted-foreground tabular-nums">
                <ChangeLine summary={summary} name={name} />
              </span>
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${metric}`} className="p-5">
        {summary.metrics[metric] === null ? (
          <NotEnough>
            None of your followed posts shares {METRIC_LABELS[metric].toLowerCase()} with Mindra yet. X shares views; X, Facebook and Instagram
            share likes and comments. YouTube's numbers are in the YouTube section.
          </NotEnough>
        ) : (
          <TimeChart points={points(summary, metric)} name={METRIC_LABELS[metric]} unit={METRIC_UNITS[metric]} />
        )}
      </div>
    </div>
  );
}

/** A top content card's picture, or the post's words on a tile when it has none (a text post) or it doesn't load. */
function CardPicture({ post }: { post: ResultPost }) {
  const [failed, setFailed] = useState(false);
  if (post.thumbnail_url && !failed) {
    return <img src={post.thumbnail_url} alt="" loading="lazy" onError={() => setFailed(true)} className="aspect-[4/3] w-full bg-secondary object-cover" />;
  }
  return (
    <span className="flex aspect-[4/3] w-full flex-col gap-1.5 bg-secondary p-3 text-left">
      <PlatformBadge platform={post.platform} withLabel={false} />
      <span className="line-clamp-4 text-xs text-pretty text-foreground">{postName(post)}</span>
    </span>
  );
}

/**
 * Facebook's "Top content": a card per post (its picture, or its words for a text post), with the day it went out and
 * its number for the period; a row that scrolls sideways inside its card.
 */
function TopContentCards({ id, title, posts, value, unit, empty }: { id: string; title: string; posts: ResultPost[]; value: (post: ResultPost) => number; unit: string; empty: ReactNode }) {
  return (
    <Card id={id} title={title}>
      {posts.length === 0 ? (
        <NotEnough>{empty}</NotEnough>
      ) : (
        <ul className="relative -mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
          {posts.map((post) => (
            <li key={post.id} className="w-40 shrink-0 snap-start sm:w-44">
              <Link
                to={`/library/${post.id}`}
                className="block overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <CardPicture post={post} />
                <span className="block p-3">
                  <span className="block truncate text-xs text-muted-foreground">{post.posted_at ? formatDate(post.posted_at) : platformInfo(post.platform).label}</span>
                  <span className="mt-0.5 block text-base font-semibold text-foreground tabular-nums">{formatCount(value(post))}</span>
                  <span className="block text-xs text-muted-foreground">{unit}</span>
                  <span className="sr-only">: {postName(post)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** Views or engagement by what the posts are made of, as shares of the whole. */
function ContentTypeBars({ summary, metric, empty }: { summary: ResultsSummary; metric: "views" | "engagement"; empty: ReactNode }) {
  const rows = summary.content_types.filter((row) => row[metric] !== null);
  const total = rows.reduce((sum, row) => sum + (row[metric] ?? 0), 0);
  if (total === 0) return <NotEnough>{empty}</NotEnough>;
  const max = Math.max(...rows.map((row) => row[metric] ?? 0));
  const hint = (type: ContentType) => {
    const posts = summary.content_types.find((row) => row.type === type)?.posts ?? 0;
    return `${posts} ${posts === 1 ? "post" : "posts"} out in this period`;
  };
  // The platforms of this period's posts that don't share this number with Mindra, named under the bars.
  const uncounted = summary.platforms
    .filter((row) => (metric === "views" ? row.views === null : row.likes === null && row.comments === null && row.shares === null))
    .map((row) => platformInfo(row.platform).label);
  return (
    <>
      <ul className="space-y-3">
        {rows.map((row) => (
          <BarRow
            key={row.type}
            label={CONTENT_TYPE_LABELS[row.type]}
            hint={hint(row.type)}
            value={row[metric] ?? 0}
            max={max}
            display={`${Math.round(((row[metric] ?? 0) / total) * 1000) / 10}%`}
          />
        ))}
      </ul>
      {uncounted.length > 0 && (
        <p className="mt-3 text-xs text-pretty text-muted-foreground">
          Not counted here: your {uncounted.length > 1 ? `${uncounted.slice(0, -1).join(", ")} and ${uncounted[uncounted.length - 1]}` : uncounted[0]} posts, since{" "}
          {uncounted.length === 1 ? "that platform doesn't" : "those platforms don't"} share {metric === "views" ? "views" : "likes, comments or shares"} with
          Mindra.
        </p>
      )}
    </>
  );
}

// Overview

function TopContent({ posts, title = "Your top content in this period" }: { posts: ResultPost[]; title?: string }) {
  return (
    <section aria-labelledby="top-content" className={card}>
      <h3 id="top-content" className="text-center text-base font-semibold text-foreground">
        {title}
      </h3>
      {posts.length === 0 ? (
        <p className="mt-3 text-center text-sm text-muted-foreground">No views, likes, comments, shares or clicks in this period yet.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="w-8 py-2 text-left font-medium">
                  <span className="sr-only">Rank</span>
                </th>
                <th scope="col" className="py-2 text-left font-medium">
                  Post
                </th>
                <th scope="col" className="py-2 pl-4 text-right font-medium whitespace-nowrap">
                  Views
                </th>
                <th scope="col" className="py-2 pl-4 text-right font-medium whitespace-nowrap">
                  Likes
                </th>
                <th scope="col" className="py-2 pl-4 text-right font-medium whitespace-nowrap">
                  Engagement rate
                </th>
                <th scope="col" className="py-2 pl-4 text-right font-medium whitespace-nowrap">
                  Link clicks
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post, index) => (
                <tr key={post.id} className="border-b border-border last:border-b-0">
                  <td className="py-3 text-muted-foreground tabular-nums">{index + 1}</td>
                  <td className="py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Thumb post={post} className="h-12 w-20" />
                      <div className="min-w-0">
                        <Link to={`/library/${post.id}`} className="block truncate font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
                          {postName(post)}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <PlatformBadge platform={post.platform} withLabel={false} />
                          {post.posted_at ? formatDate(post.posted_at) : ""}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pl-4 text-right tabular-nums whitespace-nowrap">{formatCount(post.period.views)}</td>
                  <td className="py-3 pl-4 text-right tabular-nums whitespace-nowrap">{formatCount(post.period.likes)}</td>
                  <td className="py-3 pl-4 text-right tabular-nums whitespace-nowrap">{post.engagement_rate === null ? "—" : `${post.engagement_rate}%`}</td>
                  <td className="py-3 pl-4 text-right tabular-nums whitespace-nowrap">{formatCount(post.period.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-pretty text-muted-foreground">Views, likes and clicks each post gained in this period; the engagement rate is its likes, comments and shares for every 100 views so far.</p>
    </section>
  );
}

function LatestPost({ post }: { post: ResultPost | null }) {
  if (!post) return null;
  const age = post.posted_at ? formatRelative(post.posted_at).replace(/ ago$/, "") : "";
  const rows: [string, string][] = [
    ["Views", formatCount(post.views)],
    ["Likes", formatCount(post.likes)],
    ["Comments", formatCount(post.comments)],
    ["Link clicks", formatCount(post.clicks)],
    ["Engagement rate", post.engagement_rate === null ? "—" : `${post.engagement_rate}%`],
  ];
  return (
    <Card id="latest-post" title="Latest post">
      <Link to={`/library/${post.id}`} className="relative block overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        <Thumb post={post} className="aspect-video w-full rounded-lg" />
        <span className="absolute inset-x-0 bottom-0 truncate bg-black/65 px-3 py-2 text-sm font-medium text-white">{postName(post)}</span>
      </Link>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <PlatformBadge platform={post.platform} withLabel={false} />
        {age ? `Out ${age}` : ""} <StatusChip post={post} />
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-foreground">{label}</dt>
            <dd className="text-foreground tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {post.status !== "following" && post.status_text && <p className="mt-3 text-xs text-pretty text-muted-foreground">{post.status_text}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link to={`/library/${post.id}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          See post analytics
        </Link>
        {post.url && (
          <a href={post.url} target="_blank" rel="noreferrer" className={buttonStyles({ variant: "ghost", size: "sm" })}>
            <ExternalLink aria-hidden="true" className="size-4" />
            Open
          </a>
        )}
      </div>
    </Card>
  );
}

/** Link clicks hour by hour over the last 48 hours, as YouTube's realtime card. */
function RecentClicks({ summary, onSeeMore }: { summary: ResultsSummary; onSeeMore: () => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const hours = summary.recent_clicks;
  const total = hours.reduce((sum, hour) => sum + hour.clicks, 0);
  const max = Math.max(1, ...hours.map((hour) => hour.clicks));
  const label = (iso: string) => new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "numeric" });
  return (
    <Card id="recent-clicks" title="Link clicks · last 48 hours">
      <p className="text-3xl font-semibold text-foreground tabular-nums">{total.toLocaleString()}</p>
      <div className="relative mt-3" onMouseLeave={() => setHovered(null)}>
        <div role="img" aria-label={`${total} link clicks in the last 48 hours`} className="flex h-16 items-end gap-px border-b border-border">
          {hours.map((hour, index) => (
            <div key={hour.hour} onMouseEnter={() => setHovered(index)} className="flex h-full min-w-0 flex-1 items-end">
              <div className={cn("w-full rounded-t-[2px] bg-primary", hovered !== null && hovered !== index && "opacity-40")} style={{ height: hour.clicks ? `max(2px, ${(hour.clicks / max) * 100}%)` : 0 }} />
            </div>
          ))}
        </div>
        {hovered !== null && (
          <p role="status" className="absolute -top-7 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-2 py-1 text-xs whitespace-nowrap text-white">
            {label(hours[hovered].hour)} · {hours[hovered].clicks} {hours[hovered].clicks === 1 ? "click" : "clicks"}
          </p>
        )}
        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
          <span>-48 h</span>
          <span>Now</span>
        </div>
      </div>
      <button type="button" onClick={onSeeMore} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-4" })}>
        See more
      </button>
    </Card>
  );
}

function Overview({ summary, go }: { summary: ResultsSummary; go: (tab: TabId) => void }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-6">
        <div>
          <MetricChart id="overview" summary={summary} metrics={["views", "engagement", "clicks", "posts"]} />
          <OtherPlatformsNote />
          <button type="button" onClick={() => go("content")} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })}>
            See more
          </button>
        </div>
        <TopContent posts={summary.top_posts} />
        <YouTubeSection summary={summary} top={false} />
      </div>
      <div className="min-w-0 space-y-6">
        <RecentClicks summary={summary} onSeeMore={() => go("audience")} />
        <LatestPost post={summary.latest} />
      </div>
    </div>
  );
}

// Content

function AllPosts({ summary }: { summary: ResultsSummary }) {
  const { posts } = summary;
  return (
    <section aria-labelledby="all-posts" className={card}>
      <h3 id="all-posts" className="text-base font-semibold text-foreground">
        Every post that went out
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {summary.posts_total > posts.length ? `The newest ${posts.length} of ${summary.posts_total}, ` : ""}with their numbers now and whether Mindra follows them.
      </p>
      {posts.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No posts went out in this period.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th scope="col" className="py-2 text-left font-medium">
                  Post
                </th>
                <th scope="col" className="py-2 text-left font-medium">
                  Numbers
                </th>
                {NUMBER_NAMES.map((name) => (
                  <th key={name} scope="col" className="py-2 pl-4 text-right font-medium whitespace-nowrap">
                    {NUMBER_LABELS[name]}
                  </th>
                ))}
                <th scope="col" className="py-2 pl-4 text-right font-medium whitespace-nowrap">
                  Link clicks
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((post) => (
                <tr key={post.id} className="border-b border-border align-top last:border-b-0">
                  <td className="py-3 pr-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Thumb post={post} className="h-10 w-16" />
                      <div className="min-w-0 max-w-72">
                        <Link to={`/library/${post.id}`} className="block truncate font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-primary">
                          {postName(post)}
                        </Link>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                          <PlatformBadge platform={post.platform} withLabel={false} />
                          {post.posted_at ? formatDate(post.posted_at) : ""}
                          {post.published ? " · posted by Mindra" : " · shared by you"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="max-w-64 py-3 pr-3">
                    <StatusChip post={post} />
                    {post.status !== "following" && post.status_text && (
                      <p className="mt-1 text-xs text-pretty text-muted-foreground">
                        {post.status_text}{" "}
                        {(post.status === "paste" || post.status === "looking") && (
                          <Link to={`/library/${post.id}`} className={linkClass}>
                            Open the post
                          </Link>
                        )}
                        {post.status === "connect" && (
                          <Link to="/settings#accounts" className={linkClass}>
                            Connect it
                          </Link>
                        )}
                      </p>
                    )}
                  </td>
                  {NUMBER_NAMES.map((name) => (
                    <td key={name} className="py-3 pl-4 text-right tabular-nums">
                      {formatCount(post[name])}
                    </td>
                  ))}
                  <td className="py-3 pl-4 text-right tabular-nums">{formatCount(post.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ContentTab({ summary }: { summary: ResultsSummary }) {
  const sources = summary.sources;
  const sourceMax = Math.max(0, ...sources.map((row) => row.clicks));
  const sourceTotal = sources.reduce((sum, row) => sum + row.clicks, 0);
  const viewed = summary.top_posts.filter((post) => (post.period.views ?? 0) > 0);
  return (
    <div className="space-y-6">
      <div>
        <MetricChart id="content" summary={summary} metrics={["views", "likes", "comments", "shares"]} />
        <OtherPlatformsNote />
      </div>
      <TopContentCards
        id="top-viewed"
        title="Top content"
        posts={viewed}
        value={(post) => post.period.views ?? 0}
        unit="Views"
        empty="No views in this period yet. X shares views with Mindra; Facebook and Instagram share likes and comments. YouTube's are in the YouTube section."
      />
      <YouTubeSection summary={summary} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card id="views-by-type" title="Views by content type" subtitle="Views gained in this period">
          <ContentTypeBars
            summary={summary}
            metric="views"
            empty="Views by photo, video and text posts show once your posts on X have views in this period. YouTube's are in the YouTube section."
          />
        </Card>
        <Card id="sources" title="How people found your links" subtitle="Link clicks, by where they came from">
          {sources.length === 0 ? (
            <NotEnough>No clicks on your Mindra links in this period. “Count clicks” in the post editor puts one in a post.</NotEnough>
          ) : (
            <ul className="space-y-3">
              {sources.map((row) => (
                <BarRow key={row.key || "direct"} label={SOURCE_LABELS[row.key] ?? row.key} value={row.clicks} max={sourceMax} display={`${Math.round((row.clicks / sourceTotal) * 1000) / 10}%`} />
              ))}
            </ul>
          )}
        </Card>
        <PlatformsCard summary={summary} />
      </div>
      <AllPosts summary={summary} />
    </div>
  );
}

// Engagement

/** Likes, comments and shares in the period, split by kind (Facebook's "By interaction type"). */
function InteractionSplit({ summary }: { summary: ResultsSummary }) {
  const { metrics } = summary;
  const engaged = (metrics.likes ?? 0) + (metrics.comments ?? 0) + (metrics.shares ?? 0);
  const parts = (["likes", "comments", "shares"] as const).map((name) => ({ name, value: metrics[name] ?? 0 }));
  return (
    <Card id="engaged" title="By interaction type" subtitle="Likes, comments and shares in this period">
      {metrics.engagement === null || engaged === 0 ? (
        <NotEnough>No likes, comments or shares in this period yet.</NotEnough>
      ) : (
        <>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={parts.map((part) => `${part.value} ${part.name}`).join(", ")}>
            {parts.map((part, index) =>
              part.value ? <span key={part.name} className={cn("h-full", ["bg-primary", "bg-primary/60", "bg-primary/30"][index])} style={{ width: `${(part.value / engaged) * 100}%` }} /> : null,
            )}
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
            {parts.map((part, index) => (
              <div key={part.name}>
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <span aria-hidden="true" className={cn("size-2.5 rounded-sm", ["bg-primary", "bg-primary/60", "bg-primary/30"][index])} />
                  {NUMBER_LABELS[part.name]}
                </dt>
                <dd className="mt-0.5 text-lg font-semibold text-foreground tabular-nums">{formatCount(part.value)}</dd>
              </div>
            ))}
          </dl>
          {metrics.views ? (
            <p className="mt-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground tabular-nums">{Math.round((engaged / metrics.views) * 1000) / 10}%</span> engagement rate: likes, comments and shares for every 100 views.
            </p>
          ) : null}
        </>
      )}
    </Card>
  );
}

/** Facebook's Engagement overview: the total and each kind against the period before, day by day; by interaction
 * and content type; and the posts with the most. */
function EngagementTab({ summary }: { summary: ResultsSummary }) {
  return (
    <div className="space-y-6">
      <div>
        <MetricChart id="engagement" summary={summary} metrics={["engagement", "likes", "comments", "shares"]} />
        <OtherPlatformsNote />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <InteractionSplit summary={summary} />
        <Card id="engagement-by-type" title="By content type" subtitle="Likes, comments and shares gained in this period">
          <ContentTypeBars summary={summary} metric="engagement" empty="No likes, comments or shares in this period yet." />
        </Card>
      </div>
      <TopContentCards
        id="top-engaged"
        title="Top content"
        posts={summary.top_engaged}
        value={(post) => post.period.engagement ?? 0}
        unit="Engagement"
        empty="No likes, comments or shares in this period yet. Facebook, Instagram and X share them for posts Mindra follows."
      />
    </div>
  );
}

// Content, continued

function PlatformsCard({ summary }: { summary: ResultsSummary }) {
  return (
    <Card id="platforms" title="By platform" subtitle="Posts out and what they gained in this period; YouTube's numbers as YouTube counted them, without engagement">
      {summary.platforms.length === 0 ? (
        <NotEnough>No posts went out in this period.</NotEnough>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[26rem] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="py-1.5 pr-3 font-medium">
                  Platform
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                  Posts
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                  Views
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-medium">
                  Engagement
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  Link clicks
                </th>
              </tr>
            </thead>
            <tbody>
              {summary.platforms.map((row) => (
                <tr key={row.platform} className="border-t border-border">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">
                    <PlatformBadge platform={row.platform} />
                  </th>
                  <td className="py-2 pr-3 text-right tabular-nums">{row.posts}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatCount(row.views)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{formatCount(row.engagement)}</td>
                  <td className="py-2 text-right tabular-nums">{formatCount(row.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

// Audience

function dayLabel(iso: string, options: Intl.DateTimeFormatOptions) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, options);
}

/** One account's followers: the latest count, the change over the period, and the count day by day once there are two. */
function AccountFollowersRow({ account }: { account: AccountFollowers }) {
  const unit: [string, string] = account.kind === "youtube" ? ["subscriber", "subscribers"] : ["follower", "followers"];
  const points: ChartPoint[] = account.series.map((entry) => ({
    label: dayLabel(entry.day, { day: "numeric", month: "short" }),
    long: dayLabel(entry.day, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    value: entry.followers,
  }));
  return (
    <li className="min-w-0 rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        {account.picture_url ? (
          <img src={account.picture_url} alt="" loading="lazy" className="size-9 shrink-0 rounded-full bg-secondary object-cover" />
        ) : (
          <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-sm font-medium text-foreground">
            {account.name.replace(/^@/, "").charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
          <p className="text-xs text-muted-foreground">{ACCOUNT_KINDS[account.kind].label}</p>
        </div>
      </div>
      {account.followers === null ? (
        <p className="mt-3 text-sm text-pretty text-muted-foreground">
          {account.needs_reconnect ? (
            <>
              Reconnect it in{" "}
              <Link to="/settings#accounts" className={linkClass}>
                Settings
              </Link>
              , so Mindra can count its {unit[1]}.
            </>
          ) : account.kind === "youtube" ? (
            "Mindra counts its subscribers once a day, unless the channel hides them. The first count shows here soon."
          ) : (
            `Mindra counts its ${unit[1]} once a day. The first count shows here soon.`
          )}
        </p>
      ) : (
        <>
          <p className="mt-3 text-2xl font-semibold text-foreground tabular-nums">
            {account.followers.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{account.followers === 1 ? unit[0] : unit[1]}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {account.kind === "youtube" ? (
              "As YouTube counts them, once a day."
            ) : account.change === null ? (
              "The change shows once Mindra has counted on two days."
            ) : (
              <>
                <span className={cn("font-medium tabular-nums", account.change > 0 ? "text-emerald-700" : account.change < 0 ? "text-red-600" : "text-foreground")}>
                  {signed(account.change)}
                </span>{" "}
                in this period
              </>
            )}
          </p>
          {points.length >= 2 && (
            <div className="mt-3">
              <TimeChart points={points} name={account.kind === "youtube" ? "Subscribers" : "Followers"} unit={unit} format={(value) => value.toLocaleString()} fromZero={false} />
            </div>
          )}
          {account.needs_reconnect && (
            <p className="mt-2 text-xs text-pretty text-muted-foreground">
              Mindra can't count any more until it's reconnected in{" "}
              <Link to="/settings#accounts" className={linkClass}>
                Settings
              </Link>
              .
            </p>
          )}
          {account.kind === "youtube" && <p className="mt-2 text-xs text-muted-foreground">YouTube rounds subscriber numbers down to three figures.</p>}
        </>
      )}
    </li>
  );
}

/** How many follow each connected account (Facebook's "Total followers" and "Net follows"), read once a day. */
function FollowersCard({ summary }: { summary: ResultsSummary }) {
  const { accounts, others } = summary.followers;
  const notes = [...new Set(others.map((row) => NO_FOLLOWERS[row.kind]).filter((note): note is string => Boolean(note)))];
  return (
    <Card id="followers" title="Followers" subtitle="On your connected accounts, counted once a day">
      {accounts.length === 0 ? (
        <NotEnough>
          Connect your YouTube channel, Facebook Page or Instagram account in{" "}
          <Link to="/settings#accounts" className={linkClass}>
            Settings
          </Link>
          , and Mindra counts their followers once a day.
        </NotEnough>
      ) : (
        <ul className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
          {accounts.map((account) => (
            <AccountFollowersRow key={account.account_id} account={account} />
          ))}
        </ul>
      )}
      {notes.map((note) => (
        <p key={note} className="mt-3 text-sm text-pretty text-muted-foreground">
          {note}
        </p>
      ))}
    </Card>
  );
}

function AudienceTab({ summary }: { summary: ResultsSummary }) {
  const total = summary.metrics.clicks ?? 0;
  const countryMax = Math.max(0, ...summary.countries.map((row) => row.clicks));
  const deviceMax = Math.max(0, ...summary.devices.map((row) => row.clicks));
  // The clicks' UTC hours, moved to this browser's time.
  const offset = -new Date().getTimezoneOffset() / 60;
  const byHour = Array.from({ length: 24 }, () => 0);
  for (const row of summary.click_hours) byHour[(((row.key + Math.round(offset)) % 24) + 24) % 24] += row.clicks;
  const hourMax = Math.max(0, ...byHour);
  const byWeekday = Array.from({ length: 7 }, () => 0);
  for (const day of summary.series) byWeekday[new Date(`${day.day}T12:00:00Z`).getUTCDay()] += day.clicks;
  const weekdayMax = Math.max(0, ...byWeekday);
  const share = (value: number) => (total ? `${Math.round((value / total) * 1000) / 10}%` : "0%");
  const hourLabel = (hour: number) => new Date(2026, 0, 1, hour).toLocaleTimeString(undefined, { hour: "numeric" });
  const busiestHour = byHour.indexOf(hourMax);
  return (
    <div className="space-y-6">
      <FollowersCard summary={summary} />
      <MetricChart id="audience" summary={summary} metrics={["clicks", "posts", "engagement"]} />
      {total === 0 && (
        <p className="rounded-lg border border-dashed border-border bg-card px-4 py-3 text-sm text-pretty text-muted-foreground">
          Who your audience is comes from the clicks on your Mindra links: where people are, their devices and when they click. Nothing about the people
          themselves is kept. In the post editor, “Count clicks” puts a Mindra link in place of a web address.
        </p>
      )}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card id="countries" title="Top countries" subtitle="Link clicks in this period">
          {summary.countries.length === 0 ? (
            <NotEnough>Not enough data to show this report.</NotEnough>
          ) : (
            <ul className="space-y-3">
              {summary.countries.map((row) => (
                <BarRow key={row.key || "unknown"} label={countryName(row.key)} value={row.clicks} max={countryMax} display={share(row.clicks)} />
              ))}
            </ul>
          )}
        </Card>
        <Card id="devices" title="Device type" subtitle="Link clicks in this period">
          {summary.devices.length === 0 ? (
            <NotEnough>Not enough data to show this report.</NotEnough>
          ) : (
            <ul className="space-y-3">
              {summary.devices.map((row) => (
                <BarRow key={row.key || "unknown"} label={DEVICE_LABELS[row.key] ?? row.key} value={row.clicks} max={deviceMax} display={share(row.clicks)} />
              ))}
            </ul>
          )}
        </Card>
        <Card id="hours" title="When people click" subtitle="Link clicks by hour of the day, your time">
          {hourMax === 0 ? (
            <NotEnough>Not enough data to show this report.</NotEnough>
          ) : (
            <>
              <div role="img" aria-label={`Most clicks around ${hourLabel(busiestHour)}`} className="flex h-28 items-end gap-0.5 border-b border-border">
                {byHour.map((value, hour) => (
                  <div key={hour} title={`${hourLabel(hour)}: ${value} ${value === 1 ? "click" : "clicks"}`} className="flex h-full min-w-0 flex-1 items-end">
                    <div className="w-full rounded-t-[2px] bg-primary" style={{ height: value ? `max(2px, ${(value / hourMax) * 100}%)` : 0 }} />
                  </div>
                ))}
              </div>
              <div aria-hidden="true" className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                <span>{hourLabel(0)}</span>
                <span>{hourLabel(6)}</span>
                <span>{hourLabel(12)}</span>
                <span>{hourLabel(18)}</span>
                <span>{hourLabel(23)}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Most clicks come around {hourLabel(busiestHour)}.</p>
            </>
          )}
        </Card>
        <Card id="weekdays" title="Clicks by day of the week" subtitle="Link clicks in this period">
          {weekdayMax === 0 ? (
            <NotEnough>Not enough data to show this report.</NotEnough>
          ) : (
            <ul className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 0].map((day) => (
                <BarRow key={day} label={WEEKDAYS[day]} value={byWeekday[day]} max={weekdayMax} display={formatCount(byWeekday[day])} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

// Trends

type Group = { label: string; hint?: string; posts: number; average: number };

function groupBy(posts: ResultPost[], keyOf: (date: Date) => number, labels: { label: string; hint?: string }[]): Group[] {
  return labels.map((entry, index) => {
    const mine = posts.filter((post) => post.posted_at && keyOf(new Date(post.posted_at)) === index);
    const total = mine.reduce((sum, post) => sum + (post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0), 0);
    return { ...entry, posts: mine.length, average: mine.length ? total / mine.length : 0 };
  });
}

function TrendsTab({ summary }: { summary: ResultsSummary }) {
  // YouTube's numbers aren't averaged with other platforms' (its rules), so its videos aren't counted here.
  const measured = summary.posts.filter((post) => post.following && post.fetched_at && !post.youtube);
  const platformMax = Math.max(0, ...summary.platforms.map((row) => row.posts));
  let best: ReactNode;
  if (measured.length < BEST_TIMES_MIN_POSTS) {
    best = (
      <NotEnough>
        These show once {BEST_TIMES_MIN_POSTS} or more posts in this period have numbers ({measured.length} so far), so one lucky post doesn't decide them.
      </NotEnough>
    );
  } else {
    const days = groupBy(measured, (date) => date.getDay(), WEEKDAYS.map((label) => ({ label })));
    const times = groupBy(
      measured,
      (date) => TIMES_OF_DAY.findIndex((time) => [date.getHours(), date.getHours() + 24].some((hour) => hour >= time.from && hour < time.to)),
      TIMES_OF_DAY,
    );
    const top = (groups: Group[]) => groups.reduce((winner, group) => (group.average > winner.average ? group : winner), groups[0]);
    const dayMax = Math.max(...days.map((group) => group.average));
    const timeMax = Math.max(...times.map((group) => group.average));
    const display = (group: Group) => (group.posts ? `${formatCount(Math.round(group.average))} (${group.posts} ${group.posts === 1 ? "post" : "posts"})` : "No posts");
    best = (
      <>
        <p className="text-sm text-pretty text-muted-foreground">
          {top(days).average > 0
            ? `Posts on ${top(days).label}s and in the ${top(times).label.toLowerCase()} got the most likes, comments and shares.`
            : "None of these posts has likes, comments or shares yet."}{" "}
          Averages per post, by when they went out here.
        </p>
        <div className="mt-4 grid gap-6 sm:grid-cols-2">
          <ul aria-label="By day" className="space-y-2">
            {days.map((group) => (
              <BarRow key={group.label} label={group.label} value={group.average} max={dayMax} display={display(group)} />
            ))}
          </ul>
          <ul aria-label="By time of day" className="space-y-2">
            {times.map((group) => (
              <BarRow key={group.label} label={group.label} hint={group.hint} value={group.average} max={timeMax} display={display(group)} />
            ))}
          </ul>
        </div>
      </>
    );
  }
  return (
    <div className="space-y-6">
      <Card id="best" title="Best days and times to post" subtitle="Likes, comments and shares per post">
        {best}
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card id="posting" title="Where you post most" subtitle="Posts out in this period">
          {summary.platforms.length === 0 ? (
            <NotEnough>No posts went out in this period.</NotEnough>
          ) : (
            <ul className="space-y-3">
              {summary.platforms.map((row) => (
                <BarRow key={row.platform} label={<PlatformBadge platform={row.platform} />} value={row.posts} max={platformMax} display={`${row.posts}`} />
              ))}
            </ul>
          )}
        </Card>
        <Card id="habits" title="Posting rhythm" subtitle={`${summary.metrics.posts ?? 0} posts out in ${summary.days} days`}>
          <p className="text-3xl font-semibold text-foreground tabular-nums">{(((summary.metrics.posts ?? 0) / summary.days) * 7).toFixed(1)}</p>
          <p className="text-sm text-muted-foreground">posts a week on average</p>
          <p className="mt-3 text-sm text-pretty text-muted-foreground">
            {(summary.previous.posts ?? 0) > 0
              ? `${summary.previous.posts} went out in the ${summary.days} days before.`
              : "None went out in the period before."}{" "}
            Posting regularly helps platforms show your posts to more people.
          </p>
        </Card>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" className="sr-only">
        Loading analytics
      </p>
      <div className="h-80 animate-pulse rounded-xl bg-secondary" />
      <div className="h-64 animate-pulse rounded-xl bg-secondary" />
    </div>
  );
}

/** The Analytics page, laid out like YouTube Studio's and Facebook's Creator dashboard: Overview, Content, Engagement,
 * Audience and Trends for a period. */
export default function Analytics() {
  const [params, setParams] = useSearchParams();
  const asked = Number(params.get("days"));
  const days = PERIODS.some((period) => period.days === asked) ? asked : DEFAULT_PERIOD;
  const tab: TabId = TABS.some((item) => item.id === params.get("tab")) ? (params.get("tab") as TabId) : "overview";
  const summary = useResultsSummary(days);
  // From the address as it is now, so two changes made one after the other (a tab, then the period) both stay.
  const set = (changes: Record<string, string>) => {
    const next = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(changes)) next.set(key, value);
    setParams(next, { replace: true });
  };

  let body: ReactNode = null;
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
    const empty = !data.posts_total && !data.metrics.clicks && !data.links && !data.top_posts.length && !data.latest && !data.followers.accounts.length;
    body = empty ? (
      <EmptyState
        icon={ChartColumn}
        title="No analytics yet"
        description="Analytics come from the posts Mindra posts, posts you share and mark as posted (Mindra finds them on your connected YouTube, Instagram and Facebook), and clicks on Mindra links in any post."
        action={
          <Link to="/planner" className={buttonStyles()}>
            <Send aria-hidden="true" className="size-4" />
            Plan your posts
          </Link>
        }
      />
    ) : (
      <div role="tabpanel" id={`analytics-${tab}`} aria-labelledby={`analytics-tab-${tab}`}>
        {tab === "overview" && <Overview summary={data} go={(next) => set({ tab: next })} />}
        {tab === "content" && <ContentTab summary={data} />}
        {tab === "engagement" && <EngagementTab summary={data} />}
        {tab === "audience" && <AudienceTab summary={data} />}
        {tab === "trends" && <TrendsTab summary={data} />}
        <p className="mt-6 flex items-start gap-2 text-xs text-pretty text-muted-foreground">
          <Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          Mindra reads each post's numbers about 1 hour, 1 day, 3 days, 7 days and 30 days after it goes out, and spreads the change between two readings
          evenly over the days between them. Clicks are counted as they happen; link previews and search engines aren't counted, and nothing about the
          people who click is kept.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-balance text-foreground">Analytics</h2>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">How your posts did: views, likes, comments, shares and the clicks on your links.</p>
        </div>
        <div className="text-right">
          {summary.data && <p className="text-xs text-muted-foreground tabular-nums">{dateRange(summary.data)}</p>}
          <label htmlFor="analytics-period" className="sr-only">
            Period
          </label>
          <select
            id="analytics-period"
            value={days}
            onChange={(event) => set({ days: event.target.value })}
            className="mt-0.5 h-10 rounded-lg border border-border bg-card px-3 text-sm font-medium text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
          >
            {PERIODS.map((period) => (
              <option key={period.days} value={period.days}>
                {period.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div role="tablist" aria-label="Analytics" className="flex gap-6 overflow-x-auto border-b border-border">
        {TABS.map((item) => {
          const active = item.id === tab;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`analytics-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`analytics-${item.id}`}
              onClick={() => set({ tab: item.id })}
              className={cn(
                "-mb-px border-b-2 px-0.5 pb-3 text-sm font-medium whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {body}
    </div>
  );
}
