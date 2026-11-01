import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { PlanItem } from "./briefs";

// The Content Studio (the backend's calendars/studio.py, Phase 5): every item with an approved brief, its post made from
// the brief, reviewed and approved onto the schedule. Only an approved post goes out.

export type StudioPost = {
  id: string;
  title: string;
  body: string;
  status: "draft" | "approved";
  scheduled_at: string | null;
  schedule_status: string;
  publish_to: number | null;
  published_url: string;
};

export type StudioItem = PlanItem & {
  /** What its format needs besides text: "photos", "video" or "". */
  needs: "photos" | "video" | "";
  /** What it still lacks. */
  missing: "photos" | "video" | "";
  post: StudioPost | null;
  /** Its post is being written on the server (it carries on if the page is closed). */
  writing: boolean;
  /** Why the last try to write its post failed, until the next try; or "". */
  post_error: string;
};

/** The item statuses the Content Studio lists (its brief approved, or further). */
export const IN_STUDIO = ["plan_approved", "in_production", "ready", "content_approved"];

const queueKey = ["studio-queue"];

export function useStudioQueue() {
  return useQuery({
    queryKey: queueKey,
    queryFn: () => apiRequest<StudioItem[]>("/api/studio-queue/"),
    // While posts are written, until each is in (or says why not).
    refetchInterval: (query) => (query.state.data?.some((item) => item.writing) ? 3000 : false),
  });
}

function useQueueChanged() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: queueKey });
    queryClient.invalidateQueries({ queryKey: ["content"] });
    queryClient.invalidateQueries({ queryKey: ["calendars"] });
  };
}

export function useMakePost() {
  const changed = useQueueChanged();
  return useMutation({
    mutationFn: (itemId: string) => apiRequest<StudioItem>(`/api/calendar-items/${itemId}/make/`, { method: "POST" }),
    onSuccess: changed,
  });
}

/** Write the post of every item ready to make, one after another on the server. */
export function useMakeAll() {
  const changed = useQueueChanged();
  return useMutation({
    mutationFn: () => apiRequest<{ started: number }>("/api/studio-queue/make-all/", { method: "POST" }),
    onSuccess: changed,
  });
}

export function useApprovePost() {
  const changed = useQueueChanged();
  return useMutation({
    mutationFn: (itemId: string) => apiRequest<StudioItem>(`/api/calendar-items/${itemId}/approve-post/`, { method: "POST" }),
    onSuccess: changed,
  });
}

/** Where to make a video for the item: Motion Studio's "Create with AI", started from its brief. */
export function studioVideoLink(item: StudioItem) {
  const brief = item.brief;
  const prompt = [item.topic, brief?.hook, brief?.outline].filter(Boolean).join("\n\n");
  const params = new URLSearchParams({ name: item.topic, prompt: prompt.slice(0, 1500) });
  return `/studio/new?${params.toString()}`;
}
