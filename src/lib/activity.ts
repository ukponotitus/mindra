import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { ActivityEvent, ActivitySummary, ActivityType, Paginated } from "./types";

// The Activity log (the backend's engagement/activity.py): what Mindra and the people in the workspace did, newest first.

export type ActivityPeriod = "" | "7" | "30" | "90";

export const ACTIVITY_PERIODS: { id: ActivityPeriod; label: string }[] = [
  { id: "", label: "All time" },
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
];

export const ACTIVITY_TYPES: { id: ActivityType | ""; label: string }[] = [
  { id: "", label: "All activity" },
  { id: "posting", label: "Posting" },
  { id: "planning", label: "Planning" },
  { id: "videos", label: "Videos" },
  { id: "accounts", label: "Accounts" },
];

export type ActivityFilters = { days: ActivityPeriod; type: ActivityType | ""; search: string };

function activityQuery(filters: ActivityFilters, page = 1): string {
  const params = new URLSearchParams();
  if (filters.days) params.set("days", filters.days);
  if (filters.type) params.set("type", filters.type);
  if (filters.search) params.set("search", filters.search);
  if (page > 1) params.set("page", String(page));
  return params.toString();
}

/** The log, 50 events a page; `fetchNextPage` adds the next. */
export function useActivity(filters: ActivityFilters) {
  return useInfiniteQuery({
    queryKey: ["activity", "list", filters],
    queryFn: ({ pageParam }) => apiRequest<Paginated<ActivityEvent>>(`/api/activity/?${activityQuery(filters, pageParam)}`),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => (last.next ? pages.length + 1 : undefined),
    placeholderData: keepPreviousData,
  });
}

/** The period's counts: posted automatically, posted by hand, failed and reminders sent. */
export function useActivitySummary(days: ActivityPeriod) {
  return useQuery({
    queryKey: ["activity", "summary", days],
    queryFn: () => apiRequest<ActivitySummary>(`/api/activity/summary/?${activityQuery({ days, type: "", search: "" })}`),
  });
}
