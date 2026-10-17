import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { Paginated, Platform } from "./types";

// Shapes of the clips API (see mindra-backend/clips).

export type ClipStatus = "suggested" | "rendering" | "ready" | "failed";
export type CaptionStyle = "bold" | "clean" | "none";

export type Clip = {
  id: string;
  project: string;
  project_name: string;
  start: number;
  end: number;
  duration: number;
  score: number;
  title: string;
  hook: string;
  caption: string;
  reason: string;
  caption_style: CaptionStyle;
  /** Made by someone choosing the times, rather than suggested by Mindra. */
  custom: boolean;
  status: ClipStatus;
  error: string;
  /** Rendered, but trimmed or restyled since: render again to update the video. */
  is_stale: boolean;
  video_url: string | null;
  download_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

export type ClipSearch = { status: "" | "finding" | "done" | "failed"; error: string };

export type ProjectClips = { search: ClipSearch; clips: Clip[] };

export const CAPTION_STYLES: { id: CaptionStyle; label: string; description: string }[] = [
  { id: "bold", label: "Bold", description: "Large words, highlighted as they're spoken" },
  { id: "clean", label: "Clean", description: "Smaller lines on a soft dark box" },
  { id: "none", label: "No captions", description: "For videos that already have captions" },
];

const key = (projectId: string) => ["clips", "project", projectId];

/** A clip's place in its project's Clips tab. */
export function clipPath(clip: Pick<Clip, "id" | "project">) {
  return `/projects/${clip.project}?tab=clips&clip=${clip.id}`;
}

/** The badge for a clip's state. */
export function clipStatusLabel(clip: Clip) {
  if (clip.status === "rendering") return { text: "Rendering", tone: "bg-primary/10 text-primary" };
  if (clip.status === "failed") return { text: "Failed", tone: "bg-red-50 text-red-700" };
  if (clip.status === "ready" && clip.is_stale) return { text: "Changed", tone: "bg-amber-50 text-amber-800" };
  if (clip.status === "ready") return { text: "Ready", tone: "bg-emerald-50 text-emerald-700" };
  return { text: clip.custom ? "Not made yet" : "Suggested", tone: "bg-secondary text-muted-foreground" };
}

/** Where a clip can be posted: the platforms that take short vertical video. */
export const CLIP_PLATFORMS: Platform[] = ["instagram", "tiktok", "youtube_shorts", "facebook", "whatsapp", "x", "linkedin"];

/** Shortest clip the API accepts. */
export const SHORTEST_CLIP_SECONDS = 3;

/** 1:05.4 */
export function formatClipTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds - minutes * 60).toFixed(1).padStart(4, "0")}`;
}

/** "1:05.4", "65" or "1:02:03" as seconds; null if it isn't a time. */
export function parseClipTime(text: string): number | null {
  const parts = text.trim().split(":");
  if (!parts[0] || parts.length > 3 || parts.some((part) => !/^\d+(\.\d+)?$/.test(part))) return null;
  // Only the last part may have a fraction, and minutes and seconds after a colon stay under 60.
  if (parts.slice(0, -1).some((part) => part.includes("."))) return null;
  if (parts.slice(1).some((part) => Number(part) >= 60)) return null;
  return parts.reduce((total, part) => total * 60 + Number(part), 0);
}

export type ClipFilters = { project?: string; status?: "" | "made" | "not_made"; page?: number };

export function useProjectClips(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: key(projectId),
    queryFn: () => apiRequest<ProjectClips>(`/api/projects/${projectId}/clips/`),
    enabled,
    // Keep checking while clips are being found or rendered.
    refetchInterval: (query) => {
      const data = query.state.data;
      const busy = data?.search.status === "finding" || data?.clips.some((clip) => clip.status === "rendering");
      return busy ? 2000 : false;
    },
  });
}

/** Every clip across the person's recordings, newest first. */
export function useClips(filters: ClipFilters) {
  const params = new URLSearchParams();
  if (filters.project) params.set("project", filters.project);
  if (filters.status) params.set("status", filters.status);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return useQuery({
    queryKey: ["clips", "list", filters],
    queryFn: () => apiRequest<Paginated<Clip>>(`/api/clips/?${params}`),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (query.state.data?.results.some((clip) => clip.status === "rendering") ? 2000 : false),
  });
}

export function useCreateClip(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (clip: { start: number; end: number; title?: string }) =>
      apiRequest<Clip>("/api/clips/", { method: "POST", body: { project: projectId, ...clip } }),
    onSuccess: (clip) => {
      queryClient.setQueryData<ProjectClips>(key(projectId), (data) => (data ? { ...data, clips: [...data.clips, clip] } : data));
      queryClient.invalidateQueries({ queryKey: ["clips", "list"] });
    },
  });
}

export function useFindClips(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ search: ClipSearch }>(`/api/projects/${projectId}/clips/`, { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(projectId) }),
  });
}

/** Replace one clip in the cached list, so changes show at once. */
function useStoreClip() {
  const queryClient = useQueryClient();
  return (clip: Clip) => {
    queryClient.setQueryData<ProjectClips>(key(clip.project), (data) =>
      data ? { ...data, clips: data.clips.map((item) => (item.id === clip.id ? clip : item)) } : data,
    );
    queryClient.invalidateQueries({ queryKey: ["clips", "list"] });
  };
}

export function useUpdateClip() {
  const store = useStoreClip();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string } & Partial<Pick<Clip, "start" | "end" | "title" | "caption" | "caption_style">>) =>
      apiRequest<Clip>(`/api/clips/${id}/`, { method: "PATCH", body: changes }),
    onSuccess: store,
  });
}

export function useRenderClip() {
  const store = useStoreClip();
  return useMutation({
    mutationFn: (id: string) => apiRequest<Clip>(`/api/clips/${id}/render/`, { method: "POST" }),
    onSuccess: store,
  });
}

export function useDeleteClip(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/clips/${id}/`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<ProjectClips>(key(projectId), (data) =>
        data ? { ...data, clips: data.clips.filter((clip) => clip.id !== id) } : data,
      );
      queryClient.invalidateQueries({ queryKey: ["clips", "list"] });
    },
  });
}
