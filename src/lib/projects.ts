import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioLines, ClipboardList, FileText, Images, Megaphone, Video, type LucideIcon } from "lucide-react";
import { apiRequest } from "./api";
import { formatDuration } from "./format";
import type { Paginated, Platform, Project, ProjectStatus, ProjectSummary, SourceType, Transcript, UploadOptions } from "./types";

export const PAGE_SIZE = 20;

const IN_PROGRESS: ProjectStatus[] = ["queued", "extracting_audio", "transcribing", "analyzing"];

export function isInProgress(status: ProjectStatus): boolean {
  return IN_PROGRESS.includes(status);
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  queued: "Queued",
  extracting_audio: "Processing",
  transcribing: "Processing",
  analyzing: "Processing",
  completed: "Ready",
  failed: "Failed",
};

export const SOURCE_LABELS: Record<SourceType, string> = {
  video: "Video",
  audio: "Audio",
  transcript: "Transcript",
  photos: "Photos",
  flyer: "Flyer",
  plan: "Content plan",
};

export const SOURCE_ICONS: Record<SourceType, LucideIcon> = {
  video: Video,
  audio: AudioLines,
  transcript: FileText,
  photos: Images,
  flyer: Megaphone,
  plan: ClipboardList,
};

/** Photo and flyer posts: projects made of pictures (kept as photos), with no recording. */
export function isPicturePost(sourceType: SourceType | undefined): boolean {
  return sourceType === "photos" || sourceType === "flyer";
}

/** How long a recording is, or how many pictures a photo or flyer post has: "47:32", "6 photos", "1 flyer". */
export function projectLength(project: Pick<Project, "source_type" | "duration_seconds" | "photo_count">): string {
  if (!isPicturePost(project.source_type)) return formatDuration(project.duration_seconds);
  const count = project.photo_count ?? 0;
  const noun = project.source_type === "flyer" ? "flyer" : "photo";
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** The line under a project's name: its file, "Pasted transcript", or what its photos show. */
export function projectSourceDetail(project: Pick<Project, "source_type" | "source_filename" | "note">): string {
  if (project.source_type === "photos") return project.note || "Photo post";
  if (project.source_type === "flyer") return project.note || "Flyer post";
  return project.source_filename || "Pasted transcript";
}

export const PLATFORMS: { id: Platform; label: string; badge: string; color: string; limit?: number }[] = [
  { id: "instagram", label: "Instagram", badge: "IG", color: "#E1306C", limit: 2200 },
  { id: "facebook", label: "Facebook", badge: "f", color: "#1877F2" },
  { id: "whatsapp", label: "WhatsApp", badge: "WA", color: "#25D366", limit: 700 },
  { id: "tiktok", label: "TikTok", badge: "♪", color: "#111827" },
  { id: "youtube_shorts", label: "YouTube Shorts", badge: "▶", color: "#FF0033" },
  { id: "youtube", label: "YouTube", badge: "YT", color: "#CC0000" },
  { id: "x", label: "X (Twitter)", badge: "𝕏", color: "#111827" },
  { id: "linkedin", label: "LinkedIn", badge: "in", color: "#0A66C2", limit: 3000 },
  { id: "newsletter", label: "Newsletter", badge: "✉", color: "#6D5EF5" },
  { id: "blog", label: "Blog", badge: "B", color: "#10B981" },
  { id: "quote_cards", label: "Quote Cards", badge: "❝", color: "#F59E0B" },
];

export function platformInfo(platform: Platform) {
  return PLATFORMS.find((p) => p.id === platform) ?? PLATFORMS[0];
}

/** Re-run the AI analysis of a finished project. */
export function useAnalyzeProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<Project>(`/api/projects/${id}/analyze/`, { method: "POST" }),
    onSuccess: (project) => queryClient.setQueryData(["projects", "detail", project.id], project),
  });
}

/** Where to go when someone opens a project: the progress screen while a recording is processed, otherwise the
 * details (a flyer being read shows that on its own page). */
