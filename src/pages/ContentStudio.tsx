import { useEffect, useRef, useState, type ReactNode } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { Check, Clapperboard, ImagePlus, LayoutTemplate, LoaderCircle, PenLine, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import GraphicEditor from "../components/content/GraphicEditor";
import PlatformBadge from "../components/content/PlatformBadge";
import SeePlans from "../components/SeePlans";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { formatLabel } from "../lib/calendars";
import { cn } from "../lib/cn";
import {
  inProgress,
  useApprovePost,
  useMakeAll,
  useMakeItemGraphic,
  useMakeItemVideo,
  useMakePost,
  useRemoveItems,
  useStudioQueue,
  type StudioItem,
} from "../lib/studioQueue";

// The Content Studio (Phase 5): every approved brief, with its post made from it, reviewed and approved. Approved posts
// are planned at their time in the Planner and go out by themselves or with a reminder. Each stage is a tab (`?tab=`), and
// anything can be removed for good, one at a time or a whole tab.

function when(item: StudioItem) {
  return new Date(item.scheduled_for).toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

const GROUPS: { id: string; title: string; hint: string; empty: string; statuses: string[] }[] = [
  {
    id: "make",
    title: "Ready to make",
    hint: "Their briefs are approved. Mindra writes each post from its brief.",
    empty: "Nothing is waiting to be made. Briefs show up here as soon as they're approved.",
    statuses: ["plan_approved"],
  },
  {
    id: "production",
    title: "In production",
    hint: "Written, and waiting for what their format needs: pictures or a video, which Mindra can make from the brief.",
    empty: "Nothing is waiting for pictures or a video.",
    statuses: ["in_production"],
  },
  {
    id: "review",
    title: "Ready for review",
    hint: "Read each post, change it in the editor if you like, and approve it.",
    empty: "Nothing is waiting for your review.",
    statuses: ["ready"],
  },
  {
    id: "approved",
    title: "Approved",
    hint: "Planned at their time in the Planner. Changing one sends it back for review.",
    empty: "No approved posts are waiting to go out.",
    statuses: ["content_approved"],
  },
];

function groupOf(item: StudioItem) {
  return GROUPS.find((group) => group.statuses.includes(item.status))?.id;
}

const SCHEDULE_WORDS: Record<string, string> = {
  planned: "Planned",
  reminded: "Reminded",
  posted: "Posted",
  publishing: "Posting…",
  published: "Published",
  failed: "Couldn't post",
  missed: "Missed",
};

const spinner = <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />;

/** Where the server is with the item's graphic or video, while it works on it. */
function Working({ item }: { item: StudioItem }) {
  let words = "";
  if (item.writing) words = "Writing the post.";
  else if (item.graphic?.working) words = item.graphic.status === "writing" ? "Writing the words of the graphic." : "Drawing the graphic.";
  else if (item.video?.stage === "drafting") words = "Planning the video with AI.";
  else if (item.video?.stage === "rendering") words = `Making the video: ${item.video.progress}%.`;
  if (!words) return null;
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
      {spinner}
      {words} You can leave this page: it carries on.
    </p>
  );
}

function Card({ item, chosen }: { item: StudioItem; chosen: boolean }) {
  const make = useMakePost();
  const approve = useApprovePost();
  const makeGraphic = useMakeItemGraphic();
  const makeVideo = useMakeItemVideo();
  const remove = useRemoveItems();
  const [error, setError] = useState<unknown>(null);
  const [editing, setEditing] = useState(false);

  const run = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      await work();
    } catch (caught) {
      setError(caught);
    }
  };

  const working = inProgress(item);
  const busy = make.isPending || makeGraphic.isPending || makeVideo.isPending || working;
  const pictures = item.format === "image" || item.format === "carousel";
  const videoFormat = item.format === "short_video" || item.format === "video";
  const video = item.video;
  let actions: ReactNode = null;
  if (working) {
    actions = <Working item={item} />;
  } else if (item.status === "plan_approved") {
    actions = (
      <button type="button" onClick={() => run(() => make.mutateAsync(item.id))} disabled={busy} className={buttonStyles({ size: "sm" })}>
        {make.isPending ? spinner : <PenLine aria-hidden="true" className="size-4" />}
        {item.post_error ? "Try again" : "Make the post"}
      </button>
    );
  } else if (item.post) {
    actions = (
      <>
        {pictures && item.missing === "photos" && !item.graphic && (
          <button type="button" onClick={() => run(() => makeGraphic.mutateAsync(item.id))} disabled={busy} className={buttonStyles({ size: "sm" })}>
            {makeGraphic.isPending ? spinner : <LayoutTemplate aria-hidden="true" className="size-4" />}
            {item.format === "carousel" ? "Make the slides" : "Make the graphic"}
          </button>
        )}
        {item.graphic && (
          <button type="button" onClick={() => setEditing(true)} className={buttonStyles({ variant: item.missing ? "primary" : "secondary", size: "sm" })}>
            <LayoutTemplate aria-hidden="true" className="size-4" />
            {item.graphic.status === "failed" ? "Try the graphic again" : item.format === "carousel" ? "Change the slides" : "Change the graphic"}
          </button>
        )}
        {videoFormat && item.missing === "video" && (!video || video.stage === "failed") && (
          <button type="button" onClick={() => run(() => makeVideo.mutateAsync(item.id))} disabled={busy} className={buttonStyles({ size: "sm" })}>
            {makeVideo.isPending ? spinner : <Clapperboard aria-hidden="true" className="size-4" />}
            {video ? "Try again" : "Make the video"}
          </button>
        )}
        {video && (video.stage === "waiting" || video.stage === "ready" || video.stage === "failed") && (
          <Link to={`/studio/${video.project}`} className={buttonStyles({ variant: video.stage === "waiting" ? "primary" : "secondary", size: "sm" })}>
            <Clapperboard aria-hidden="true" className="size-4" />
            Open in Motion Studio
          </Link>
        )}
        <Link to={`/library/${item.post.id}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          {item.missing === "photos" ? <ImagePlus aria-hidden="true" className="size-4" /> : <PenLine aria-hidden="true" className="size-4" />}
          {item.missing === "photos" ? "Add photos" : item.missing === "video" ? "Add a video" : "Open the post"}
        </Link>
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
      <div className="flex items-start gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{when(item)}</span>
          <PlatformBadge platform={item.platform} />
          <span>{formatLabel(item.format)}</span>
          <span className="truncate">· {item.calendar_name}</span>
          {item.post && item.status === "content_approved" && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700">{SCHEDULE_WORDS[item.post.schedule_status] ?? "Approved"}</span>
          )}
        </div>
        {!working && (
          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={remove.isPending}
                aria-label={`Remove “${item.topic}”`}
                title="Remove"
                className="-mt-1 -mr-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-red-600 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
              >
                {remove.isPending ? spinner : <Trash2 aria-hidden="true" className="size-4" />}
              </button>
            }
            title="Remove this from the Content Studio?"
            description={
              item.status === "content_approved"
                ? `“${item.topic}” leaves its content calendar, and its approved post is deleted, so it leaves the Planner and won't go out. This can't be undone.`
                : item.post
                  ? `“${item.topic}” leaves its content calendar, and the post written for it is deleted. This can't be undone.`
                  : `“${item.topic}” and its brief leave the content calendar. This can't be undone.`
            }
            confirmLabel="Remove"
            onConfirm={() => run(() => remove.mutateAsync([item.id]))}
          />
        )}
      </div>
      <p className="mt-1.5 font-medium text-foreground">{item.topic}</p>
      {item.brief?.hook && !item.post && <p className="mt-1 text-sm text-muted-foreground">Hook: {item.brief.hook}</p>}
      {item.post && <p className="mt-2 line-clamp-4 rounded-lg bg-secondary/60 p-3 text-sm whitespace-pre-wrap text-foreground">{item.post.body}</p>}
      {item.missing && !working && (
        <p className="mt-2 text-sm text-pretty text-amber-800">
          {item.missing === "photos"
            ? `A ${formatLabel(item.format).toLowerCase()} needs pictures: Mindra can make ${item.format === "carousel" ? "the slides" : "a graphic"} from the brief in your brand colours, or add your own photos in the post editor.`
            : `A ${formatLabel(item.format).toLowerCase()} needs a video: Mindra can make it from the brief and your photos and clips in Motion Studio, or add your own in the post editor.`}
        </p>
      )}
      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
      {/* The last try on the server failed: why, until the next try. */}
      {item.post_error && !item.writing && (
        <p className="mt-2 text-sm text-pretty text-red-600">
          Couldn't write this post: {item.post_error} <SeePlans text={item.post_error} />
        </p>
      )}
      {item.graphic?.error && !item.graphic.working && (
        <p className="mt-2 text-sm text-pretty text-red-600">
          {item.graphic.status === "failed" ? "Couldn't make the graphic: " : ""}
          {item.graphic.error} <SeePlans text={item.graphic.error} />
        </p>
      )}
      {video?.error && (video.stage === "failed" || video.stage === "waiting") && (
        <p className={cn("mt-2 text-sm text-pretty", video.stage === "failed" ? "text-red-600" : "text-amber-800")}>
          {video.stage === "failed" ? "Couldn't make the video: " : ""}
          {video.error}
        </p>
      )}
      {Boolean(error) && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error instanceof ApiError ? error.message : "Something went wrong. Try again."} <SeePlans error={error} />
        </p>
      )}
      {item.post && (
        <GraphicEditor
          open={editing}
          onOpenChange={setEditing}
          piece={{ id: item.post.id }}
          startTemplate={item.format === "carousel" ? "carousel" : undefined}
        />
      )}
    </li>
  );
}

