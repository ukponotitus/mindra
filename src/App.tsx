import { useState } from "react";
import LandingPage from "./pages/Landing";
import AuthPage from "./pages/Auth";
import DashboardShell from "./components/DashboardShell";

export type Page =
  | "landing"
  | "login"
  | "signup"
  | "forgot"
  | "dashboard"
  | "projects"
  | "create"
  | "processing"
  | "project-details"
  | "ai-studio"
  | "content-library"
  | "content-editor"
  | "calendar"
  | "brand-voice"
  | "billing"
  | "settings";

export default function App() {
  const [page, setPage] = useState<Page>("landing");
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");

  const navigate = (p: Page) => setPage(p);

  if (page === "landing") {
    return (
      <LandingPage
        onGetStarted={() => { setAuthMode("signup"); navigate("login"); }}
        onLogin={() => { setAuthMode("login"); navigate("login"); }}
      />
    );
  }

  if (page === "login" || page === "signup" || page === "forgot") {
    return (
      <AuthPage
        mode={authMode}
        onModeChange={(m) => { setAuthMode(m); navigate(m); }}
        onSuccess={() => navigate("dashboard")}
        onBack={() => navigate("landing")}
      />
    );
  }

  return <DashboardShell page={page} navigate={navigate} />;
}
