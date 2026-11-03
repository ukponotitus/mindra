import { apiRequest } from "./api";

// What people do with what Mindra makes, for the founder's usage numbers in the admin (the backend's
// engagement/usage_report.py): a post's text copied, its photos, flyer, clip or video shared or downloaded. Only what
// and when is sent, never the content.

export type UseAction = "shared" | "copied" | "downloaded";
export type UseWhat = "post" | "photos" | "flyer" | "clip" | "video";

/** Note it, without waiting or ever getting in the way: a note that doesn't get through is dropped. */
export function recordUse(action: UseAction, what: UseWhat, ids: { piece?: string; clip?: string } = {}) {
  void apiRequest("/api/usage/", { method: "POST", body: { action, what, ...ids } }).catch(() => undefined);
}
