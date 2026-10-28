import { useId, useState } from "react";
import { Check, LoaderCircle, PenLine, RotateCw, Trash2, Undo2 } from "lucide-react";
import { Link } from "react-router";
import PublishStatus from "../calendar/PublishStatus";
import ScheduleChip from "../calendar/ScheduleChip";
import { ClipStrip, PostPhotos } from "../content/ContentCard";
import PlatformBadge from "../content/PlatformBadge";
import SeePlans from "../SeePlans";
import ConfirmDialog from "../ui/ConfirmDialog";
import { buttonStyles } from "../ui/button";
import { formatTime, scheduleStatus } from "../../lib/calendar";
import { clipFrame } from "../../lib/clips";
import { cn } from "../../lib/cn";
import { isPicturePost } from "../../lib/projects";
import { formatLabel, useEntryAction } from "../../lib/plans";
import type { ContentPiece, PlanEntry, Project } from "../../lib/types";
import EntryForm from "./EntryForm";

interface Props {
  planId: string;
  entry: PlanEntry;
  projects: Project[];
  projectsLoading: boolean;
  /** False while the plan is read again: nothing can be written then. */
  planReady: boolean;
  /** Why "Approve all" couldn't approve it just now. */
  skipped?: string;
}

/** Where the post stands, for its chip. */
function entryState(entry: PlanEntry): { label: string; className: string; busy?: boolean } {
  if (entry.gone_out) {
    const status = entry.piece ? scheduleStatus(entry.piece) : null;
    return status === "publishing"
      ? { label: "Posting", className: "bg-primary/10 text-primary", busy: true }
      : { label: "Posted", className: "bg-emerald-50 text-emerald-700" };
  }
  if (entry.approved) return { label: "Approved", className: "bg-emerald-50 text-emerald-700" };
  switch (entry.status) {
    case "writing":
      return { label: "Writing", className: "bg-primary/10 text-primary", busy: true };
    case "written":
      return { label: "Written", className: "bg-secondary text-foreground" };
    case "needs":
      return { label: "Needs you", className: "bg-amber-50 text-amber-800" };
    case "failed":
      return { label: "Couldn't write it", className: "bg-red-50 text-red-700" };
    default:
      return { label: "Not written", className: "bg-secondary text-muted-foreground" };
  }
}

/** What the post is written from, in words. */
function sourceText(entry: PlanEntry): string {
  if (entry.format === "text") return "Written from the plan's note";
  if (entry.source_name) return entry.clip ? `A clip from ${entry.source_name}` : `From ${entry.source_name}`;
  if (entry.format === "recording") return "From the newest recording";
  if (entry.format === "clip") return "A clip from the newest video recording";
  return "";
}

