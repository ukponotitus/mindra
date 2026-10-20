// Renders the public text pages to HTML at build time (scripts/prerender.mjs builds this file for Node and calls
// renderPage). Meta's app review and URL checker read the privacy policy, terms and data deletion page, and they may
// not run JavaScript, so the text has to be in the HTML. These are the same components the app shows; when the app's
// JavaScript starts, it renders the page again in place.
import type { ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { Route, Routes, StaticRouter } from "react-router";
import { AuthContext, type AuthContextValue } from "../src/auth/context";
import DataDeletionPage from "../src/pages/DataDeletion";
import PrivacyPage from "../src/pages/Privacy";
import TermsPage from "../src/pages/Terms";

export interface StaticPage {
  /** The route, as in src/App.tsx. */
  path: string;
  /** The file written into dist/; Cloudflare serves dist/privacy.html at /privacy. */
  file: string;
  description: string;
  Component: ComponentType;
}

export const pages: StaticPage[] = [
  {
    path: "/privacy",
    file: "privacy.html",
    description:
      "What Mindra collects, including from the Facebook Pages and Instagram accounts you connect, how it's used and kept, and how to delete it.",
    Component: PrivacyPage,
  },
  {
    path: "/terms",
    file: "terms.html",
    description: "The terms for using Mindra, including posting to the Facebook Pages and Instagram accounts you connect.",
    Component: TermsPage,
  },
  {
    path: "/data-deletion",
    file: "data-deletion.html",
    description:
      "How to delete your data from Mindra, including connected Facebook Pages and Instagram accounts and their access tokens.",
    Component: DataDeletionPage,
  },
];

// A visitor nobody has signed in yet: the pages' buttons say "Start free", as they do before the app checks a sign-in.
const signedOut: AuthContextValue = {
  status: "signedOut",
  user: null,
  signIn: () => undefined,
  signOut: async () => undefined,
  retry: () => undefined,
};

// The same base path the app's router uses (src/App.tsx), so links match on hosted previews too.
const basename = new URL(import.meta.env.BASE_URL, "https://example.invalid").pathname.replace(/\/$/, "") || "/";

export function renderPage(page: StaticPage): string {
  const { Component } = page;
  const location = basename === "/" ? page.path : `${basename}${page.path}`;
  return renderToString(
    <StaticRouter basename={basename} location={location}>
      <AuthContext.Provider value={signedOut}>
        <Routes>
          <Route path={page.path} element={<Component />} />
        </Routes>
      </AuthContext.Provider>
    </StaticRouter>,
  );
}
