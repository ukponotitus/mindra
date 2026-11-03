import { useEffect, useRef, useState } from "react";
import { ExternalLink, MessageSquare, RefreshCw, Search, ThumbsUp } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import PlatformBadge from "../components/content/PlatformBadge";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { cn } from "../lib/cn";
import {
  COMMENTS_LATER,
  useComments,
  useCommentsChannel,
  useCommentsSummary,
  useMarkCommentsSeen,
  useRefreshComments,
} from "../lib/comments";
import { formatDate, initials } from "../lib/format";
import type { CommentsSummary, Platform, PostComment, PostCommentReply } from "../lib/types";

// Comments on the workspace's posts, like Facebook's Comments manager: newest first, what's new since the last look,
// filters, and a link to reply on the platform. Today YouTube's, for the channels someone turned comments on for.

const fieldClass =
  "h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden";
// Comments longer than this start folded, with "Show more".
const LONG_COMMENT = 280;
const PAGE_SIZE = 30;

function ago(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days < 7 ? `${days} d ago` : formatDate(iso);
}

function Avatar({ name, image }: { name: string; image: string }) {
  const [broken, setBroken] = useState(false);
  return image && !broken ? (
    <img src={image} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="size-9 shrink-0 rounded-full bg-secondary object-cover" />
  ) : (
    <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold text-muted-foreground">
      {initials(name)}
    </span>
  );
}

