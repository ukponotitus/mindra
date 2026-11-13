// The Worker in front of mindra.online. Files in dist/ are served as static assets without running this script; only
// /l/* and /v run it first (`run_worker_first` in wrangler.jsonc). /l/* are Mindra's short links: each is passed to
// the API (API_URL), with the visitor's country from Cloudflare, and the API counts the click and answers with a
// redirect to where the link goes. /v is the website's note that a page was looked at (src/lib/visits.ts), passed to
// the API's /api/visits/ with the country, the state or region, and a visitor id: a hash of the day, the visitor's
// address and browser (and VISITOR_SALT, a secret, when one is set), so the API counts a person once a day without
// ever seeing their address. Nothing else about the visitor is passed on.

// What the API needs to tell a person's click from a link preview or a browser's prefetch.
// The Referer says which site sent the click; the API keeps its site only, as a count.
const PASSED_HEADERS = ["User-Agent", "Referer", "Sec-Purpose", "Purpose", "X-Purpose", "X-Moz"];

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/l/")) return followShortLink(request, url, env);
    if (url.pathname === "/v") return recordVisit(request, env, ctx);
    return env.ASSETS.fetch(request);
  },
};

async function recordVisit(request, env, ctx) {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
  const body = (await request.text()).slice(0, 4000);
  const headers = new Headers({ "Content-Type": "text/plain; charset=utf-8" });
  const agent = request.headers.get("User-Agent") ?? "";
  if (agent) headers.set("User-Agent", agent);
  for (const name of ["Sec-Purpose", "Purpose", "X-Purpose", "X-Moz"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const country = request.cf?.country;
  if (country) headers.set("X-Mindra-Country", country);
  const region = request.cf?.region;
  if (region) headers.set("X-Mindra-Region", region);
  headers.set("X-Mindra-Visitor", await visitorId(request, agent, env));
  const sending = fetch(`${env.API_URL}/api/visits/`, { method: "POST", headers, body }).catch(() => undefined);
  // The visitor's page doesn't wait for the API.
  ctx.waitUntil(sending);
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

async function visitorId(request, agent, env) {
  const address = request.headers.get("CF-Connecting-IP") ?? "";
  const day = new Date().toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${day}|${address}|${agent}|${env.VISITOR_SALT ?? ""}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  return Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function followShortLink(request, url, env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const headers = new Headers();
  for (const name of PASSED_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const country = request.cf?.country;
  if (country) headers.set("X-Mindra-Country", country);
  let answer;
  try {
    answer = await fetch(`${env.API_URL}${url.pathname}`, { method: request.method, headers, redirect: "manual" });
  } catch {
    return new Response("Mindra couldn't open this link just now. Try again in a moment.", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  const location = answer.headers.get("Location");
  if (answer.status >= 300 && answer.status < 400 && location) {
    return new Response(null, {
      status: 302,
      headers: { Location: location, "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
    });
  }
  // A link that isn't in use: the API's page saying so.
  return new Response(answer.body, {
    status: answer.status,
    headers: {
      "Content-Type": answer.headers.get("Content-Type") ?? "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
