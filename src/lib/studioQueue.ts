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
  /** Its post's newest graphic (src/lib/graphics.ts), or null. */
  graphic: { id: string; template: string; status: "writing" | "rendering" | "ready" | "failed"; error: string; working: boolean; slides: number } | null;
  /** Its video made from the brief in Motion Studio, or null before one is asked for. */
  video: StudioVideo | null;
};

export type StudioVideo = {
  project: string;
  /** drafting: the AI writes the draft; waiting: the draft needs the person in Motion Studio; then rendering, ready or failed. */
  stage: "drafting" | "waiting" | "rendering" | "ready" | "failed";
  progress: number;
  error: string;
};

/** Whether the server is working on the item: its post, graphic or video. */
export function inProgress(item: StudioItem) {
  return item.writing || Boolean(item.graphic?.working) || item.video?.stage === "drafting" || item.video?.stage === "rendering";
}

/** The item statuses the Content Studio lists (its brief approved, or further). */
export const IN_STUDIO = ["plan_approved", "in_production", "ready", "content_approved"];

const queueKey = ["studio-queue"];

export function useStudioQueue() {
  return useQuery({
    queryKey: queueKey,
    queryFn: () => apiRequest<StudioItem[]>("/api/studio-queue/"),
    // While posts, graphics and videos are made, until each is in (or says why not).
    refetchInterval: (query) => (query.state.data?.some(inProgress) ? 3000 : false),
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

/** Have the AI write the item's graphic or carousel slides from its brief, drawn onto its post. */
export function useMakeItemGraphic() {
  const changed = useQueueChanged();
  return useMutation({
    mutationFn: (itemId: string) => apiRequest<StudioItem>(`/api/calendar-items/${itemId}/graphic/`, { method: "POST" }),
    onSuccess: changed,
  });
}

/** Have Motion Studio's AI make the item's video from its brief, then put it on its post. */
export function useMakeItemVideo() {
  const changed = useQueueChanged();
  return useMutation({
    mutationFn: (itemId: string) => apiRequest<StudioItem>(`/api/calendar-items/${itemId}/video/`, { method: "POST" }),
    onSuccess: changed,
  });
}
