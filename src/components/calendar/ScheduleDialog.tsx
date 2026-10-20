import { useId, useMemo, useState, type FormEvent, type ReactElement, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Switch } from "@base-ui/react/switch";
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
import { accountName, accountPlace, defaultAccount, kindPhrase, sameAccount, useAutoPost, type AutoPost } from "../../lib/social";
import type { ConnectedAccount, ContentPiece } from "../../lib/types";
import { backdropClass, popupClass, switchClass, thumbClass } from "./dialogStyles";
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

const linkClass =
  "rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const settingsLink = (section: "reminders" | "accounts", label: ReactNode) => (
  <Link to={`/settings#${section}`} className={linkClass}>
    {label}
  </Link>
);

/** Why this post can't go out automatically, for the line under the time; null when it can (or it isn't known yet). */
function autoPostNote(auto: AutoPost, platformLabel: string): ReactNode {
  switch (auto.state) {
    case "unsupported":
      return `Mindra can't post on ${platformLabel} by itself yet.`;
    case "needs-media":
      return "Instagram posts need a photo or a video to post automatically.";
    case "no-account":
      return <>To post it automatically, connect {kindPhrase(auto.kind)} in {settingsLink("accounts", "Settings → Connected accounts")}.</>;
    case "needs-reconnect":
      return (
        <>
          {auto.accounts.map(accountName).join(", ")} {auto.accounts.length === 1 ? "needs" : "need"} reconnecting before Mindra can post
          there: {settingsLink("accounts", "Settings → Connected accounts")}.
        </>
      );
    default:
      return null;
  }
}

/** "Post automatically": a switch, and a choice of account when there are several. */
function AutoPostChoice({
  accounts,
  on,
  account,
  onToggle,
  onPick,
}: {
  accounts: ConnectedAccount[];
  on: boolean;
  account: ConnectedAccount;
  onToggle: (on: boolean) => void;
  onPick: (id: string) => void;
}) {
  const ids = { toggle: useId(), note: useId(), account: useId() };
  const several = accounts.length > 1;
  const kind = account.kind === "instagram" ? "Instagram accounts" : "Pages";
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-4">
        <label htmlFor={ids.toggle} className="text-sm font-medium text-foreground">
          Post automatically
        </label>
        <Switch.Root
          id={ids.toggle}
          nativeButton
          render={<button type="button" />}
          checked={on}
          onCheckedChange={onToggle}
          aria-describedby={ids.note}
          className={switchClass}
        >
          <Switch.Thumb className={thumbClass} />
        </Switch.Root>
      </div>
      <p id={ids.note} className="mt-1 text-sm text-pretty text-muted-foreground">
        {several && !on ? `Post it to one of your connected ${kind} at that time.` : `Post it to ${accountPlace(account)} at that time.`}
      </p>
      {on && several && (
        <div className="mt-3">
          <label htmlFor={ids.account} className="mb-1.5 block text-sm font-medium text-foreground">
            Account
          </label>
          <select id={ids.account} value={String(account.id)} onChange={(event) => onPick(event.target.value)} className={fieldClass}>
            {accounts.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {accountName(option)}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function ScheduleForm({ piece, day, onDone }: { piece: ContentPiece; day?: string; onDone: (piece: ContentPiece) => void }) {
  const schedule = useSchedulePost();
  const picks = useMemo(() => quickPicks(), []);
  const scheduled = piece.scheduled_at ? new Date(piece.scheduled_at) : null;
  const dropped = parseDayKey(day);
  const start = dropped ? defaultTimeFor(dropped) : (scheduled ?? picks[0].date);
  const [date, setDate] = useState(dayKey(start));
  const [time, setTime] = useState(timeValue(start));
  const [tried, setTried] = useState(false);

  // Automatic posting, for a post that hasn't gone out: on when it's already set to an account that can still post.
  const auto = useAutoPost(piece);
  const offerAuto = auto.state === "ready" && !piece.posted_at;
  const activeAccounts = auto.state === "ready" ? auto.accounts : [];
  const [autoChoice, setAutoChoice] = useState<boolean | null>(null);
  const [pickedAccount, setPickedAccount] = useState<string | null>(null);
  const autoOn = offerAuto && (autoChoice ?? activeAccounts.some((account) => sameAccount(account.id, piece.publish_to)));
  const account = activeAccounts.find((option) => sameAccount(option.id, pickedAccount)) ?? defaultAccount(activeAccounts, piece.publish_to);
  // Sent only when the choice was shown; otherwise the post keeps what it has.
  const publishTo = offerAuto ? (autoOn && account ? account.id : null) : undefined;
  const sameTarget = publishTo === undefined || (publishTo === null ? piece.publish_to == null : sameAccount(publishTo, piece.publish_to));
  const note = piece.posted_at ? null : autoPostNote(auto, platformInfo(piece.platform).label);

  const when = combine(date, time);
  const problem = scheduleProblem(when);
  const shownProblem = tried ? problem : "";
  const apiError = schedule.isError ? schedule.error.message : "";
  const unchanged = Boolean(scheduled && when && scheduled.getTime() === when.getTime()) && sameTarget;
  const today = new Date();

  const save = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (problem || !when) return;
    if (unchanged) return onDone(piece);
    schedule.mutate({ id: piece.id, scheduled_at: toOffsetIso(when), publish_to: publishTo }, { onSuccess: onDone });
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
      <div className="space-y-3 text-sm text-pretty text-muted-foreground">
        <p id="schedule-zone">
          Times are in {timeZoneName(when ?? today)}.
          {when && !problem && <span className="tabular-nums"> This goes on the calendar for {formatScheduled(when)}.</span>}
        </p>
        {offerAuto && account && (
          <AutoPostChoice
            accounts={activeAccounts}
            on={autoOn}
            account={account}
            onToggle={(on) => {
              setAutoChoice(on);
              schedule.reset();
            }}
            onPick={(id) => {
              setPickedAccount(id);
              schedule.reset();
            }}
          />
        )}
        <p>
          {note && <>{note} </>}
          {autoOn
            ? "If it can't be posted, Mindra reminds you instead, on each device where reminders are on ("
            : `At that time Mindra reminds you${note ? " instead" : ""} on each device where reminders are on (`}
          {settingsLink("reminders", "Settings")}).
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
  // Decided when the dialog opens, so posting it from "Post now" doesn't swap the view while it shows the result.
  const [canPostNow] = useState(!piece.posted_at);
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
    else
      setAnnouncement(
        `${piece.scheduled_at ? "Moved to" : "Scheduled for"} ${formatScheduled(saved.scheduled_at)}.${saved.publish_to ? " Mindra posts it then." : ""}`,
      );
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
