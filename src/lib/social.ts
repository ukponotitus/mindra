// Automatic posting: connecting accounts (Facebook Pages and Instagram through Facebook Login; YouTube, LinkedIn, X
// and TikTok through their own sign-ins; WordPress sites with an application password), the connected accounts, which
// account a post can go to, and posting a post now.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import { platformInfo } from "./projects";
import type {
  ConfirmedConnection,
  ConnectedAccount,
  ConnectedAccountId,
  ConnectedAccountKind,
  ContentPiece,
  PendingConnection,
  Platform,
  PublishOptions,
  SocialService,
  SocialServiceId,
  TikTokCreator,
} from "./types";

export const ACCOUNT_KINDS: Record<ConnectedAccountKind, { label: string; plural: string; service: SocialServiceId; phrase: string }> = {
  facebook_page: { label: "Facebook Page", plural: "Pages", service: "meta", phrase: "your Facebook Page" },
  instagram: { label: "Instagram", plural: "Instagram accounts", service: "meta", phrase: "your Instagram business or creator account" },
  youtube: { label: "YouTube channel", plural: "YouTube channels", service: "youtube", phrase: "your YouTube channel" },
  linkedin: { label: "LinkedIn profile", plural: "LinkedIn profiles", service: "linkedin", phrase: "your LinkedIn profile" },
  x: { label: "X account", plural: "X accounts", service: "x", phrase: "your X account" },
  tiktok: { label: "TikTok account", plural: "TikTok accounts", service: "tiktok", phrase: "your TikTok account" },
  wordpress: { label: "WordPress site", plural: "WordPress sites", service: "wordpress", phrase: "your WordPress site" },
};

/** The kind of account each platform's posts go to. WhatsApp, newsletters and quote cards get reminders. */
const KIND_FOR_PLATFORM: Partial<Record<Platform, ConnectedAccountKind>> = {
  facebook: "facebook_page",
  instagram: "instagram",
  youtube_shorts: "youtube",
  youtube: "youtube",
  linkedin: "linkedin",
  x: "x",
  tiktok: "tiktok",
  blog: "wordpress",
};

/** Accounts known by a handle ("@gracechapel"). */
const HANDLE_KINDS: ConnectedAccountKind[] = ["instagram", "x", "tiktok", "youtube"];

export function accountKindFor(platform: Platform): ConnectedAccountKind | null {
  return KIND_FOR_PLATFORM[platform] ?? null;
}

/** Account ids compared whatever their type (the API may send numbers; selects give strings). */
export function sameAccount(a: ConnectedAccountId | null | undefined, b: ConnectedAccountId | null | undefined): boolean {
  return a != null && b != null && String(a) === String(b);
}

/** "@gracechapel" for an account with a handle, otherwise its name ("Grace Chapel", "Grace Chapel Blog"). */
export function accountName(account: Pick<ConnectedAccount, "kind" | "name" | "username">): string {
  if (account.kind === "youtube") return account.name;
  return HANDLE_KINDS.includes(account.kind) && account.username ? `@${account.username}` : account.name;
}

/** Where a post goes, for a sentence: "Grace Chapel's Page", "@gracechapel on Instagram", "Grace Chapel on YouTube". */
export function accountPlace(account: Pick<ConnectedAccount, "kind" | "name" | "username">): string {
  const name = account.name.trim();
  switch (account.kind) {
    case "facebook_page":
      return `${name}${/s$/i.test(name) ? "'" : "'s"} Page`;
    case "instagram":
      return `${accountName(account)} on Instagram`;
    case "youtube":
      return `${name} on YouTube`;
    case "linkedin":
      return `${name} on LinkedIn`;
    case "x":
      return `${accountName(account)} on X`;
    case "tiktok":
      return `${accountName(account)} on TikTok`;
    default:
      return name;
  }
}

/** Whether a post goes out with a made clip's video, or with its photos. */
export function postMedia(piece: ContentPiece): "video" | "photos" | null {
  const clip = piece.clip;
  if (clip && clip.status === "ready" && clip.video_url && !clip.is_stale) return "video";
  return (piece.photos ?? []).length > 0 ? "photos" : null;
}

