// The choices a post needs on some services, as the API checks them (social/options.py): YouTube's visibility and
// audience, and TikTok's settings, which TikTok asks apps to let people choose for every post.

import type { ConnectedAccountKind, PublishOptions, TikTokPrivacy, YouTubePrivacy } from "./types";

export const YOUTUBE_PRIVACY: { id: YouTubePrivacy; label: string }[] = [
  { id: "public", label: "Public" },
  { id: "unlisted", label: "Unlisted (only people with the link)" },
  { id: "private", label: "Private (only you)" },
];

export const TIKTOK_PRIVACY_LABELS: Record<TikTokPrivacy, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends (followers you follow back)",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only you",
};

export const TIKTOK_MUSIC_URL = "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en";
export const TIKTOK_BRANDED_URL = "https://www.tiktok.com/legal/page/global/bc-policy/en";

/** Whether a kind of account has choices to make for each post. */
export function hasOptions(kind: ConnectedAccountKind): boolean {
  return kind === "youtube" || kind === "tiktok";
}

/** The choices to start from: the post's own for the same service, otherwise the service's defaults (TikTok's
 * visibility is never chosen for the person). */
export function startingOptions(kind: ConnectedAccountKind, current: PublishOptions | undefined): PublishOptions {
  const options = current ?? {};
  if (kind === "youtube") {
    return { privacy: options.privacy ?? "public", ...(typeof options.made_for_kids === "boolean" ? { made_for_kids: options.made_for_kids } : {}) };
  }
  if (kind === "tiktok") {
    return {
      ...(options.privacy_level ? { privacy_level: options.privacy_level } : {}),
      allow_comment: options.allow_comment === true,
      allow_duet: options.allow_duet === true,
      allow_stitch: options.allow_stitch === true,
      your_brand: options.your_brand === true,
      branded_content: options.branded_content === true,
    };
  }
  return {};
}

/** Why the choices can't be used yet, in the API's words, or "". `disclose`: TikTok's disclosure switch is on. */
export function optionsProblem(kind: ConnectedAccountKind, options: PublishOptions, disclose = false): string {
  if (kind !== "tiktok") return "";
  if (!options.privacy_level) return "Choose who can see it on TikTok.";
  if (disclose && !options.your_brand && !options.branded_content) {
    return "Say whether it promotes yourself, another brand, or both, or turn off the disclosure.";
  }
  if (options.branded_content && options.privacy_level === "SELF_ONLY") {
    return "Branded content can't be private on TikTok. Choose who else can see it.";
  }
  return "";
}

/** The two option sets are the same choices. */
export function sameOptions(a: PublishOptions | undefined, b: PublishOptions | undefined): boolean {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]) as Set<keyof PublishOptions>;
  return [...keys].every((key) => (a ?? {})[key] === (b ?? {})[key]);
}
