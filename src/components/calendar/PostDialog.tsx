import { Dialog } from "@base-ui/react/dialog";
import { CalendarClock, Check, PenLine, Undo2, X } from "lucide-react";
import { Link } from "react-router";
import PlatformBadge from "../content/PlatformBadge";
import { PostPhotos } from "../content/ContentCard";
import { buttonStyles } from "../ui/button";
import { scheduleStatus, useMarkPosted, useSchedulePost } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { platformInfo } from "../../lib/projects";
import type { ContentPiece } from "../../lib/types";
import { backdropClass, popupClass } from "./dialogStyles";
import ScheduleChip from "./ScheduleChip";
import ScheduleDialog from "./ScheduleDialog";
import ShareOrCopy, { postMedia } from "./ShareOrCopy";

interface Props {
  /** The post, once it's known (it may still be loading when the dialog opens from a link). */
  piece: ContentPiece | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Why the post couldn't be shown, such as a deleted post. */
  error?: string;
  /** After it moved to another time, or came off the calendar (`piece.scheduled_at` null). */
  onRescheduled: (piece: ContentPiece, previous: string | null) => void;
}

function PostBody({ piece, onRescheduled }: { piece: ContentPiece; onRescheduled: Props["onRescheduled"] }) {
  const posted = useMarkPosted();
  const schedule = useSchedulePost();
  const clip = piece.clip;
  const media = postMedia(piece);
  const isPosted = scheduleStatus(piece) === "posted";
  const error = posted.error ?? schedule.error;

  return (
    <>
      {media === "video" && clip && (
        <div className="mb-4 overflow-hidden rounded-lg bg-black">
          <video
            src={clip.video_url ?? undefined}
            poster={clip.thumbnail_url ?? undefined}
            controls
            playsInline
            preload="metadata"
            aria-label={`Clip: ${clip.title}`}
            className="mx-auto block aspect-[9/16] max-h-80 bg-black"
          />
        </div>
      )}
      {media === "photos" && (
        <div className="mx-auto mb-4 max-w-80">
          <PostPhotos photos={piece.photos} project={piece.project} />
        </div>
      )}
      <p className="max-h-64 overflow-y-auto rounded-lg bg-background p-3 text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
        {piece.body}
      </p>
      <p className="mt-2 truncate text-xs text-muted-foreground">
        From{" "}
        <Link
          to={`/projects/${piece.project}`}
          className="rounded font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {piece.project_name}
        </Link>
      </p>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
        <ShareOrCopy piece={piece} text={piece.body} />
        <Link to={`/library/${piece.id}`} className={buttonStyles({ variant: "secondary" })}>
          <PenLine aria-hidden="true" className="size-4" />
          Open in editor
        </Link>
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => posted.mutate({ id: piece.id, posted: !isPosted })}
          disabled={posted.isPending}
          className={buttonStyles({
            variant: "secondary",
            className: cn(isPosted && "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"),
          })}
        >
          {isPosted ? <Undo2 aria-hidden="true" className="size-4" /> : <Check aria-hidden="true" className="size-4 text-emerald-600" />}
          {isPosted ? "Not posted" : "Mark as posted"}
        </button>
        <ScheduleDialog
          piece={piece}
          onDone={onRescheduled}
          trigger={
            <button type="button" className={buttonStyles({ variant: "secondary" })}>
              <CalendarClock aria-hidden="true" className="size-4" />
              Reschedule
            </button>
          }
        />
        <button
          type="button"
          onClick={() => schedule.mutate({ id: piece.id, scheduled_at: null }, { onSuccess: (saved) => onRescheduled(saved, piece.scheduled_at) })}
          disabled={schedule.isPending}
          className={buttonStyles({ variant: "ghost", className: "text-red-600 hover:bg-red-50 hover:text-red-700" })}
        >
          Unschedule
        </button>
      </div>
      {isPosted && (
        <p className="mt-3 text-sm text-pretty text-muted-foreground">Marked as posted. The calendar shows it in green.</p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-pretty text-red-600">
          {error.message}
        </p>
      )}
    </>
  );
}

/** A scheduled post on the calendar: see it, share it, mark it as posted, move it or take it off. */
export default function PostDialog({ piece, open, onOpenChange, error, onRescheduled }: Props) {
  const info = piece ? platformInfo(piece.platform) : null;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={cn(popupClass, "w-[min(36rem,calc(100vw-2rem))]")}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <Dialog.Title className="flex items-center gap-2.5 text-lg font-semibold text-balance text-foreground">
                {piece && <PlatformBadge platform={piece.platform} withLabel={false} />}
                {info ? `${info.label} post` : error ? "Post not found" : "Loading post"}
              </Dialog.Title>
              {piece && (
                <Dialog.Description>
                  <ScheduleChip piece={piece} />
                  {!piece.scheduled_at && <span className="text-sm text-muted-foreground">Not on the calendar</span>}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-1 -mr-2" })}>
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          {piece ? (
            <PostBody piece={piece} onRescheduled={onRescheduled} />
          ) : error ? (
            <p role="alert" className="text-sm text-pretty text-red-600">
              {error}
            </p>
          ) : (
            <div aria-busy="true" className="space-y-3">
              <div className="h-24 animate-pulse rounded-lg bg-secondary" />
              <div className="h-9 w-40 animate-pulse rounded-lg bg-secondary" />
            </div>
          )}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
