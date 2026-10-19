import { useCallback, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "react-router";
import AgendaView from "../components/calendar/AgendaView";
import CalendarNotice, { type Notice } from "../components/calendar/CalendarNotice";
import type { DragAndDrop, DragSource } from "../components/calendar/dragAndDrop";
import MonthView from "../components/calendar/MonthView";
import PostDialog from "../components/calendar/PostDialog";
import ReadyTray from "../components/calendar/ReadyTray";
import ScheduleDialog from "../components/calendar/ScheduleDialog";
import WeekView from "../components/calendar/WeekView";
import { buttonStyles } from "../components/ui/button";
import {
  addDays,
  addMonths,
  dayKey,
  formatDayShort,
  formatScheduled,
  formatTime,
  groupByDay,
  monthGrid,
  parseDayKey,
  postSummary,
  scheduleProblem,
  scheduleStatus,
  startOfMonth,
  toOffsetIso,
  useScheduledPosts,
  useMarkPosted,
  useSchedulePost,
  useUnscheduledPosts,
  weekDays,
} from "../lib/calendar";
import { cn } from "../lib/cn";
import { useContentPiece } from "../lib/content";
import type { ContentPiece } from "../lib/types";
import { useMediaQuery } from "../lib/useMediaQuery";

type View = "month" | "week" | "agenda";

const VIEWS: { id: View; label: string }[] = [
  { id: "month", label: "Month" },
  { id: "week", label: "Week" },
  { id: "agenda", label: "Agenda" },
];

const TRAY_PAGE = 20;

const isView = (value: string | null): value is View => VIEWS.some((view) => view.id === value);

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** "20–26 Oct 2026". */
function formatWeek(start: Date, end: Date) {
  const format = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });
  const ranged = format as Intl.DateTimeFormat & { formatRange?: (from: Date, to: Date) => string };
  return ranged.formatRange ? ranged.formatRange(start, end) : `${format.format(start)} – ${format.format(end)}`;
}

/**
 * The content calendar: a month, a week or an agenda of scheduled posts, with the posts that aren't scheduled yet
 * beside it. The view, the day and the open post live in the address (?view=week&date=2026-10-26&post=<id>), so the
 * dashboard can link to a post and the back button leaves the page.
 */
