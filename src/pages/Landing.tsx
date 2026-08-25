interface Props {
  onGetStarted: () => void;
  onLogin: () => void;
}

const features = [
  {
    icon: "🎬",
    title: "Any Format, Any Source",
    desc: "Upload video, audio, podcast, or paste a YouTube link. We handle the rest.",
  },
  {
    icon: "✨",
    title: "AI-Powered Extraction",
    desc: "Our AI finds hooks, quotes, key topics, and viral moments automatically.",
  },
  {
    icon: "📱",
    title: "10+ Platform Formats",
    desc: "LinkedIn, Instagram, X, TikTok, newsletters, blogs, and more — all from one source.",
  },
  {
    icon: "🎯",
    title: "Brand Voice Training",
    desc: "Feed it your past content and it writes exactly like you — not like a robot.",
  },
  {
    icon: "📅",
    title: "Content Calendar",
    desc: "Schedule and publish directly from the platform. Never miss a posting day.",
  },
  {
    icon: "⚡",
    title: "Lightning Fast",
    desc: "A 60-minute video becomes 30 pieces of content in under 10 minutes.",
  },
];

const steps = [
  { num: "01", label: "Upload", desc: "Drop a video, audio file, or paste a YouTube URL." },
  { num: "02", label: "Analyze", desc: "AI transcribes, extracts hooks, quotes, and topics." },
  { num: "03", label: "Generate", desc: "Pick platforms and tone. AI writes platform-native content." },
  { num: "04", label: "Publish", desc: "Schedule, edit, and push to your channels — done." },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Creator & Coach, 180k followers",
    quote: "I used to spend 8 hours repurposing each webinar. Now it takes 20 minutes. ContentRepurpose changed how I run my business.",
    avatar: "SC",
  },
  {
    name: "Marcus Rivera",
    role: "Podcast Host, The Founder Show",
    quote: "Every episode now turns into LinkedIn posts, Twitter threads, and a newsletter — automatically. My engagement tripled.",
    avatar: "MR",
  },
  {
    name: "Aisha Patel",
    role: "B2B Marketing Lead, Growthly",
    quote: "We repurpose our webinars into 40+ pieces of content per recording. The ROI on this tool is insane.",
    avatar: "AP",
  },
];

const plans = [
  { name: "Free", price: "$0", credits: "5 AI credits/mo", projects: "2 projects", color: "#6B7280" },
  {
    name: "Creator",
    price: "$29",
    credits: "100 AI credits/mo",
    projects: "20 projects",
    color: "#6D5EF5",
    popular: true,
  },
  { name: "Pro", price: "$79", credits: "500 AI credits/mo", projects: "Unlimited", color: "#3ECFCE" },
  { name: "Agency", price: "$199", credits: "2000 AI credits/mo", projects: "Unlimited + Teams", color: "#F59E0B" },
];

