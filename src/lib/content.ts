import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { AiProvider, AiStatus, BrandVoice, ContentPiece, Generation, Paginated, Platform, Suggestions } from "./types";

/** How each writer is named in the app. */
export const AI_PROVIDER_NAMES: Record<AiProvider, string> = { gemini: "Gemini", anthropic: "Claude", fake: "the stand-in writer" };

export const TONES = ["Warm", "Inspiring", "Teaching", "Storytelling", "Conversational", "Bold", "Professional"];

export type ContentFilters = {
  project?: string;
  clip?: string;
  platform?: Platform | "";
  favorite?: boolean;
  search?: string;
  /** Only posts on the calendar (true) or only posts that aren't (false). */
  scheduled?: boolean;
  /** Posts scheduled at or after this ISO time; results then come in time order. */
  scheduledAfter?: string;
  /** Posts scheduled before this ISO time. */
  scheduledBefore?: string;
  page?: number;
  pageSize?: number;
};

function contentQuery(filters: ContentFilters): string {
  const params = new URLSearchParams();
  if (filters.project) params.set("project", filters.project);
  if (filters.clip) params.set("clip", filters.clip);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.favorite) params.set("favorite", "true");
  if (filters.search) params.set("search", filters.search);
  if (filters.scheduled !== undefined) params.set("scheduled", String(filters.scheduled));
  if (filters.scheduledAfter) params.set("scheduled_after", filters.scheduledAfter);
  if (filters.scheduledBefore) params.set("scheduled_before", filters.scheduledBefore);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("page_size", String(filters.pageSize));
  return params.toString();
}

export function useAiStatus() {
  return useQuery({
    queryKey: ["ai-status"],
    queryFn: () => apiRequest<AiStatus>("/api/ai/status/"),
    staleTime: 60_000,
  });
}

/** How often a list or a post is fetched again while Mindra is posting one of its posts, to show when it's out. */
const PUBLISHING_POLL_MS = 4000;
const isPublishing = (piece: ContentPiece | undefined) => piece?.schedule_status === "publishing";

export function useContentList(filters: ContentFilters) {
  return useQuery({
    queryKey: ["content", "list", filters],
    queryFn: () => apiRequest<Paginated<ContentPiece>>(`/api/content/?${contentQuery(filters)}`),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (query.state.data?.results.some(isPublishing) ? PUBLISHING_POLL_MS : false),
  });
}

export function useContentPiece(id: string | undefined) {
  return useQuery({
    queryKey: ["content", "detail", id],
    queryFn: () => apiRequest<ContentPiece>(`/api/content/${id}/`),
    enabled: Boolean(id),
    refetchInterval: (query) => (isPublishing(query.state.data) ? PUBLISHING_POLL_MS : false),
  });
}

/** Everything that shows posts or counts them has to refresh after a change (content plans show their drafts). */
function useRefreshContent() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["content"] });
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["plans"] });
  };
}

export function useUpdatePiece() {
  const queryClient = useQueryClient();
  const refresh = useRefreshContent();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string } & Partial<Pick<ContentPiece, "title" | "body" | "status" | "is_favorite">>) =>
      apiRequest<ContentPiece>(`/api/content/${id}/`, { method: "PATCH", body: changes }),
    onSuccess: (piece) => {
      queryClient.setQueryData(["content", "detail", piece.id], piece);
      refresh();
    },
  });
}

export function useDeletePiece() {
  const refresh = useRefreshContent();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/content/${id}/`, { method: "DELETE" }),
    onSuccess: refresh,
  });
}

export type RewriteAction = "shorter" | "longer" | "rephrase" | "tone";

export function useRewritePiece() {
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; action: RewriteAction; tone?: string; body: string }) =>
      apiRequest<{ body: string }>(`/api/content/${id}/rewrite/`, { method: "POST", body }),
  });
}

/** Ideas, openers, calls to action, hashtags and emoji for the post's current text. Each run is an AI call. */
export function useSuggestPiece() {
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string; tone?: string; body: string }) =>
      apiRequest<Suggestions>(`/api/content/${id}/suggestions/`, { method: "POST", body }),
  });
}

export function useStartGeneration() {
  return useMutation({
    mutationFn: (body: { project: string; clip?: string; platforms: Platform[]; tone?: string; variations: number }) =>
      apiRequest<Generation>("/api/generations/", { method: "POST", body }),
  });
}

/** Polls a writing run until it finishes, then refreshes the posts it wrote. */
export function useGeneration(id: string | null) {
  const queryClient = useQueryClient();
  const refresh = useRefreshContent();
  return useQuery({
    queryKey: ["generation", id],
    queryFn: async () => {
      const generation = await apiRequest<Generation>(`/api/generations/${id}/`);
      // Posts are saved platform by platform, so show each batch as it lands; refresh counts at the end.
      if (generation.status === "completed" || generation.status === "failed") refresh();
      else queryClient.invalidateQueries({ queryKey: ["content", "list"] });
      return generation;
    },
    enabled: Boolean(id),
    refetchInterval: (query) => {
      const state = query.state.data?.status;
      return state === "completed" || state === "failed" ? false : 1500;
    },
  });
}

export function useBrandVoice() {
  return useQuery({
    queryKey: ["brand-voice"],
    queryFn: () => apiRequest<BrandVoice>("/api/brand-voice/"),
  });
}

export function useSaveBrandVoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (voice: Partial<BrandVoice>) => apiRequest<BrandVoice>("/api/brand-voice/", { method: "PUT", body: voice }),
    onSuccess: (voice) => queryClient.setQueryData(["brand-voice"], voice),
  });
}
