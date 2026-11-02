import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import AuthProvider from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import DashboardShell from "./components/DashboardShell";
import { ApiError } from "./lib/api";
import AuthPage from "./pages/Auth";
import DataDeletionPage from "./pages/DataDeletion";
import LandingPage from "./pages/Landing";
import PrivacyPage from "./pages/Privacy";
import TermsPage from "./pages/Terms";

// The signed-in pages load when they're first opened, so a phone downloads the landing page and sign-in first, not the
// whole app (DashboardShell shows "Loading…" meanwhile).
const Analytics = lazy(() => import("./pages/Analytics"));
const Assistant = lazy(() => import("./pages/Assistant"));
const CalendarPlan = lazy(() => import("./pages/CalendarPlan"));
const ContentCalendarPage = lazy(() => import("./pages/ContentCalendar"));
const ContentCalendarNew = lazy(() => import("./pages/ContentCalendarNew"));
const ContentCalendars = lazy(() => import("./pages/ContentCalendars"));
const ContentStudio = lazy(() => import("./pages/ContentStudio"));
const AutomationApprovals = lazy(() => import("./pages/AutomationApprovals"));
const AutomationDetail = lazy(() => import("./pages/AutomationDetail"));
const AutomationNew = lazy(() => import("./pages/AutomationNew"));
const AutomationRun = lazy(() => import("./pages/AutomationRun"));
const Automations = lazy(() => import("./pages/Automations"));
const AutomationSetup = lazy(() => import("./pages/AutomationSetup"));
const Billing = lazy(() => import("./pages/Billing"));
const CalendarPage = lazy(() => import("./pages/Calendar"));
const BrandProfile = lazy(() => import("./pages/BrandProfile"));
const CampaignDetail = lazy(() => import("./pages/CampaignDetail"));
const CampaignEditor = lazy(() => import("./pages/CampaignEditor"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const ContentEditor = lazy(() => import("./pages/ContentEditor"));
const Clips = lazy(() => import("./pages/Clips"));
const PlanDetail = lazy(() => import("./pages/PlanDetail"));
const Plans = lazy(() => import("./pages/Plans"));
const VerticalVideos = lazy(() => import("./pages/VerticalVideos"));
const Studio = lazy(() => import("./pages/Studio"));
const StudioCreate = lazy(() => import("./pages/StudioCreate"));
const StudioEditor = lazy(() => import("./pages/StudioEditor"));
const ContentLibrary = lazy(() => import("./pages/ContentLibrary"));
const CreateProject = lazy(() => import("./pages/CreateProject"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const Processing = lazy(() => import("./pages/Processing"));
const ProjectDetails = lazy(() => import("./pages/ProjectDetails"));
const Projects = lazy(() => import("./pages/Projects"));
const Settings = lazy(() => import("./pages/Settings"));
const ShortLink = lazy(() => import("./pages/ShortLink"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      // Retry network blips, but not answers like "not found" or "not allowed".
      retry: (failures, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failures < 2,
    },
  },
});

// Vite's base can be a full URL on hosted previews; the router only needs its path.
const basename = new URL(import.meta.env.BASE_URL, window.location.origin).pathname.replace(/\/$/, "") || "/";

/** The Calendar is now the Planner: old links (reminder emails, bookmarks) still open it, with their day and post. */
function ToPlanner() {
  const { search } = useLocation();
  return <Navigate to={`/planner${search}`} replace />;
}

/** AI Studio was taken out (the same posts are in the Content Library, and on each project's page): old links open
 * the recording's posts, or the Library. */
function FromAIStudio() {
  const project = new URLSearchParams(useLocation().search).get("project");
  return <Navigate to={project ? `/projects/${project}?tab=posts` : "/library"} replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <AuthProvider>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<AuthPage key="login" mode="login" />} />
              <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
              <Route path="/forgot-password" element={<AuthPage key="forgot" mode="forgot" />} />
              <Route path="/reset-password" element={<AuthPage key="reset" mode="reset" />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/data-deletion" element={<DataDeletionPage />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/l/:code" element={<ShortLink />} />

              <Route element={<RequireAuth />}>
                <Route element={<DashboardShell />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/new" element={<CreateProject />} />
                  <Route path="/projects/:projectId" element={<ProjectDetails />} />
                  <Route path="/projects/:projectId/processing" element={<Processing />} />
                  <Route path="/ai-studio" element={<FromAIStudio />} />
                  <Route path="/library" element={<ContentLibrary />} />
                  <Route path="/library/:pieceId" element={<ContentEditor />} />
                  <Route path="/clips" element={<Clips />} />
                  <Route path="/vertical" element={<VerticalVideos />} />
                  <Route path="/studio" element={<Studio />} />
                  <Route path="/studio/new" element={<StudioCreate />} />
                  <Route path="/studio/:projectId" element={<StudioEditor />} />
                  <Route path="/planner" element={<CalendarPage />} />
                  <Route path="/calendar" element={<ToPlanner />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/results" element={<Navigate to="/analytics" replace />} />
                  <Route path="/plans" element={<Plans />} />
                  <Route path="/automations" element={<Automations />} />
                  <Route path="/automations/new" element={<AutomationNew />} />
                  <Route path="/automations/approvals" element={<AutomationApprovals />} />
                  <Route path="/automations/runs/:runId" element={<AutomationRun />} />
                  <Route path="/automations/:automationId" element={<AutomationDetail />} />
                  <Route path="/automations/:automationId/setup" element={<AutomationSetup />} />
                  <Route path="/plans/:planId" element={<PlanDetail />} />
                  <Route path="/assistant" element={<Assistant />} />
                  <Route path="/content-studio" element={<ContentStudio />} />
                  <Route path="/content-calendar" element={<ContentCalendars />} />
                  <Route path="/content-calendar/new" element={<ContentCalendarNew />} />
                  <Route path="/content-calendar/:calendarId" element={<ContentCalendarPage />} />
                  <Route path="/content-calendar/:calendarId/plan" element={<CalendarPlan />} />
                  <Route path="/brand" element={<BrandProfile />} />
                  <Route path="/brand-voice" element={<Navigate to="/brand" replace />} />
                  <Route path="/campaigns" element={<Campaigns />} />
                  <Route path="/campaigns/new" element={<CampaignEditor />} />
                  <Route path="/campaigns/:campaignId" element={<CampaignDetail />} />
                  <Route path="/campaigns/:campaignId/edit" element={<CampaignEditor key="edit" />} />
                  <Route path="/billing" element={<Billing />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
