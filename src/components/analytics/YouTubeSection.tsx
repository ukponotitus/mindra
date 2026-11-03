import { useId, useState } from "react";
import { Link } from "react-router";
import { cn } from "../../lib/cn";
import { formatDate } from "../../lib/format";
import { formatCount, formatRelative, type ResultsSummary } from "../../lib/results";
import TimeChart, { type ChartPoint } from "./TimeChart";

// The Analytics page's YouTube section. YouTube's API policies don't allow its numbers to be added to other
// platforms', compared with them, spread between readings or turned into rates, so they're shown here on their own and
// as read: the period's videos with their numbers as YouTube counted them at the last reading, day by day as read, and
// those videos by views.

type Name = "views" | "likes" | "comments";
const NAMES: { id: Name; label: string; unit: [string, string] }[] = [
  { id: "views", label: "Views", unit: ["view", "views"] },
  { id: "likes", label: "Likes", unit: ["like", "likes"] },
  { id: "comments", label: "Comments", unit: ["comment", "comments"] },
];

function points(summary: ResultsSummary, name: Name): ChartPoint[] {
  const day = (iso: string, options: Intl.DateTimeFormatOptions) => new Date(`${iso}T12:00:00Z`).toLocaleDateString(undefined, options);
  const daily = summary.youtube.series.map((entry) => ({
    label: day(entry.day, { day: "numeric", month: "short" }),
    long: day(entry.day, { weekday: "short", day: "numeric", month: "short", year: "numeric" }),
    value: entry[name] ?? 0,
  }));
  if (summary.days <= 90) return daily;
  // A year as weeks, each at its last day's reading (these are totals as read, not gains).
  const weeks: ChartPoint[] = [];
  for (let start = 0; start < daily.length; start += 7) {
    const week = daily.slice(start, start + 7);
    weeks.push({ label: week[0].label, long: `Week of ${week[0].long}`, value: week[week.length - 1].value });
  }
  return weeks;
}

export default function YouTubeSection({ summary, top = true }: { summary: ResultsSummary; top?: boolean }) {
  const youtube = summary.youtube;
  const [chosen, setChosen] = useState<Name>("views");
  const id = useId();
  const chosenName = NAMES.find((name) => name.id === chosen)!;
  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <h2 id={`${id}-title`} className="text-base font-semibold text-foreground">
        From YouTube
      </h2>
      <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
        As YouTube counts them, for the videos that went out in this period. YouTube's rules keep its numbers apart from
        your other platforms', so they're here on their own.
      </p>
      {!youtube.connected ? (
        <p className="mt-4 text-sm text-pretty text-muted-foreground">
          Connect your YouTube channel in{" "}
          <Link to="/settings#accounts" className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
            Settings
          </Link>{" "}
          to see your videos' views, likes and comments here.
        </p>
      ) : youtube.videos === 0 ? (
        <p className="mt-4 text-sm text-pretty text-muted-foreground">No YouTube videos that Mindra follows went out in this period.</p>
      ) : (
        <>
          <div role="tablist" aria-label="YouTube number to show" className="mt-4 grid grid-cols-3 overflow-hidden rounded-lg border border-border">
            {NAMES.map((name) => {
              const active = name.id === chosen;
              return (
                <button
                  key={name.id}
                  type="button"
                  role="tab"
                  id={`${id}-${name.id}`}
                  aria-selected={active}
                  aria-controls={`${id}-panel`}
                  onClick={() => setChosen(name.id)}
                  className={cn(
                    "border-r border-border px-3 py-3 text-center transition-colors last:border-r-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                    active ? "bg-card" : "bg-secondary/70 hover:bg-secondary",
                  )}
                >
                  <span className="block text-xs font-medium text-muted-foreground">{name.label}</span>
                  <span className="mt-1 block text-xl font-semibold text-foreground tabular-nums">{formatCount(youtube.metrics[name.id])}</span>
                </button>
              );
            })}
          </div>
          <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-${chosen}`} className="mt-4">
            {youtube.metrics[chosen] === null ? (
              <p className="text-sm text-muted-foreground">YouTube doesn't share {chosenName.label.toLowerCase()} for these videos.</p>
            ) : (
              <TimeChart points={points(summary, chosen)} name={`${chosenName.label} on YouTube`} unit={chosenName.unit} />
            )}
          </div>
          <p className="mt-2 text-xs text-pretty text-muted-foreground">
            {youtube.videos} {youtube.videos === 1 ? "video" : "videos"}, as read from YouTube
            {youtube.read_at ? `, last ${formatRelative(youtube.read_at)}` : ""}. Each day shows the numbers as they were last read by then.
          </p>
          {top && youtube.top.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-medium text-foreground">Your videos by views</h3>
              <ol className="mt-2 divide-y divide-border">
                {youtube.top.map((post) => (
                  <li key={post.id} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary">
                      {post.thumbnail_url && <img src={post.thumbnail_url} alt="" loading="lazy" className="size-full object-cover" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        to={`/library/${post.id}`}
                        className="block truncate text-sm font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {post.title || post.excerpt || post.project_name}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{post.posted_at ? formatDate(post.posted_at) : "YouTube"}</span>
                    </div>
                    <dl className="grid shrink-0 grid-cols-3 gap-3 text-right text-xs">
                      {NAMES.map((name) => (
                        <div key={name.id}>
                          <dt className="text-muted-foreground">{name.label}</dt>
                          <dd className="font-medium text-foreground tabular-nums">{formatCount(post[name.id])}</dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}
    </section>
  );
}
