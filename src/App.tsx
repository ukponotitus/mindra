import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import AuthProvider from "./auth/AuthProvider";
import RequireAuth from "./auth/RequireAuth";
import ComingSoon from "./components/ComingSoon";
import DashboardShell from "./components/DashboardShell";
import { ApiError } from "./lib/api";
import AIStudio from "./pages/AIStudio";
import AuthPage from "./pages/Auth";
import CalendarPage from "./pages/Calendar";
import BrandVoice from "./pages/BrandVoice";
import ContentEditor from "./pages/ContentEditor";
import Clips from "./pages/Clips";
import PlanDetail from "./pages/PlanDetail";
import Plans from "./pages/Plans";
import VerticalVideos from "./pages/VerticalVideos";
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
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/plans" element={<Plans />} />
                <Route path="/plans/:planId" element={<PlanDetail />} />
                <Route path="/brand-voice" element={<BrandVoice />} />
                <Route
                  path="/billing"
                  element={
                    <ComingSoon
                      icon={CreditCard}
                      title="Plans & Billing"
                      description="Mindra is free while it's in beta. Paid plans arrive after the beta."
                      points={[
                        "Plans priced by hours of video, never per post",
                        "Pay in naira with Paystack, or in dollars with a card",
                        "See your usage for the month at a glance",
                        "Download invoices for your records",
                      ]}
                      note="You'll hear from us well before anything changes."
                    />
                  }
                />
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
