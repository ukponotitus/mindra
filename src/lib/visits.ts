import { useEffect } from "react";
import { useLocation } from "react-router";
import { API_URL } from "./api";
import { pixelBrowserId } from "./metaPixel";

// Traction: a small note of each page someone looks at, for the founder's Traffic page in the admin (the backend's
// analytics/traffic.py). The website's pages go by name; every signed-in page is "the app", sent once per visit; and
// a sign-up completed is "/signed-up", so the admin can see where sign-ups come from. With it goes the page that sent
// the person here (document.referrer) and an ad's UTM tags from the address they arrived on, kept for the visit. On
// mindra.online it goes to the Worker's /v, which adds the visitor's country and region; in development straight to
// the API. It never waits and never shows an error.

const PUBLIC_PAGES = new Set(["/", "/login", "/signup", "/forgot-password", "/reset-password", "/privacy", "/terms", "/data-deletion", "/unsubscribe"]);
const APP_SENT = "mindra.visit.app";
const CAMPAIGN = "mindra.visit.campaign";
// The site that sent the person at the start of the visit ("-" for none), and Meta's ad click id from the address
// they arrived on (fbclid), both kept for the visit and sent with a sign-up (`signupAttribution`).
const FIRST_REFERRER = "mindra.visit.referrer";
const AD_CLICK = "mindra.visit.fbc";

function remember(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // Private windows and blocked storage: the note still goes, the campaign just isn't kept across pages.
  }
}

function recall(key: string): string {
  try {
    return sessionStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

/** The ad's UTM tags from the address someone arrived on, kept for the rest of the visit. */
function campaign(search: string): Record<string, string> {
  const params = new URLSearchParams(search);
  const click = params.get("fbclid")?.trim();
  if (click) remember(AD_CLICK, `fb.1.${Date.now()}.${click.slice(0, 200)}`);
  const tags: Record<string, string> = {};
  for (const name of ["utm_source", "utm_medium", "utm_campaign"]) {
    const value = params.get(name)?.trim();
    if (value) tags[name] = value.slice(0, 50);
  }
  if (Object.keys(tags).length) {
    remember(CAMPAIGN, JSON.stringify(tags));
    return tags;
  }
  try {
    return JSON.parse(recall(CAMPAIGN) || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

/** Send the note of `page` being looked at. */
export function recordVisit(page: string, search = "") {
  if (typeof navigator === "undefined" || typeof document === "undefined") return;
  const note = { page, referrer: document.referrer || "", ...campaign(search) };
  // Through the Worker on the live site (same origin, so a beacon needs no permission); straight to the API otherwise.
  const target = import.meta.env.PROD && !import.meta.env.VITE_VISITS_TO_API ? "/v" : `${API_URL}/api/visits/`;
  // Text, not JSON: a beacon can't ask the API first, and text needs no asking.
  const body = new Blob([JSON.stringify(note)], { type: "text/plain" });
  try {
    if (!navigator.sendBeacon?.(target, body)) {
      void fetch(target, { method: "POST", body, keepalive: true }).catch(() => undefined);
    }
  } catch {
    // Never in the way.
  }
}

/** The site that sent the person at the start of the visit, kept for the visit (later pages are referred by Mindra). */
function firstReferrer(): string {
  const kept = recall(FIRST_REFERRER);
  if (kept) return kept === "-" ? "" : kept;
  let external = "";
  try {
    external = document.referrer && new URL(document.referrer).host !== window.location.host ? document.referrer : "";
  } catch {
    external = "";
  }
  remember(FIRST_REFERRER, external || "-");
  return external;
}

/** What a sign-up sends about where the person came from (the backend's analytics/signups.py), and, only with their
 * agreement to Meta's ad measurement, Meta's ad click id and browser id. */
export function signupAttribution(adsConsent: boolean) {
  const tags = typeof window === "undefined" ? {} : campaign(window.location.search);
  const ids = adsConsent ? { fbc: recall(AD_CLICK), fbp: pixelBrowserId() } : {};
  return { referrer: typeof document === "undefined" ? "" : firstReferrer(), ...tags, ads_consent: adsConsent, ...ids };
}

/** A sign-up completed, so the admin's Traffic page can count it against where the person came from. */
export function recordSignup() {
  recordVisit("/signed-up");
}

/** Sends a note for each page of the website as it's opened, and one for the app per visit. Mounted inside the router. */
export function useRecordVisits() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const page = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname;
    if (PUBLIC_PAGES.has(page)) {
      firstReferrer();
      recordVisit(page, search);
    } else if (page.startsWith("/l/")) {
      // A short link: the API counts the click itself.
    } else if (!recall(APP_SENT)) {
      remember(APP_SENT, "1");
      recordVisit("/app", search);
    }
  }, [pathname]);
}
