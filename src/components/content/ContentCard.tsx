import { useId, useState } from "react";
import { CalendarClock, Check, Clapperboard, Copy, Download, PenLine, Star, Trash2 } from "lucide-react";
import { Link } from "react-router";
import PublishStatus from "../calendar/PublishStatus";
import ScheduleChip from "../calendar/ScheduleChip";
import ScheduleDialog from "../calendar/ScheduleDialog";
import ConfirmDialog from "../ui/ConfirmDialog";
import { buttonStyles } from "../ui/button";
import { cn } from "../../lib/cn";
import { clipFrame, clipPath } from "../../lib/clips";
import { useDeletePiece, useUpdatePiece } from "../../lib/content";
import { formatDate, formatDuration } from "../../lib/format";
import { photoFiles } from "../../lib/photos";
import { postOrigin } from "../../lib/plans";
import type { ClipSummary, ContentPiece, PostPhoto } from "../../lib/types";
import PlatformBadge from "./PlatformBadge";
import ShareButton from "./ShareButton";

interface Props {
  piece: ContentPiece;
  /** Show which project the post came from (in the library, not on the project page). */
  showProject?: boolean;
  /** Name the clip the post goes with, and say when it isn't made yet (not needed in that clip's own list of posts).
   * A made clip's video is shown either way: the post is the video and its caption. */
  showClip?: boolean;
}

/** The clip a post is the caption for: open it, or download it once it's made. */
export function ClipStrip({ clip, project }: { clip: ClipSummary; project: string }) {
  const made = clip.status === "ready" && clip.download_url && !clip.is_stale;
  return (
    <div className="mt-3 flex items-center gap-3 rounded-lg bg-secondary p-2">
      <span
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded bg-white text-muted-foreground",
          clipFrame(clip.shape, "h-12 w-7", "h-7 w-12"),
        )}
      >
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

/**
 * A photo post's pictures, in boxes of a fixed shape so the card doesn't jump while they load: one large; two side by
 * side; three or four in a 2×2 grid; more than four in a 2×2 grid with "+N" on the last, linking to all of them.
 */
export function PostPhotos({ photos, project }: { photos: PostPhoto[]; project: string }) {
  const count = photos.length;
  const shown = photos.slice(0, 4);
  const hidden = count - shown.length;
  const image = (photo: PostPhoto, index: number) => (
    <img
      src={photo.thumbnail_url}
      alt={`Photo ${index + 1} of ${count}`}
      loading="lazy"
      decoding="async"
      className="size-full object-cover"
    />
  );

  if (count === 1) {
    const photo = photos[0];
    // The photo's own shape, kept between Instagram's tallest (4:5) and widest (1.91:1).
    const ratio = photo.width > 0 && photo.height > 0 ? Math.min(1.91, Math.max(0.8, photo.width / photo.height)) : 0.8;
    return (
      <div className="overflow-hidden rounded-lg bg-secondary" style={{ aspectRatio: ratio }}>
        {image(photo, 0)}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-1 overflow-hidden rounded-lg", count === 2 ? "aspect-[2/1]" : "aspect-square grid-rows-2")}>
      {shown.map((photo, index) => (
        <div key={photo.id} className={cn("relative min-h-0 bg-secondary", count === 3 && index === 0 && "row-span-2")}>
          {image(photo, index)}
          {hidden > 0 && index === shown.length - 1 && (
            <Link
              to={`/projects/${project}?tab=photos`}
              aria-label={`See all ${count} photos`}
              className="absolute inset-0 grid place-items-center bg-black/55 text-2xl font-semibold text-white tabular-nums transition-colors hover:bg-black/65 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white"
            >
              <span aria-hidden="true">+{hidden}</span>
            </Link>
          )}
        </div>
      ))}
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
  const clip = piece.clip;
  const videoReady = Boolean(clip && clip.status === "ready" && clip.video_url && !clip.is_stale);
  // A photo post: the pictures and the caption go out together.
  const photos = piece.photos ?? [];
  const hasPhotos = !videoReady && photos.length > 0;
  const mainAction = videoReady || hasPhotos;
  const origin = postOrigin(piece);

  const copy = async () => {
    await navigator.clipboard.writeText(piece.body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    // min-w-0: in a grid, a long one-line title would otherwise make the card wider than a phone screen.
    <article className="flex min-w-0 flex-col rounded-xl border border-border bg-white p-5">
      <div className="mb-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <PlatformBadge platform={piece.platform} />
          {piece.title && <p className="mt-1.5 truncate text-xs text-muted-foreground">{piece.title}</p>}
          <ScheduleChip piece={piece} className="mt-2 flex w-fit" />
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

      {videoReady && clip && (
        <div className="mb-3">
          <div className="overflow-hidden rounded-lg bg-black">
            <video
              src={clip.video_url ?? undefined}
              poster={clip.thumbnail_url ?? undefined}
              controls
              playsInline
              preload="none"
              aria-label={`Clip: ${clip.title}`}
              className={cn("mx-auto block bg-black", clipFrame(clip.shape, "aspect-[9/16] h-72"))}
            />
          </div>
          {showClip && (
            <p className="mt-1.5 truncate text-xs text-muted-foreground tabular-nums">
              Clip{" "}
              <Link
                to={clipPath({ id: clip.id, project: piece.project })}
                className="rounded font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {clip.title}
              </Link>{" "}
              · {formatDuration(clip.start)}–{formatDuration(clip.end)}
            </p>
          )}
        </div>
      )}

      {hasPhotos && (
        <div className="mb-3">
          <PostPhotos photos={photos} project={piece.project} />
        </div>
      )}

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

      {showClip && clip && !videoReady && <ClipStrip clip={clip} project={piece.project} />}

      {/* Automatic posting: where it goes, posting now, the post on Facebook or Instagram, or why it failed. */}
      <PublishStatus piece={piece} className="mt-3" />

      {showProject && (
        <p className="mt-3 truncate text-xs text-muted-foreground">
          From{" "}
          {origin.to ? (
            <Link
              to={origin.to}
              className="rounded font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {origin.label}
            </Link>
          ) : (
            <span className="font-medium text-foreground">{origin.label}</span>
          )}{" "}
          · <span className="tabular-nums">{formatDate(piece.created_at)}</span>
        </p>
      )}

      {videoReady && clip && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <ShareButton
            clipId={clip.id}
            downloadUrl={clip.download_url}
            text={piece.body}
            title={piece.title || clip.title}
            variant="primary"
            wide
          />
        </div>
      )}
      {hasPhotos && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          <ShareButton
            // New photos or a new order: fetch the files again.
            key={photos.map((photo) => photo.id).join()}
            loadFiles={() => photoFiles(piece.project)}
            text={piece.body}
            title={piece.title || piece.project_name}
            variant="primary"
            wide
          />
        </div>
      )}
      <div className={cn("flex items-center gap-2", mainAction ? "mt-2" : "mt-4 border-t border-border pt-4")}>
        <button type="button" onClick={copy} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
        <Link to={`/library/${piece.id}`} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
          <PenLine aria-hidden="true" className="size-4" />
          Edit
        </Link>
        <ScheduleDialog
          piece={piece}
          trigger={
            <button
              type="button"
              aria-label={piece.scheduled_at ? "Change schedule" : "Schedule post"}
              title={piece.scheduled_at ? "Change schedule" : "Schedule"}
              className={buttonStyles({ variant: "secondary", size: "icon" })}
            >
              <CalendarClock aria-hidden="true" className="size-4" />
            </button>
          }
        />
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
