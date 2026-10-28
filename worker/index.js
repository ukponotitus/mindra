// The Worker in front of mindra.online. Files in dist/ are served as static assets without running this script; only
// /l/* runs it first (`run_worker_first` in wrangler.jsonc). Those are Mindra's short links: each is passed to the API
// (API_URL), with the visitor's country from Cloudflare, and the API counts the click and answers with a redirect to
// where the link goes. Nothing else about the visitor is passed on.

// What the API needs to tell a person's click from a link preview or a browser's prefetch.
// The Referer says which site sent the click; the API keeps its site only, as a count.
const PASSED_HEADERS = ["User-Agent", "Referer", "Sec-Purpose", "Purpose", "X-Purpose", "X-Moz"];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/l/")) return followShortLink(request, url, env);
    return env.ASSETS.fetch(request);
  },
};

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
