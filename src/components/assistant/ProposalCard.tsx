import { Check, X } from "lucide-react";
import { Link } from "react-router";
import type { Proposal } from "../../lib/assistant";
import { dayKey, formatDayShort, formatTime } from "../../lib/calendar";
import { formatLabel } from "../../lib/calendars";
import { cn } from "../../lib/cn";
import { PLATFORMS } from "../../lib/projects";
import { buttonStyles } from "../ui/button";

// A change the assistant proposed, as a card: what would change, then Apply or Discard. Nothing changes until Apply.

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  organisation_type: "Kind of organisation",
  about: "What it does",
  location: "Where",
  website: "Website",
  whatsapp: "WhatsApp",
  socials: "Social accounts",
  pillars: "Content pillars",
  audience: "Audience",
  tone: "Tone",
  style_notes: "Style notes",
  words_to_use: "Words to use",
  words_to_avoid: "Words to avoid",
  objective: "What it's for",
  promoting: "Details posts must get right",
  starts_on: "Starts on",
  ends_on: "Ends on",
  platforms: "Where it goes",
  budget: "Budget (₦)",
  main_message: "Main message",
  link: "Where people should go",
  targets: "Targets",
};

function shown(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) {
    return value.map((item) => (item && typeof item === "object" ? Object.values(item as Record<string, unknown>).join(" ") : String(item))).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, inner]) => inner)
      .map(([key, inner]) => `${key}: ${String(inner)}`)
      .join(", ");
  }
  return String(value);
}