/** The written post: its clip or pictures, its text, and once approved, when and how it goes out. */
function Draft({ piece, approved }: { piece: ContentPiece; approved: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();
  const clip = piece.clip;
  const videoReady = Boolean(clip && clip.status === "ready" && clip.video_url && !clip.is_stale);
  const photos = piece.photos ?? [];
  const long = piece.body.length > 280 || piece.body.split("\n").length > 6;
  const reminderOnly = approved && piece.scheduled_at && !piece.publish_to && scheduleStatus(piece) === "planned";

  return (
    <div className="mt-3 rounded-lg border border-border bg-background p-3.5">
      {videoReady && clip && (
        <div className="mb-3 overflow-hidden rounded-lg bg-black">
          <video
            src={clip.video_url ?? undefined}
            poster={clip.thumbnail_url ?? undefined}
            controls
            playsInline
            preload="none"
            aria-label={`Clip: ${clip.title}`}
            className={cn("mx-auto block bg-black", clipFrame(clip.shape, "aspect-[9/16] h-64"))}
          />
        </div>
      )}
      {!videoReady && photos.length > 0 && (
        <div className="mb-3 max-w-72">
          <PostPhotos photos={photos} project={isPicturePost(piece.project_source_type) ? piece.project : null} />
        </div>
      )}
      {piece.title && <p className="mb-1 truncate text-xs font-medium text-muted-foreground">{piece.title}</p>}
      <p id={bodyId} className={cn("text-sm leading-relaxed whitespace-pre-wrap text-gray-700", !expanded && "line-clamp-5")}>
        {piece.body}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="mt-1.5 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}
      {clip && !videoReady && <ClipStrip clip={clip} project={piece.project} />}
      {piece.scheduled_at && <ScheduleChip piece={piece} className="mt-3 flex w-fit" />}
      <PublishStatus piece={piece} className="mt-2" />
      {reminderOnly && <p className="mt-2 text-xs text-pretty text-muted-foreground">Mindra reminds you to post it at its time.</p>}
    </div>
  );
}

/** One post of a plan: when, where, what, its draft once written, and what to do next. */
export default function EntryCard({ planId, entry, projects, projectsLoading, planReady, skipped }: Props) {
  const [editing, setEditing] = useState(false);
  const action = useEntryAction(planId);
  const state = entryState(entry);
  const writing = entry.status === "writing";
  const busy = action.isPending || writing;
  const from = sourceText(entry);
  // The plan's own words for what's wrong come first; the list repeats none of them.
  const problems = entry.problems.filter((problem) => problem !== entry.problem);
  const showSkipped = skipped && skipped !== entry.problem && !entry.problems.includes(skipped);
  const canApprove = entry.status === "written" && entry.problems.length === 0;
  const pending = action.isPending ? action.variables?.action : undefined;

  return (
    <article className="min-w-0 rounded-xl border border-border bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {entry.scheduled_at ? formatTime(entry.scheduled_at) : "No time yet"}
        </span>
        {entry.platform ? <PlatformBadge platform={entry.platform} /> : <span className="text-sm text-amber-700">No platform yet</span>}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">{formatLabel(entry.format)}</span>
        <span className={cn("ml-auto inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium", state.className)}>
          {state.busy && <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />}
          {state.label}
        </span>
      </div>

      {editing ? (
        <div className="mt-4 border-t border-border pt-4">
          <EntryForm planId={planId} entry={entry} projects={projects} projectsLoading={projectsLoading} onDone={() => setEditing(false)} />
        </div>
      ) : (
        <>
          <p className="mt-3 text-sm text-pretty break-words text-foreground">{entry.brief}</p>
          {from && <p className="mt-1 truncate text-xs text-muted-foreground">{from}</p>}

          {writing && (
            <p role="status" className="mt-3 text-sm text-pretty text-primary">
              Mindra is writing this post…
            </p>
          )}
          {entry.problem && !writing && (
            <p
              role={entry.status === "failed" ? "alert" : undefined}
              className={cn(
                "mt-3 text-sm text-pretty",
                entry.status === "failed" ? "text-red-700" : entry.status === "needs" ? "text-amber-800" : "text-muted-foreground",
              )}
            >
              {entry.problem} <SeePlans text={entry.problem} />
            </p>
          )}
          {problems.length > 0 && !writing && (
            <ul className="mt-2 space-y-1 text-sm text-pretty text-amber-800">
              {problems.map((problem) => (
                <li key={problem} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" />
                  {problem}
                </li>
              ))}
            </ul>
          )}
          {showSkipped && (
            <p role="alert" className="mt-2 text-sm text-pretty text-red-700">
              Couldn&apos;t approve it: {skipped}
            </p>
          )}

          {entry.piece && <Draft piece={entry.piece} approved={entry.approved} />}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!entry.gone_out && !entry.approved && canApprove && (
              <button
                type="button"
                disabled={busy}
                onClick={() => action.mutate({ id: entry.id, action: "approve" })}
                className={buttonStyles({ size: "sm", className: "h-9" })}
              >
                {pending === "approve" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}
                Approve
              </button>
            )}
            {!entry.gone_out && !entry.approved && (
              <button
                type="button"
                disabled={busy || !planReady}
                onClick={() => action.mutate({ id: entry.id, action: "write" })}
                className={buttonStyles({ variant: entry.piece ? "secondary" : "primary", size: "sm", className: "h-9" })}
              >
                {pending === "write" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <RotateCw aria-hidden="true" className="size-4" />}
                {entry.piece ? "Write again" : "Write"}
              </button>
            )}
            {entry.approved && !entry.gone_out && (
              <button
                type="button"
                disabled={busy}
                onClick={() => action.mutate({ id: entry.id, action: "unapprove" })}
                className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}
              >
                {pending === "unapprove" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Undo2 aria-hidden="true" className="size-4" />}
                Unapprove
              </button>
            )}
            {!entry.gone_out && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  action.reset();
                  setEditing(true);
                }}
                className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}
              >
                <PenLine aria-hidden="true" className="size-4" />
                {entry.approved ? "Change time" : "Edit"}
              </button>
            )}
            {entry.piece && (
              <Link to={`/library/${entry.piece.id}`} className={buttonStyles({ variant: "ghost", size: "sm", className: "h-9" })}>
                Open in editor
              </Link>
            )}
            {!entry.gone_out && (
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    disabled={action.isPending}
                    aria-label="Remove this post from the plan"
                    title="Remove"
                    className={buttonStyles({ variant: "ghost", size: "icon", className: "ml-auto size-9 hover:bg-red-50 hover:text-red-600" })}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </button>
                }
                title="Remove this post?"
                description={
                  entry.approved
                    ? "It comes off the plan and off your calendar, and its draft is deleted. This can't be undone."
                    : entry.piece
                      ? "It comes off the plan, and its draft is deleted. This can't be undone."
                      : "It comes off the plan. This can't be undone."
                }
                confirmLabel="Remove"
                onConfirm={() => action.mutate({ id: entry.id, action: "remove" })}
              />
            )}
          </div>
          {action.isError && (
            <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
              {action.error.message}
            </p>
          )}
        </>
      )}
    </article>
  );
}