export default function LandingPage({ onGetStarted, onLogin }: Props) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#111827]">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E5E7EB] px-6 lg:px-12">
        <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center">
              <span className="text-white text-xs font-bold">CR</span>
            </div>
            <span className="font-bold text-lg tracking-tight">ContentRepurpose</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#6B7280]">
            <a href="#features" className="hover:text-[#111827] transition-colors">Features</a>
            <a href="#how" className="hover:text-[#111827] transition-colors">How it Works</a>
            <a href="#pricing" className="hover:text-[#111827] transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onLogin}
              className="text-sm font-medium text-[#6B7280] hover:text-[#111827] transition-colors px-3 py-2"
            >
              Log in
            </button>
            <button
              onClick={onGetStarted}
              className="text-sm font-semibold text-white bg-[#6D5EF5] hover:bg-[#5a4de0] transition-colors px-4 py-2 rounded-xl"
            >
              Start Free
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 pt-20 pb-24 grid lg:grid-cols-2 gap-16 items-center">
        <div className="animate-slide-in">
          <div className="inline-flex items-center gap-2 bg-[#EDE9FE] text-[#6D5EF5] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6D5EF5] inline-block"></span>
            AI-Powered Content Engine
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Turn One Video Into{" "}
            <span className="bg-gradient-to-r from-[#6D5EF5] to-[#3ECFCE] bg-clip-text text-transparent">
              30 Days of Content.
            </span>
          </h1>
          <p className="text-lg text-[#6B7280] leading-relaxed mb-8 max-w-lg">
            Upload a video, podcast, or webinar and let AI transform it into platform-ready posts for LinkedIn,
            Instagram, TikTok, newsletters, blogs, and more — in minutes.
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={onGetStarted}
              className="px-6 py-3 bg-gradient-to-r from-[#6D5EF5] to-[#5a4de0] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-200"
            >
              Start Free — No credit card
            </button>
            <button className="px-6 py-3 border border-[#E5E7EB] text-[#374151] font-semibold rounded-xl hover:bg-[#F9FAFB] transition-colors flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#6D5EF5] flex items-center justify-center">
                <span className="text-white text-xs">▶</span>
              </span>
              Watch Demo
            </button>
          </div>
          <div className="flex items-center gap-6 mt-10">
            <div className="flex -space-x-2">
              {["A", "B", "C", "D"].map((l, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: ["#6D5EF5", "#3ECFCE", "#F59E0B", "#10B981"][i] }}
                >
                  {l}
                </div>
              ))}
            </div>
            <p className="text-sm text-[#6B7280]">
              <span className="font-bold text-[#111827]">12,400+</span> creators already using ContentRepurpose
            </p>
          </div>
        </div>

        {/* Hero illustration */}
        <div className="relative hidden lg:block">
          <div className="bg-white rounded-2xl shadow-xl border border-[#E5E7EB] p-5">
            {/* Source video card */}
            <div className="bg-[#1F2937] rounded-xl p-4 mb-4 relative overflow-hidden">
              <div className="absolute inset-0 opacity-20"
                style={{ background: "linear-gradient(135deg, #6D5EF5 0%, #3ECFCE 100%)" }} />
              <div className="relative flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-[#6D5EF5]/40 flex items-center justify-center text-xl">🎬</div>
                <div>
                  <p className="text-white font-semibold text-sm">Founder Story — Episode 42.mp4</p>
                  <p className="text-[#9CA3AF] text-xs mt-0.5">47:32 • Uploaded just now</p>
                </div>
                <div className="ml-auto w-8 h-8 rounded-full bg-[#10B981] flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 my-3">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center animate-spin-slow">
                <span className="text-white text-xs">✨</span>
              </div>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>

            <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Generated Content</p>

            <div className="grid grid-cols-2 gap-2">
              {[
                { platform: "LinkedIn", badge: "in", color: "#0A66C2", preview: "My biggest lesson after 5 years building startups..." },
                { platform: "X Thread", badge: "𝕏", color: "#000", preview: "1/ Nobody talks about the hardest part of..." },
                { platform: "Instagram", badge: "📸", color: "#E1306C", preview: "POV: You finally figured out product-market fit 🔥" },
                { platform: "Newsletter", badge: "✉", color: "#6D5EF5", preview: "This week: The story behind our pivot that..." },
                { platform: "TikTok", badge: "♪", color: "#010101", preview: "Hook: I almost quit 3 times before hitting $1M..." },
                { platform: "Blog", badge: "📝", color: "#10B981", preview: "5 Startup Lessons That Changed Everything For Us" },
              ].map((c) => (
                <div key={c.platform} className="bg-[#F8FAFC] rounded-lg p-3 border border-[#E5E7EB]">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                      className="w-5 h-5 rounded text-[9px] font-bold flex items-center justify-center text-white"
                      style={{ background: c.color }}
                    >
                      {c.badge}
                    </span>
                    <span className="text-[10px] font-semibold text-[#374151]">{c.platform}</span>
                  </div>
                  <p className="text-[10px] text-[#6B7280] leading-snug line-clamp-2">{c.preview}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trusted by */}
      <section className="border-y border-[#E5E7EB] bg-white py-10 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-8">
            Trusted by creators at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-10 opacity-50">
            {["HubSpot", "Morning Brew", "Indie Hackers", "Product Hunt", "Beehiiv", "ConvertKit"].map((b) => (
              <span key={b} className="text-lg font-bold text-[#374151]">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-extrabold mb-4">Everything you need to scale content</h2>
          <p className="text-[#6B7280] text-lg max-w-xl mx-auto">
            Stop spending hours repurposing content manually. Let AI do the heavy lifting.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-[#E5E7EB] p-6 hover:shadow-lg hover:border-[#6D5EF5]/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-[#EDE9FE] flex items-center justify-center text-2xl mb-4 group-hover:scale-105 transition-transform">
                {f.icon}
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-[#F3F4F6] py-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold mb-4">How it works</h2>
            <p className="text-[#6B7280] text-lg">Four steps. Thirty days of content.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-8">
            {steps.map((s, i) => (
              <div key={s.num} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-8 left-full w-full h-px border-t-2 border-dashed border-[#D1D5DB] z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center mb-4">
                    <span className="text-white font-bold text-xl">{s.num}</span>
                  </div>
                  <h3 className="font-bold text-xl mb-2">{s.label}</h3>
                  <p className="text-[#6B7280] text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-24">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-extrabold mb-4">Creators love it</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div key={t.name} className="bg-white rounded-2xl border border-[#E5E7EB] p-6 shadow-sm">
              <div className="flex mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className="text-yellow-400 text-sm">★</span>
                ))}
              </div>
              <p className="text-[#374151] leading-relaxed mb-5 text-sm">"{t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center text-white text-xs font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-[#9CA3AF] text-xs">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-[#F3F4F6] py-24 px-6 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold mb-4">Simple, transparent pricing</h2>
            <p className="text-[#6B7280] text-lg">Start free. Scale as you grow.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            {plans.map((p) => (
              <div
                key={p.name}
                className={`bg-white rounded-2xl border p-6 relative ${p.popular ? "border-[#6D5EF5] shadow-lg shadow-purple-100" : "border-[#E5E7EB]"}`}
              >
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#6D5EF5] text-white text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div
                  className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center"
                  style={{ background: p.color + "20" }}
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                </div>
                <h3 className="font-bold text-lg mb-1">{p.name}</h3>
                <p className="text-3xl font-extrabold mb-4">
                  {p.price}
                  <span className="text-sm font-normal text-[#9CA3AF]">/mo</span>
                </p>
                <div className="space-y-2 text-sm text-[#6B7280] mb-6">
                  <p>✓ {p.credits}</p>
                  <p>✓ {p.projects}</p>
                  <p>✓ All platforms</p>
                </div>
                <button
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-colors"
                  style={p.popular
                    ? { background: "#6D5EF5", color: "#fff" }
                    : { background: "#F3F4F6", color: "#374151" }}
                >
                  Get Started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
        <div className="bg-gradient-to-r from-[#6D5EF5] to-[#3ECFCE] rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl font-extrabold mb-4">Ready to 10x your content output?</h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Join 12,400+ creators who never run out of content ideas again.
          </p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-white text-[#6D5EF5] font-bold rounded-xl hover:bg-white/90 transition-colors shadow-lg"
          >
            Start For Free Today
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E5E7EB] bg-white px-6 lg:px-12 py-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center">
              <span className="text-white text-xs font-bold">CR</span>
            </div>
            <span className="font-bold">ContentRepurpose</span>
          </div>
          <div className="flex gap-6 text-sm text-[#9CA3AF]">
            <a href="#" className="hover:text-[#374151]">Privacy</a>
            <a href="#" className="hover:text-[#374151]">Terms</a>
            <a href="#" className="hover:text-[#374151]">Blog</a>
            <a href="#" className="hover:text-[#374151]">Support</a>
          </div>
          <p className="text-sm text-[#9CA3AF]">© 2026 ContentRepurpose. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