function Fields({ values }: { values: Record<string, unknown> }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {Object.entries(values).map(([key, value]) => (
        <div key={key}>
          <dt className="text-xs text-muted-foreground">{FIELD_LABELS[key] ?? key}</dt>
          <dd className="break-words text-foreground">{shown(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

// A post in a calendar the assistant planned, as the API checked it.
type PlannedPost = { scheduled_for: string; platform: string; format?: string; topic: string; angle?: string; description?: string; cta?: string };

const platformLabel = (platform: string) => PLATFORMS.find((item) => item.id === platform)?.label ?? platform;

/** The posts day by day, in the browser's time zone, in a box that scrolls (from the keyboard too). */
function PlannedPosts({ posts, label }: { posts: PlannedPost[]; label: string }) {
  const days = new Map<string, PlannedPost[]>();
  for (const post of [...posts].sort((a, b) => a.scheduled_for.localeCompare(b.scheduled_for))) {
    const key = dayKey(new Date(post.scheduled_for));
    days.set(key, [...(days.get(key) ?? []), post]);
  }
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label={label}
      className="max-h-96 overflow-y-auto rounded-lg border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <ol className="divide-y divide-border">
        {[...days].map(([key, dayPosts]) => (
          <li key={key} className="p-2.5">
            <p className="text-xs font-semibold text-foreground">{formatDayShort(new Date(dayPosts[0].scheduled_for))}</p>
            <ul className="mt-1.5 space-y-2">
              {dayPosts.map((post, index) => (
                <li key={index} className="text-sm">
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {formatTime(post.scheduled_for)} · {platformLabel(post.platform)}
                    {post.format ? ` · ${formatLabel(post.format)}` : ""}
                  </p>
                  <p className="font-medium text-pretty text-foreground">{post.topic}</p>
                  {post.angle && <p className="text-pretty text-secondary-foreground">{post.angle}</p>}
                  {post.description && <p className="text-pretty whitespace-pre-wrap text-muted-foreground">{post.description}</p>}
                  {post.cta && <p className="text-xs text-pretty text-muted-foreground">Call to action: {post.cta}</p>}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  );
}

function NewCalendar({ payload }: { payload: Record<string, unknown> }) {
  const posts = (payload.items as PlannedPost[]) ?? [];
  // A longer calendar comes as how many posts on each platform, drafted by Mindra after Apply.
  const drafted = posts.length ? null : ((payload.posts as Record<string, number> | undefined) ?? null);
  const total = drafted ? Object.values(drafted).reduce((sum, count) => sum + count, 0) : posts.length;
  const range = `${formatDayShort(new Date(`${String(payload.starts_on)}T12:00`))} to ${formatDayShort(new Date(`${String(payload.ends_on)}T12:00`))}`;
  return (
    <div className="space-y-2.5">
      <p className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{String(payload.name ?? "")}</span> · {range} · {total} {total === 1 ? "post" : "posts"}
        {payload.campaign_name ? ` · for ${String(payload.campaign_name)}` : ""}
      </p>
      {typeof payload.strategy === "string" && payload.strategy && <p className="text-sm text-pretty whitespace-pre-wrap text-secondary-foreground">{payload.strategy}</p>}
      {drafted ? (
        <>
          <ul className="grid gap-1 text-sm text-foreground sm:grid-cols-2">
            {Object.entries(drafted).map(([platform, count]) => (
              <li key={platform} className="flex justify-between gap-3 rounded-lg bg-secondary/60 px-2.5 py-1.5">
                <span>{platformLabel(platform)}</span>
                <span className="text-muted-foreground tabular-nums">{count} posts</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-pretty text-muted-foreground">
            Apply saves it, and Mindra drafts all {total} posts from this plan, a few days at a time. Then change anything and approve it on its page.
          </p>
        </>
      ) : (
        <>
          <PlannedPosts posts={posts} label="Posts in this calendar" />
          <p className="text-xs text-pretty text-muted-foreground">Apply saves it as a draft. You can change it, then approve it on its page.</p>
        </>
      )}
    </div>
  );
}

function CalendarChanges({ payload }: { payload: Record<string, unknown> }) {
  const add = (payload.add as PlannedPost[]) ?? [];
  const change = (payload.change as (Partial<PlannedPost> & { item_id: string; topic_before: string })[]) ?? [];
  const remove = (payload.remove as { item_id: string; topic: string }[]) ?? [];
  return (
    <div className="space-y-2.5 text-sm">
      <p className="text-xs text-muted-foreground">Changes to the draft of “{String(payload.calendar ?? "")}”</p>
      {add.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-foreground">Add</p>
          <PlannedPosts posts={add} label="Posts to add" />
        </div>
      )}
      {change.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground">Change</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-foreground">
            {change.map((item) => (
              <li key={item.item_id}>
                {item.topic_before}
                <span className="text-muted-foreground">
                  {": "}
                  {[
                    item.topic && item.topic !== item.topic_before ? `now “${item.topic}”` : "",
                    item.scheduled_for ? `moves to ${formatDayShort(new Date(item.scheduled_for))}, ${formatTime(item.scheduled_for)}` : "",
                    item.platform ? `on ${platformLabel(item.platform)}` : "",
                    item.format ? `as a ${formatLabel(item.format).toLowerCase()}` : "",
                    item.angle ? `angle: ${item.angle}` : "",
                    item.cta ? `call to action: ${item.cta}` : "",
                  ]
                    .filter(Boolean)
                    .join("; ") || "new details"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {remove.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground">Take out</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-foreground">
            {remove.map((item) => (
              <li key={item.item_id}>{item.topic}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Preview({ proposal }: { proposal: Proposal }) {
  const payload = proposal.payload;
  if (proposal.kind === "new_calendar") return <NewCalendar payload={payload} />;
  if (proposal.kind === "calendar") return <CalendarChanges payload={payload} />;
  if (proposal.kind === "post_text") {
    const platform = PLATFORMS.find((item) => item.id === payload.platform)?.label ?? "";
    return (
      <div className="space-y-2">
        {platform && <p className="text-xs text-muted-foreground">New text for the {platform} post</p>}
        {typeof payload.title === "string" && <p className="text-sm font-medium text-foreground">{payload.title}</p>}
        <p className="max-h-60 overflow-y-auto rounded-lg bg-secondary/60 p-3 text-sm whitespace-pre-wrap text-foreground">{String(payload.body ?? "")}</p>
      </div>
    );
  }
  if (proposal.kind === "brand_profile") {
    const changes = (payload.changes as Record<string, unknown>) ?? {};
    const offerings = (payload.add_offerings as { name: string; price?: string }[]) ?? [];
    return (
      <div className="space-y-2">
        {Object.keys(changes).length > 0 && <Fields values={changes} />}
        {offerings.length > 0 && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">Offerings to add</p>
            <ul className="list-disc pl-5 text-foreground">
              {offerings.map((item) => (
                <li key={item.name}>{item.price ? `${item.name}, ${item.price}` : item.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  const fields = (payload.fields as Record<string, unknown>) ?? {};
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{payload.campaign_id && payload.name ? `Changes to “${String(payload.name)}”` : "A new campaign"}</p>
      <Fields values={fields} />
    </div>
  );
}

function where(proposal: Proposal): { to: string; label: string } | null {
  const payload = proposal.payload;
  if (proposal.kind === "post_text" && payload.post_id) return { to: `/library/${String(payload.post_id)}`, label: "Open the post" };
  if (proposal.kind === "brand_profile") return { to: "/brand", label: "Open the brand profile" };
  if (proposal.kind === "campaign" && payload.campaign_id) return { to: `/campaigns/${String(payload.campaign_id)}`, label: "Open the campaign" };
  if ((proposal.kind === "calendar" || proposal.kind === "new_calendar") && payload.calendar_id) {
    return { to: `/content-calendar/${String(payload.calendar_id)}`, label: "Open the calendar" };
  }
  return null;
}

interface Props {
  proposal: Proposal;
  onDecide: (decision: "apply" | "discard") => void;
  deciding: boolean;
}

export default function ProposalCard({ proposal, onDecide, deciding }: Props) {
  const link = where(proposal);
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-xs font-medium tracking-wide text-primary uppercase">{proposal.kind_label}</p>
      <p className="mt-0.5 mb-3 text-sm font-semibold text-foreground">{proposal.title}</p>
      <Preview proposal={proposal} />

      {proposal.status === "proposed" ? (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={deciding} onClick={() => onDecide("apply")} className={buttonStyles({ size: "sm" })}>
            <Check aria-hidden="true" className="size-4" />
            Apply
          </button>
          <button type="button" disabled={deciding} onClick={() => onDecide("discard")} className={buttonStyles({ variant: "ghost", size: "sm" })}>
            <X aria-hidden="true" className="size-4" />
            Discard
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span
            role="status"
            className={cn(
              "font-medium",
              proposal.status === "applied" && "text-emerald-700",
              proposal.status === "failed" && "text-red-600",
              proposal.status === "discarded" && "text-muted-foreground",
            )}
          >
            {proposal.status === "applied" ? proposal.result || "Applied." : proposal.status === "failed" ? proposal.result : "Discarded."}
          </span>
          {proposal.status === "applied" && link && (
            <Link to={link.to} className="font-medium text-primary underline-offset-2 hover:underline">
              {link.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
