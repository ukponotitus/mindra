import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AuthProvider from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import DashboardShell from "./components/DashboardShell";
import { ApiError } from "./lib/api";
import AIStudio from "./pages/AIStudio";
import Analytics from "./pages/Analytics";
import AutomationApprovals from "./pages/AutomationApprovals";
import AutomationDetail from "./pages/AutomationDetail";
import AutomationNew from "./pages/AutomationNew";
import AutomationRun from "./pages/AutomationRun";
import Automations from "./pages/Automations";
import AutomationSetup from "./pages/AutomationSetup";
import Billing from "./pages/Billing";
import AuthPage from "./pages/Auth";
import CalendarPage from "./pages/Calendar";
import BrandVoice from "./pages/BrandVoice";
import ContentEditor from "./pages/ContentEditor";
import Clips from "./pages/Clips";
import PlanDetail from "./pages/PlanDetail";
import Plans from "./pages/Plans";
import VerticalVideos from "./pages/VerticalVideos";
import Studio from "./pages/Studio";
import StudioCreate from "./pages/StudioCreate";
import StudioEditor from "./pages/StudioEditor";
import ContentLibrary from "./pages/ContentLibrary";
import CreateProject from "./pages/CreateProject";
import Dashboard from "./pages/Dashboard";
import DataDeletionPage from "./pages/DataDeletion";
import LandingPage from "./pages/Landing";
import PrivacyPage from "./pages/Privacy";
import Processing from "./pages/Processing";
import ProjectDetails from "./pages/ProjectDetails";
import Projects from "./pages/Projects";
import Settings from "./pages/Settings";
import ShortLink from "./pages/ShortLink";
import TermsPage from "./pages/Terms";

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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={basename}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<AuthPage key="login" mode="login" />} />
            <Route path="/signup" element={<AuthPage key="signup" mode="signup" />} />
            <Route path="/forgot-password" element={<AuthPage key="forgot" mode="forgot" />} />
            <Route path="/reset-password" element={<AuthPage key="reset" mode="reset" />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/data-deletion" element={<DataDeletionPage />} />
            <Route path="/l/:code" element={<ShortLink />} />

            <Route element={<RequireAuth />}>
              <Route element={<DashboardShell />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/new" element={<CreateProject />} />
                <Route path="/projects/:projectId" element={<ProjectDetails />} />
                <Route path="/projects/:projectId/processing" element={<Processing />} />
                <Route path="/ai-studio" element={<AIStudio />} />
                <Route path="/library" element={<ContentLibrary />} />
                <Route path="/library/:pieceId" element={<ContentEditor />} />
                <Route path="/clips" element={<Clips />} />
                <Route path="/vertical" element={<VerticalVideos />} />
                <Route path="/studio" element={<Studio />} />
                <Route path="/studio/new" element={<StudioCreate />} />
                <Route path="/studio/:projectId" element={<StudioEditor />} />
                <Route path="/calendar" element={<CalendarPage />} />
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
                <Route path="/brand-voice" element={<BrandVoice />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
