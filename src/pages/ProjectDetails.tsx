import { useState } from "react";
import type { Page } from "../App";

interface Props {
  navigate: (p: Page) => void;
}

const tabs = ["Overview", "Transcript", "Generated Content", "Clip Suggestions", "Analytics"];

const overviewCards = [
  { label: "Duration", value: "47:32", icon: "⏱" },
  { label: "Language", value: "English", icon: "🌐" },
  { label: "Topics Detected", value: "12", icon: "🏷" },
  { label: "Quotes Extracted", value: "8", icon: "💬" },
  { label: "Hooks Found", value: "5", icon: "🎣" },
  { label: "Content Pieces", value: "31", icon: "📦" },
];

const generatedContent = [
  { platform: "LinkedIn", color: "#0A66C2", badge: "in", preview: "My biggest lesson after 5 years building startups: stop optimizing for vanity metrics. Here's what actually moved the needle for us..." },
  { platform: "X Thread", color: "#000", badge: "𝕏", preview: "1/ Nobody talks about the hardest part of startup life. It's not the funding, the product, or even the team. It's THIS 🧵" },
  { platform: "Instagram", color: "#E1306C", badge: "📸", preview: "POV: You finally figured out product-market fit after 3 years of pivoting 🔥 The journey no one shows you..." },
  { platform: "Newsletter", color: "#6D5EF5", badge: "✉", preview: "This week: The story behind our pivot that saved the company. Plus: 3 frameworks we use for strategic decisions." },
  { platform: "TikTok Script", color: "#010101", badge: "♪", preview: "Hook: I almost quit 3 times before hitting $1M ARR. Here's what I wish someone told me on day one." },
  { platform: "Blog Post", color: "#10B981", badge: "📝", preview: "5 Startup Lessons That Changed Everything For Us — A deep dive into the decisions that shaped our trajectory." },
];

const transcript = [
  { time: "00:00", text: "Welcome everyone to episode 42. Today I want to talk about something that almost broke us..." },
  { time: "01:34", text: "When we hit $500k ARR, I thought we had figured it out. We were growing 20% month over month." },
  { time: "03:12", text: "Then the bottom fell out. Three enterprise customers churned in the same week. That was $180k ARR gone overnight." },
  { time: "05:47", text: "Here's what I learned from that experience, and why I'm grateful it happened early rather than late." },
  { time: "08:22", text: "We had to make a decision: pivot to serve a different customer segment, or double down and iterate faster." },
  { time: "11:05", text: "The answer wasn't obvious at the time. But looking back, it was one of the clearest signals we ignored for too long." },
];

