import { useState } from "react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthDates = Array.from({ length: 35 }, (_, i) => {
  const day = i - 3; // August 2026 starts on Saturday
  return day < 1 || day > 31 ? null : day;
});

const scheduledPosts: Record<number, { platform: string; color: string; badge: string; title: string }[]> = {
  24: [{ platform: "LinkedIn", color: "#0A66C2", badge: "in", title: "The $180k Churn Lesson" }],
  25: [
    { platform: "X Thread", color: "#000", badge: "𝕏", title: "Nobody Talks About This" },
    { platform: "Instagram", color: "#E1306C", badge: "📸", title: "Product-Market Fit POV" },
  ],
  26: [{ platform: "Newsletter", color: "#6D5EF5", badge: "✉", title: "Q3 Learnings Edition" }],
  28: [{ platform: "TikTok", color: "#010101", badge: "♪", title: "Almost Quit 3 Times" }],
  30: [{ platform: "Blog", color: "#10B981", badge: "📝", title: "5 Startup Lessons" }],
};

const upcoming = [
  { date: "Aug 24", platform: "LinkedIn", color: "#0A66C2", badge: "in", title: "The $180k Churn Lesson", time: "9:00 AM" },
  { date: "Aug 25", platform: "X Thread", color: "#000", badge: "𝕏", title: "Nobody Talks About This", time: "11:00 AM" },
  { date: "Aug 25", platform: "Instagram", color: "#E1306C", badge: "📸", title: "Product-Market Fit POV", time: "6:00 PM" },
  { date: "Aug 26", platform: "Newsletter", color: "#6D5EF5", badge: "✉", title: "Q3 Learnings Edition", time: "8:00 AM" },
  { date: "Aug 28", platform: "TikTok", color: "#010101", badge: "♪", title: "Almost Quit 3 Times", time: "12:00 PM" },
];

export default function Calendar() {
  const [view, setView] = useState<"month" | "week">("month");

  return (
    <div className="animate-slide-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-[#111827] mb-1">Content Calendar</h2>
          <p className="text-sm text-[#6B7280]">August 2026 · 7 posts scheduled</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-[#F3F4F6] rounded-xl p-1">
            <button onClick={() => setView("month")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "month" ? "bg-white shadow-sm text-[#6D5EF5]" : "text-[#6B7280]"}`}>Month</button>
            <button onClick={() => setView("week")} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${view === "week" ? "bg-white shadow-sm text-[#6D5EF5]" : "text-[#6B7280]"}`}>Week</button>
          </div>
          <button className="px-4 py-2 bg-[#6D5EF5] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
            + Schedule Post
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          {/* Month header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#F3F4F6]">
            <button className="text-[#6B7280] hover:text-[#111827] transition-colors p-1">←</button>
            <h3 className="font-bold text-[#111827]">August 2026</h3>
            <button className="text-[#6B7280] hover:text-[#111827] transition-colors p-1">→</button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-[#F3F4F6]">
            {days.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Date grid */}
          <div className="grid grid-cols-7">
            {monthDates.map((date, i) => {
              const posts = date ? scheduledPosts[date] ?? [] : [];
              const isToday = date === 24;
              return (
                <div
                  key={i}
                  className={`min-h-[90px] border-b border-r border-[#F3F4F6] p-2 ${
                    !date ? "bg-[#F9FAFB]" : "hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                  } ${i % 7 === 6 ? "border-r-0" : ""}`}
                >
                  {date && (
                    <>
                      <span
                        className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${
                          isToday ? "bg-[#6D5EF5] text-white" : "text-[#374151]"
                        }`}
                      >
                        {date}
                      </span>
                      <div className="space-y-0.5">
                        {posts.map((p) => (
                          <div
                            key={p.title}
                            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-white truncate"
                            style={{ background: p.color }}
                          >
                            <span>{p.badge}</span>
                            <span className="truncate">{p.title}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming posts */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h3 className="font-bold text-[#111827] mb-4 text-sm">Upcoming Posts</h3>
            <div className="space-y-3">
              {upcoming.map((p, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span
                    className="w-7 h-7 rounded text-[11px] font-bold flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: p.color }}
                  >
                    {p.badge}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#111827] truncate">{p.title}</p>
                    <p className="text-[10px] text-[#9CA3AF]">{p.date} · {p.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#EDE9FE] rounded-2xl p-5">
            <div className="text-2xl mb-2">📅</div>
            <h3 className="font-bold text-[#6D5EF5] text-sm mb-1">30-Day Fill</h3>
            <p className="text-xs text-[#7C6FF0]">Generate enough content to fill your entire month automatically with AI Studio.</p>
            <button className="mt-3 w-full py-2 bg-[#6D5EF5] text-white text-xs font-bold rounded-xl hover:opacity-90 transition-opacity">
              Auto-Fill Month
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
