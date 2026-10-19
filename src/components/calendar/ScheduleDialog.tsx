import { useMemo, useState, type FormEvent, type ReactElement } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { LoaderCircle, X } from "lucide-react";
import { Link } from "react-router";
import { buttonStyles } from "../ui/button";
import {
  LATEST_AHEAD_DAYS,
  addDays,
  combine,
  dayKey,
  defaultTimeFor,
  formatDayShort,
  formatScheduled,
  formatTime,
  parseDayKey,
  postSummary,
  quickPicks,
  scheduleProblem,
  timeValue,
  timeZoneName,
  toOffsetIso,
  useSchedulePost,
} from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { platformInfo } from "../../lib/projects";
import type { ContentPiece } from "../../lib/types";
import { backdropClass, popupClass } from "./dialogStyles";
import PostNow from "./PostNow";

interface Props {
  piece: ContentPiece;
  /** The button that opens the dialog. Leave it out to open the dialog with `open`, e.g. after a drop on the calendar. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The day to start on ("2026-10-26"), such as the one a post was dropped on. */
  day?: string;
  /** After the post was scheduled, moved or taken off the calendar; `previous` is the time it had before. */
  onDone?: (piece: ContentPiece, previous: string | null) => void;
}

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-sm text-foreground tabular-nums transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden aria-invalid:border-red-400";

