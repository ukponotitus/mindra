import { useState } from "react";

const platforms = [
  { id: "linkedin", label: "LinkedIn Post", icon: "in", color: "#0A66C2" },
  { id: "facebook", label: "Facebook Post", icon: "f", color: "#1877F2" },
  { id: "instagram", label: "Instagram Caption", icon: "📸", color: "#E1306C" },
  { id: "x-thread", label: "X Thread", icon: "𝕏", color: "#000" },
  { id: "blog", label: "Blog Article", icon: "📝", color: "#10B981" },
  { id: "newsletter", label: "Newsletter", icon: "✉", color: "#6D5EF5" },
  { id: "tiktok", label: "TikTok Script", icon: "♪", color: "#010101" },
  { id: "quote", label: "Quote Cards", icon: "💬", color: "#F59E0B" },
  { id: "carousel", label: "Carousel", icon: "🎠", color: "#3ECFCE" },
];

const tones = ["Professional", "Casual", "Educational", "Storytelling", "Bold", "Funny"];

const generated = [
  {
    platform: "LinkedIn Post",
    icon: "in",
    color: "#0A66C2",
    content: `My biggest lesson after 5 years building startups:\n\nStop optimizing for vanity metrics.\n\nRevenue is the only metric that doesn't lie.\n\nHere's what we got wrong in year 2 👇\n\nWe had 50k monthly active users. We were growing 20% MoM. Investors were excited.\n\nThen 3 enterprise customers churned in the same week. $180k ARR — gone.\n\nWe were building for the wrong customer the entire time.\n\nThe lesson? Talk to your churned customers FIRST.\n\nWhat's your biggest startup lesson? Drop it below ↓\n\n#StartupLife #Entrepreneurship #ProductMarketFit`,
  },
  {
    platform: "X Thread",
    icon: "𝕏",
    color: "#000",
    content: `1/ Nobody talks about the hardest part of startup life.\n\nIt's not the funding, the product, or even the team.\n\nIt's THIS 🧵\n\n2/ We lost $180k ARR in a single week. Three enterprise customers churned at the same time.\n\nI sat in my car for 20 minutes before I could walk back into the office.\n\n3/ Here's what I did next (and what saved the company)...`,
  },
];

export default function AIStudio() {
  const [selected, setSelected] = useState<string[]>(["linkedin", "x-thread"]);
  const [tone, setTone] = useState("Storytelling");
  const [count, setCount] = useState(3);
  const [generated_, setGenerated] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggle = (id: string) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const handleGenerate = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setGenerated(true); }, 2000);
  };

  return (
    <div className="animate-slide-in">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#111827] mb-1">AI Studio</h2>
        <p className="text-[#6B7280] text-sm">Generate platform-native content from your project.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left config panel */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <p className="text-sm font-bold text-[#111827] mb-3">Source Project</p>
            <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
              <span className="text-xl">🎬</span>
              <div>
                <p className="text-sm font-semibold text-[#111827]">Founder Story EP42</p>
                <p className="text-xs text-[#9CA3AF]">47:32 · Processed</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <p className="text-sm font-bold text-[#111827] mb-3">Output Platforms</p>
            <div className="space-y-1.5">
              {platforms.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                    selected.includes(p.id)
                      ? "bg-[#EDE9FE] border border-[#6D5EF5]/30"
                      : "hover:bg-[#F8FAFC] border border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(p.id)}
                    onChange={() => toggle(p.id)}
                    className="accent-[#6D5EF5]"
                  />
                  <span
                    className="w-6 h-6 rounded text-[10px] font-bold flex items-center justify-center text-white flex-shrink-0"
                    style={{ background: p.color }}
                  >
                    {p.icon}
                  </span>
                  <span className="text-sm font-medium text-[#374151]">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 space-y-4">
            <div>
              <label className="block text-sm font-bold text-[#111827] mb-2">Tone</label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5]"
              >
                {tones.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-[#111827]">Variations per Platform</label>
                <span className="text-sm font-bold text-[#6D5EF5]">{count}</span>
              </div>
              <input
                type="range"
                min={1}
                max={5}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full accent-[#6D5EF5]"
              />
              <div className="flex justify-between text-xs text-[#9CA3AF] mt-1">
                <span>1</span><span>5</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || selected.length === 0}
            className="w-full py-4 bg-gradient-to-r from-[#6D5EF5] to-[#3ECFCE] text-white font-bold rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                Generating...
              </>
            ) : (
              <>✨ Generate {selected.length > 0 ? `${selected.length * count} Pieces` : "Content"}</>
            )}
          </button>
        </div>

        {/* Right output panel */}
        <div className="lg:col-span-2">
          {!generated_ && !loading && (
            <div className="h-full min-h-[400px] bg-white rounded-2xl border border-dashed border-[#D1D5DB] flex flex-col items-center justify-center text-center p-12">
              <div className="w-16 h-16 rounded-2xl bg-[#EDE9FE] flex items-center justify-center text-3xl mb-4">✨</div>
              <h3 className="font-bold text-[#374151] mb-2">Ready to Generate</h3>
              <p className="text-sm text-[#9CA3AF] max-w-xs">
                Select your platforms and tone on the left, then click Generate to create your content.
              </p>
            </div>
          )}

          {loading && (
            <div className="h-full min-h-[400px] bg-white rounded-2xl border border-[#E5E7EB] flex flex-col items-center justify-center text-center p-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center text-2xl mb-4 animate-spin-slow">
                ✨
              </div>
              <h3 className="font-bold text-[#374151] mb-2">AI is writing your content...</h3>
              <p className="text-sm text-[#9CA3AF]">Analyzing transcript and generating {selected.length * count} pieces</p>
            </div>
          )}

          {generated_ && !loading && (
            <div className="space-y-4 animate-slide-in">
              {generated.map((g) => (
                <div key={g.platform} className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-7 h-7 rounded text-[11px] font-bold flex items-center justify-center text-white"
                        style={{ background: g.color }}
                      >
                        {g.icon}
                      </span>
                      <span className="font-bold text-[#111827] text-sm">{g.platform}</span>
                    </div>
                    <div className="flex gap-2">
                      <button className="text-xs px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] transition-colors font-medium">Copy</button>
                      <button className="text-xs px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#F3F4F6] transition-colors font-medium">Edit</button>
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-[#EDE9FE] text-[#6D5EF5] hover:bg-[#DDD6FE] transition-colors font-medium">↻ Regenerate</button>
                    </div>
                  </div>
                  <pre className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap font-sans">
                    {g.content}
                  </pre>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#F3F4F6]">
                    <span className="text-xs text-[#9CA3AF]">{g.content.length} characters</span>
                    <span className="text-[#E5E7EB]">·</span>
                    <button className="text-xs text-[#6D5EF5] hover:underline font-medium">Schedule</button>
                    <span className="text-[#E5E7EB]">·</span>
                    <button className="text-xs text-[#6D5EF5] hover:underline font-medium">Add to Calendar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
