import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { CommentsSummary, ConnectedAccountId, Paginated, Platform, PostComment } from "./types";

// The Comments page (the backend's comments/): comments on the workspace's YouTube posts, read for the channels
// someone turned comments on for, newest first, with "new since you last looked" and Refresh.

export type CommentFilters = {
  post?: string;
  platform?: Platform | "";
  search?: string;
  /** Only threads with something new since the person last looked. */
  fresh?: boolean;
  /** Only threads the account hasn't replied to. */
  unanswered?: boolean;
  /** What counts as new: since this visit's previous one (an ISO time, or "none" when there wasn't one). */
  since?: string;
  page?: number;
};

function commentsQuery(filters: CommentFilters): string {
  const params = new URLSearchParams();
  if (filters.post) params.set("post", filters.post);
  if (filters.platform) params.set("platform", filters.platform);
  if (filters.search) params.set("search", filters.search);
  if (filters.fresh) params.set("new", "true");
  if (filters.unanswered) params.set("unanswered", "true");
  if (filters.since) params.set("since", filters.since);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

/** How often the summary is read while comments are being read. */
const REFRESHING_POLL_MS = 3000;

export function useCommentsSummary(enabled = true) {
  return useQuery({
    queryKey: ["comments", "summary"],
    queryFn: () => apiRequest<CommentsSummary>("/api/comments/summary/"),
    enabled,
    refetchInterval: (query) => (query.state.data?.refreshing ? REFRESHING_POLL_MS : false),
  });
}

export function useComments(filters: CommentFilters, enabled = true) {
  return useQuery({
    queryKey: ["comments", "list", filters],
    queryFn: () => apiRequest<Paginated<PostComment>>(`/api/comments/?${commentsQuery(filters)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Read the comments again now; the summary says when it's done, and the list follows. */
export function useRefreshComments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ refreshing: boolean }>("/api/comments/refresh/", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", "summary"] }),
  });
}

/** What's there now isn't new to this person any more (the page keeps showing this visit's "New" marks). */
export function useMarkCommentsSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<{ seen_at: string }>("/api/comments/seen/", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments", "summary"] }),
  });
}

/** Turn reading a channel's comments on (they're read now) or off (the ones read are deleted). */
export function useCommentsChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reading }: { id: ConnectedAccountId; reading: boolean }) =>
      apiRequest<{ id: ConnectedAccountId; reading: boolean }>(`/api/comments/channels/${id}/`, { method: "POST", body: { reading } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["comments"] }),
  });
}

/** The platforms whose comments come once each approves Mindra to read them. */
export const COMMENTS_LATER = ["Facebook", "Instagram", "LinkedIn", "X", "TikTok"];