function ScheduleForm({ piece, day, onDone }: { piece: ContentPiece; day?: string; onDone: (piece: ContentPiece) => void }) {
  const schedule = useSchedulePost();
  const picks = useMemo(() => quickPicks(), []);
  const scheduled = piece.scheduled_at ? new Date(piece.scheduled_at) : null;
  const dropped = parseDayKey(day);
  const start = dropped ? defaultTimeFor(dropped) : (scheduled ?? picks[0].date);
  const [date, setDate] = useState(dayKey(start));
  const [time, setTime] = useState(timeValue(start));
  const [tried, setTried] = useState(false);

  const when = combine(date, time);
  const problem = scheduleProblem(when);
  const shownProblem = tried ? problem : "";
  const apiError = schedule.isError ? schedule.error.message : "";
  const unchanged = Boolean(scheduled && when && scheduled.getTime() === when.getTime());
  const today = new Date();

  const save = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (problem || !when) return;
    if (unchanged) return onDone(piece);
    schedule.mutate({ id: piece.id, scheduled_at: toOffsetIso(when) }, { onSuccess: onDone });
  };

  const pick = (date: Date) => {
    setDate(dayKey(date));
    setTime(timeValue(date));
    schedule.reset();
  };

  return (
    <form onSubmit={save} noValidate className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground">Quick picks</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {picks.map((option) => {
            const chosen = when?.getTime() === option.date.getTime();
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => pick(option.date)}
                aria-pressed={chosen}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  chosen ? "border-primary bg-primary/10" : "border-border bg-white hover:bg-secondary",
                )}
              >
                <span className={cn("block text-sm font-medium", chosen ? "text-primary" : "text-foreground")}>
                  {option.name} {formatTime(option.date)}
                </span>
                <span className="block text-xs text-muted-foreground tabular-nums">{formatDayShort(option.date)}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <label htmlFor="schedule-date" className="mb-1.5 block text-sm font-medium text-foreground">
            Date
          </label>
          <input
            id="schedule-date"
            type="date"
            value={date}
            min={dayKey(today)}
            max={dayKey(addDays(today, LATEST_AHEAD_DAYS))}
            onChange={(event) => {
              setDate(event.target.value);
              schedule.reset();
            }}
            required
            aria-invalid={Boolean(shownProblem || apiError) || undefined}
            aria-describedby="schedule-zone schedule-problem"
            className={fieldClass}
          />
        </div>
        <div className="min-w-0">
          <label htmlFor="schedule-time" className="mb-1.5 block text-sm font-medium text-foreground">
            Time
          </label>
          <input
            id="schedule-time"
            type="time"
            value={time}
            onChange={(event) => {
              setTime(event.target.value);
              schedule.reset();
            }}
            required
            aria-invalid={Boolean(shownProblem || apiError) || undefined}
            aria-describedby="schedule-zone schedule-problem"
            className={fieldClass}
          />
        </div>
      </div>
      <div className="space-y-1.5 text-sm text-pretty text-muted-foreground">
        <p id="schedule-zone">
          Times are in {timeZoneName(when ?? today)}.
          {when && !problem && <span className="tabular-nums"> This goes on the calendar for {formatScheduled(when)}.</span>}
        </p>
        <p>
          At that time Mindra reminds you on each device where reminders are on (
          <Link
            to="/settings#reminders"
            className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Settings
          </Link>
          ).
        </p>
      </div>

      <p id="schedule-problem" role="alert" className={cn("text-sm text-pretty text-red-600", !(shownProblem || apiError) && "sr-only")}>
        {shownProblem || apiError}
      </p>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {scheduled && (
          <button
            type="button"
            onClick={() => schedule.mutate({ id: piece.id, scheduled_at: null }, { onSuccess: onDone })}
            disabled={schedule.isPending}
            className={buttonStyles({ variant: "ghost", className: "-ml-2 text-red-600 hover:bg-red-50 hover:text-red-700" })}
          >
            Unschedule
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <Dialog.Close className={buttonStyles({ variant: "secondary" })}>Cancel</Dialog.Close>
          <button type="submit" disabled={schedule.isPending} className={buttonStyles()}>
            {schedule.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            {scheduled ? "Change" : "Schedule"}
          </button>
        </div>
      </div>
    </form>
  );
}

/** The dialog's inside: "Schedule for later" or "Post now", chosen at the top (Post now only before it's posted). */
function DialogBody({ piece, day, onDone }: { piece: ContentPiece; day?: string; onDone: (piece: ContentPiece) => void }) {
  const [mode, setMode] = useState<"later" | "now">("later");
  const info = platformInfo(piece.platform);
  const canPostNow = !piece.posted_at;
  const now = canPostNow && mode === "now";

  return (
    <>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <Dialog.Title className="text-lg font-semibold text-balance text-foreground">
            {now ? "Post this now" : piece.scheduled_at ? "Change when it goes out" : "Schedule this post"}
          </Dialog.Title>
          <Dialog.Description className="mt-1 truncate text-sm text-muted-foreground">
            {info.label}: {postSummary(piece)}
          </Dialog.Description>
        </div>
        <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-1 -mr-2" })}>
          <X aria-hidden="true" className="size-4" />
        </Dialog.Close>
      </div>
      {canPostNow && (
        <fieldset className="mb-5">
          <legend className="sr-only">When it goes out</legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
            {(
              [
                ["later", piece.scheduled_at ? "Change time" : "Schedule for later"],
                ["now", "Post now"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className={cn(
                  "grid h-9 cursor-pointer place-items-center rounded-md text-sm font-medium transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary",
                  mode === value ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <input
                  type="radio"
                  name="schedule-mode"
                  value={value}
                  checked={mode === value}
                  onChange={() => setMode(value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {now ? <PostNow piece={piece} onPosted={onDone} /> : <ScheduleForm piece={piece} day={day} onDone={onDone} />}
    </>
  );
}

/**
 * Put a post on the calendar, move it or take it off, or post it now. Times are entered in the browser's time zone and
 * sent with their offset. Used on post cards, in the editor and on the calendar.
 */
export default function ScheduleDialog({ piece, trigger, open, onOpenChange, day, onDone }: Props) {
  const [innerOpen, setInnerOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const isOpen = open ?? innerOpen;
  const setOpen = (next: boolean) => {
    if (open === undefined) setInnerOpen(next);
    onOpenChange?.(next);
  };
  const done = (saved: ContentPiece) => {
    setOpen(false);
    // Where nothing else reports the change (cards, the editor), say it for screen readers.
    if (onDone) onDone(saved, piece.scheduled_at);
    else if (saved.posted_at && !piece.posted_at) setAnnouncement("Marked as posted. It's on today's calendar.");
    else if (!saved.scheduled_at) setAnnouncement("Taken off the calendar.");
    else setAnnouncement(`${piece.scheduled_at ? "Moved to" : "Scheduled for"} ${formatScheduled(saved.scheduled_at)}.`);
  };

  return (
    <>
      <Dialog.Root open={isOpen} onOpenChange={setOpen}>
        {trigger && <Dialog.Trigger render={trigger} />}
        <Dialog.Portal>
          <Dialog.Backdrop className={backdropClass} />
          <Dialog.Popup className={cn(popupClass, "w-[min(34rem,calc(100vw-2rem))]")}>
            <DialogBody piece={piece} day={day} onDone={done} />
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      <span role="status" className="sr-only">
        {announcement}
      </span>
    </>
  );
}
