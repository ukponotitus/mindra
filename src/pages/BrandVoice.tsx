import { useState } from "react";

export default function BrandVoice() {
  const [wordsToUse, setWordsToUse] = useState("authentic, data-driven, transparent, scrappy");
  const [wordsToAvoid, setWordsToAvoid] = useState("synergy, leverage, paradigm shift");

  return (
    <div className="max-w-3xl animate-slide-in">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-[#111827] mb-1">Brand Voice</h2>
        <p className="text-sm text-[#6B7280]">Train the AI to write exactly like your brand.</p>
      </div>

      <div className="space-y-5">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5">
          <h3 className="font-bold text-[#111827]">Brand Profile</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Brand Name</label>
              <input defaultValue="Growthly" type="text" className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Industry</label>
              <select className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all">
                {["B2B SaaS", "E-commerce", "Creator Economy", "Marketing", "Finance", "Healthcare", "Education"].map((i) => (
                  <option key={i}>{i}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Target Audience</label>
              <input defaultValue="Startup founders, marketing leads, B2B creators" type="text" className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Preferred Tone</label>
              <select className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all">
                {["Storytelling", "Professional", "Casual", "Educational", "Bold", "Funny"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Writing Style</label>
            <textarea defaultValue="Conversational and data-backed. We share real numbers and lessons. We write like a smart friend, not a corporate marketer. Short sentences. White space. Stories over theory." rows={4} className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all resize-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-4">
          <h3 className="font-bold text-[#111827]">Vocabulary Guide</h3>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Words & Phrases to Use</label>
            <textarea value={wordsToUse} onChange={(e) => setWordsToUse(e.target.value)} rows={3} placeholder="e.g. authentic, data-driven, real talk..." className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">Words & Phrases to Avoid</label>
            <textarea value={wordsToAvoid} onChange={(e) => setWordsToAvoid(e.target.value)} rows={3} placeholder="e.g. synergy, leverage, game-changer..." className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all resize-none" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <h3 className="font-bold text-[#111827] mb-2">Train from Past Content</h3>
          <p className="text-sm text-[#6B7280] mb-4">Upload your best posts to help AI learn your exact voice.</p>
          <div className="border-2 border-dashed border-[#D1D5DB] rounded-xl p-8 text-center hover:border-[#6D5EF5]/50 transition-colors cursor-pointer hover:bg-[#F8FAFC]">
            <div className="text-3xl mb-3">📁</div>
            <p className="text-sm font-semibold text-[#374151] mb-1">Upload past LinkedIn posts, newsletters, or blogs</p>
            <p className="text-xs text-[#9CA3AF]">TXT, CSV, or paste text directly · Up to 50 posts</p>
            <button className="mt-4 px-5 py-2 bg-[#6D5EF5] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
              Browse Files
            </button>
          </div>
        </div>

        <button className="w-full py-4 bg-gradient-to-r from-[#6D5EF5] to-[#5a4de0] text-white font-bold rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-200 text-sm">
          Save Brand Voice Settings
        </button>
      </div>
    </div>
  );
}
