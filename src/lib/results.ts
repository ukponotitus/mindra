import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { ConnectedAccountKind, Platform } from "./types";

/** A Mindra short link (mindra.online/l/<code>) that counts each click, then sends people on to `destination`. */
export type TrackedLink = {
  code: string;
  short_url: string;
  destination: string;
  clicks: number;
  last_clicked_at: string | null;
  created_at: string;
};

/** A post's numbers on its platform. A number is null when the platform doesn't share it with Mindra. */
export type PostResult = {
  kind: ConnectedAccountKind;
  /** "published": Mindra posted it; "pasted": it was shared by hand and its link pasted in. */
  source: "published" | "pasted";
  url: string;
  account_name: string;
  posted_at: string;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  /** When the numbers were last read (null until the first reading, about an hour after it went out). */
  fetched_at: string | null;
  /** When they're read next (null once the post has been followed for a month). */
  next_fetch_at: string | null;
  /** Why the last reading didn't work, or "". */
  error: string;
  can_refresh: boolean;
  /** When "Update now" works again, or null. */
  refresh_after: string | null;
};

/** GET /api/content/<id>/results/: what a post's Results box shows. */
export type PostResults = {
  result: PostResult | null;
  links: TrackedLink[];
  clicks: number;
  /** Whether the platform shares numbers with Mindra at all. */
  readable: boolean;
  /** For a post shared by hand: the service its link can be pasted from ("YouTube", "X", "Instagram"), or "". */
  paste_service: string;
  /** Whether an account is connected there, so pasting can work. */
  paste_ready: boolean;
};

/** One post on the Results page. */
export type ResultPost = {
  id: string;
  platform: Platform;
  title: string;
  excerpt: string;
  project_name: string;
  posted_at: string;
  published: boolean;
  url: string;
  account_name: string;
  following: boolean;
  fetched_at: string | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  clicks: number;
};

/** Sums of posts' numbers (null where none of them has that number) and their links' clicks. */
export type ResultTotals = Record<NumberName, number | null> & { posts: number; clicks: number };

/** GET /api/results/?days=: totals of every post that went out in the period, each platform's, the top posts, the
 * newest posts (up to 500, for the best days and times), and clicks on every link day by day. */
export type ResultsSummary = {
  days: number;
  since: string;
  totals: ResultTotals;
  platforms: (ResultTotals & { platform: Platform })[];
  top_posts: ResultPost[];
  posts: ResultPost[];
  clicks_by_day: { day: string; clicks: number }[];
  /** Two-letter country codes ("" when unknown), most clicks first. */
  countries: { country: string; clicks: number }[];
  links: number;
};

export const PERIODS = [
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
  { days: 365, label: "12 months" },
] as const;

export const NUMBER_LABELS = { views: "Views", likes: "Likes", comments: "Comments", shares: "Shares" } as const;
export type NumberName = keyof typeof NUMBER_LABELS;
export const NUMBER_NAMES = Object.keys(NUMBER_LABELS) as NumberName[];

// Hooks

export function usePostResults(pieceId: string | undefined) {
  return useQuery({
    queryKey: ["results", "post", pieceId],
    queryFn: () => apiRequest<PostResults>(`/api/content/${pieceId}/results/`),
    enabled: Boolean(pieceId),
  });
}

/** After a change to a post's results: its card, the lists and the Results page show them too. */
function useAfterResults(pieceId: string) {
  const queryClient = useQueryClient();
  return (results: PostResults) => {
    queryClient.setQueryData(["results", "post", pieceId], results);
    queryClient.invalidateQueries({ queryKey: ["results", "summary"] });
    queryClient.invalidateQueries({ queryKey: ["content"] });
  };
}

export function useRefreshResults(pieceId: string) {
  const done = useAfterResults(pieceId);
  return useMutation({
    mutationFn: () => apiRequest<PostResults>(`/api/content/${pieceId}/results/refresh/`, { method: "POST" }),
    onSuccess: done,
  });
}

/** Follow a post shared by hand from its link. It's marked as posted too, so the calendar changes. */
export function usePasteLink(pieceId: string) {
  const done = useAfterResults(pieceId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => apiRequest<PostResults>(`/api/content/${pieceId}/results/link/`, { method: "POST", body: { url } }),
    onSuccess: (results) => {
      done(results);
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
  });
}

export function useStopFollowing(pieceId: string) {
  const done = useAfterResults(pieceId);
  return useMutation({
    mutationFn: () => apiRequest<PostResults>(`/api/content/${pieceId}/results/`, { method: "DELETE" }),
    onSuccess: done,
  });
}

export function useMakeLink(pieceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (destination: string) =>
      apiRequest<TrackedLink>("/api/links/", { method: "POST", body: { piece: pieceId, destination } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["results", "post", pieceId] }),
  });
}

export function useResultsSummary(days: number) {
  return useQuery({
    queryKey: ["results", "summary", days],
    queryFn: () => apiRequest<ResultsSummary>(`/api/results/?days=${days}`),
  });
}

// Links in a post's text

// A web address in text: http(s)://… or www.…, up to a space or a quote. Punctuation at its end belongs to the sentence.
const ADDRESS = /(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;
const TRAILING = /[.,;:!?)\]}…]$/;
const count = (text: string, character: string) => text.split(character).length - 1;

function split(match: string) {
  let address = match;
  while (TRAILING.test(address)) {
    // A ")" that closes a "(" in the address is part of it (Wikipedia's "…_(film)").
    if (address.endsWith(")") && count(address, "(") >= count(address, ")")) break;
    address = address.slice(0, -1);
  }
  return { address, rest: match.slice(address.length) };
}

/** Every web address in the text, once each, in order. */
export function findAddresses(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(ADDRESS)) {
    const { address } = split(match[0]);
    if (address.length > 4 && !found.includes(address)) found.push(address);
  }
  return found;
}

/** The text with every whole `address` swapped for `replacement` (an address that only starts with it is left alone). */
export function swapAddress(text: string, address: string, replacement: string): string {
  return text.replace(ADDRESS, (match) => {
    const parts = split(match);
    return parts.address === address ? replacement + parts.rest : match;
  });
}

/** What a link goes to, short: "grace.example/sunday". */
export function shortAddress(url: string): string {
  return url.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");
}

// Numbers and times

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

/** 1,284 · 12.9K · 4.2M; "—" when the platform doesn't share it. */
export function formatCount(value: number | null | undefined): string {
  if (value == null) return "—";
  return value >= 10_000 ? compact.format(value) : value.toLocaleString();
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/** "5 minutes ago", "in 23 hours", "yesterday". */
export function formatRelative(iso: string, now = Date.now()): string {
  const difference = new Date(iso).getTime() - now;
  for (const [unit, size] of UNITS) {
    if (Math.abs(difference) >= size) return relative.format(Math.round(difference / size), unit);
  }
  return difference < 0 ? "just now" : "in a minute";
}

/** Likes, comments and shares together: what "engagement" means on the Results page. */
export function engagement(post: Pick<ResultPost, "likes" | "comments" | "shares">): number {
  return (post.likes ?? 0) + (post.comments ?? 0) + (post.shares ?? 0);
}

/** "Nigeria"; "Unknown" for "". */
export function countryName(code: string): string {
  if (!code) return "Unknown";
  try {
    return new Intl.DisplayNames(undefined, { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