export default function ContentStudio() {
  const queue = useStudioQueue();
  const items = queue.data ?? [];
  const makeAll = useMakeAll();
  const removeAll = useRemoveItems();
  // ?item=<id>: the one opened from its plan, shown and marked; its tab is open, and follows it as it moves on.
  // ?tab=: the tab someone chose. Otherwise the first tab with something in it, as the page loaded.
  const [params, setParams] = useSearchParams();
  const chosen = params.get("item");
  const chosenItem = items.find((item) => item.id === chosen);
  const firstFilled = useRef<string | null>(null);
  if (queue.data && firstFilled.current === null) {
    firstFilled.current = GROUPS.find((group) => items.some((item) => group.statuses.includes(item.status)))?.id ?? "make";
  }
  const asked = GROUPS.find((group) => group.id === params.get("tab"))?.id;
  const tab = asked ?? (chosenItem && groupOf(chosenItem)) ?? firstFilled.current ?? "make";
  const found = Boolean(chosenItem);
  useEffect(() => {
    if (found) document.getElementById(`item-${chosen}`)?.scrollIntoView({ block: "center" });
  }, [found, chosen, tab]);
  const choose = (value: string) => {
    removeAll.reset();
    makeAll.reset();
    setParams({ tab: value }, { replace: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Content studio</h2>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
          Every approved brief from your content calendars. Mindra writes each post from its brief, and can make its graphic, carousel
          slides or video too; you review it and approve it. Only approved posts go out, at their time in the Planner.
        </p>
      </div>
      {queue.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : queue.isError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-pretty text-red-800">
          Couldn't load the Content Studio: {queue.error.message}{" "}
          <button type="button" onClick={() => queue.refetch()} className="font-medium underline">
            Try again
          </button>
        </div>
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
        <Tabs.Root value={tab} onValueChange={(value) => choose(String(value))}>
          <Tabs.List aria-label="Content studio" className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1">
            {GROUPS.map((group) => (
              <Tabs.Tab
                key={group.id}
                value={group.id}
                className="shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary data-[active]:bg-card data-[active]:text-foreground data-[active]:shadow-sm"
              >
                {group.title}{" "}
                <span className="ml-1 font-normal text-muted-foreground tabular-nums">{items.filter((item) => group.statuses.includes(item.status)).length}</span>
              </Tabs.Tab>
            ))}
          </Tabs.List>
          {GROUPS.map((group) => {
            const list = items.filter((item) => group.statuses.includes(item.status));
            const toMake = list.filter((item) => !item.writing).length;
            const removable = list.filter((item) => !inProgress(item));
            return (
              <Tabs.Panel key={group.id} value={group.id} className="outline-none">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-pretty text-muted-foreground">{group.hint}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.id === "make" && toMake > 0 && (
                      <button type="button" onClick={() => makeAll.mutate()} disabled={makeAll.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                        {makeAll.isPending ? spinner : <PenLine aria-hidden="true" className="size-4" />}
                        Make all {toMake} posts
                      </button>
                    )}
                    {/* Approved posts are planned to go out, so those are removed one at a time. */}
                    {group.id !== "approved" && removable.length > 1 && (
                      <ConfirmDialog
                        trigger={
                          <button type="button" disabled={removeAll.isPending} className={buttonStyles({ variant: "danger-outline", size: "sm" })}>
                            {removeAll.isPending ? spinner : <Trash2 aria-hidden="true" className="size-4" />}
                            Remove all {removable.length}
                          </button>
                        }
                        title={`Remove all ${removable.length} from “${group.title}”?`}
                        description={
                          group.id === "make"
                            ? "They and their briefs leave their content calendars. This can't be undone."
                            : "They leave their content calendars, and the posts written for them are deleted. This can't be undone."
                        }
                        confirmLabel={`Remove all ${removable.length}`}
                        onConfirm={() => removeAll.mutate(removable.map((item) => item.id))}
                      />
                    )}
                  </div>
                </div>
                {group.id === "make" && makeAll.isError && (
                  <p role="alert" className="mb-3 text-sm text-pretty text-red-600">
                    {makeAll.error.message} <SeePlans error={makeAll.error} />
                  </p>
                )}
                {removeAll.isError && (
                  <p role="alert" className="mb-3 text-sm text-pretty text-red-600">
                    {removeAll.error.message}
                  </p>
                )}
                {removeAll.data && (
                  <p role="status" className="mb-3 text-sm text-pretty text-muted-foreground">
                    Removed {removeAll.data.removed}.{removeAll.data.skipped > 0 && ` ${removeAll.data.skipped} left: ${removeAll.data.detail}`}
                  </p>
                )}
                {list.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">{group.empty}</p>
                ) : (
                  <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {list.map((item) => (
                      <Card key={item.id} item={item} chosen={item.id === chosen} />
                    ))}
                  </ul>
                )}
              </Tabs.Panel>
            );
          })}
        </Tabs.Root>
      )}
    </div>
  );
}
