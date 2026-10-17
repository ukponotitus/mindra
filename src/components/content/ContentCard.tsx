import { useId, useState } from "react";
import { Check, Clapperboard, Copy, Download, PenLine, Star, Trash2 } from "lucide-react";
import { Link } from "react-router";
import ConfirmDialog from "../ui/ConfirmDialog";
import { buttonStyles } from "../ui/button";
import { cn } from "../../lib/cn";
import { clipPath } from "../../lib/clips";
import { useDeletePiece, useUpdatePiece } from "../../lib/content";
import { formatDate, formatDuration } from "../../lib/format";
import type { ClipSummary, ContentPiece } from "../../lib/types";
import PlatformBadge from "./PlatformBadge";

interface Props {
  piece: ContentPiece;
  /** Show which project the post came from (in the library, not on the project page). */
  showProject?: boolean;
  /** Show the clip the post goes with (not in that clip's own list of posts). */
  showClip?: boolean;
}

/** The clip a post is the caption for: open it, or download it once it's made. */
export function ClipStrip({ clip, project }: { clip: ClipSummary; project: string }) {
  const made = clip.status === "ready" && clip.download_url && !clip.is_stale;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg bg-secondary p-2">
      <span className="grid h-12 w-7 shrink-0 place-items-center overflow-hidden rounded bg-white text-muted-foreground">
        {clip.thumbnail_url ? <img src={clip.thumbnail_url} alt="" className="size-full object-cover" /> : <Clapperboard aria-hidden="true" className="size-3.5" />}
      </span>
      <span className="min-w-0 flex-1 text-xs">
        <span className="block text-muted-foreground">Goes with the clip</span>
        <Link
          to={clipPath({ id: clip.id, project })}
          className="block truncate rounded font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {clip.title}
        </Link>
        <span className="text-muted-foreground tabular-nums">
          {formatDuration(clip.start)}–{formatDuration(clip.end)}
          {!made && " · not made yet"}
        </span>
      </span>
      {made && (
        <a href={clip.download_url ?? undefined} download className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
          <Download aria-hidden="true" className="size-4" />
          Clip
        </a>
      )}
    </div>
  );
}

export default function ContentCard({ piece, showProject = false, showClip = true }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const update = useUpdatePiece();
  const remove = useDeletePiece();
  const bodyId = useId();
  const long = piece.body.length > 320 || piece.body.split("\n").length > 7;
  const actionError = remove.error ?? update.error;

  const copy = async () => {
    await navigator.clipboard.writeText(piece.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="flex flex-col rounded-xl border border-border bg-white p-5">
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <PlatformBadge platform={piece.platform} />
          {piece.title && <p className="mt-1.5 truncate text-xs text-muted-foreground">{piece.title}</p>}
        </div>
        {piece.status === "approved" && (
          <span className="mt-0.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Approved</span>
        )}
        <button
          type="button"
          onClick={() => update.mutate({ id: piece.id, is_favorite: !piece.is_favorite })}
          className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-2 -mr-2 size-10" })}
          aria-label="Favourite"
          aria-pressed={piece.is_favorite}
        >
          <Star
            aria-hidden="true"
            className={cn("size-5", piece.is_favorite && "fill-amber-400 text-amber-500")}
          />
        </button>
      </div>

      <p
        id={bodyId}
        className={cn("flex-1 text-sm leading-relaxed whitespace-pre-wrap text-gray-700", !expanded && "line-clamp-6")}
      >
        {piece.body}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          aria-expanded={expanded}
          aria-controls={bodyId}
          className="mt-2 self-start rounded text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      )}

      {showClip && piece.clip && <ClipStrip clip={piece.clip} project={piece.project} />}

      {showProject && (
        <p className="mt-3 truncate text-xs text-muted-foreground">
          From{" "}
          <Link
            to={`/projects/${piece.project}`}
            className="rounded font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {piece.project_name}
          </Link>{" "}
          · <span className="tabular-nums">{formatDate(piece.created_at)}</span>
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <button type="button" onClick={copy} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <Link to={`/library/${piece.id}`} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
          <PenLine aria-hidden="true" className="size-4" />
          Edit
        </Link>
        <ConfirmDialog
          trigger={
            <button
              type="button"
              disabled={remove.isPending}
              aria-label="Delete post"
              className={buttonStyles({
                variant: "ghost",
                size: "icon",
                className: "-mr-2 ml-auto size-10 hover:bg-red-50 hover:text-red-600",
              })}
            >
              <Trash2 aria-hidden="true" className="size-4" />
            </button>
          }
          title="Delete this post?"
          description="This removes the post from your library and from its project. It can't be undone."
          confirmLabel="Delete post"
          onConfirm={() => remove.mutate(piece.id)}
        />
      </div>
      {actionError && (
        <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
          {actionError.message}
        </p>
      )}
    </article>
  );
}
