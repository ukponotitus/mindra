// Reminders: the service worker that shows them, phone notifications through Web Push, and the email preference.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { NotificationSettings, TestReminderResult } from "./types";

/** public/sw.js, next to the app so it covers every page. It shows reminders and caches nothing. */
const SERVICE_WORKER_URL = `${import.meta.env.BASE_URL}sw.js`;

/** Register the service worker, where the browser has them. Reminders need it; the app works without it. */
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SERVICE_WORKER_URL).catch(() => {
      // Blocked (private mode, a hosted preview on another origin): reminders say they aren't available.
    });
  });
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => apiRequest<NotificationSettings>("/api/notifications/"),
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: { email_reminders: boolean }) =>
      apiRequest<NotificationSettings>("/api/notifications/", { method: "PATCH", body: changes }),
    onSuccess: (settings) => queryClient.setQueryData(["notifications"], settings),
  });
}

/** Send a reminder now to every device and inbox the signed-in person gets reminders on. */
export function useTestReminder() {
  return useMutation({
    mutationFn: () => apiRequest<TestReminderResult>("/api/notifications/test/", { method: "POST" }),
  });
}

// --- This device ---------------------------------------------------------------------------------------------------

function isIos(): boolean {
  const agent = navigator.userAgent;
  // iPads say they're Macs; a touch screen gives them away.
  return /iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
}

/** Opened from the Home Screen (or installed elsewhere) rather than in a browser tab. */
function isInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

/**
 * Whether this device can get phone notifications: "supported"; "install-first" on an iPhone or iPad that hasn't added
 * Mindra to its Home Screen (Safari only allows them there); "update-ios" on an older iPhone; "unsupported" elsewhere.
 */
export function pushSupport(): "supported" | "install-first" | "update-ios" | "unsupported" {
  const capable = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (isIos() && !isInstalled()) return "install-first";
  if (capable) return "supported";
  return isIos() ? "update-ios" : "unsupported";
}

/** The server's key, which comes as URL-safe base64, as the bytes the browser wants. */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index++) bytes[index] = raw.charCodeAt(index);
  return bytes;
}

/** Whether a subscription was made with this server key (a new key on the server needs a new subscription). */
function madeWithKey(subscription: PushSubscription, key: string): boolean {
  const current = subscription.options?.applicationServerKey;
  if (!current) return true;
  const a = new Uint8Array(current);
  const b = keyBytes(key);
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** The service worker once it's running, registering it if the page loaded before it could be. */
async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register(SERVICE_WORKER_URL);
  let timer = 0;
  const timeout = new Promise<never>((_, reject) => {
    timer = window.setTimeout(
      () => reject(new Error("Notifications couldn't start in this browser. Reload the page and try again.")),
      15_000,
    );
  });
  try {
    return await Promise.race([navigator.serviceWorker.ready, timeout]);
  } finally {
    window.clearTimeout(timer);
  }
}

/** This device's subscription, if it has one made with the server's current key. */
export async function currentSubscription(publicKey: string): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = (await registration?.pushManager.getSubscription()) ?? null;
  return subscription && madeWithKey(subscription, publicKey) ? subscription : null;
}

/** Tell the server where to send this person's reminders. Sending the same address again just updates it. */
export async function saveSubscription(subscription: PushSubscription) {
  const { keys } = subscription.toJSON();
  await apiRequest("/api/notifications/push/", {
    method: "POST",
    body: { endpoint: subscription.endpoint, keys: { p256dh: keys?.p256dh ?? "", auth: keys?.auth ?? "" } },
  });
}

/**
 * Turn phone notifications on for this device: ask for permission, subscribe with the server's key and save the
 * subscription. "blocked" when the browser says no; "dismissed" when the question was closed without an answer.
 */
export async function turnOnPush(publicKey: string): Promise<"on" | "blocked" | "dismissed"> {
  const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission === "denied") return "blocked";
  if (permission !== "granted") return "dismissed";

  const registration = await readyRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (subscription && !madeWithKey(subscription, publicKey)) {
    await subscription.unsubscribe();
    subscription = null;
  }
  try {
    subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  } catch {
    throw new Error("This browser couldn't turn on notifications. Check they're allowed for Mindra, or try Chrome or Safari.");
  }
  await saveSubscription(subscription);
  return "on";
}

/** Turn them off for this device. Once unsubscribed here nothing more arrives, even if the server can't be told. */
export async function turnOffPush() {
  if (!("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  try {
    await apiRequest<null>("/api/notifications/push/remove/", { method: "POST", body: { endpoint } });
  } catch {
    // The push service refuses that address from now on, so nothing reaches this device either way.
  }
}
