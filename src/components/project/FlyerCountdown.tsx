import { useEffect, useId, useState, type FormEvent } from "react";
import { CalendarDays, LoaderCircle } from "lucide-react";
import { Link } from "react-router";
import SeePlans from "../SeePlans";
import { buttonStyles } from "../ui/button";
import { ApiError } from "../../lib/api";
import { addDays, combine, dayKey, formatDayLong, formatDayShort, parseDayKey } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { useGeneration, useStartGeneration } from "../../lib/content";
import { PHOTO_PLATFORMS } from "../../lib/photos";
import { PLATFORMS } from "../../lib/projects";
import type { Platform, Project } from "../../lib/types";

// Countdown posts to the event on a flyer (the backend's content/countdown.py): a post a week before, 3 days before,
// the day before and on the day, for each platform chosen, written from the flyer and planned in the Planner at one
// time of day. Each goes out by itself where the workspace has one account for its platform (as the Schedule dialog
// does), otherwise Mindra reminds whoever planned them.

const DAYS = [
  { before: 7, label: "A week before" },
  { before: 3, label: "3 days before" },
  { before: 1, label: "The day before" },
  { before: 0, label: "On the day" },
];
const DEFAULT_PLATFORMS: Platform[] = ["instagram", "facebook", "whatsapp"];
// The API plans nothing sooner than this, so a post isn't due before it's written.
const SOONEST_MS = 15 * 60 * 1000;

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm text-foreground tabular-nums transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-60";

