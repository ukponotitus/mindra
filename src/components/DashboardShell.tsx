import { useState } from "react";
import type { Page } from "../App";
import Sidebar from "./Sidebar";
import TopNav from "./TopNav";
import Dashboard from "../pages/Dashboard";
import CreateProject from "../pages/CreateProject";
import Processing from "../pages/Processing";
import ProjectDetails from "../pages/ProjectDetails";
import AIStudio from "../pages/AIStudio";
import ContentLibrary from "../pages/ContentLibrary";
import ContentEditor from "../pages/ContentEditor";
import Calendar from "../pages/Calendar";
import BrandVoice from "../pages/BrandVoice";
import Billing from "../pages/Billing";
import Settings from "../pages/Settings";

interface Props {
  page: Page;
  navigate: (p: Page) => void;
}

const pageTitles: Partial<Record<Page, string>> = {
  dashboard: "Dashboard",
  projects: "Projects",
  create: "Create Project",
  processing: "Processing",
  "project-details": "Project Details",
  "ai-studio": "AI Studio",
  "content-library": "Content Library",
  "content-editor": "Content Editor",
  calendar: "Content Calendar",
  "brand-voice": "Brand Voice",
  billing: "Billing",
  settings: "Settings",
};

export default function DashboardShell({ page, navigate }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const renderPage = () => {
    switch (page) {
      case "dashboard": return <Dashboard navigate={navigate} />;
      case "create": return <CreateProject navigate={navigate} />;
      case "processing": return <Processing navigate={navigate} />;
      case "project-details": return <ProjectDetails navigate={navigate} />;
      case "ai-studio": return <AIStudio />;
      case "content-library": return <ContentLibrary navigate={navigate} />;
      case "content-editor": return <ContentEditor />;
      case "calendar": return <Calendar />;
      case "brand-voice": return <BrandVoice />;
      case "billing": return <Billing />;
      case "settings": return <Settings />;
      default: return <Dashboard navigate={navigate} />;
    }
  };

  return (
    <div className="h-screen flex bg-[#F8FAFC] overflow-hidden">
      <Sidebar page={page} navigate={navigate} open={sidebarOpen} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav
          title={pageTitles[page] ?? "Dashboard"}
          onToggleSidebar={() => setSidebarOpen((o) => !o)}
          navigate={navigate}
        />
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {renderPage()}
        </main>
      </div>
    </div>
  );
}