export default function Calendar() {
  const wide = useMediaQuery("(min-width: 768px)");
  // Drag and drop needs a mouse or trackpad; phones use the buttons.
  const mouse = useMediaQuery("(hover: hover) and (pointer: fine)");
  const [params, setParams] = useSearchParams();
  const requestedView = params.get("view");
  const view: View = isView(requestedView) ? requestedView : wide ? "month" : "agenda";
  const today = dayKey(new Date());
  const anchorKey = parseDayKey(params.get("date")) ? params.get("date")! : today;
  const postId = params.get("post");

  const setParam = useCallback(
    (changes: Record<string, string | null>) =>
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          for (const [name, value] of Object.entries(changes)) {
            if (value === null) next.delete(name);
            else next.set(name, value);
          }
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const period = useMemo(() => {
    const anchor = parseDayKey(anchorKey)!;
    if (view === "week") {
      const days = weekDays(anchor);
      return {
        days,
        start: days[0],
        end: addDays(days[0], 7),
        month: anchor,
        title: formatWeek(days[0], days[6]),
        name: "this week",
        step: (direction: number) => dayKey(addDays(anchor, 7 * direction)),
        previous: "Previous week",
        next: "Next week",
      };
    }
    const month = startOfMonth(anchor);
    const monthDays = Array.from({ length: new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate() }, (_, index) =>
      addDays(month, index),
    );
    const days = view === "month" ? monthGrid(anchor) : monthDays;
    const title = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    return {
      days,
      start: days[0],
      end: addDays(days[days.length - 1], 1),
      month,
      title,
      name: month.toLocaleDateString(undefined, { month: "long" }),
      step: (direction: number) => dayKey(addMonths(month, direction)),
      previous: "Previous month",
      next: "Next month",
    };
  }, [view, anchorKey]);

  const scheduled = useScheduledPosts(period.start, period.end);
  const [trayCount, setTrayCount] = useState(TRAY_PAGE);
  const tray = useUnscheduledPosts(trayCount);
  const schedule = useSchedulePost();
  const markPosted = useMarkPosted();

  // Posts being moved by a drag show on their new day straight away, until the server answers.
  const [moving, setMoving] = useState<Record<string, string>>({});
  const posts = useMemo(
    () =>
      groupByDay(
        (scheduled.data?.results ?? []).map((piece) => (moving[piece.id] ? { ...piece, scheduled_at: moving[piece.id] } : piece)),
      ),
    [scheduled.data, moving],
  );

  const shownDays = view === "month" ? period.days.filter((day) => day.getMonth() === period.month.getMonth()) : period.days;
  const shownPosts = shownDays.flatMap((day) => posts.get(dayKey(day)) ?? []);
  const missed = shownPosts.filter((piece) => scheduleStatus(piece) === "missed").length;

  // --- Notes and Undo ------------------------------------------------------------------------------------------------

  const [notice, setNotice] = useState<Notice | null>(null);
  const dismiss = useCallback(() => setNotice(null), []);

  /** Put a post back where it was (a time, or off the calendar), for Undo. */
  const restore = (piece: ContentPiece, previous: string | null) =>
    schedule
      .mutateAsync({ id: piece.id, scheduled_at: previous })
      .then(() => setNotice({ text: previous ? `Moved back to ${formatScheduled(previous)}.` : "Taken off the calendar." }))
      .catch((error: Error) => setNotice({ error: true, text: `Couldn't undo: ${error.message}` }));

  /** Post now, undone: not posted, so off the calendar again. */
  const unpost = (piece: ContentPiece) =>
    markPosted
      .mutateAsync({ id: piece.id, posted: false })
      .then(() => setNotice({ text: "Not posted. It's back in Ready to schedule." }))
      .catch((error: Error) => setNotice({ error: true, text: `Couldn't undo: ${error.message}` }));

  /** After the schedule dialog or a post's dialog changed a post. */
  const changed = (saved: ContentPiece, previous: string | null) => {
    if (saved.posted_at && !previous && saved.scheduled_at === saved.posted_at) {
      setNotice({ text: "Marked as posted. It's on today's calendar.", undo: () => unpost(saved) });
    } else if (!saved.scheduled_at) {
      setParam({ post: null });
      setNotice({ text: "Taken off the calendar. It's back in Ready to schedule.", undo: () => restore(saved, previous) });
    } else if (!previous) {
      setNotice({ text: `Scheduled for ${formatScheduled(saved.scheduled_at)}.`, undo: () => restore(saved, null) });
    } else if (saved.scheduled_at !== previous) {
      setNotice({ text: `Moved to ${formatScheduled(saved.scheduled_at)}.`, undo: () => restore(saved, previous) });
    }
  };

  // --- Drag and drop -------------------------------------------------------------------------------------------------

  const [dragging, setDragging] = useState<DragSource | null>(null);
  const [overDay, setOverDay] = useState<string | null>(null);
  // A post from the tray dropped on a day: the schedule dialog opens with that day filled in.
  const [dropped, setDropped] = useState<{ piece: ContentPiece; day: string } | null>(null);
  const [droppedOpen, setDroppedOpen] = useState(false);

  const move = (piece: ContentPiece, day: string) => {
    const previous = piece.scheduled_at;
    if (!previous) return;
    const from = new Date(previous);
    const to = parseDayKey(day)!;
    to.setHours(from.getHours(), from.getMinutes(), 0, 0);
    if (to.getTime() === from.getTime()) return;
    const problem = scheduleProblem(to);
    if (problem) {
      setNotice({
        error: true,
        text:
          problem === "Pick a time in the future."
            ? `${formatTime(from)} on ${formatDayShort(to)} has already passed. Drop it on a later day, or open it and use Reschedule.`
            : problem,
      });
      return;
    }
    const iso = toOffsetIso(to);
    setMoving((current) => ({ ...current, [piece.id]: iso }));
    schedule
      .mutateAsync({ id: piece.id, scheduled_at: iso })
      .then((saved) =>
        setNotice({
          text: `Moved “${postSummary(saved)}” to ${formatScheduled(saved.scheduled_at ?? iso)}.`,
          undo: () => restore(saved, previous),
        }),
      )
      .catch((error: Error) => setNotice({ error: true, text: error.message }))
      .finally(() =>
        setMoving((current) => {
          const next = { ...current };
          delete next[piece.id];
          return next;
        }),
      );
  };

  const drop = (day: string) => {
    const source = dragging;
    setDragging(null);
    setOverDay(null);
    if (!source) return;
    if (source.from === "tray") {
      setDropped({ piece: source.piece, day });
      setDroppedOpen(true);
    } else {
      move(source.piece, day);
    }
  };

  const dnd: DragAndDrop = {
    enabled: mouse,
    dragging,
    overDay,
    start: (source, event) => {
      event.dataTransfer.effectAllowed = "move";
      // Firefox only starts a drag that carries some data.
      event.dataTransfer.setData("text/plain", postSummary(source.piece));
      setDragging(source);
    },
    end: () => {
      setDragging(null);
      setOverDay(null);
    },
    dayTarget: (day) => ({
      onDragOver: (event) => {
        // Days that have gone can't take a post.
        if (!dragging || day < today) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (overDay !== day) setOverDay(day);
      },
      onDragLeave: (event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setOverDay((current) => (current === day ? null : current));
      },
      onDrop: (event) => {
        event.preventDefault();
        drop(day);
      },
    }),
  };

  // --- The open post -------------------------------------------------------------------------------------------------

  const listed = postId
    ? (scheduled.data?.results.find((piece) => piece.id === postId) ?? tray.data?.results.find((piece) => piece.id === postId))
    : undefined;
  const fetched = useContentPiece(postId && !listed ? postId : undefined);
  const openPiece = listed ?? (postId ? fetched.data : undefined);
  // Keep showing the post while its dialog closes.
  const [shownPiece, setShownPiece] = useState<ContentPiece | undefined>(openPiece);
  if (openPiece && openPiece !== shownPiece) setShownPiece(openPiece);
  const postError = postId && !listed && fetched.isError ? "We couldn't find that post. It may have been deleted." : "";

  const postHref = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("post", id);
    return `?${next}`;
  };

  const waiting = (tray.data?.results ?? []).filter((piece) => !piece.scheduled_at);
  const label = `${period.title}, ${plural(shownPosts.length, "post")}`;

  let subtitle = `${plural(shownPosts.length, "post")} planned ${view === "week" ? period.name : `in ${period.name}`}`;
  if (missed > 0) subtitle += ` · ${missed} missed`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-balance text-foreground">Content Calendar</h2>
          <p className="mt-1 text-sm text-pretty text-muted-foreground tabular-nums">
            {scheduled.isPending ? "Loading your posts…" : subtitle}
          </p>
        </div>
        <div role="group" aria-label="Calendar view" className="flex gap-1 rounded-lg bg-secondary p-1">
          {VIEWS.map((option) => {
            const active = view === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={active}
                onClick={() => setParam({ view: option.id })}
                className={buttonStyles({
                  variant: "ghost",
                  size: "sm",
                  className: cn(active && "bg-white text-foreground shadow-sm hover:bg-white"),
                })}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <section
          aria-labelledby="calendar-period"
          aria-busy={scheduled.isFetching}
          className="min-w-0 overflow-hidden rounded-xl border border-border bg-white"
        >
          <div className="flex items-center gap-1 border-b border-border px-2 py-2 sm:px-3">
            <button
              type="button"
              onClick={() => setParam({ date: period.step(-1) })}
              aria-label={period.previous}
              className={buttonStyles({ variant: "ghost", size: "icon" })}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setParam({ date: period.step(1) })}
              aria-label={period.next}
              className={buttonStyles({ variant: "ghost", size: "icon" })}
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
            <h3 id="calendar-period" className="ml-1 min-w-0 truncate font-semibold text-foreground tabular-nums">
              {period.title}
            </h3>
            <button
              type="button"
              onClick={() => setParam({ date: null })}
              className={buttonStyles({ variant: "secondary", size: "sm", className: "ml-auto" })}
            >
              Today
            </button>
          </div>

          {scheduled.isError && (
            <div className="flex flex-wrap items-center gap-3 border-b border-border bg-red-50 px-4 py-3">
              <p role="alert" className="min-w-0 flex-1 text-sm text-pretty text-red-700">
                {scheduled.error.message}
              </p>
              <button type="button" onClick={() => scheduled.refetch()} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                Try again
              </button>
            </div>
          )}

          {view === "month" ? (
            <MonthView
              days={period.days}
              month={period.month}
              posts={posts}
              today={today}
              dnd={dnd}
              postHref={postHref}
              onShowDay={(day) => setParam({ view: "week", date: day })}
              label={label}
            />
          ) : view === "week" ? (
            <WeekView days={period.days} posts={posts} today={today} dnd={dnd} postHref={postHref} label={label} />
          ) : (
            <AgendaView days={period.days} posts={posts} today={today} dnd={dnd} postHref={postHref} periodName={period.title} />
          )}
        </section>

        <div className="min-w-0 lg:sticky lg:top-0 lg:self-start">
          <ReadyTray
            posts={waiting}
            total={tray.data?.count ?? 0}
            loading={tray.isPending}
            error={tray.isError ? tray.error.message : ""}
            onRetry={() => tray.refetch()}
            onShowMore={() => setTrayCount((count) => Math.min(200, count + TRAY_PAGE))}
            loadingMore={tray.isPlaceholderData}
            dnd={dnd}
            onScheduled={changed}
          />
        </div>
      </div>

      <PostDialog
        piece={postId ? openPiece : shownPiece}
        open={Boolean(postId)}
        onOpenChange={(open) => !open && setParam({ post: null })}
        error={postError}
        onRescheduled={changed}
      />

      {dropped && (
        <ScheduleDialog
          piece={dropped.piece}
          day={dropped.day}
          open={droppedOpen}
          onOpenChange={setDroppedOpen}
          onDone={changed}
        />
      )}

      <CalendarNotice notice={notice} onDismiss={dismiss} />
    </div>
  );
}
