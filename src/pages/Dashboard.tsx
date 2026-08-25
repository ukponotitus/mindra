import type { Page } from "../App";

interface Props {
  navigate: (p: Page) => void;
}

const stats = [
  { label: "Total Projects", value: "24", change: "+3 this week", icon: "📁", color: "#6D5EF5", bg: "#EDE9FE" },
  { label: "Content Generated", value: "1,284", change: "+127 today", icon: "📝", color: "#3ECFCE", bg: "#E0FAFA" },
  { label: "AI Credits Left", value: "73", change: "out of 100", icon: "✨", color: "#F59E0B", bg: "#FEF3C7" },
  { label: "Processing Jobs", value: "3", change: "2 in queue", icon: "⚙", color: "#10B981", bg: "#D1FAE5" },
];

const projects = [
  { name: "Founder Story EP42", platform: "Video", duration: "47:32", generated: 28, status: "completed", date: "Aug 22" },
  { name: "Q3 Webinar Recap", platform: "Webinar", duration: "1:12:04", generated: 41, status: "processing", date: "Aug 23" },
  { name: "Product Deep Dive", platform: "Podcast", duration: "34:18", generated: 0, status: "queued", date: "Aug 24" },
  { name: "Marketing Strategy Talk", platform: "YouTube", duration: "28:45", generated: 19, status: "completed", date: "Aug 20" },
  { name: "Team AMA Session", platform: "Audio", duration: "52:10", generated: 33, status: "completed", date: "Aug 18" },
];

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: "#D1FAE5", text: "#059669", label: "Completed" },
  processing: { bg: "#EDE9FE", text: "#6D5EF5", label: "Processing" },
  queued: { bg: "#FEF3C7", text: "#D97706", label: "Queued" },
};

const quickActions = [
  { label: "Upload Video", icon: "🎬", desc: "MP4, MOV, AVI up to 10GB", page: "create" as Page },
  { label: "YouTube Link", icon: "▶️", desc: "Paste any YouTube URL", page: "create" as Page },
  { label: "Upload Podcast", icon: "🎙", desc: "MP3, WAV, AAC supported", page: "create" as Page },
  { label: "Paste Transcript", icon: "📄", desc: "Already have text? Start here", page: "create" as Page },
];

export default function Dashboard({ navigate }: Props) {
  return (
    <div className="space-y-8 animate-slide-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-[#111827]">Good morning, Sarah 👋</h2>
          <p className="text-[#6B7280] text-sm mt-1">You have 2 projects processing and 3 pieces ready to publish.</p>
        </div>
        <button
          onClick={() => navigate("create")}
          className="px-5 py-2.5 bg-gradient-to-r from-[#6D5EF5] to-[#5a4de0] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-purple-200"
        >
          + New Project
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: s.bg }}
              >
                {s.icon}
              </div>
              <span className="text-xs text-[#10B981] font-medium bg-[#D1FAE5] px-2 py-0.5 rounded-full">
                {s.change}
              </span>
            </div>
            <p className="text-2xl font-extrabold text-[#111827] mb-0.5">{s.value}</p>
            <p className="text-xs text-[#9CA3AF] font-medium">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB]">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6]">
            <h3 className="font-bold text-[#111827]">Recent Projects</h3>
            <button
              onClick={() => navigate("projects")}
              className="text-sm text-[#6D5EF5] font-medium hover:underline"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-[#F3F4F6]">
            {projects.map((p) => {
              const st = statusColors[p.status];
              return (
                <button
                  key={p.name}
                  onClick={() => navigate("project-details")}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-base flex-shrink-0">
                    {p.platform === "Video" ? "🎬" : p.platform === "Podcast" ? "🎙" : p.platform === "Webinar" ? "📡" : p.platform === "YouTube" ? "▶️" : "🔊"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#111827] truncate">{p.name}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{p.duration} · {p.date}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {p.generated > 0 && (
                      <span className="text-xs text-[#6B7280]">{p.generated} pieces</span>
                    )}
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: st.bg, color: st.text }}
                    >
                      {st.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h3 className="font-bold text-[#111827] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {quickActions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => navigate(a.page)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#E5E7EB] hover:border-[#6D5EF5]/30 hover:bg-[#EDE9FE]/30 transition-all text-left group"
                >
                  <span className="text-xl">{a.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-[#111827] group-hover:text-[#6D5EF5] transition-colors">
                      {a.label}
                    </p>
                    <p className="text-xs text-[#9CA3AF]">{a.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Mini chart */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 mt-4">
            <h3 className="font-bold text-[#111827] mb-1">Content This Week</h3>
            <p className="text-3xl font-extrabold text-[#111827] mb-4">127 <span className="text-sm font-normal text-[#10B981]">↑ 34%</span></p>
            <div className="flex items-end gap-1.5 h-16">
              {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm" style={{
                  height: `${h}%`,
                  background: i === 5 ? "#6D5EF5" : "#EDE9FE",
                }} />
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                <span key={i} className="text-[10px] text-[#9CA3AF] flex-1 text-center">{d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