/** Why a post can't go out automatically for want of a video or photos (the API checks the rest), or "". */
export function mediaNeeded(piece: ContentPiece): string {
  const clip = piece.clip;
  switch (piece.platform) {
    case "instagram":
      return postMedia(piece) ? "" : "Instagram posts need a photo or a video to post automatically.";
    case "tiktok":
      return clip || (piece.photos ?? []).length > 0 ? "" : "TikTok posts need a clip or photos to post automatically.";
    case "youtube_shorts":
      return clip ? "" : "YouTube Shorts posts need a clip to post automatically.";
    case "youtube":
      return clip || piece.project_source_type === "video" ? "" : "YouTube posts need a video (a clip, or a video recording) to post automatically.";
    default:
      return "";
  }
}

/**
 * Whether a post can go out automatically, and to which accounts: "ready" with the active accounts of its kind;
 * otherwise why not ("unsupported" platform, a post without the video or photos its platform needs, no account of that
 * kind yet, or only accounts that need reconnecting). "loading" and "unavailable" (the accounts couldn't be loaded) say
 * nothing yet.
 */
export type AutoPost =
  | { state: "loading" | "unavailable" | "unsupported" }
  | { state: "not-set-up"; kind: ConnectedAccountKind }
  | { state: "needs-media"; message: string }
  | { state: "no-account"; kind: ConnectedAccountKind }
  | { state: "needs-reconnect"; kind: ConnectedAccountKind; accounts: ConnectedAccount[] }
  | { state: "ready"; kind: ConnectedAccountKind; accounts: ConnectedAccount[] };

export function autoPostFor(
  piece: ContentPiece,
  accounts: ConnectedAccount[] | undefined,
  failed = false,
  services?: SocialService[],
): AutoPost {
  const kind = accountKindFor(piece.platform);
  if (!kind) return { state: "unsupported" };
  const needed = mediaNeeded(piece);
  if (needed) return { state: "needs-media", message: needed };
  if (!accounts) return { state: failed ? "unavailable" : "loading" };
  const ofKind = accounts.filter((account) => account.kind === kind);
  const active = ofKind.filter((account) => account.status === "active");
  if (active.length > 0) return { state: "ready", kind, accounts: active };
  if (ofKind.length > 0) return { state: "needs-reconnect", kind, accounts: ofKind };
  // No account yet: say so only where one can be connected (the service is switched on for Mindra).
  const service = services?.find((item) => item.id === ACCOUNT_KINDS[kind].service);
  if (service && !service.available) return { state: "not-set-up", kind };
  return { state: "no-account", kind };
}

/** The account to offer first: the one the post is already set to, or the first. */
export function defaultAccount(accounts: ConnectedAccount[], current: ConnectedAccountId | null): ConnectedAccount | undefined {
  return accounts.find((account) => sameAccount(account.id, current)) ?? accounts[0];
}

/** What to call where a post goes, by kind: "your Facebook Page", "your YouTube channel". */
export function kindPhrase(kind: ConnectedAccountKind): string {
  return ACCOUNT_KINDS[kind].phrase;
}

/** Whether Mindra's access to an account ends soon (within `days`), so Settings asks to reconnect it. */
export function accessEndsSoon(account: Pick<ConnectedAccount, "access_ends_at">, days = 7, now = Date.now()): boolean {
  if (!account.access_ends_at) return false;
  return new Date(account.access_ends_at).getTime() - now < days * 24 * 60 * 60 * 1000;
}

/** "View on Facebook". */
export function viewOnLabel(platform: Platform): string {
  return `View on ${platformInfo(platform).label}`;
}

// --- Hooks ---------------------------------------------------------------------------------------------------------

const ACCOUNTS_KEY = ["social", "accounts"];

/** The workspace's connected accounts. */
export function useConnectedAccounts(enabled = true) {
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: () => apiRequest<ConnectedAccount[]>("/api/social/accounts/"),
    enabled,
    staleTime: 30_000,
  });
}

/** The services accounts can be connected on, and whether each is set up on the server. */
export function useSocialServices(enabled = true) {
  return useQuery({
    queryKey: ["social", "services"],
    queryFn: () => apiRequest<SocialService[]>("/api/social/services/"),
    enabled,
    staleTime: 5 * 60_000,
  });
}

/** Whether a post can go out automatically (it loads the accounts only for platforms that can). */
export function useAutoPost(piece: ContentPiece): AutoPost {
  const supported = accountKindFor(piece.platform) !== null;
  const accounts = useConnectedAccounts(supported);
  const services = useSocialServices(supported);
  return autoPostFor(piece, accounts.data, accounts.isError, services.data);
}

/**
 * "Connect YouTube" (and Reconnect): asks the API for the service's sign-in address and goes there; the service sends
 * the person back to Settings. `variables.source` is what was pressed, so only that button shows it's busy.
 */
