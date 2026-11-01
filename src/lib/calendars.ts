import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { Platform } from "./types";

// The content calendar (the backend's calendars/): what goes out, when and where, drafted with AI as versions and
// approved before anything is written. Approved items show in the Planner as planned.

export type VersionStatus = "generating" | "draft" | "approved" | "rejected" | "failed";
export type ItemStatus =
  | "proposed"
  | "rejected"
  | "calendar_approved"
  | "plan_generated"
  | "plan_approved"
  | "in_production"
  | "ready"
  | "content_approved";

export type CalendarVersion = {
  id: string;
  number: number;
  status: VersionStatus;
  request: string;
  error: string;
  items: number;
  decided_at: string | null;
  created_at: string;
};

export type ContentCalendar = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  /** Posts a week on each platform. */
  cadence: Partial<Record<Platform, number>>;
  instructions: string;
  campaign: string | null;
  campaign_name: string;
  versions: CalendarVersion[];
  approved_items: number;
  /** Posts on each platform over the dates. */
  wanted: Partial<Record<Platform, number>>;
  created_at: string;
  updated_at: string;
};

export type CalendarItem = {
  id: string;
  calendar: string;
  calendar_name: string;
  version: string;
  scheduled_for: string;
  platform: Platform;
  topic: string;
  pillar: string;
  objective: string;
  format: string;
  angle: string;
  description: string;
  cta: string;
  campaign: string | null;
  campaign_name: string;
  status: ItemStatus;
  status_label: string;
  post_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemChanges = Partial<Pick<CalendarItem, "scheduled_for" | "platform" | "topic" | "pillar" | "objective" | "format" | "angle" | "description" | "cta">>;

export const FORMATS: { id: string; label: string }[] = [
  { id: "post", label: "Text post" },
  { id: "image", label: "Image post" },
  { id: "carousel", label: "Carousel" },
  { id: "short_video", label: "Short video" },
  { id: "video", label: "Long video" },
  { id: "story", label: "Story or status" },
  { id: "article", label: "Article or newsletter" },
];

export const OBJECTIVES: { id: string; label: string }[] = [
  { id: "awareness", label: "Awareness" },
  { id: "engagement", label: "Engagement" },
  { id: "traffic", label: "Traffic" },
  { id: "conversion", label: "Sales or sign-ups" },
  { id: "community", label: "Community" },
  { id: "education", label: "Education" },
];

export const VERSION_LABELS: Record<VersionStatus, string> = {
  generating: "Being drafted",
  draft: "Draft",
  approved: "Approved",
  rejected: "Rejected",
  failed: "Couldn't be drafted",
};

export function formatLabel(id: string) {
  return FORMATS.find((format) => format.id === id)?.label ?? id;
}

const listKey = ["calendars", "list"];
const detailKey = (id: string) => ["calendars", "detail", id];
const itemsKey = (versionId: string) => ["calendars", "items", versionId];

export function useCalendars() {
  return useQuery({ queryKey: listKey, queryFn: () => apiRequest<ContentCalendar[]>("/api/calendars/") });
}

/** One calendar; checked every few seconds while a version is being drafted. */
export function useCalendar(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => apiRequest<ContentCalendar>(`/api/calendars/${id}/`),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.versions.some((version) => version.status === "generating") ? 3000 : false),
  });
}

export function useVersionItems(versionId: string | undefined, status?: VersionStatus) {
  return useQuery({
    queryKey: [...itemsKey(versionId ?? ""), status],
    queryFn: () => apiRequest<CalendarItem[]>(`/api/calendar-items/?version=${versionId}`),
    enabled: Boolean(versionId) && status !== "generating",
  });
}

/** Approved items without a post yet, for the Planner. */
export function usePlannedItems(start: Date, end: Date) {
  return useQuery({
    queryKey: ["calendars", "planned", start.toISOString(), end.toISOString()],
    queryFn: () =>
      apiRequest<CalendarItem[]>(`/api/calendar-items/?planned=1&start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`),
  });
}

export type NewCalendar = Pick<ContentCalendar, "name" | "starts_on" | "ends_on" | "cadence" | "instructions" | "campaign">;

export function useCreateCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (calendar: NewCalendar) => apiRequest<ContentCalendar>("/api/calendars/", { method: "POST", body: calendar }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });
}

export function useDeleteCalendar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/calendars/${id}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendars"] }),
  });
}

export function useGenerateVersion(calendarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: string) => apiRequest<CalendarVersion>(`/api/calendars/${calendarId}/generate/`, { method: "POST", body: { request } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: detailKey(calendarId) }),
  });
}

export function useDecideVersion(calendarId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      apiRequest<CalendarVersion>(`/api/calendar-versions/${id}/${decision}/`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: detailKey(calendarId) });
      queryClient.invalidateQueries({ queryKey: ["calendars", "items"] });
      queryClient.invalidateQueries({ queryKey: ["calendars", "planned"] });
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

function useItemsChanged() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["calendars", "items"] });
    queryClient.invalidateQueries({ queryKey: ["calendars", "planned"] });
    queryClient.invalidateQueries({ queryKey: ["calendars", "detail"] });
  };
}

export function useAddItem() {
  const changed = useItemsChanged();
  return useMutation({
    mutationFn: (item: ItemChanges & { version: string }) => apiRequest<CalendarItem>("/api/calendar-items/", { method: "POST", body: item }),
    onSuccess: changed,
  });
}

export function useUpdateItem() {
  const changed = useItemsChanged();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: ItemChanges }) => apiRequest<CalendarItem>(`/api/calendar-items/${id}/`, { method: "PATCH", body: changes }),
    onSuccess: changed,
  });
}

export function useDeleteItem() {
  const changed = useItemsChanged();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/calendar-items/${id}/`, { method: "DELETE" }),
    onSuccess: changed,
  });
}

export function useRegenerateItem() {
  const changed = useItemsChanged();
  return useMutation({
    mutationFn: (id: string) => apiRequest<CalendarItem>(`/api/calendar-items/${id}/regenerate/`, { method: "POST", body: {} }),
    onSuccess: changed,
  });
}
