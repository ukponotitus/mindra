# figma-make-app

React + Vite + Tailwind CSS project running inside Figma Make.

## Development Server

A Vite development server is **already running** on `$PORT` (default 8443). You don't need to start it manually.

- Preview URL: The user can access the running app through the preview panel
- Hot reload: Changes to source files are reflected immediately

## Project Structure

This is the canonical project structure. Start with task-relevant files below. Only follow imports or inspect other files when required, when a documented path is missing, or when the repository contradicts this guide.

- `src/main.tsx` - React entrypoint; imports `src/index.css` and mounts `src/App.tsx` into the `#root` element
- `src/App.tsx` - Primary application component and the usual starting point for UI work
- `src/index.css` - Global CSS entrypoint and Tailwind CSS v4 import
- `index.html` - Vite HTML shell containing the `#root` element and loading `src/main.tsx`
- `package.json` - Project dependencies and the Vite build, development, preview, and formatting scripts
- `vite.config.ts` - Vite configuration with React, Tailwind CSS v4, and Figma Make plugins plus the `@` alias for `src`
- `.mise.toml` - Toolchain versions for Node.js and pnpm

## Dependencies

- Runtime: React 19 and React DOM 19
- Styling: Tailwind CSS v4 with the `@tailwindcss/vite` plugin
- Build tooling: Vite 8, TypeScript 5.7, and `@vitejs/plugin-react`
- Formatting: oxfmt

## Styling

This project uses **Tailwind CSS v4** through the `@tailwindcss/vite` plugin configured in `vite.config.ts`. `src/index.css` imports Tailwind with `@import 'tailwindcss';`. Use Tailwind utility classes directly in JSX and put global CSS or Tailwind v4 theme customization in `src/index.css`. This scaffold does not need a Tailwind config file or PostCSS config.

`src/main.tsx` imports `src/index.css`, so global font wiring belongs in `src/index.css`. Keep CSS `@import` statements first, then add any `@font-face` rules and font-family defaults there.

## Code quality

- Use double quotes for strings containing apostrophes (`"We're here to help"`), or escape them in single-quoted strings. An unescaped apostrophe in a single-quoted string breaks the build.
- Ensure JSX tags are closed and braces are balanced.
- Export components as default exports.

## Backend connection

The app talks to the Django API in the separate `mindra-backend` repo (`../mindra-backend`; its README lists the endpoints). Locally the API runs at `http://localhost:8000`; set `VITE_API_URL` to point elsewhere.

- `src/lib/api.ts` - `apiRequest` and `uploadWithProgress`: base URL, sign-in token, readable `ApiError`s
- `src/lib/projects.ts` - TanStack Query hooks for projects, plus status and platform labels
- `src/lib/types.ts` - API response types
- `src/auth/` - sign-in state (`AuthProvider`, `useAuth`) and `RequireAuth` for signed-in routes
- `src/App.tsx` - every route (React Router)