export function useConnectService() {
  return useMutation({
    mutationFn: async ({ service }: { service: Exclude<SocialServiceId, "wordpress">; source: string }) => {
      const { url } = await apiRequest<{ url: string }>(`/api/social/${service}/start/`);
      window.location.assign(url);
      // Stay busy while the browser leaves for the service.
      await new Promise((resolve) => window.setTimeout(resolve, 10_000));
    },
  });
}

export type WordPressDetails = { site: string; username: string; password: string };

/** Connect a WordPress site with an application password, and show it in the list at once. */
export function useConnectWordPress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (details: WordPressDetails) =>
      apiRequest<ConnectedAccount>("/api/social/wordpress/connect/", { method: "POST", body: details }),
    onSuccess: (saved) => {
      queryClient.setQueryData<ConnectedAccount[]>(ACCOUNTS_KEY, (accounts) => [
        ...(accounts ?? []).filter((account) => !sameAccount(account.id, saved.id)),
        saved,
      ]);
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}

/**
 * Back from a sign-in with ?pending=<id>: the accounts it shared, which aren't saved until the person confirms. A 404
 * means the link has expired or belongs to someone else.
 */
export function usePendingConnection(id: string) {
  return useQuery({
    queryKey: ["social", "pending", id],
    queryFn: () => apiRequest<PendingConnection>(`/api/social/pending/${encodeURIComponent(id)}/`),
    enabled: Boolean(id),
    retry: false,
    staleTime: Infinity,
  });
}

/** "Connect": save the pending accounts to the workspace, and show them in the list at once. */
export function useConfirmPending() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<ConfirmedConnection>(`/api/social/pending/${encodeURIComponent(id)}/confirm/`, { method: "POST" }),
    onSuccess: ({ accounts: saved }) => {
      queryClient.setQueryData<ConnectedAccount[]>(ACCOUNTS_KEY, (accounts) => [
        ...(accounts ?? []).filter((account) => !saved.some((item) => sameAccount(item.id, account.id))),
        ...saved,
      ]);
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
    },
  });
}

/** "Cancel": forget the pending accounts. */
export function useCancelPending() {
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/social/pending/${encodeURIComponent(id)}/cancel/`, { method: "POST" }),
  });
}

/** Disconnect an account: its token is deleted, and posts set to post there go back to reminders. */
export function useDisconnectAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: ConnectedAccountId) => apiRequest<null>(`/api/social/accounts/${id}/`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<ConnectedAccount[]>(ACCOUNTS_KEY, (accounts) => accounts?.filter((account) => !sameAccount(account.id, id)));
      queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
  });
}

/**
 * Post a post now (or try again after it failed): set the account first when `account` is a different one, then start
 * posting. The API answers at once with the post "publishing"; it's then followed until it's "published" or "failed".
 */
export function usePublishPiece() {
  return useMutation({
    mutationFn: ({ piece, account, options }: { piece: ContentPiece; account?: ConnectedAccountId; options?: PublishOptions }) => {
      const body: Record<string, unknown> = {};
      if (account !== undefined) body.publish_to = account;
      if (options !== undefined) body.publish_options = options;
      return apiRequest<ContentPiece>(`/api/content/${piece.id}/publish/`, { method: "POST", body });
    },
  });
}

/** A TikTok account's current settings, which TikTok asks apps to show each time someone posts. */
export function useTikTokCreator(accountId: ConnectedAccountId | null) {
  return useQuery({
    queryKey: ["social", "tiktok-creator", String(accountId)],
    queryFn: () => apiRequest<TikTokCreator>(`/api/social/accounts/${accountId}/tiktok-creator/`),
    enabled: accountId != null,
    retry: false,
    staleTime: 60_000,
  });
}

/** How often an open "Post now" checks on the post. */
const PROGRESS_POLL_MS = 2500;

export const publishProgressKey = (id: string) => ["content", "publish", id];

/**
 * Follows a post being posted from "Post now" until it's published or failed. It keeps its own copy, so the lists
 * under the open dialog don't change (a post leaving "Ready to schedule" would close it); store the last copy
 * everywhere when the dialog closes.
 */
export function usePublishProgress(id: string, enabled: boolean) {
  return useQuery({
    queryKey: publishProgressKey(id),
    queryFn: () => apiRequest<ContentPiece>(`/api/content/${id}/`),
    enabled,
    refetchInterval: (query) => (query.state.data?.schedule_status === "publishing" ? PROGRESS_POLL_MS : false),
  });
}