export default function FlyerCountdown({ project }: { project: Project }) {
  const ids = useId();
  const found = project.flyer_event_date;
  const [eventDate, setEventDate] = useState(found ?? "");
  const [typed, setTyped] = useState(false);
  const [days, setDays] = useState<number[]>(DAYS.map((day) => day.before));
  const [time, setTime] = useState("09:00");
  const choices = PLATFORMS.filter((platform) => PHOTO_PLATFORMS.includes(platform.id));
  const [platforms, setPlatforms] = useState<Platform[]>(() => {
    const chosen = project.target_platforms.filter((platform) => PHOTO_PLATFORMS.includes(platform));
    return chosen.length > 0 ? chosen : DEFAULT_PLATFORMS;
  });
  const [generationId, setGenerationId] = useState<string | null>(null);
  const start = useStartGeneration();
  const generation = useGeneration(generationId).data;
  const running = Boolean(generationId) && generation?.status !== "completed" && generation?.status !== "failed";

  // The flyer's text was read (or corrected) after the form opened: follow the date found, until one is typed in.
  useEffect(() => {
    if (!typed && found) setEventDate(found);
  }, [found, typed]);

  const event = parseDayKey(eventDate);
  const today = parseDayKey(dayKey(new Date()));
  const passedEvent = Boolean(event && today && event < today);
  // Each day's post time, and whether it has passed.
  const slots = DAYS.map((day) => {
    const when = event ? combine(dayKey(addDays(event, -day.before)), time) : null;
    return { ...day, when, passed: !when || when.getTime() < Date.now() + SOONEST_MS };
  });
  const kept = slots.filter((slot) => days.includes(slot.before) && !slot.passed);
  const total = kept.length * platforms.length;

  const toggleDay = (before: number) =>
    setDays((current) => (current.includes(before) ? current.filter((day) => day !== before) : [...current, before]));
  const togglePlatform = (platform: Platform) =>
    setPlatforms((current) => (current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]));

  const submit = (formEvent: FormEvent) => {
    formEvent.preventDefault();
    if (!event || total === 0) return;
    start.mutate(
      {
        project: project.id,
        platforms,
        variations: 1,
        countdown: {
          event_date: eventDate,
          days: kept.map((slot) => slot.before),
          time,
          time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      },
      { onSuccess: (created) => setGenerationId(created.id) },
    );
  };

  const error =
    generation?.status === "failed"
      ? generation.error
      : start.error instanceof ApiError
        ? (start.error.fieldErrors.countdown?.[0] ?? start.error.fieldErrors.platforms?.[0] ?? start.error.fieldErrors.project?.[0] ?? start.error.message)
        : "";
  const done = generation?.status === "completed" && !running;
  const firstDay = kept[0]?.when ?? (event ? addDays(event, -7) : null);
  const progress = generation?.progress ?? 0;

  return (
    <section aria-labelledby={`${ids}-title`} className="rounded-xl border border-border bg-card p-5">
      <h3 id={`${ids}-title`} className="text-sm font-semibold text-foreground">
        Countdown posts
      </h3>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        Posts leading up to the event, written from the flyer and planned in the Planner. Mindra posts each one by itself
        where you've connected one account for its platform, and otherwise reminds you when it's time.
      </p>

      <form onSubmit={submit} className="mt-4 space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="min-w-0">
            <label htmlFor={`${ids}-date`} className="mb-1.5 block text-sm font-medium text-foreground">
              The event's date
            </label>
            <input
              id={`${ids}-date`}
              type="date"
              value={eventDate}
              onChange={(change) => {
                setEventDate(change.target.value);
                setTyped(true);
                start.reset();
              }}
              disabled={running}
              required
              aria-describedby={`${ids}-date-note`}
              aria-invalid={passedEvent || undefined}
              className={fieldClass}
            />
            <p id={`${ids}-date-note`} className={cn("mt-1.5 text-sm text-pretty", passedEvent ? "text-red-600" : "text-muted-foreground")}>
              {passedEvent && event
                ? `${formatDayLong(event)} has passed. Check the date.`
                : found && !typed
                  ? "Mindra found this date on the flyer. Check it's right."
                  : !found && !eventDate
                    ? "Mindra didn't find the event's date on the flyer. When is it?"
                    : event
                      ? formatDayLong(event)
                      : ""}
            </p>
          </div>
          <div className="min-w-0">
            <label htmlFor={`${ids}-time`} className="mb-1.5 block text-sm font-medium text-foreground">
              Time of day
            </label>
            <input
              id={`${ids}-time`}
              type="time"
              value={time}
              onChange={(change) => setTime(change.target.value)}
              disabled={running}
              required
              className={fieldClass}
            />
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">Days</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {slots.map((slot) => {
              const checked = days.includes(slot.before) && !slot.passed;
              return (
                <label
                  key={slot.before}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors has-disabled:cursor-not-allowed has-disabled:opacity-60",
                    checked ? "border-primary bg-primary/10" : "border-border hover:bg-secondary",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 shrink-0 accent-primary"
                    checked={checked}
                    disabled={running || slot.passed}
                    onChange={() => toggleDay(slot.before)}
                  />
                  <span className="min-w-0">
                    <span className="block font-medium text-foreground">{slot.label}</span>
                    <span className="block text-xs text-muted-foreground tabular-nums">
                      {slot.when ? formatDayShort(slot.when) : "Choose the date first"}
                      {slot.when && slot.passed ? " · passed" : ""}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">Platforms</legend>
          <div className="flex flex-wrap gap-2">
            {choices.map((platform) => {
              const checked = platforms.includes(platform.id);
              return (
                <label
                  key={platform.id}
                  className={cn(
                    "flex h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors has-disabled:cursor-not-allowed has-disabled:opacity-60",
                    checked ? "border-primary bg-primary/10 text-foreground" : "border-border text-secondary-foreground hover:bg-secondary",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={checked}
                    disabled={running}
                    onChange={() => togglePlatform(platform.id)}
                  />
                  {platform.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-pretty text-red-600">
            {error} <SeePlans error={start.error} text={error} />
          </p>
        )}
        {done && (
          <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-pretty text-emerald-800">
            <p>Done. The countdown posts are in the Planner and on the Posts tab.</p>
            {firstDay && (
              <Link
                to={`/planner?date=${dayKey(firstDay)}`}
                className="mt-1 inline-flex items-center gap-1.5 rounded font-medium text-emerald-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <CalendarDays aria-hidden="true" className="size-4" />
                See them in the Planner
              </Link>
            )}
          </div>
        )}
        {done && generation?.notice && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-pretty text-amber-900">{generation.notice}</p>
        )}

        {running ? (
          <div>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span role="status" className="flex items-center gap-2 font-medium text-foreground">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-primary" />
                {generation?.status === "queued" ? "Waiting to start…" : "Writing and planning the countdown…"}
              </span>
              <span className="font-medium text-muted-foreground tabular-nums">{progress}%</span>
            </div>
            <div
              role="progressbar"
              aria-label="Writing the countdown posts"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
              className="h-2 overflow-hidden rounded-full bg-secondary"
            >
              <div
                className="h-full origin-left rounded-full bg-primary transition-transform duration-500 ease-out"
                style={{ transform: `scaleX(${Math.max(progress, 4) / 100})` }}
              />
            </div>
          </div>
        ) : (
          <button type="submit" disabled={!event || passedEvent || total === 0 || start.isPending} className={buttonStyles({ className: "w-full" })}>
            {!event
              ? "Choose the event's date"
              : passedEvent
                ? "The event has passed"
                : platforms.length === 0
                  ? "Choose at least one platform"
                  : kept.length === 0
                    ? "Choose a day that hasn't passed"
                    : start.isPending
                      ? "Starting…"
                      : `Plan ${total} countdown post${total === 1 ? "" : "s"}`}
          </button>
        )}
      </form>
    </section>
  );
}
