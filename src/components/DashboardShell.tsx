import { Suspense, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import AssistantPanel from "./assistant/AssistantPanel";
import { matchPath, Outlet, useLocation } from "react-router";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { useApplyTheme } from "../lib/theme";
import { cn } from "../lib/cn";
import { useMediaQuery } from "../lib/useMediaQuery";
import Sidebar from "./Sidebar";
import MobileTabBar from "./MobileTabBar";
import PageErrorBoundary from "./PageErrorBoundary";
import TopNav from "./TopNav";

// Most specific first: the first pattern that matches names the page.
const pageTitles: [pattern: string, title: string][] = [
  ["/dashboard", "Dashboard"],
  ["/projects/new", "Create Project"],
  ["/projects/:projectId/processing", "Processing"],
  ["/projects/:projectId", "Project Details"],
  ["/projects", "Projects"],
  ["/library/:pieceId", "Edit Post"],
  ["/library", "Content Library"],
  ["/clips", "Clips"],
  ["/vertical", "Vertical Videos"],
  ["/studio/new", "Create with AI"],
  ["/studio/:projectId", "Video Editor"],
  ["/studio", "Motion Studio"],
  ["/planner", "Planner"],
  ["/activity", "Activity Log"],
  ["/analytics", "Analytics"],
  ["/plans/:planId", "Content Plan"],
  ["/plans", "Content Plans"],
  ["/automations/new", "New Automation"],
  ["/automations/approvals", "Waiting for Approval"],
  ["/automations/runs/:runId", "Automation Run"],
  ["/automations/:automationId/setup", "Set Up Automation"],
  ["/automations/:automationId", "Automation"],
  ["/automations", "Automations"],
  ["/brand", "Brand Profile"],
  ["/campaigns/new", "New Campaign"],
  ["/campaigns/:campaignId/edit", "Change Campaign"],
  ["/campaigns/:campaignId", "Campaign"],
  ["/campaigns", "Campaigns"],
  ["/assistant", "Assistant"],
  ["/content-studio", "Content Studio"],
  ["/content-calendar/new", "New Calendar"],
  ["/content-calendar/:calendarId/plan", "Content Plan"],
  ["/content-calendar/:calendarId", "Content Calendar"],
  ["/content-calendar", "Content Calendar"],
  ["/billing", "Billing"],
  ["/settings", "Settings"],
];

const ASSISTANT_KEY = "mindra.assistant.open";

function savedAssistantOpen() {
  try {
    return localStorage.getItem(ASSISTANT_KEY) === "1";
  } catch {
    return false;
  }
}

export default function DashboardShell() {
  useApplyTheme();
  const wide = useMediaQuery("(min-width: 1024px)");
  // The assistant sits beside the page when there's room for both, and over it otherwise.
  const roomy = useMediaQuery("(min-width: 1280px)");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assistantOpen, setAssistantOpenState] = useState(savedAssistantOpen);
  const { pathname } = useLocation();
  // Its own page shows it already.
  const showAssistant = assistantOpen && pathname !== "/assistant";
  const setAssistantOpen = (open: boolean) => {
    setAssistantOpenState(open);
    try {
      localStorage.setItem(ASSISTANT_KEY, open ? "1" : "0");
    } catch {
      // Not remembered; it still opens and closes.
    }
  };
  const title = pageTitles.find(([pattern]) => matchPath(pattern, pathname))?.[1] ?? "Dashboard";
  // Phones get the tab bar, except in the video editor, which fills the screen with its own header and tools.
  const editing = Boolean(matchPath("/studio/:projectId", pathname)) && pathname !== "/studio/new";
  const fullScreen = !wide && editing;
  useDocumentTitle(title);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {wide && !collapsed && (
        <aside className="w-60 shrink-0 border-r border-border bg-card">
          <Sidebar />
        </aside>
      )}

      {/* On small screens the navigation is a drawer: focus stays inside it and Escape closes it. */}
      {!wide && (
        <Dialog.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <Dialog.Popup className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ease-out data-[ending-style]:-translate-x-full data-[starting-style]:-translate-x-full">
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Sidebar onNavigate={() => setDrawerOpen(false)} />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {!fullScreen && (
          <TopNav
            title={title}
            onToggleNavigation={() => (wide ? setCollapsed((value) => !value) : setDrawerOpen(true))}
            navigationLabel={wide ? (collapsed ? "Show sidebar" : "Hide sidebar") : "Open navigation"}
            assistantOpen={showAssistant}
            onToggleAssistant={pathname === "/assistant" ? undefined : () => setAssistantOpen(!assistantOpen)}
          />
        )}
        <main className={cn("relative flex-1", fullScreen ? "overflow-hidden" : "overflow-y-auto p-4 sm:p-6 lg:p-8")}>
          {/* A page that fails says so here, with the navigation still around it. */}
          <PageErrorBoundary resetKey={pathname}>
            <Suspense
              fallback={
                <p role="status" className={cn("text-sm text-muted-foreground", fullScreen && "p-4")}>
                  Loading…
                </p>
              }
            >
              <Outlet />
            </Suspense>
          </PageErrorBoundary>
        </main>
        {!wide && !fullScreen && <MobileTabBar onMore={() => setDrawerOpen(true)} />}
      </div>

      {showAssistant && roomy && (
        <aside aria-label="Assistant" className="w-[400px] shrink-0 border-l border-border">
          <AssistantPanel onClose={() => setAssistantOpen(false)} />
        </aside>
      )}
      {!roomy && pathname !== "/assistant" && (
        <Dialog.Root open={showAssistant} onOpenChange={setAssistantOpen}>
          <Dialog.Portal>
            <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
            <Dialog.Popup className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-xl transition-transform duration-200 ease-out data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full">
              <Dialog.Title className="sr-only">Assistant</Dialog.Title>
              <AssistantPanel onClose={() => setAssistantOpen(false)} />
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </div>
  );
}
