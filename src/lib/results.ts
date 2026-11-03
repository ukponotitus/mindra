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
  /** "published": Mindra posted it; "pasted": shared by hand and its link pasted in; "found": shared by hand and
   * found by Mindra on the connected account. */
  source: "published" | "pasted" | "found";
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
  /** Mindra looking for it on the connected account, for a post shared by hand; null when it hasn't. */
  search: { tries: number; last_tried_at: string | null; found: boolean } | null;
};

/** Whether Mindra follows a post's numbers, and if not why: "following"; "waiting" for its first reading; "error"
 * (the last reading failed); "looking" for it on the connected account (shared by hand); "paste" its link (X);
 * "connect" the account; "clicks_only" (the platform shares no numbers). */
export type FollowStatus = "following" | "waiting" | "error" | "looking" | "paste" | "connect" | "clicks_only";

export type NumberSet = { views: number | null; likes: number | null; comments: number | null; shares: number | null };

/** What a post is made of: one photo, several, a video (a clip, a Motion Studio video or an uploaded one) or its text. */
export type ContentType = "photo" | "photos" | "video" | "text";
export const CONTENT_TYPE_LABELS: Record<ContentType, string> = { photo: "Photo", photos: "Multiple photos", video: "Video", text: "Text" };

/** One post on the Analytics page: its numbers now, and what it gained in the period. */
export type ResultPost = NumberSet & {
  id: string;
  platform: Platform;
  title: string;
  excerpt: string;
  project_name: string;
  thumbnail_url: string | null;
  content_type: ContentType;
  posted_at: string | null;
  published: boolean;
  url: string;
  account_name: string;
  following: boolean;
  fetched_at: string | null;
  status: FollowStatus;
  status_text: string;
  /** Every click on its links so far. */
  clicks: number;
  /** What it gained in the period. A YouTube post's numbers aren't worked out per period (only its clicks are). */
  period: NumberSet & { engagement: number | null; clicks: number };
  /** Likes, comments and shares as a share of views, or null without views (and always for YouTube). */
  engagement_rate: number | null;
  /** A YouTube post: its numbers are shown on their own, as read (YouTube's API policies). */
  youtube: boolean;
};

/** The Analytics page's YouTube section (the backend's analytics/summary.py): kept apart from other platforms, as
 * YouTube's API policies ask. The period's videos Mindra follows, with their numbers as YouTube counted them at the last
 * reading; day by day as read (never spread between readings); and those videos by views. */
export type YouTubeResults = {
  connected: boolean;
  videos: number;
  metrics: Record<"views" | "likes" | "comments", number | null>;
  series: { day: string; views: number | null; likes: number | null; comments: number | null }[];
  top: ResultPost[];
  read_at: string | null;
};

export type MetricName = NumberName | "engagement" | "clicks" | "posts";
/** A period's totals (null: no followed post there shares that number). */
export type MetricSet = Record<MetricName, number | null>;
export type Breakdown<K extends string | number = string> = { key: K; clicks: number }[];

/** A connected account's followers (the backend's analytics/followers.py, read once a day): the latest count, the
 * change over the period (null until there are two days to compare) and the counts day by day in the period. */
export type AccountFollowers = {
  account_id: string;
  kind: ConnectedAccountKind;
  name: string;
  username: string;
  picture_url: string;
  needs_reconnect: boolean;
  followers: number | null;
  read_at: string | null;
  change: number | null;
  series: { day: string; followers: number }[];
};

/** GET /api/results/?days= (the backend's analytics/summary.py): what happened in the period, like YouTube Studio. */
export type ResultsSummary = {
  days: number;
  since: string;
  until: string;
  metrics: MetricSet;
  /** The same for the period before, to compare. */
  previous: MetricSet;
  /** Day by day (UTC days); views, likes, comments and shares spread evenly between readings. Other platforms than
   * YouTube, which is in `youtube`; clicks and posts are Mindra's own counts, YouTube's included. */
  series: ({ day: string } & Record<MetricName, number>)[];
  top_posts: ResultPost[];
  /** The posts with the most likes, comments and shares in the period. */
  top_engaged: ResultPost[];
  /** Posts out, and views and engagement gained in the period (null: none of its posts shares that), by content type. */
  content_types: { type: ContentType; posts: number; views: number | null; engagement: number | null }[];
  /** Followers on the accounts whose platform shares them, and the connected accounts whose platform doesn't. */
  followers: { accounts: AccountFollowers[]; others: { kind: ConnectedAccountKind; name: string }[] };
  latest: ResultPost | null;
  /** Link clicks hour by hour over the last 48 hours. */
  recent_clicks: { hour: string; clicks: number }[];
  /** The posts that went out in the period, newest first (up to 500 of `posts_total`). */
  posts: ResultPost[];
  posts_total: number;
  /** YouTube's rows have its numbers as read and no engagement. */
  platforms: (Record<NumberName, number | null> & { platform: Platform; posts: number; engagement: number | null; clicks: number })[];
  youtube: YouTubeResults;
  /** Link clicks in the period by where they came from ("" direct), device, country ("" unknown) and UTC hour. */
  sources: Breakdown;
  devices: Breakdown;
  countries: Breakdown;
  click_hours: Breakdown<number>;
  links: number;
};

export const PERIODS = [
  { days: 7, label: "Last 7 days" },
  { days: 28, label: "Last 28 days" },
  { days: 90, label: "Last 90 days" },
  { days: 365, label: "Last 365 days" },
] as const;
export const DEFAULT_PERIOD = 28;

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
