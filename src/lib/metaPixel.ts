// Meta's pixel, for measuring Mindra's own Facebook and Instagram ads. It's only loaded for someone who ticks "Let Meta
// know I signed up" on a sign-up form, and only when the build has a pixel id (VITE_META_PIXEL_ID). Then it reports
// the sign-up (CompleteRegistration) with the same event id as the API's server-side report (the backend's
// analytics/meta_ads.py), so Meta counts it once. Nobody else's visit ever loads it.

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...args: unknown[]) => void; queue: unknown[][]; push: Fbq; loaded: boolean; version: string };
type WithPixel = Window & { fbq?: Fbq; _fbq?: Fbq };

const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID ?? "").trim();

/** Whether this build can measure Meta's ads (so the sign-up forms offer the choice). */
export const metaAdsAvailable = Boolean(PIXEL_ID);

/** Load the pixel, once: Meta's standard snippet, written out. */
export function loadPixel() {
  if (!PIXEL_ID || typeof window === "undefined") return;
  const page = window as WithPixel;
  if (page.fbq) return;
  const fbq = function (...args: unknown[]) {
    if (fbq.callMethod) fbq.callMethod(...args);
    else fbq.queue.push(args);
  } as Fbq;
  fbq.push = fbq;
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.queue = [];
  page.fbq = fbq;
  page._fbq = fbq;
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
  fbq("init", PIXEL_ID);
}

/** Meta's browser id (the pixel's _fbp cookie), or "" before the pixel has set it. */
export function pixelBrowserId(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

/** The sign-up, for someone who agreed: the same event id as the API's report of it. */
export function trackSignup(userId: number | string) {
  (window as WithPixel).fbq?.("track", "CompleteRegistration", {}, { eventID: `signup-${userId}` });
}
