// Runs after `vite build` (see "build" in package.json). Writes the privacy policy, terms and data deletion page as
// static HTML (dist/privacy.html, dist/terms.html, dist/data-deletion.html) with their full text, so Meta's app
// review and URL checker, which may not run JavaScript, can read them. Cloudflare serves dist/privacy.html at /privacy
// (the default html_handling, "auto-trailing-slash"); every other path still gets index.html and the app.
//
// The text comes from the app's own page components, rendered by scripts/prerender-entry.tsx, so it can't drift from
// what the app shows. Each file is dist/index.html with that page's title and description and the rendered page inside
// #root; the app's script tags stay, so the app takes over when JavaScript runs.
import { readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "vite";

process.env.NODE_ENV ??= "production";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
// Inside node_modules, so the built entry finds react, react-dom and react-router next to it. Removed at the end.
const out = path.join(root, "node_modules", ".cache", "mindra-prerender");

function fail(message) {
  console.error(`prerender: ${message}`);
  process.exit(1);
}

function escapeAttribute(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Replaces the content of an existing <meta name|property="key"> tag, or adds one before </head>. */
function setMeta(html, attribute, key, content) {
  const tag = `<meta ${attribute}="${key}" content="${escapeAttribute(content)}">`;
  const existing = new RegExp(`<meta ${attribute}="${key}" content="[^"]*"\\s*/?>`);
  return existing.test(html) ? html.replace(existing, () => tag) : html.replace("</head>", () => `  ${tag}\n  </head>`);
}

// 1. Build the entry for Node with the app's own Vite config (aliases, React plugin, BASE_URL).
await build({
  root,
  mode: "production",
  logLevel: "warn",
  build: {
    ssr: "scripts/prerender-entry.tsx",
    outDir: out,
    emptyOutDir: true,
    copyPublicDir: false,
    sourcemap: false,
    minify: false,
  },
});

const entry = (await readdir(out)).find((name) => /^prerender-entry\.m?js$/.test(name));
if (!entry) fail(`the built entry is missing from ${out}`);
const { pages, renderPage } = await import(pathToFileURL(path.join(out, entry)).href);

// 2. Fill a copy of the built index.html for each page.
const template = await readFile(path.join(dist, "index.html"), "utf8").catch(() => fail("run vite build first"));
if (!template.includes('<div id="root"></div>')) fail('dist/index.html has no empty <div id="root"></div>');
if (!/<title>[^<]*<\/title>/.test(template)) fail("dist/index.html has no <title>");

for (const page of pages) {
  const body = renderPage(page);
  // The page's own heading names it, as the browser tab does (src/lib/useDocumentTitle.ts).
  const heading = body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]?.replace(/<[^>]+>/g, "").trim();
  if (!heading) fail(`${page.path} rendered without an <h1>`);
  const title = `${heading} · Mindra`;

  let html = template.replace(/<title>[^<]*<\/title>/, () => `<title>${title}</title>`);
  html = setMeta(html, "name", "description", page.description);
  html = setMeta(html, "property", "og:title", title);
  html = setMeta(html, "property", "og:description", page.description);
  // index.html's canonical address is the home page's; each page gets its own on the same site.
  const home = html.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
  if (home) {
    const address = new URL(page.path, home).href;
    html = html.replace(/<link rel="canonical" href="[^"]*"/, () => `<link rel="canonical" href="${escapeAttribute(address)}"`);
    html = setMeta(html, "property", "og:url", address);
  }
  html = html.replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);

  await writeFile(path.join(dist, page.file), html);
  console.log(`prerender: ${page.path} -> dist/${page.file} (${(Buffer.byteLength(html) / 1024).toFixed(1)} kB)`);
}

// 3. The site asks crawlers to stay away (.figma/make/site.json, "robots": {"index": false}). Let them fetch these
// pages, so Meta's URL checker can read them; their noindex tag still keeps them out of search results. And Mindra's
// short links (/l/<code>): X's and LinkedIn's link previews follow robots.txt, so without this a post with a Mindra
// link would show no preview card. The API answers them with X-Robots-Tag: noindex.
const robotsPath = path.join(dist, "robots.txt");
const robots = await readFile(robotsPath, "utf8").catch(() => null);
if (robots && /^Disallow: \/$/m.test(robots)) {
  const allowed = [...pages.map((page) => page.path), "/l/"];
  const allow = allowed.map((address) => `Allow: ${address}`).join("\n");
  await writeFile(robotsPath, robots.replace(/^Disallow: \/$/m, () => `${allow}\nDisallow: /`));
  console.log(`prerender: robots.txt allows ${allowed.join(", ")}`);
}

await rm(out, { recursive: true, force: true });
