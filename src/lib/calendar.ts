// The content calendar: dates in the browser's time zone, schedule statuses, and the hooks that put posts on the
// calendar, move them, take them off and mark them as posted.

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import { useContentList } from "./content";
import type { ConnectedAccountId, ContentPiece, Paginated, ScheduleStatus } from "./types";

const pad = (value: number) => String(value).padStart(2, "0");
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/** The API takes times at least this far ahead. */
export const EARLIEST_AHEAD_MS = MINUTE;
/** And at most a year ahead. */
export const LATEST_AHEAD_DAYS = 365;

type Status = Exclude<ScheduleStatus, "">;

/** How each status looks: a label, a chip, and a coloured edge or dot for the calendar. */
export const SCHEDULE_STATUS: Record<Status, { label: string; chip: string; edge: string; dot: string }> = {
  planned: { label: "Planned", chip: "bg-primary/10 text-primary", edge: "border-l-primary", dot: "bg-primary" },
  reminded: { label: "Reminded", chip: "bg-amber-50 text-amber-800", edge: "border-l-amber-500", dot: "bg-amber-500" },
  posted: { label: "Posted", chip: "bg-emerald-50 text-emerald-700", edge: "border-l-emerald-500", dot: "bg-emerald-500" },
  missed: { label: "Missed", chip: "bg-red-50 text-red-700", edge: "border-l-red-500", dot: "bg-red-500" },
  // Automatic posting: on its way (the accent, like planned), out (green, like posted), or given up (red, like missed).
  publishing: { label: "Posting", chip: "bg-primary/10 text-primary", edge: "border-l-primary", dot: "bg-primary" },
  published: { label: "Published", chip: "bg-emerald-50 text-emerald-700", edge: "border-l-emerald-500", dot: "bg-emerald-500" },
  failed: { label: "Failed", chip: "bg-red-50 text-red-700", edge: "border-l-red-500", dot: "bg-red-500" },
};

/** It went out: marked as posted, or posted by Mindra. */
export function isPostedStatus(status: Status | null): boolean {
  return status === "posted" || status === "published";
}

/** It went out or is going out now, so it can't be moved or posted again. */
export function isSettledStatus(status: Status | null): boolean {
  return isPostedStatus(status) || status === "publishing";
}

/** A post's status, or null when it isn't scheduled (also when talking to an API without the calendar yet). */
export function scheduleStatus(piece: Pick<ContentPiece, "scheduled_at" | "schedule_status">): Status | null {
  if (!piece.scheduled_at) return null;
  return piece.schedule_status || "planned";
}

/** What a post is called on the calendar: its label, or the first line of its text. */
export function postSummary(piece: Pick<ContentPiece, "title" | "body">): string {
  const label = piece.title.trim();
  if (label) return label;
  return piece.body.trim().split("\n")[0]?.trim() || "Untitled post";
}

// --- Days ----------------------------------------------------------------------------------------------------------

/** "2026-10-26" for a day in the browser's time zone. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The start of the day a "2026-10-26" key names, or null if it isn't one. */
export function parseDayKey(key: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key ?? "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) || dayKey(date) !== key ? null : date;
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Calendar days later (or earlier), at the same clock time, whatever the daylight saving changes. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function sameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b);
}

