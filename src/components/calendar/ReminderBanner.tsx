import { BellRing, Check, Undo2, X } from "lucide-react";
import { buttonStyles } from "../ui/button";
import { formatScheduled, isPostedStatus, scheduleStatus, useMarkPosted } from "../../lib/calendar";
import { platformInfo } from "../../lib/projects";
import type { ContentPiece } from "../../lib/types";
import PublishStatus from "./PublishStatus";
import ShareOrCopy from "./ShareOrCopy";

interface Props {
  piece: ContentPiece;
  /** The text as it is in the editor, which Share and Copy use. */
  text: string;
  onClose: () => void;
}

/**
 * Shown when a reminder is opened (/library/<id>?reminder=1): post it now, then mark it as posted. Also where the
 * notification lands when automatic posting failed (with why, and Try again) or worked.
 */
export default function ReminderBanner({ piece, text, onClose }: Props) {
  const posted = useMarkPosted();
  const info = platformInfo(piece.platform);
  const status = scheduleStatus(piece);
  const isPosted = isPostedStatus(status);
  const published = status === "published";

  let note = "Share it, then come back and mark it as posted.";
  if (published || status === "publishing") note = "";
  else if (isPosted) note = "Marked as posted. The calendar shows it in green.";
  else if (status === "failed") note = "Share it yourself, then mark it as posted.";
  else if (!piece.scheduled_at) note = "This post isn't on the calendar any more, but you can still share it.";
  else if (status === "missed") note = `It was planned for ${formatScheduled(piece.scheduled_at)}. Share it now, then mark it as posted.`;

  return (
    <section aria-labelledby="reminder-title" className="rounded-xl border border-primary/25 bg-primary/5 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <BellRing aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <h3 id="reminder-title" className="font-semibold text-balance text-foreground">
            {isPosted ? `Posted on ${info.label}` : `It's time to post this on ${info.label}`}
          </h3>
          {note && <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{note}</p>}
          <PublishStatus piece={piece} className="mt-2" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isPosted && status !== "publishing" && <ShareOrCopy piece={piece} text={text} />}
            {piece.scheduled_at && !published && status !== "publishing" && (
              <button
                type="button"
                onClick={() => posted.mutate({ id: piece.id, posted: !isPosted })}
                disabled={posted.isPending}
                className={buttonStyles({ variant: "secondary" })}
              >
                {isPosted ? <Undo2 aria-hidden="true" className="size-4" /> : <Check aria-hidden="true" className="size-4 text-emerald-600" />}
                {isPosted ? "Not posted" : "Mark as posted"}
              </button>
            )}
          </div>
          {posted.isError && (
            <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
              {posted.error.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close reminder"
          className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-1.5 -mr-1.5" })}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>
    </section>
  );
}
