import type { Page } from "../App";

interface Props {
  title: string;
  onToggleSidebar: () => void;
  navigate: (p: Page) => void;
}

export default function TopNav({ title, onToggleSidebar, navigate }: Props) {
  return (
    <header className="h-14 bg-white border-b border-[#E5E7EB] px-6 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="text-[#9CA3AF] hover:text-[#374151] transition-colors p-1.5 rounded-lg hover:bg-[#F3F4F6]"
          aria-label="Toggle sidebar"
        >
          ☰
        </button>
        <h1 className="font-semibold text-[#111827] text-sm">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-[#F3F4F6] rounded-xl px-3 py-2 w-52">
          <span className="text-[#9CA3AF] text-sm">🔍</span>
          <input
            type="text"
            placeholder="Search content..."
            className="bg-transparent text-sm text-[#374151] placeholder-[#9CA3AF] focus:outline-none w-full"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F3F4F6] transition-colors text-[#6B7280]">
          🔔
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#6D5EF5] rounded-full border border-white" />
        </button>

        {/* Avatar */}
        <button
          onClick={() => navigate("settings")}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center text-white text-xs font-bold"
        >
          SC
        </button>
      </div>
    </header>
  );
}
