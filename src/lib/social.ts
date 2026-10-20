// Automatic posting to Facebook Pages and Instagram professional accounts: connecting them through Facebook Login,
// the connected accounts, which account a post can go to, and posting a post now.

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
} from "./types";

export const ACCOUNT_KINDS: Record<ConnectedAccountKind, { label: string; platform: Platform }> = {
  facebook_page: { label: "Facebook Page", platform: "facebook" },
  instagram: { label: "Instagram", platform: "instagram" },
};

/** The kind of account each platform's posts go to. Other platforms can't post automatically yet. */
const KIND_FOR_PLATFORM: Partial<Record<Platform, ConnectedAccountKind>> = { facebook: "facebook_page", instagram: "instagram" };

export function accountKindFor(platform: Platform): ConnectedAccountKind | null {
  return KIND_FOR_PLATFORM[platform] ?? null;
}

/** Account ids compared whatever their type (the API may send numbers; selects give strings). */
export function sameAccount(a: ConnectedAccountId | null | undefined, b: ConnectedAccountId | null | undefined): boolean {
  return a != null && b != null && String(a) === String(b);
}

/** "@gracechapel" for Instagram, the Page's name for a Page. */
export function accountName(account: Pick<ConnectedAccount, "kind" | "name" | "username">): string {
  return account.kind === "instagram" && account.username ? `@${account.username}` : account.name;
}

/** Where a post goes, for a sentence: "Grace Chapel's Page", "@gracechapel on Instagram". */
export function accountPlace(account: Pick<ConnectedAccount, "kind" | "name" | "username">): string {
  if (account.kind === "instagram") return `${accountName(account)} on Instagram`;
  const name = account.name.trim();
  return `${name}${/s$/i.test(name) ? "'" : "'s"} Page`;
}

/** Whether a post goes out with a made clip's video, or with its photos. */
export function postMedia(piece: ContentPiece): "video" | "photos" | null {
  const clip = piece.clip;
  if (clip && clip.status === "ready" && clip.video_url && !clip.is_stale) return "video";
  return (piece.photos ?? []).length > 0 ? "photos" : null;
}

/**
 * Whether a post can go out automatically, and to which accounts: "ready" with the active accounts of its kind;
 * otherwise why not ("unsupported" platform, an Instagram post without a photo or video, no account of that kind yet,
 * or only accounts that need reconnecting). "loading" and "unavailable" (the accounts couldn't be loaded) say nothing yet.
 */
export type AutoPost =
  | { state: "loading" | "unavailable" | "unsupported" | "needs-media" }
  | { state: "no-account"; kind: ConnectedAccountKind }
  | { state: "needs-reconnect"; kind: ConnectedAccountKind; accounts: ConnectedAccount[] }
  | { state: "ready"; kind: ConnectedAccountKind; accounts: ConnectedAccount[] };

export function autoPostFor(piece: ContentPiece, accounts: ConnectedAccount[] | undefined, failed = false): AutoPost {
  const kind = accountKindFor(piece.platform);
  if (!kind) return { state: "unsupported" };
  if (kind === "instagram" && !postMedia(piece)) return { state: "needs-media" };
  if (!accounts) return { state: failed ? "unavailable" : "loading" };
  const ofKind = accounts.filter((account) => account.kind === kind);
  const active = ofKind.filter((account) => account.status === "active");
  if (active.length > 0) return { state: "ready", kind, accounts: active };
  if (ofKind.length > 0) return { state: "needs-reconnect", kind, accounts: ofKind };
  return { state: "no-account", kind };
}

/** The account to offer first: the one the post is already set to, or the first. */
export function defaultAccount(accounts: ConnectedAccount[], current: ConnectedAccountId | null): ConnectedAccount | undefined {
  return accounts.find((account) => sameAccount(account.id, current)) ?? accounts[0];
}

/** What to call where a post goes, by kind: "your Facebook Page", "your Instagram account". */
export function kindPhrase(kind: ConnectedAccountKind): string {
  return kind === "instagram" ? "your Instagram business or creator account" : "your Facebook Page";
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

/** Whether a post can go out automatically (it loads the accounts only for Facebook and Instagram posts). */
export function useAutoPost(piece: ContentPiece): AutoPost {
  const accounts = useConnectedAccounts(accountKindFor(piece.platform) !== null);
  return autoPostFor(piece, accounts.data, accounts.isError);
}

/**
 * "Connect Facebook and Instagram" (and Reconnect): asks the API for the Facebook Login address and goes there; Facebook
 * sends the person back to Settings. `variables` is what was pressed, so only that button shows it's busy.
 */
export function useConnectMeta() {
  return useMutation({
    mutationFn: async (_source: string) => {
      const { url } = await apiRequest<{ url: string }>("/api/social/meta/start/");
      window.location.assign(url);
      // Stay busy while the browser leaves for Facebook.
      await new Promise((resolve) => window.setTimeout(resolve, 10_000));
    },
  });
}

/**
 * Back from Facebook with ?pending=<id>: the accounts it shared, which aren't saved until the person confirms. A 404
 * means the link has expired or belongs to someone else.
 */
export function usePendingConnection(id: string) {
  return useQuery({
    queryKey: ["social", "pending", id],
    queryFn: () => apiRequest<PendingConnection>(`/api/social/meta/pending/${encodeURIComponent(id)}/`),
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
      apiRequest<ConfirmedConnection>(`/api/social/meta/pending/${encodeURIComponent(id)}/confirm/`, { method: "POST" }),
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
    mutationFn: (id: string) => apiRequest<null>(`/api/social/meta/pending/${encodeURIComponent(id)}/cancel/`, { method: "POST" }),
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
    mutationFn: async ({ piece, account }: { piece: ContentPiece; account?: ConnectedAccountId }) => {
      if (account !== undefined && !sameAccount(account, piece.publish_to)) {
        await apiRequest<ContentPiece>(`/api/content/${piece.id}/`, { method: "PATCH", body: { publish_to: account } });
      }
      return apiRequest<ContentPiece>(`/api/content/${piece.id}/publish/`, { method: "POST" });
    },
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
