import { useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { matchPath, Outlet, useLocation } from "react-router";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useMediaQuery } from "../lib/useMediaQuery";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";

// Most specific first: the first pattern that matches names the page.
const pageTitles: [pattern: string, title: string][] = [
  ["/dashboard", "Dashboard"],
  ["/projects/new", "Create Project"],
  ["/projects/:projectId/processing", "Processing"],
  ["/projects/:projectId", "Project Details"],
  ["/projects", "Projects"],
  ["/ai-studio", "AI Studio"],
  ["/library/:pieceId", "Edit Post"],
  ["/library", "Content Library"],
  ["/clips", "Clips"],
  ["/vertical", "Vertical Videos"],
  ["/studio/new", "Create with AI"],
  ["/studio/:projectId", "Video Editor"],
  ["/studio", "Motion Studio"],
  ["/calendar", "Content Calendar"],
  ["/analytics", "Analytics"],
  ["/plans/:planId", "Content Plan"],
  ["/plans", "Content Plans"],
  ["/brand-voice", "Brand Voice"],
  ["/billing", "Billing"],
  ["/settings", "Settings"],
];

export default function DashboardShell() {
  const wide = useMediaQuery("(min-width: 1024px)");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { pathname } = useLocation();
  const title = pageTitles.find(([pattern]) => matchPath(pattern, pathname))?.[1] ?? "Dashboard";
  useDocumentTitle(title);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {wide && !collapsed && (
        <aside className="w-60 shrink-0 border-r border-border bg-white">
          <Sidebar />
        </aside>
      )}

      {/* On small screens the navigation is a drawer: focus stays inside it and Escape closes it. */}
      {!wide && (
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ease-out data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopNav
          title={title}
          onToggleNavigation={() => (wide ? setCollapsed((value) => !value) : setDrawerOpen(true))}
          navigationLabel={wide ? (collapsed ? "Show sidebar" : "Hide sidebar") : "Open navigation"}
        />
        <main className="relative flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
