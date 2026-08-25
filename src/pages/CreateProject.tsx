import { useState } from "react";
import type { Page } from "../App";

interface Props {
  navigate: (p: Page) => void;
}

const uploadTypes = [
  { id: "video", label: "Video File", icon: "🎬", formats: "MP4, MOV, AVI, MKV" },
  { id: "audio", label: "Audio File", icon: "🎙", formats: "MP3, WAV, AAC, M4A" },
  { id: "youtube", label: "YouTube URL", icon: "▶️", formats: "Any public YouTube video" },
  { id: "transcript", label: "Paste Transcript", icon: "📄", formats: "Plain text or SRT" },
];

export default function CreateProject({ navigate }: Props) {
  const [activeType, setActiveType] = useState("video");
  const [dragging, setDragging] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [transcript, setTranscript] = useState("");

  return (
    <div className="max-w-4xl mx-auto animate-slide-in">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-[#111827] mb-1">Create New Project</h2>
        <p className="text-[#6B7280] text-sm">Upload your content and let AI do the rest.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Project name */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <label className="block text-sm font-semibold text-[#111827] mb-2">Project Name</label>
            <input
              type="text"
              placeholder="e.g. Founder Story Episode 42"
              className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all"
            />
          </div>

          {/* Upload type selector */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <p className="text-sm font-semibold text-[#111827] mb-3">Source Type</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-5">
              {uploadTypes.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveType(t.id)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-center transition-all ${
                    activeType === t.id
                      ? "border-[#6D5EF5] bg-[#EDE9FE]"
                      : "border-[#E5E7EB] hover:border-[#6D5EF5]/30 hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className={`text-xs font-semibold ${activeType === t.id ? "text-[#6D5EF5]" : "text-[#374151]"}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Upload zone */}
            {(activeType === "video" || activeType === "audio") && (
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={() => setDragging(false)}
                className={`border-2 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  dragging
                    ? "border-[#6D5EF5] bg-[#EDE9FE]/50"
                    : "border-[#D1D5DB] hover:border-[#6D5EF5]/50 hover:bg-[#F8FAFC]"
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-[#EDE9FE] flex items-center justify-center text-3xl mb-4">
                  {activeType === "video" ? "🎬" : "🎙"}
                </div>
                <p className="font-semibold text-[#374151] mb-1">
                  Drop your {activeType === "video" ? "video" : "audio"} here
                </p>
                <p className="text-sm text-[#9CA3AF] mb-4">
                  {uploadTypes.find((t) => t.id === activeType)?.formats}
                </p>
                <button className="px-5 py-2.5 bg-[#6D5EF5] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                  Browse Files
                </button>
                <p className="text-xs text-[#D1D5DB] mt-3">Maximum file size: 10 GB</p>
              </div>
            )}

            {activeType === "youtube" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#374151]">YouTube URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1 px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all"
                  />
                  <button className="px-4 py-3 bg-[#6D5EF5] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity whitespace-nowrap">
                    Fetch Video
                  </button>
                </div>
                <p className="text-xs text-[#9CA3AF]">Supports public videos up to 3 hours. Private videos require manual upload.</p>
              </div>
            )}

            {activeType === "transcript" && (
              <div className="space-y-3">
                <label className="block text-sm font-medium text-[#374151]">Paste Transcript</label>
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste your transcript text here. You can include timestamps like [00:01:32] for better analysis..."
                  rows={10}
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all resize-none"
                />
                <p className="text-xs text-[#9CA3AF]">{transcript.length} characters</p>
              </div>
            )}
          </div>

          {/* Output preferences */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <p className="text-sm font-semibold text-[#111827] mb-3">Target Platforms</p>
            <div className="flex flex-wrap gap-2">
              {["LinkedIn", "Instagram", "X (Twitter)", "Facebook", "TikTok", "YouTube Shorts", "Newsletter", "Blog", "Quote Cards"].map((pl) => (
                <label key={pl} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E5E7EB] cursor-pointer hover:border-[#6D5EF5]/40 transition-colors has-[:checked]:border-[#6D5EF5] has-[:checked]:bg-[#EDE9FE]">
                  <input type="checkbox" className="accent-[#6D5EF5]" defaultChecked={["LinkedIn", "Instagram", "X (Twitter)"].includes(pl)} />
                  <span className="text-xs font-medium text-[#374151]">{pl}</span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate("processing")}
            className="w-full py-4 bg-gradient-to-r from-[#6D5EF5] to-[#5a4de0] text-white font-bold rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-200 text-sm"
          >
            Start Processing →
          </button>
        </div>

        {/* Sidebar info */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h3 className="font-bold text-[#111827] mb-3 text-sm">Supported Formats</h3>
            <div className="space-y-2">
              {[
                { label: "Video", formats: "MP4, MOV, AVI, MKV, WebM" },
                { label: "Audio", formats: "MP3, WAV, AAC, M4A, FLAC" },
                { label: "YouTube", formats: "Any public URL" },
                { label: "Transcript", formats: "TXT, SRT, VTT, plain text" },
              ].map((f) => (
                <div key={f.label} className="text-xs">
                  <span className="font-semibold text-[#374151]">{f.label}:</span>{" "}
                  <span className="text-[#9CA3AF]">{f.formats}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h3 className="font-bold text-[#111827] mb-3 text-sm">Upload Limits</h3>
            <div className="space-y-2 text-xs text-[#6B7280]">
              <div className="flex justify-between"><span>Max file size</span><span className="font-semibold text-[#111827]">10 GB</span></div>
              <div className="flex justify-between"><span>Max duration</span><span className="font-semibold text-[#111827]">4 hours</span></div>
              <div className="flex justify-between"><span>Languages</span><span className="font-semibold text-[#111827]">95+</span></div>
            </div>
          </div>

          <div className="bg-[#EDE9FE] rounded-2xl p-5">
            <div className="text-2xl mb-2">⚡</div>
            <h3 className="font-bold text-[#6D5EF5] mb-1 text-sm">Estimated Time</h3>
            <p className="text-xs text-[#7C6FF0]">A 60-min video typically processes in <strong>8–12 minutes</strong> and generates 30+ pieces of content.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
