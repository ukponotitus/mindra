import type { Page } from "../App";

interface Props {
  page: Page;
  navigate: (p: Page) => void;
  open: boolean;
}

const navItems: { label: string; page: Page; icon: string }[] = [
  { label: "Dashboard", page: "dashboard", icon: "⊡" },
  { label: "Projects", page: "projects", icon: "📁" },
  { label: "Content Library", page: "content-library", icon: "🗂" },
  { label: "AI Studio", page: "ai-studio", icon: "✨" },
  { label: "Calendar", page: "calendar", icon: "📅" },
  { label: "Brand Voice", page: "brand-voice", icon: "🎯" },
  { label: "Billing", page: "billing", icon: "💳" },
  { label: "Settings", page: "settings", icon: "⚙" },
];

export default function Sidebar({ page, navigate, open }: Props) {
  if (!open) return null;

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-[#E5E7EB] flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">CR</span>
          </div>
          <span className="font-bold text-[#111827] tracking-tight">ContentRepurpose</span>
        </div>
      </div>

      {/* New Project CTA */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => navigate("create")}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-[#6D5EF5] to-[#5a4de0] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
        >
          <span className="text-base leading-none">+</span> New Project
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const active = page === item.page || (item.page === "projects" && page === "project-details");
          return (
            <button
              key={item.label}
              onClick={() => navigate(item.page)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                active
                  ? "bg-[#EDE9FE] text-[#6D5EF5]"
                  : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
              }`}
            >
              <span className="text-base leading-none w-5 text-center">{item.icon}</span>
              {item.label}
              {item.page === "ai-studio" && (
                <span className="ml-auto text-[10px] font-bold bg-[#3ECFCE]/20 text-[#0E9F9F] px-1.5 py-0.5 rounded-full">
                  AI
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Usage meter */}
      <div className="px-4 pb-4 pt-2 border-t border-[#E5E7EB] mt-auto">
        <div className="bg-[#F8FAFC] rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#374151]">AI Credits</span>
            <span className="text-xs font-bold text-[#111827]">73 / 100</span>
          </div>
          <div className="h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#6D5EF5] to-[#3ECFCE] rounded-full" style={{ width: "73%" }} />
          </div>
          <p className="text-[10px] text-[#9CA3AF] mt-1.5">Creator Plan · Resets in 8 days</p>
        </div>

        <div className="flex items-center gap-2 mt-3 px-1">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            SC
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#111827] truncate">Sarah Chen</p>
            <p className="text-[10px] text-[#9CA3AF] truncate">sarah@example.com</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
