import { useState } from "react";
import type { Page } from "../App";

interface Props {
  navigate: (p: Page) => void;
}

const platforms = ["All", "LinkedIn", "Instagram", "X Thread", "Blog", "Newsletter", "TikTok", "Quote Cards"];

const content = [
  { id: 1, platform: "LinkedIn", badge: "in", color: "#0A66C2", project: "Founder Story EP42", tone: "Storytelling", date: "Aug 22", title: "The $180k Churn Lesson", preview: "My biggest lesson after 5 years building startups: stop optimizing for vanity metrics. Revenue is the only metric that doesn't lie...", fav: true },
  { id: 2, platform: "X Thread", badge: "𝕏", color: "#000", project: "Founder Story EP42", tone: "Bold", date: "Aug 22", title: "Nobody Talks About This Thread", preview: "1/ Nobody talks about the hardest part of startup life. It's not the funding, the product, or even the team. It's THIS 🧵", fav: false },
  { id: 3, platform: "Instagram", badge: "📸", color: "#E1306C", project: "Q3 Webinar", tone: "Casual", date: "Aug 23", title: "Product-Market Fit POV", preview: "POV: You finally figured out product-market fit after 3 years of pivoting 🔥 The journey no one shows you...", fav: true },
  { id: 4, platform: "Blog", badge: "📝", color: "#10B981", project: "Founder Story EP42", tone: "Educational", date: "Aug 22", title: "5 Startup Lessons That Changed Everything", preview: "5 Startup Lessons That Changed Everything For Us — A deep dive into the decisions that shaped our trajectory from $0 to $1M ARR.", fav: false },
  { id: 5, platform: "Newsletter", badge: "✉", color: "#6D5EF5", project: "Q3 Webinar", tone: "Professional", date: "Aug 23", title: "Q3 Learnings & What's Next", preview: "This week: The story behind our pivot that saved the company. Plus: 3 frameworks we use for strategic decisions under pressure.", fav: false },
  { id: 6, platform: "TikTok", badge: "♪", color: "#010101", project: "Founder Story EP42", tone: "Funny", date: "Aug 22", title: "Almost Quit 3 Times Script", preview: "Hook: I almost quit 3 times before hitting $1M ARR. Here's what I wish someone told me on day one. [CUT TO reaction face]", fav: true },
];

export default function ContentLibrary({ navigate }: Props) {
  const [filterPlatform, setFilterPlatform] = useState("All");
  const [viewGrid, setViewGrid] = useState(true);
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState<number[]>([1, 3, 6]);

  const filtered = content.filter((c) => {
    const matchPlatform = filterPlatform === "All" || c.platform === filterPlatform;
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.preview.toLowerCase().includes(search.toLowerCase());
    return matchPlatform && matchSearch;
  });

  return (
    <div className="animate-slide-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-[#111827] mb-1">Content Library</h2>
          <p className="text-sm text-[#6B7280]">{content.length} pieces across {new Set(content.map((c) => c.platform)).size} platforms</p>
        </div>
        <button
          onClick={() => navigate("ai-studio")}
          className="px-5 py-2.5 bg-gradient-to-r from-[#6D5EF5] to-[#5a4de0] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-md shadow-purple-200"
        >
          ✨ Generate More
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white rounded-xl border border-[#E5E7EB] px-3 py-2 flex-1 min-w-48">
          <span className="text-[#9CA3AF] text-sm">🔍</span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search content..."
            className="bg-transparent text-sm text-[#374151] placeholder-[#9CA3AF] focus:outline-none w-full"
          />
        </div>
        <div className="flex gap-1 bg-[#F3F4F6] rounded-xl p-1">
          <button onClick={() => setViewGrid(true)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${viewGrid ? "bg-white shadow-sm text-[#6D5EF5]" : "text-[#6B7280]"}`}>⊞</button>
          <button onClick={() => setViewGrid(false)} className={`px-3 py-1.5 rounded-lg text-sm transition-all ${!viewGrid ? "bg-white shadow-sm text-[#6D5EF5]" : "text-[#6B7280]"}`}>☰</button>
        </div>
      </div>

      {/* Platform filter chips */}
      <div className="flex gap-2 flex-wrap mb-6">
        {platforms.map((p) => (
          <button
            key={p}
            onClick={() => setFilterPlatform(p)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filterPlatform === p
                ? "bg-[#6D5EF5] text-white"
                : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#6D5EF5]/40"
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Content grid/list */}
      {viewGrid ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded text-[11px] font-bold flex items-center justify-center text-white" style={{ background: c.color }}>
                    {c.badge}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[#374151]">{c.platform}</span>
                    <p className="text-[10px] text-[#9CA3AF]">{c.project}</p>
                  </div>
                </div>
                <button
                  onClick={() => setFavorites((f) => f.includes(c.id) ? f.filter((x) => x !== c.id) : [...f, c.id])}
                  className={`text-base transition-all ${favorites.includes(c.id) ? "text-yellow-400" : "text-[#D1D5DB] hover:text-yellow-300"}`}
                >
                  ★
                </button>
              </div>
              <h4 className="font-bold text-sm text-[#111827] mb-2">{c.title}</h4>
              <p className="text-xs text-[#6B7280] leading-relaxed line-clamp-3">{c.preview}</p>
              <div className="flex items-center gap-1.5 mt-3">
                <span className="px-2 py-0.5 bg-[#F3F4F6] text-[#9CA3AF] text-[10px] rounded-full font-medium">{c.tone}</span>
                <span className="text-[#E5E7EB]">·</span>
                <span className="text-[10px] text-[#9CA3AF]">{c.date}</span>
              </div>
              <div className="flex gap-2 mt-4 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => navigate("content-editor")}
                  className="flex-1 py-2 text-xs font-medium rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                >
                  Edit
                </button>
                <button className="flex-1 py-2 text-xs font-medium rounded-lg bg-[#EDE9FE] text-[#6D5EF5] hover:bg-[#DDD6FE] transition-colors">
                  Copy
                </button>
                <button className="py-2 px-3 text-xs font-medium rounded-lg border border-[#E5E7EB] text-[#9CA3AF] hover:bg-[#F3F4F6] transition-colors">
                  ↻
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <span className="w-8 h-8 rounded text-[11px] font-bold flex items-center justify-center text-white flex-shrink-0" style={{ background: c.color }}>
                {c.badge}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="font-semibold text-sm text-[#111827] truncate">{c.title}</h4>
                  <span className="text-[10px] text-[#9CA3AF] flex-shrink-0">{c.tone} · {c.date}</span>
                </div>
                <p className="text-xs text-[#9CA3AF] truncate">{c.preview}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={() => navigate("content-editor")} className="text-xs px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] transition-colors font-medium">Edit</button>
                <button className="text-xs px-3 py-1.5 rounded-lg bg-[#EDE9FE] text-[#6D5EF5] hover:bg-[#DDD6FE] transition-colors font-medium">Copy</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
