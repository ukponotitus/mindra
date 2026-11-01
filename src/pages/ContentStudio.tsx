import { useEffect, useState, type ReactNode } from "react";
import { Check, Clapperboard, ImagePlus, LoaderCircle, PenLine } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import PlatformBadge from "../components/content/PlatformBadge";
import SeePlans from "../components/SeePlans";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { formatLabel } from "../lib/calendars";
import { cn } from "../lib/cn";
import { studioVideoLink, useApprovePost, useMakeAll, useMakePost, useStudioQueue, type StudioItem } from "../lib/studioQueue";

// The Content Studio (Phase 5): every approved brief, with its post made from it, reviewed and approved. Approved posts
// are planned at their time in the Planner and go out by themselves or with a reminder.

function when(item: StudioItem) {
  return new Date(item.scheduled_for).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

const GROUPS: { id: string; title: string; hint: string; statuses: string[] }[] = [
  { id: "make", title: "Ready to make", hint: "Their briefs are approved. Mindra writes each post from its brief.", statuses: ["plan_approved"] },
  { id: "production", title: "In production", hint: "Written, and waiting for what their format needs: photos or a video.", statuses: ["in_production"] },
  { id: "review", title: "Ready for review", hint: "Read each post, change it in the editor if you like, and approve it.", statuses: ["ready"] },
  { id: "approved", title: "Approved", hint: "Planned at their time in the Planner. Changing one sends it back for review.", statuses: ["content_approved"] },
];

const SCHEDULE_WORDS: Record<string, string> = {
  planned: "Planned",
  reminded: "Reminded",
  posted: "Posted",
  publishing: "Posting…",
  published: "Published",
  failed: "Couldn't post",
  missed: "Missed",
};

function Card({ item, chosen }: { item: StudioItem; chosen: boolean }) {
  const make = useMakePost();
  const approve = useApprovePost();
  const [error, setError] = useState<unknown>(null);

  const run = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      await work();
    } catch (caught) {
      setError(caught);
    }
  };

  const busy = make.isPending || item.writing;
  let actions: ReactNode = null;
  if (item.writing) {
    actions = (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
        Writing the post. You can leave this page: it carries on.
      </p>
    );
  } else if (item.status === "plan_approved") {
    actions = (
      <button type="button" onClick={() => run(() => make.mutateAsync(item.id))} disabled={busy} className={buttonStyles({ size: "sm" })}>
        {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <PenLine aria-hidden="true" className="size-4" />}
        {item.post_error ? "Try again" : "Make the post"}
      </button>
    );
  } else if (item.post) {
    actions = (
      <>
        <Link to={`/library/${item.post.id}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          {item.missing === "photos" ? <ImagePlus aria-hidden="true" className="size-4" /> : <PenLine aria-hidden="true" className="size-4" />}
          {item.missing === "photos" ? "Add photos" : item.missing === "video" ? "Add a video" : "Open the post"}
        </Link>
        {item.missing === "video" && (
          <Link to={studioVideoLink(item)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <Clapperboard aria-hidden="true" className="size-4" />
            Make it in Motion Studio
          </Link>
        )}
        {(item.status === "ready" || item.status === "in_production") && (
          <button type="button" onClick={() => run(() => make.mutateAsync(item.id))} disabled={busy} className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Write it again
          </button>
        )}
        {item.status === "ready" && (
          <button type="button" onClick={() => run(() => approve.mutateAsync(item.id))} disabled={approve.isPending} className={buttonStyles({ size: "sm" })}>
            <Check aria-hidden="true" className="size-4" />
            Approve
          </button>
        )}
      </>
    );
  }

  return (
    <li id={`item-${item.id}`} className={cn("scroll-mt-20 rounded-xl border bg-card p-4", chosen ? "border-primary ring-2 ring-primary/20" : "border-border")}>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">{when(item)}</span>
        <PlatformBadge platform={item.platform} />
        <span>{formatLabel(item.format)}</span>
        <span className="truncate">· {item.calendar_name}</span>
        {item.post && item.status === "content_approved" && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{SCHEDULE_WORDS[item.post.schedule_status] ?? "Approved"}</span>
        )}
      </div>
      <p className="mt-1.5 font-medium text-foreground">{item.topic}</p>
      {item.brief?.hook && !item.post && <p className="mt-1 text-sm text-muted-foreground">Hook: {item.brief.hook}</p>}
      {item.post && <p className="mt-2 line-clamp-4 rounded-lg bg-secondary/60 p-3 text-sm whitespace-pre-wrap text-foreground">{item.post.body}</p>}
      {item.missing && (
        <p className="mt-2 text-sm text-amber-800">
          A {formatLabel(item.format).toLowerCase()} needs {item.missing === "photos" ? "photos" : "a video"}: add {item.missing === "photos" ? "them" : "it"} in the post editor (from your
          uploads{item.missing === "photos" ? " or as AI pictures" : ""}){item.missing === "video" ? ", or make it in Motion Studio" : ""}.
        </p>
      )}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      {/* The last try on the server failed: why, until the next try. */}
      {item.post_error && !item.writing && (
        <p className="mt-2 text-sm text-pretty text-red-600">
          Couldn't write this post: {item.post_error} <SeePlans text={item.post_error} />
        </p>
      )}
      {Boolean(error) && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error instanceof ApiError ? error.message : "Something went wrong. Try again."} <SeePlans error={error} />
        </p>
      )}
    </li>
  );
}

export default function ContentStudio() {
  const queue = useStudioQueue();
  const items = queue.data ?? [];
  const makeAll = useMakeAll();
  // ?item=<id>: the one opened from its plan, shown and marked.
  const [params] = useSearchParams();
  const chosen = params.get("item");
  const found = items.some((item) => item.id === chosen);
  useEffect(() => {
    if (found) document.getElementById(`item-${chosen}`)?.scrollIntoView({ block: "center" });
  }, [found, chosen]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Content studio</h2>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
          Every approved brief from your content calendars. Mindra writes each post from its brief; you add photos or a video where its
          format needs them, review it and approve it. Only approved posts go out, at their time in the Planner.
        </p>
      </div>
      {queue.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <PenLine aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium text-foreground">Nothing to make yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Approve a content calendar, then its plan: each approved brief shows up here.</p>
          <Link to="/content-calendar" className={buttonStyles({ className: "mt-5" })}>
            Open the content calendar
          </Link>
        </div>
      ) : (
        GROUPS.map((group) => {
          const list = items.filter((item) => group.statuses.includes(item.status));
          if (list.length === 0) return null;
          return (
            <section key={group.id} aria-labelledby={`studio-${group.id}`}>
              <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 id={`studio-${group.id}`} className="font-semibold text-foreground">
                    {group.title} <span className="text-sm font-normal text-muted-foreground tabular-nums">({list.length})</span>
                  </h3>
                  <p className="text-sm text-muted-foreground">{group.hint}</p>
                </div>
                {group.id === "make" && list.some((item) => !item.writing) && (
                  <button type="button" onClick={() => makeAll.mutate()} disabled={makeAll.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                    {makeAll.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <PenLine aria-hidden="true" className="size-4" />}
                    Make all {list.filter((item) => !item.writing).length} posts
                  </button>
                )}
              </div>
              {group.id === "make" && makeAll.isError && (
                <p role="alert" className="mb-3 text-sm text-pretty text-red-600">
                  {makeAll.error.message} <SeePlans error={makeAll.error} />
                </p>
              )}
              <ul className="grid gap-3 md:grid-cols-2">
                {list.map((item) => (
                  <Card key={item.id} item={item} chosen={item.id === chosen} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}