- `src/lib/content.ts` - hooks for written posts, writing runs, brand voice, editor suggestions and AI status
- `src/lib/clips.ts` - hooks for video clips (every clip, a project's clips, find, make by hand, trim, caption style, render, delete), polling while clips are found or rendered
- `src/pages/Clips.tsx` - the Clips page: every clip across videos, linking to each one in its project's Clips tab (`/projects/<id>?tab=clips&clip=<clipId>`)
- `src/components/project/` - the project page's parts (Next steps, analysis, transcript, posts, clips, the "New clip" dialog, a clip's posts in `ClipPosts.tsx`, and a photos project's Photos tab in `ProjectPhotos.tsx`)
- `src/components/content/` - post card (a post for a made clip shows the video, a photo post its pictures, each with a Share button), the "write posts" form, platform badge, the editor's suggestions panel, and `ShareButton.tsx` (phone share menu with the video or photos and the caption; download and copy elsewhere)
- `src/lib/photos.ts` - photo posts: a project with `source_type: "photos"` (ready at once, nothing processed) made from New Project's "Photos" type. Photo platforms, making photos smaller on the device (long side 2048 px, JPEG quality 0.85), the one-at-a-time upload queue (a dropped connection waits for `online`), and hooks for a project's photos (list, delete, order, the files to share)
- `src/lib/calendar.ts` - the content calendar: days and times in the browser's time zone (sent to the API as ISO times with their offset), schedule statuses (planned, reminded, posted, missed) and their colours, the Schedule dialog's quick picks, and hooks to schedule, move, unschedule and mark posts as posted
- `src/pages/Calendar.tsx` and `src/components/calendar/` - the Calendar page (month, week and agenda views, with `?view=`, `?date=` and `?post=<id>` in the address), drag and drop on computers with Undo (every drag has a button in a dialog too), the "Ready to schedule" tray, the post dialog, the Schedule dialog used on post cards and in the editor, the editor's Schedule section and reminder banner (`/library/<id>?reminder=1`), the Dashboard's "Coming up" card and Settings → Reminders
- `src/lib/notifications.ts` and `public/sw.js` - reminders: the service worker (registered from `src/main.tsx`) shows Web Push messages `{title, body, url, tag}` and opens the url when one is tapped; it caches nothing. Settings turns phone notifications on or off per device with the API's VAPID key, sets email reminders and sends a test reminder
- `public/manifest.webmanifest` and `public/icons/` - the web app manifest and icons (drawn from `BrandMark`), linked from `index.html`. iPhones only allow notifications once Mindra is added to the Home Screen

Billing shows a "Coming soon" page (`src/components/ComingSoon.tsx`); `src/pages/Billing.tsx` keeps the original design for when billing is built (milestones in `../mindra-backend/IMPLEMENTATION_PLAN.md`).

## Deploy

The live site is the static build (`dist/`) served by a Cloudflare Worker named `mindra` (static assets only, no server code), connected to this repo so every push to `main` deploys: https://mindra.titusukpono0.workers.dev. `wrangler.jsonc` holds its settings: the `dist/` folder, the `workers.dev` address switched on, and `not_found_handling: "single-page-application"` so every path that isn't a file gets `index.html` and React Router's deep links work.

- Build settings (Workers & Pages → mindra → Settings → Build): build command `pnpm run build`, deploy command `npx wrangler deploy`, root directory `/`.
- Environment variables (Production, and Preview if used): `VITE_API_URL`, the live API's URL with no trailing slash. Vite writes it into the build, so redeploy after changing it; a build without it calls `http://localhost:8000`. Optionally `PNPM_VERSION=10.34.3` to match `.mise.toml` (Cloudflare's default pnpm also installs this lockfile). Leave `FIGMA_PUBLIC_URL` unset so the base is `/`.
- Node: `.node-version` pins 22.23.3, which Cloudflare's build reads. React Router 8 needs Node 22.22 or newer, and Cloudflare's default (22.16) is older.
- Install: the build installs from `pnpm-lock.yaml`. Commit that lockfile and not `package-lock.json`, and update it (`pnpm install`) whenever `package.json` changes.
- Deep links (`/projects/<id>`, `/privacy`) come from `not_found_handling` in `wrangler.jsonc`. Keep its `compatibility_date` no newer than the local wrangler supports, or `wrangler dev` won't start.
- The API must accept the site's origin: set `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` on the backend (see `../mindra-backend/README.md`).
- Search engines: `.figma/make/site.json` has `"robots": { "index": false }`, so the build adds `noindex` and a `robots.txt` that blocks crawlers. Change it when the landing page should appear in search.
- Sign-up asks for an invite code when the API says so (`GET /api/auth/signup-options/`, on when the backend's `BETA_INVITE_CODES` is set).
- Legal pages: `/privacy` and `/terms` (`src/pages/Privacy.tsx`, `src/pages/Terms.tsx`, laid out by `src/components/landing/LegalLayout.tsx`), linked from the landing footer and the sign-up form. The company name, contact email and governing country are in `src/lib/legal.ts` (the email is a personal address for the beta); change `LEGAL_LAST_UPDATED` whenever either page changes.
- Try a production build locally: `VITE_API_URL=http://localhost:8000 pnpm build`, then `pnpm preview --port 4173` (without `--port` it tries the dev server's port).

## Marketing video

`campaign/` is a separate Remotion project (its own `package.json`, not part of the Vite build) for the 60-second Facebook Reels launch video (1080x1920, 30 fps). Run `npm install` there once, then `npm run studio` to preview or `npm run render` to write `campaign/out/mindra-reel-1080x1920.mp4`. Scenes are in `campaign/src/scenes/`, scene start frames in `campaign/src/timeline.ts`. The voice-over script is `campaign/audio/voiceover.mjs`; `npm run voice` generates its lines with ElevenLabs (key in the git-ignored `campaign/.env`) into `campaign/audio/voice/`, only regenerating lines that changed, and warns if a line runs into the next scene. The soundtrack (that voice over sound effects from `campaign/audio/sfx.mjs` and soft music from `campaign/audio/music.mjs`, which dip while it speaks) is mixed by `npm run audio` (needs ffmpeg) into `campaign/public/audio/mindra-reel.wav`; rerun it after changing any timing or line. `npm run audio -- --no-music` leaves the music out.
