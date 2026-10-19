// Mindra's service worker: it shows post reminders sent with Web Push and opens the post when one is tapped.
// It caches nothing, so the app always loads fresh from the network.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Paths are resolved against the worker's own address, so they work wherever the app is served from.
const ICON = new URL("icons/icon-192.png", self.registration.scope).href;
const BADGE = new URL("icons/badge-96.png", self.registration.scope).href;

// The server sends {title, body, url, tag}: a reminder for a post opens /library/<id>?reminder=1 and is tagged with
// the post's id, so a second reminder for the same post replaces the first.
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }
  const options = {
    body: data.body || "",
    icon: ICON,
    badge: BADGE,
    data: { url: data.url || self.registration.scope },
  };
  if (data.tag) {
    options.tag = String(data.tag);
    options.renotify = true;
  }
  event.waitUntil(self.registration.showNotification(data.title || "Mindra", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || self.registration.scope, self.registration.scope);

  event.waitUntil(
    (async () => {
      // A Mindra tab that's already open: bring it forward and show the post there.
      if (url.origin === self.location.origin) {
        const tabs = await self.clients.matchAll({ type: "window" });
        const tab = tabs.find((client) => new URL(client.url).origin === url.origin);
        if (tab) {
          const focused = await tab.focus().catch(() => tab);
          try {
            await focused.navigate(url.href);
            return;
          } catch {
            // Some browsers won't move a tab from here; open the post in a new one instead.
          }
        }
      }
      await self.clients.openWindow(url.href);
    })(),
  );
});