export function projectPath(project: Pick<Project, "id" | "status" | "source_type">): string {
  return isInProgress(project.status) && !isPicturePost(project.source_type)
    ? `/projects/${project.id}/processing`
    : `/projects/${project.id}`;
}

export function useProjects(page = 1) {
  return useQuery({
    queryKey: ["projects", "list", page],
    queryFn: () => apiRequest<Paginated<Project>>(`/api/projects/?page=${page}`),
    placeholderData: keepPreviousData,
    // Keep statuses fresh while anything on the page is still processing.
    refetchInterval: (query) => (query.state.data?.results.some((p) => isInProgress(p.status)) ? 3000 : false),
  });
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", "detail", id],
    queryFn: () => apiRequest<Project>(`/api/projects/${id}/`),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data && isInProgress(query.state.data.status) ? 2000 : false),
  });
}

export function useTranscript(id: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ["projects", "transcript", id],
    queryFn: () => apiRequest<Transcript>(`/api/projects/${id}/transcript/`),
    enabled: Boolean(id) && enabled,
  });
}

export function useProjectSummary() {
  return useQuery({
    queryKey: ["projects", "summary"],
    queryFn: () => apiRequest<ProjectSummary>("/api/projects/summary/"),
    refetchInterval: (query) => ((query.state.data?.processing_jobs ?? 0) > 0 ? 3000 : false),
  });
}

// The server's defaults, used until its real answer arrives so file checks work straight away.
const DEFAULT_UPLOAD_OPTIONS: UploadOptions = {
  max_upload_mb: 2048,
  extensions: {
    video: [".avi", ".mkv", ".mov", ".mp4", ".webm"],
    audio: [".aac", ".flac", ".m4a", ".mp3", ".wav"],
  },
  // The other languages appear once the server answers; it owns the list.
  languages: [{ code: "en", name: "English" }],
  default_language: "en",
  direct_upload: false,
  photo_types: [".heic", ".heif", ".jpeg", ".jpg", ".png", ".webp"],
  max_photo_mb: 20,
  max_photos: 20,
};

/** The upload options query, for `queryClient.ensureQueryData` when the server's real answer is needed. */
export const uploadOptionsQuery = queryOptions({
  queryKey: ["upload-options"],
  queryFn: () => apiRequest<UploadOptions>("/api/projects/upload-options/"),
  staleTime: Infinity,
});

export function useUploadOptions() {
  return useQuery({ ...uploadOptionsQuery, placeholderData: DEFAULT_UPLOAD_OPTIONS });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...changes
    }: {
      id: string;
      name?: string;
      target_platforms?: Platform[];
      note?: string;
      /** Photo and flyer posts only: the recording the captions can use, or null for none. */
      linked_recording?: string | null;
      /** Flyer posts only: a correction of the text read from the flyers. */
      flyer_text?: string;
    }) =>
      apiRequest<Project>(`/api/projects/${id}/`, { method: "PATCH", body: changes }),
    onSuccess: (project) => {
      queryClient.setQueryData(["projects", "detail", project.id], project);
      queryClient.invalidateQueries({ queryKey: ["projects", "list"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/projects/${id}/`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: ["projects", "detail", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

/**
 * Transcribe a finished or failed recording again in another language (a code from the upload options, or "auto").
 * The old transcript and analysis are replaced; posts and clips stay.
 */
export function useTranscribeAgain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, language }: { id: string; language: string }) =>
      apiRequest<Project>(`/api/projects/${id}/transcribe-again/`, { method: "POST", body: { language } }),
    onSuccess: (project) => {
      queryClient.setQueryData(["projects", "detail", project.id], project);
      // The old transcript is gone; don't show it while the new one is made.
      queryClient.removeQueries({ queryKey: ["projects", "transcript", project.id] });
      queryClient.invalidateQueries({ queryKey: ["projects", "list"] });
      queryClient.invalidateQueries({ queryKey: ["projects", "summary"] });
    },
  });
}

export function useRetryProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<Project>(`/api/projects/${id}/retry/`, { method: "POST" }),
    onSuccess: (project) => {
      queryClient.setQueryData(["projects", "detail", project.id], project);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
