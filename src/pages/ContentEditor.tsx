import { useState } from "react";

const toolbarActions = ["↻ Regenerate", "↓ Make Shorter", "↑ Make Longer", "✏ Rewrite", "🎭 Change Tone", "🌐 Translate"];

const defaultContent = `My biggest lesson after 5 years building startups:

Stop optimizing for vanity metrics.

Revenue is the only metric that doesn't lie.

Here's what we got wrong in year 2 👇

We had 50k monthly active users. We were growing 20% MoM. Investors were excited.

Then 3 enterprise customers churned in the same week. $180k ARR — gone.

We were building for the wrong customer the entire time.

The lesson? Talk to your churned customers FIRST.

What's your biggest startup lesson? Drop it below ↓

#StartupLife #Entrepreneurship #ProductMarketFit`;

export default function ContentEditor() {
  const [content, setContent] = useState(defaultContent);

  return (
    <div className="animate-slide-in">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#111827] mb-1">Content Editor</h2>
        <p className="text-sm text-[#6B7280]">LinkedIn Post · Founder Story EP42</p>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 mb-5 bg-white rounded-2xl border border-[#E5E7EB] p-3">
        {toolbarActions.map((action) => (
          <button
            key={action}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#E5E7EB] text-[#374151] hover:bg-[#EDE9FE] hover:border-[#6D5EF5]/30 hover:text-[#6D5EF5] transition-all"
          >
            {action}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[#F3F4F6]">
              <span className="w-7 h-7 rounded text-[11px] font-bold flex items-center justify-center text-white bg-[#0A66C2]">in</span>
              <span className="font-bold text-[#111827] text-sm">LinkedIn Post</span>
              <span className="ml-auto text-xs text-[#9CA3AF]">{content.length} / 3000 characters</span>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full text-sm text-[#374151] leading-relaxed resize-none focus:outline-none min-h-[300px] font-sans"
              placeholder="Your content here..."
            />
          </div>

          {/* Post preview */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h3 className="font-bold text-sm text-[#111827] mb-4">Post Preview</h3>
            <div className="border border-[#E5E7EB] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center text-white text-xs font-bold">SC</div>
                <div>
                  <p className="text-sm font-bold text-[#111827]">Sarah Chen</p>
                  <p className="text-xs text-[#9CA3AF]">Marketing Lead · 1st</p>
                </div>
              </div>
              <pre className="text-sm text-[#374151] leading-relaxed whitespace-pre-wrap font-sans line-clamp-8">
                {content}
              </pre>
            </div>
          </div>

          <div className="flex gap-3">
            <button className="flex-1 py-3 bg-gradient-to-r from-[#6D5EF5] to-[#5a4de0] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity text-sm">
              Save Changes
            </button>
            <button className="px-5 py-3 bg-white border border-[#E5E7EB] text-[#374151] font-semibold rounded-xl hover:bg-[#F3F4F6] transition-colors text-sm">
              Schedule Post
            </button>
          </div>
        </div>

        {/* AI Suggestions sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h3 className="font-bold text-[#111827] text-sm mb-3">✨ AI Suggestions</h3>
            <div className="space-y-2">
              {[
                "Add a specific number or statistic to the opening line for higher engagement.",
                "Consider adding a personal story of vulnerability before the main lesson.",
                "End with a stronger CTA — ask a specific question to boost comments.",
              ].map((s, i) => (
                <div key={i} className="text-xs text-[#6B7280] p-3 bg-[#F8FAFC] rounded-xl border border-[#F3F4F6] leading-relaxed">
                  {s}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h3 className="font-bold text-[#111827] text-sm mb-3">📣 CTA Ideas</h3>
            <div className="space-y-1.5">
              {[
                "What's the hardest lesson you've learned as a founder?",
                "Save this post for the next time you're chasing the wrong metrics.",
                "Tag a founder who needs to read this today.",
              ].map((cta) => (
                <button key={cta} className="w-full text-left text-xs text-[#6B7280] p-2.5 rounded-lg hover:bg-[#EDE9FE] hover:text-[#6D5EF5] transition-colors leading-relaxed">
                  {cta}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h3 className="font-bold text-[#111827] text-sm mb-3"># Hashtags</h3>
            <div className="flex flex-wrap gap-1.5">
              {["#StartupLife", "#Entrepreneurship", "#ProductMarketFit", "#Founder", "#GrowthHacking", "#B2B", "#SaaS", "#BusinessLessons"].map((h) => (
                <button
                  key={h}
                  className="text-[10px] font-medium px-2 py-1 bg-[#EDE9FE] text-[#6D5EF5] rounded-full hover:bg-[#DDD6FE] transition-colors"
                  onClick={() => setContent((c) => c + "\n" + h)}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <h3 className="font-bold text-[#111827] text-sm mb-3">😊 Emoji Suggestions</h3>
            <div className="flex flex-wrap gap-2">
              {["🚀", "💡", "🎯", "📈", "💰", "🔥", "👇", "✅", "⚡", "🧵"].map((e) => (
                <button
                  key={e}
                  className="text-xl hover:scale-125 transition-transform"
                  onClick={() => setContent((c) => c + " " + e)}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
