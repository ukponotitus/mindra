// The choices a post needs on some services, as the API checks them (social/options.py): YouTube's visibility and
// audience, and TikTok's settings, which TikTok asks apps to let people choose for every post.

import type { ConnectedAccountKind, ContentPiece, PublishOptions, TikTokPrivacy, YouTubePrivacy } from "./types";

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

// TikTok's own words (its content sharing guidelines).
export const TIKTOK_DISCLOSE_NEEDED = "You need to indicate if your content promotes yourself, a third party, or both.";
export const TIKTOK_BRANDED_NOT_PRIVATE = "Branded content visibility cannot be set to private.";
export const TIKTOK_CAPTION_MAX = 2200;
export const TIKTOK_DESCRIPTION_MAX = 4000;
export const TIKTOK_TITLE_MAX = 90;

/** The caption's first line, which a TikTok photo post's title is until it's changed (as the API does). */
export function firstLine(text: string): string {
  return text.split("\n").find((line) => line.trim())?.trim() ?? "";
}

/** The choices to start from: the post's own for the same service, otherwise the service's defaults (TikTok's
 * visibility is never chosen for the person; its AI-generated label is on for a video Mindra made with AI). */
export function startingOptions(kind: ConnectedAccountKind, current: PublishOptions | undefined, piece?: ContentPiece): PublishOptions {
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
      ai_generated: typeof options.ai_generated === "boolean" ? options.ai_generated : Boolean(piece?.clip?.made_with_ai),
      ...(options.title ? { title: options.title } : {}),
    };
  }
  return {};
}

/** TikTok's disclosure is on and neither box is ticked: posting waits (TikTok's guidelines). */
export function disclosureIncomplete(kind: ConnectedAccountKind | undefined, options: PublishOptions | undefined, disclose: boolean): boolean {
  return kind === "tiktok" && disclose && !options?.your_brand && !options?.branded_content;
}

/** Why the choices can't be used yet, in the API's words, or "". `disclose`: TikTok's disclosure switch is on. */
export function optionsProblem(kind: ConnectedAccountKind, options: PublishOptions, disclose = false): string {
  if (kind !== "tiktok") return "";
  if (!options.privacy_level) return "Choose who can see it on TikTok.";
  if (disclose && !options.your_brand && !options.branded_content) return TIKTOK_DISCLOSE_NEEDED;
  if (options.branded_content && options.privacy_level === "SELF_ONLY") return TIKTOK_BRANDED_NOT_PRIVATE;
  if ((options.title ?? "").length > TIKTOK_TITLE_MAX) return `TikTok titles are up to ${TIKTOK_TITLE_MAX} characters.`;
  return "";
}

/** The two option sets are the same choices. */
export function sameOptions(a: PublishOptions | undefined, b: PublishOptions | undefined): boolean {
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]) as Set<keyof PublishOptions>;
  return [...keys].every((key) => (a ?? {})[key] === (b ?? {})[key]);
}
