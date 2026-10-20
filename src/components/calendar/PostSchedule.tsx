import { CalendarClock, CalendarDays, Check, Undo2 } from "lucide-react";
import { Link } from "react-router";
import { buttonStyles } from "../ui/button";
import { dayKey, scheduleStatus, useMarkPosted } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import type { ContentPiece } from "../../lib/types";
import PublishStatus from "./PublishStatus";
import ScheduleChip from "./ScheduleChip";
import ScheduleDialog from "./ScheduleDialog";

const NOTES = {
  planned: "Mindra reminds you at this time.",
  reminded: "The reminder went out. Share it, then mark it as posted.",
  posted: "Marked as posted.",
  missed: "This wasn't marked as posted. Share it now and mark it, or pick a new time.",
  // PublishStatus says how automatic posting went.
  publishing: "",
  published: "",
  failed: "You can also share it yourself and mark it as posted, or pick a new time.",
};

/** The editor's Schedule section: when the post goes out, and its status. */
export default function PostSchedule({ piece }: { piece: ContentPiece }) {
  const posted = useMarkPosted();
  const status = scheduleStatus(piece);
  const isPosted = status === "posted";
  // Out, or going out now, by Mindra: nothing to move or mark.
  const automatic = status === "published" || status === "publishing";
  // Set to post automatically: PublishStatus says where, instead of the reminder note.
  const note = status === "planned" && piece.publish_to ? "" : status ? NOTES[status] : "";

  return (
    <section aria-labelledby="post-schedule" className="rounded-xl border border-border bg-white p-5">
      <h3 id="post-schedule" className="mb-3 text-sm font-semibold text-foreground">
        Schedule
      </h3>
      {status && piece.scheduled_at ? (
        <>
          <ScheduleChip piece={piece} />
          <PublishStatus piece={piece} className="mt-2" />
          {note && <p className="mt-2 text-sm text-pretty text-muted-foreground">{note}</p>}
          {!automatic && (
            <div className="mt-3 flex flex-wrap gap-2">
              <ScheduleDialog
                piece={piece}
                trigger={
                  <button type="button" className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
                    <CalendarClock aria-hidden="true" className="size-4" />
                    Change time
                  </button>
                }
              />
              <button
                type="button"
                onClick={() => posted.mutate({ id: piece.id, posted: !isPosted })}
                disabled={posted.isPending}
                className={buttonStyles({
                  variant: "secondary",
                  size: "sm",
                  className: cn("h-9", isPosted && "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"),
                })}
              >
                {isPosted ? <Undo2 aria-hidden="true" className="size-4" /> : <Check aria-hidden="true" className="size-4 text-emerald-600" />}
                {isPosted ? "Not posted" : "Mark as posted"}
              </button>
            </div>
          )}
          <Link
            to={`/calendar?date=${dayKey(new Date(piece.scheduled_at))}&post=${piece.id}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <CalendarDays aria-hidden="true" className="size-4" />
            See it on the calendar
          </Link>
        </>
      ) : (
        <>
          <PublishStatus piece={piece} className="mb-3" />
          <p className="mb-3 text-sm text-pretty text-muted-foreground">
            Pick a day and time for this post. Mindra reminds you when it's time to share it.
          </p>
          <ScheduleDialog
            piece={piece}
            trigger={
              <button type="button" className={buttonStyles({ variant: "secondary", className: "w-full" })}>
                <CalendarClock aria-hidden="true" className="size-4" />
                Schedule
              </button>
            }
          />
        </>
      )}
      {posted.isError && (
        <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
          {posted.error.message}
        </p>
      )}
    </section>
  );
}