export default function ProjectDetails({ navigate }: Props) {
  const [activeTab, setActiveTab] = useState("Overview");

  return (
    <div className="animate-slide-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-2">
            <span>Projects</span><span>/</span><span className="text-[#6D5EF5] font-medium">Founder Story EP42</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#111827] mb-1">Founder Story — Episode 42</h2>
          <p className="text-sm text-[#6B7280]">Uploaded Aug 22, 2026 · 47:32 · MP4 · 2.3 GB</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("ai-studio")}
            className="px-4 py-2.5 bg-white border border-[#E5E7EB] text-[#374151] text-sm font-semibold rounded-xl hover:bg-[#F3F4F6] transition-colors"
          >
            ✨ AI Studio
          </button>
          <button className="px-4 py-2.5 bg-[#6D5EF5] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
            Share All
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F3F4F6] rounded-xl p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white text-[#6D5EF5] shadow-sm"
                : "text-[#6B7280] hover:text-[#374151]"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {overviewCards.map((c) => (
              <div key={c.label} className="bg-white rounded-2xl border border-[#E5E7EB] p-4 text-center">
                <div className="text-2xl mb-2">{c.icon}</div>
                <p className="text-xl font-extrabold text-[#111827]">{c.value}</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">{c.label}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
              <h3 className="font-bold text-[#111827] mb-3">Key Quotes</h3>
              <div className="space-y-3">
                {[
                  "Stop optimizing for vanity metrics. Revenue is the only metric that doesn't lie.",
                  "Three enterprise customers churned in the same week. That was $180k ARR gone overnight.",
                  "The hardest decisions are never obvious in the moment. That's what makes them hard.",
                ].map((q, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-[#6D5EF5] font-bold text-lg leading-none">"</span>
                    <p className="text-sm text-[#374151] leading-relaxed italic">{q}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
              <h3 className="font-bold text-[#111827] mb-3">Top Hooks</h3>
              <div className="space-y-2">
                {[
                  "I almost quit 3 times before hitting $1M ARR",
                  "Three enterprise customers churned in one week. Here's what I did.",
                  "Nobody talks about this part of startup life...",
                  "The pivot that saved our company (and what almost killed it)",
                  "How we went from $0 to $1M ARR without venture funding",
                ].map((h, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-[#EDE9FE] text-[#6D5EF5] flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-[#374151]">{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Transcript" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h3 className="font-bold text-[#111827] mb-4">Timestamped Transcript</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {transcript.map((t) => (
                <div key={t.time} className="flex gap-3 group cursor-pointer">
                  <span className="text-xs font-mono text-[#6D5EF5] font-bold flex-shrink-0 pt-0.5 group-hover:underline">
                    {t.time}
                  </span>
                  <p className="text-sm text-[#374151] leading-relaxed group-hover:text-[#111827] transition-colors">
                    {t.text}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
              <h3 className="font-bold text-[#111827] mb-3">AI Summary</h3>
              <p className="text-sm text-[#6B7280] leading-relaxed">
                In this episode, the founder shares the inflection point that nearly ended the company: losing $180k ARR in enterprise churn
                in a single week. The episode covers the decision-making framework used during the crisis, the pivot strategy, and the
                lessons learned about product-market fit and customer segmentation.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
              <h3 className="font-bold text-[#111827] mb-3">Key Topics</h3>
              <div className="flex flex-wrap gap-2">
                {["Startup Growth", "Product-Market Fit", "Customer Churn", "Pivoting", "ARR Growth", "Team Building", "Venture Capital", "Bootstrapping"].map((t) => (
                  <span key={t} className="px-2.5 py-1 bg-[#EDE9FE] text-[#6D5EF5] text-xs font-medium rounded-full">{t}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Generated Content" && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {generatedContent.map((c) => (
            <div key={c.platform} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-6 h-6 rounded text-[11px] font-bold flex items-center justify-center text-white"
                  style={{ background: c.color }}
                >
                  {c.badge}
                </span>
                <span className="text-sm font-bold text-[#111827]">{c.platform}</span>
                <div className="ml-auto flex gap-1.5">
                  <button className="text-[#9CA3AF] hover:text-[#6D5EF5] text-xs transition-colors">Edit</button>
                  <span className="text-[#E5E7EB]">·</span>
                  <button className="text-[#9CA3AF] hover:text-[#6D5EF5] text-xs transition-colors">Copy</button>
                </div>
              </div>
              <p className="text-sm text-[#374151] leading-relaxed line-clamp-4">{c.preview}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => navigate("content-editor")}
                  className="flex-1 py-2 rounded-lg border border-[#E5E7EB] text-xs font-medium text-[#374151] hover:bg-[#F3F4F6] transition-colors"
                >
                  Edit
                </button>
                <button className="flex-1 py-2 rounded-lg bg-[#EDE9FE] text-xs font-medium text-[#6D5EF5] hover:bg-[#DDD6FE] transition-colors">
                  Regenerate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Clip Suggestions" && (
        <div className="space-y-4">
          {[
            { title: "The $180k Churn Week", start: "03:12", end: "05:47", score: 94, hook: "Three enterprise customers churned in the same week. That was $180k ARR gone overnight." },
            { title: "Why We Almost Quit", start: "08:22", end: "11:05", score: 88, hook: "I almost quit 3 times before hitting $1M ARR. Here's what I wish someone told me." },
            { title: "The Pivot Decision", start: "15:34", end: "19:20", score: 82, hook: "The pivot that saved our company — and what we nearly got wrong." },
          ].map((clip) => (
            <div key={clip.title} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 flex gap-5 items-start">
              <div className="w-32 h-20 rounded-xl bg-[#1F2937] flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 opacity-30" style={{ background: "linear-gradient(135deg, #6D5EF5, #3ECFCE)" }} />
                <span className="relative text-white text-2xl">▶</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h3 className="font-bold text-[#111827]">{clip.title}</h3>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="text-xs font-bold text-[#059669]">AI Score</span>
                    <span className="w-8 h-8 rounded-full bg-[#D1FAE5] flex items-center justify-center text-[#059669] text-xs font-extrabold">
                      {clip.score}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-[#9CA3AF] mt-1 mb-2">{clip.start} → {clip.end}</p>
                <p className="text-sm text-[#6B7280] italic">"{clip.hook}"</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "Analytics" && (
        <div className="grid md:grid-cols-2 gap-6">
          {[
            { label: "Platform Distribution", data: [{ p: "LinkedIn", v: 8 }, { p: "Instagram", v: 6 }, { p: "X", v: 7 }, { p: "Blog", v: 4 }, { p: "TikTok", v: 6 }] },
            { label: "Content by Type", data: [{ p: "Posts", v: 18 }, { p: "Threads", v: 5 }, { p: "Stories", v: 4 }, { p: "Videos", v: 4 }] },
          ].map((chart) => (
            <div key={chart.label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
              <h3 className="font-bold text-[#111827] mb-5">{chart.label}</h3>
              <div className="space-y-3">
                {chart.data.map((d, i) => (
                  <div key={d.p}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#374151]">{d.p}</span>
                      <span className="text-[#9CA3AF]">{d.v} pieces</span>
                    </div>
                    <div className="h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(d.v / 18) * 100}%`,
                          background: `hsl(${240 + i * 20}, 80%, 60%)`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