function CommentText({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > LONG_COMMENT;
  return (
    <div>
      <p className={cn("text-sm leading-relaxed break-words whitespace-pre-wrap text-secondary-foreground", long && !open && "line-clamp-4")}>{text}</p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="mt-1 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary"
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

function Byline({ comment }: { comment: PostCommentReply }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
      {comment.author.url ? (
        <a href={comment.author.url} target="_blank" rel="noreferrer" className="font-medium text-foreground hover:underline">
          {comment.author.name}
        </a>
      ) : (
        <span className="font-medium text-foreground">{comment.author.name}</span>
      )}
      {comment.by_owner && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Your channel</span>}
      <span className="text-xs text-muted-foreground">
        <time dateTime={comment.published_at} title={new Date(comment.published_at).toLocaleString()}>
          {ago(comment.published_at)}
        </time>
        {comment.edited && " · edited"}
      </span>
      {comment.is_new && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">New</span>}
    </div>
  );
}

function Likes({ likes }: { likes: number | null }) {
  if (!likes) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
      <ThumbsUp aria-hidden="true" className="size-3.5" />
      {likes.toLocaleString()}
      <span className="sr-only"> likes</span>
    </span>
  );
}

function Thread({ comment }: { comment: PostComment }) {
  const unread = comment.reply_count - comment.replies.length;
  const title = comment.post.video_title || comment.post.label;
  return (
    <article aria-label={`Comment by ${comment.author.name}`} className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
        <PlatformBadge platform={comment.post.platform} withLabel={false} />
        <span className="shrink-0">On</span>
        <Link to={`/library/${comment.post.id}`} className="min-w-0 truncate font-medium text-foreground hover:underline">
          {title}
        </Link>
      </div>
      <div className="flex gap-3">
        <Avatar name={comment.author.name} image={comment.author.image} />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Byline comment={comment} />
          <CommentText text={comment.text} />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Likes likes={comment.likes} />
            <a href={comment.url} target="_blank" rel="noreferrer" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              <ExternalLink aria-hidden="true" className="size-4" />
              Reply on YouTube
            </a>
          </div>
          {comment.replies.length > 0 && (
            <ul aria-label="Replies" className="mt-3 space-y-3 border-l-2 border-border pl-3 sm:pl-4">
              {comment.replies.map((reply) => (
                <li key={reply.id} className="flex gap-2.5">
                  <Avatar name={reply.author.name} image={reply.author.image} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Byline comment={reply} />
                    <CommentText text={reply.text} />
                    <Likes likes={reply.likes} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {unread > 0 && (
            <a href={comment.url} target="_blank" rel="noreferrer" className="inline-block pt-1 text-xs font-medium text-primary hover:underline">
              {unread} more {unread === 1 ? "reply" : "replies"} on YouTube
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

/** Each channel: turned on (with Turn off), or the opt-in that says what's read and kept. */
function Channels({ summary }: { summary: CommentsSummary }) {
  const toggle = useCommentsChannel();
  return (
    <div className="space-y-3">
      {summary.channels.map((channel) =>
        channel.reading ? (
          <div key={channel.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <PlatformBadge platform="youtube" withLabel={false} />
            <p className="min-w-0 flex-1 text-pretty text-foreground">
              Reading comments on <span className="font-medium">{channel.name}</span>
              {channel.turned_on_at && <span className="text-muted-foreground"> since {formatDate(channel.turned_on_at)}</span>}
            </p>
            <ConfirmDialog
              trigger={
                <button type="button" disabled={toggle.isPending} className={buttonStyles({ variant: "ghost", size: "sm" })}>
                  Turn off
                </button>
              }
              title={`Turn off comments for ${channel.name}?`}
              description="Mindra stops reading this channel's comments and deletes the ones it kept. You can turn them on again at any time."
              confirmLabel="Turn off and delete"
              onConfirm={() => toggle.mutate({ id: channel.id, reading: false })}
            />
          </div>
        ) : (
          <section key={channel.id} aria-labelledby={`channel-${channel.id}`} className="rounded-xl border border-border bg-card p-5">
            <h3 id={`channel-${channel.id}`} className="font-semibold text-balance text-foreground">
              Read the comments on {channel.name}?
            </h3>
            <p className="mt-2 text-sm text-pretty text-muted-foreground">
              Mindra reads the comments on the videos it posts to this channel or finds there: each comment's words, the
              commenter's name, picture and channel link, its likes and when it was posted. It keeps them for up to 30 days
              after it last reads them, deletes them when you turn this off or disconnect the channel, and doesn't send them
              to the assistant or any AI. You reply on YouTube.
            </p>
            <button
              type="button"
              onClick={() => toggle.mutate({ id: channel.id, reading: true })}
              disabled={toggle.isPending || channel.status !== "active"}
              className={buttonStyles({ className: "mt-4" })}
            >
              {toggle.isPending ? "Turning on…" : "Turn on comments"}
            </button>
            {channel.status !== "active" && (
              <p className="mt-2 text-sm text-pretty text-amber-700">
                Reconnect this channel in <Link to="/settings#accounts" className="font-medium underline">Settings</Link> first.
              </p>
            )}
          </section>
        ),
      )}
      {toggle.isError && (
        <p role="alert" className="text-sm text-pretty text-red-600">
          {toggle.error.message}
        </p>
      )}
    </div>
  );
}

export default function Comments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const post = searchParams.get("post") ?? "";
  const platform = (searchParams.get("platform") ?? "") as Platform | "";
  const search = searchParams.get("search") ?? "";
  const fresh = searchParams.get("new") === "true";
  const unanswered = searchParams.get("unanswered") === "true";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [searchInput, setSearchInput] = useState(search);

  const summary = useCommentsSummary();
  const refresh = useRefreshComments();
  const markSeen = useMarkCommentsSeen();
  // The visit before this one, kept while the page is open so this visit's "New" marks stay.
  const [since, setSince] = useState<string | null>(null);
  useEffect(() => {
    if (since === null && summary.data) setSince(summary.data.seen_at ?? "none");
  }, [since, summary.data]);

  const filters = { post, platform, search, fresh, unanswered, page, since: since ?? undefined };
  const comments = useComments(filters, since !== null);
  // Each time the list is shown, what's in it has been seen (the marks stay for this visit, from `since`).
  const { mutate: noteSeen } = markSeen;
  useEffect(() => {
    if (comments.dataUpdatedAt) noteSeen();
  }, [comments.dataUpdatedAt, noteSeen]);

  // When a read finishes (the summary's last read moves on), show what it found.
  const lastRead = useRef<string | null | undefined>(undefined);
  const { refetch } = comments;
  const readAt = summary.data?.last_read_at;
  const busy = Boolean(summary.data?.refreshing);
  useEffect(() => {
    if (readAt === undefined || busy) return;
    if (lastRead.current !== undefined && lastRead.current !== readAt) refetch();
    lastRead.current = readAt;
  }, [readAt, busy, refetch]);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    if (searchInput === search) return;
    const id = window.setTimeout(() => update({ search: searchInput.trim() }), 300);
    return () => window.clearTimeout(id);
  });

  const data = summary.data;
  const reading = data?.channels.some((channel) => channel.reading) ?? false;
  const refreshing = Boolean(data?.refreshing) || refresh.isPending;
  const waitUntil = data?.next_refresh_at ? new Date(data.next_refresh_at) : null;
  const filtered = Boolean(post || platform || search || fresh || unanswered);
  const results = comments.data?.results ?? [];
  // New in what's shown, since the visit before this one (the stored last look moves on as the list is seen).
  const newHere = results.reduce((sum, item) => sum + Number(item.is_new) + item.replies.filter((reply) => reply.is_new).length, 0);
  const pages = Math.max(1, Math.ceil((comments.data?.count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-balance text-foreground">Comments</h2>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            What people say on your posts, newest first.{" "}
            {newHere > 0 ? `${newHere} new since you last looked.` : "Reply to them on YouTube."}
          </p>
        </div>
        {reading && (
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => refresh.mutate()}
              disabled={refreshing || (waitUntil !== null && waitUntil > new Date())}
              className={buttonStyles({ variant: "secondary" })}
            >
              <RefreshCw aria-hidden="true" className={cn("size-4", refreshing && "animate-spin")} />
              {refreshing ? "Reading comments…" : "Refresh"}
            </button>
            {data?.last_read_at && !refreshing && <p className="text-xs text-muted-foreground">Read {ago(data.last_read_at)}</p>}
          </div>
        )}
      </div>

      {summary.isPending && <div className="h-32 animate-pulse rounded-xl bg-secondary" />}
      {summary.isError && (
        <p role="alert" className="text-sm text-red-600">
          {summary.error.message}
        </p>
      )}

      {data && !data.connected && (
        <EmptyState
          icon={MessageSquare}
          title="Connect your YouTube channel"
          description="Comments on your YouTube posts show here once your channel is connected and you turn comments on for it."
          action={
            <Link to="/settings#accounts" className={buttonStyles()}>
              Connect an account
            </Link>
          }
        />
      )}

      {data && data.connected && <Channels summary={data} />}

      {(refresh.isError || data?.refresh_error || data?.paused) && (
        <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-pretty text-amber-900">
          {refresh.isError
            ? refresh.error.message
            : data?.paused
              ? "YouTube's daily allowance for Mindra is used up. Comments are read again tomorrow."
              : data?.refresh_error}
        </p>
      )}

      {data && (data.total > 0 || filtered) && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-full sm:basis-56">
            <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="comments-search" className="sr-only">
              Search comments
            </label>
            <input
              id="comments-search"
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search comments or names…"
              className={cn(fieldClass, "w-full pl-9 placeholder:text-muted-foreground")}
            />
          </div>
          <label htmlFor="comments-post" className="sr-only">
            Post
          </label>
          <select
            id="comments-post"
            value={post}
            onChange={(e) => update({ post: e.target.value })}
            className={cn(fieldClass, "min-w-0 flex-1 basis-40 sm:max-w-64 sm:flex-none sm:basis-auto")}
          >
            <option value="">All posts</option>
            {data.posts.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label} ({option.count})
              </option>
            ))}
          </select>
          {data.platforms.length > 1 && (
            <>
              <label htmlFor="comments-platform" className="sr-only">
                Platform
              </label>
              <select
                id="comments-platform"
                value={platform}
                onChange={(e) => update({ platform: e.target.value })}
                className={cn(fieldClass, "min-w-0 flex-1 basis-32 sm:flex-none sm:basis-auto")}
              >
                <option value="">All platforms</option>
                {data.platforms.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </>
          )}
          <button
            type="button"
            aria-pressed={fresh}
            onClick={() => update({ new: fresh ? "" : "true" })}
            className={buttonStyles({ variant: "secondary", className: cn(fresh && "border-primary bg-primary/10 text-primary") })}
          >
            New
          </button>
          <button
            type="button"
            aria-pressed={unanswered}
            onClick={() => update({ unanswered: unanswered ? "" : "true" })}
            className={buttonStyles({ variant: "secondary", className: cn(unanswered && "border-primary bg-primary/10 text-primary") })}
          >
            Not replied to
          </button>
        </div>
      )}

      {data && reading && data.total === 0 && !filtered && !refreshing && (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description={
            data.followed_posts > 0
              ? "Mindra reads them a few times in the month after each post goes out. Press Refresh to read them now."
              : "Comments show here for the videos Mindra posts to your channel, or finds there after you mark them as posted."
          }
        />
      )}

      {results.length > 0 && (
        <div className="space-y-3">
          {results.map((comment) => (
            <Thread key={comment.id} comment={comment} />
          ))}
        </div>
      )}
      {filtered && comments.data && results.length === 0 && (
        <EmptyState
          icon={Search}
          title="No comments match these filters"
          description="Try another post, or clear the search."
          action={
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearchParams({}, { replace: true });
              }}
              className={buttonStyles()}
            >
              Clear filters
            </button>
          }
        />
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3">
          <button type="button" disabled={page <= 1} onClick={() => update({ page: String(page - 1) })} className={buttonStyles({ variant: "secondary" })}>
            Previous
          </button>
          <span className="text-sm text-muted-foreground tabular-nums">
            Page {page} of {pages}
          </span>
          <button type="button" disabled={page >= pages} onClick={() => update({ page: String(page + 1) })} className={buttonStyles({ variant: "secondary" })}>
            Next
          </button>
        </nav>
      )}

      <p className="text-sm text-pretty text-muted-foreground">
        {COMMENTS_LATER.slice(0, -1).join(", ")} and {COMMENTS_LATER.at(-1)}: their comments show here once each platform
        approves Mindra to read them.
      </p>
    </div>
  );
}