/** The weekday weeks start on where the browser is (0 Sunday … 6 Saturday); Monday when the browser can't say. */
export function firstDayOfWeek(): number {
  try {
    const locale = new Intl.Locale(navigator.language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const firstDay = (locale.getWeekInfo?.() ?? locale.weekInfo)?.firstDay;
    return firstDay ? firstDay % 7 : 1;
  } catch {
    return 1;
  }
}

export function startOfWeek(date: Date, firstDay = firstDayOfWeek()): Date {
  const start = startOfDay(date);
  return addDays(start, -((start.getDay() - firstDay + 7) % 7));
}

/** The seven days of the week a date is in. */
export function weekDays(date: Date): Date[] {
  const start = startOfWeek(date);
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

/** Every day the month view shows: whole weeks from the one the month starts in to the one it ends in. */
export function monthGrid(date: Date): Date[] {
  const first = startOfMonth(date);
  const start = startOfWeek(first);
  const end = addDays(startOfWeek(new Date(first.getFullYear(), first.getMonth() + 1, 0)), 7);
  const days: Date[] = [];
  for (let day = start; day < end; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Posts by the day they're scheduled for, in time order. */
export function groupByDay(pieces: ContentPiece[]): Map<string, ContentPiece[]> {
  const days = new Map<string, ContentPiece[]>();
  const sorted = pieces
    .filter((piece) => piece.scheduled_at)
    .sort((a, b) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime());
  for (const piece of sorted) {
    const key = dayKey(new Date(piece.scheduled_at!));
    days.set(key, [...(days.get(key) ?? []), piece]);
  }
  return days;
}

// --- Times ---------------------------------------------------------------------------------------------------------

/** "07:00", for a time input. */
export function timeValue(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A day key and an "07:00" time as a moment in the browser's time zone, or null if either is missing. */
export function combine(day: string, time: string): Date | null {
  const date = parseDayKey(day);
  const match = /^(\d{2}):(\d{2})/.exec(time);
  if (!date || !match) return null;
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

/** "2026-10-26T07:00:00+01:00": the time as the browser shows it, with its offset, for the API. */
export function toOffsetIso(date: Date): string {
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const hours = pad(Math.floor(Math.abs(offset) / 60));
  const minutes = pad(Math.abs(offset) % 60);
  return `${dayKey(date)}T${timeValue(date)}:00${sign}${hours}:${minutes}`;
}

/** The browser's time zone by name, such as "West Africa Time". */
export function timeZoneName(date = new Date()): string {
  for (const style of ["longGeneric", "long"] as const) {
    try {
      const part = new Intl.DateTimeFormat(undefined, { timeZoneName: style })
        .formatToParts(date)
        .find((item) => item.type === "timeZoneName");
      if (part?.value) return part.value;
    } catch {
      // Older browsers don't know "longGeneric".
    }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "your time zone";
}

const sameYear = (date: Date) => date.getFullYear() === new Date().getFullYear();

/** "7:00 am" in the browser's own style. */
export function formatTime(value: string | Date): string {
  return new Date(value).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "Sun 26 Oct, 7:00 am", with the year only when it isn't this year. */
export function formatScheduled(value: string | Date): string {
  const date = new Date(value);
  return date.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: sameYear(date) ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Sunday 26 October". */
export function formatDayLong(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: sameYear(date) ? undefined : "numeric",
  });
}

/** "Sun 26 Oct". */
export function formatDayShort(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: sameYear(date) ? undefined : "numeric",
  });
}

/** Why a time can't be used, in the API's words, or "" when it can. */
export function scheduleProblem(when: Date | null, now = new Date()): string {
  if (!when) return "Pick a date and a time.";
  if (when.getTime() < now.getTime() + EARLIEST_AHEAD_MS) return "Pick a time in the future.";
  if (when.getTime() > now.getTime() + LATEST_AHEAD_DAYS * DAY) return "Pick a time within the next year.";
  return "";
}

/** The ready-made times the schedule dialog offers: tomorrow morning, and the coming Saturday evening and Sunday morning. */
export function quickPicks(now = new Date()): { id: string; name: string; date: Date }[] {
  const at = (day: Date, hours: number) => {
    const date = new Date(day);
    date.setHours(hours, 0, 0, 0);
    return date;
  };
  const next = (weekday: number, hours: number) => {
    for (let days = 0; days < 8; days++) {
      const date = at(addDays(now, days), hours);
      if (date.getDay() === weekday && date.getTime() > now.getTime() + 5 * MINUTE) return date;
    }
    return at(addDays(now, 7), hours);
  };
  const weekdayName = (date: Date) => date.toLocaleDateString(undefined, { weekday: "long" });
  const saturday = next(6, 18);
  const sunday = next(0, 7);
  return [
    { id: "tomorrow", name: "Tomorrow", date: at(addDays(now, 1), 9) },
    { id: "saturday", name: weekdayName(saturday), date: saturday },
    { id: "sunday", name: weekdayName(sunday), date: sunday },
  ];
}

/** Where a new post goes on a day: 9:00, or the next whole hour when that's already gone today. */
export function defaultTimeFor(day: Date, now = new Date()): Date {
  const date = new Date(day);
  date.setHours(9, 0, 0, 0);
  if (date.getTime() > now.getTime() + 5 * MINUTE) return date;
  const later = new Date(now);
  later.setHours(now.getHours() + 1, 0, 0, 0);
  return sameDay(later, day) ? later : date;
}

// --- Hooks ---------------------------------------------------------------------------------------------------------

/** Posts on the calendar between two moments (the start inclusive), in time order. */
export function useScheduledPosts(start: Date, end: Date) {
  return useContentList({ scheduledAfter: start.toISOString(), scheduledBefore: end.toISOString(), pageSize: 200 });
}

/** Posts that aren't on the calendar, newest first. */
export function useUnscheduledPosts(pageSize: number) {
  return useContentList({ scheduled: false, pageSize });
}

/**
 * The next scheduled posts that haven't gone out, for the dashboard: overdue ones first (missed, or past their time),
 * then the coming ones, in time order.
 */
export function useComingUp(limit = 5) {
  // From a week back, so recently missed posts show; fixed when the page opens so the query doesn't change each render.
  const [since] = useState(() => {
    const date = new Date(Date.now() - 7 * DAY);
    date.setSeconds(0, 0);
    return date.toISOString();
  });
  const query = useContentList({ scheduledAfter: since, pageSize: 100 });
  const now = Date.now();
  const waiting = (query.data?.results ?? []).filter((piece) => piece.scheduled_at && !isPostedStatus(scheduleStatus(piece)));
  const overdue = waiting.filter((piece) => new Date(piece.scheduled_at!).getTime() <= now);
  const coming = waiting.filter((piece) => new Date(piece.scheduled_at!).getTime() > now);
  const byTime = (a: ContentPiece, b: ContentPiece) => new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime();
  const needsYou = (piece: ContentPiece) => Number(scheduleStatus(piece) === "missed" || scheduleStatus(piece) === "failed");
  const missedFirst = (a: ContentPiece, b: ContentPiece) => needsYou(b) - needsYou(a) || byTime(a, b);
  return { ...query, posts: [...overdue.sort(missedFirst), ...coming.sort(byTime)].slice(0, limit) };
}

/** Show a saved post everywhere at once (so a moved post doesn't jump back while lists reload), then reload the lists. */
export function useStorePiece() {
  const queryClient = useQueryClient();
  return (piece: ContentPiece) => {
    queryClient.setQueryData(["content", "detail", piece.id], piece);
    queryClient.setQueriesData<Paginated<ContentPiece>>({ queryKey: ["content", "list"] }, (data) =>
      data ? { ...data, results: data.results.map((item) => (item.id === piece.id ? piece : item)) } : data,
    );
    queryClient.invalidateQueries({ queryKey: ["content", "list"] });
  };
}

/**
 * Put a post on the calendar, move it (an ISO time with its offset), or take it off (null). `publish_to` (sent only when
 * given) sets the account it's posted to automatically at that time, or null to only remind.
 */
export function useSchedulePost() {
  const store = useStorePiece();
  return useMutation({
    mutationFn: ({ id, scheduled_at, publish_to }: { id: string; scheduled_at: string | null; publish_to?: ConnectedAccountId | null }) =>
      apiRequest<ContentPiece>(`/api/content/${id}/`, {
        method: "PATCH",
        body: publish_to === undefined ? { scheduled_at } : { scheduled_at, publish_to },
      }),
    onSuccess: store,
  });
}

/** Mark a post as posted, or not. */
export function useMarkPosted() {
  const store = useStorePiece();
  return useMutation({
    mutationFn: ({ id, posted }: { id: string; posted: boolean }) =>
      apiRequest<ContentPiece>(`/api/content/${id}/posted/`, { method: "POST", body: { posted } }),
    onSuccess: store,
  });
}
