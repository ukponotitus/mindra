const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    color: "#6B7280",
    bg: "#F3F4F6",
    features: ["5 AI credits/month", "2 projects", "All platforms", "Basic brand voice"],
    current: false,
  },
  {
    name: "Creator",
    price: "$29",
    period: "/mo",
    color: "#6D5EF5",
    bg: "#EDE9FE",
    features: ["100 AI credits/month", "20 projects", "All platforms", "Brand voice training", "Content calendar", "Priority processing"],
    current: true,
    popular: true,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/mo",
    color: "#3ECFCE",
    bg: "#E0FAFA",
    features: ["500 AI credits/month", "Unlimited projects", "All platforms", "Advanced brand voice", "Content calendar", "API access", "Analytics"],
    current: false,
  },
  {
    name: "Agency",
    price: "$199",
    period: "/mo",
    color: "#F59E0B",
    bg: "#FEF3C7",
    features: ["2000 AI credits/month", "Unlimited projects", "5 team members", "White-label exports", "Dedicated support", "Custom integrations"],
    current: false,
  },
];

const usageMeters = [
  { label: "AI Credits Used", used: 73, total: 100, color: "#6D5EF5" },
  { label: "Video Minutes", used: 142, total: 300, color: "#3ECFCE" },
  { label: "Projects", used: 14, total: 20, color: "#F59E0B" },
];

export default function Billing() {
  return (
    <div className="animate-slide-in">
      <div className="mb-8">
        <h2 className="text-2xl font-extrabold text-[#111827] mb-1">Billing & Plans</h2>
        <p className="text-sm text-[#6B7280]">Manage your subscription and usage.</p>
      </div>

      {/* Usage meters */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {usageMeters.map((m) => (
          <div key={m.label} className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-[#111827]">{m.label}</span>
              <span className="text-sm font-bold text-[#111827]">{m.used} / {m.total}</span>
            </div>
            <div className="h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${(m.used / m.total) * 100}%`, background: m.color }}
              />
            </div>
            <p className="text-xs text-[#9CA3AF]">{m.total - m.used} remaining · Resets Aug 31</p>
          </div>
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-white rounded-2xl border p-6 relative ${
              plan.current ? "border-[#6D5EF5] shadow-lg shadow-purple-100" : "border-[#E5E7EB]"
            }`}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#6D5EF5] text-white text-[10px] font-bold px-3 py-1 rounded-full whitespace-nowrap">
                Current Plan
              </div>
            )}
            <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center" style={{ background: plan.bg }}>
              <div className="w-4 h-4 rounded-full" style={{ background: plan.color }} />
            </div>
            <h3 className="font-bold text-lg text-[#111827] mb-0.5">{plan.name}</h3>
            <p className="text-3xl font-extrabold text-[#111827] mb-4">
              {plan.price}<span className="text-sm font-normal text-[#9CA3AF]">{plan.period}</span>
            </p>
            <div className="space-y-1.5 mb-6">
              {plan.features.map((f) => (
                <div key={f} className="flex items-start gap-2 text-xs text-[#6B7280]">
                  <span className="text-[#10B981] flex-shrink-0 mt-0.5">✓</span> {f}
                </div>
              ))}
            </div>
            <button
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors"
              style={plan.current
                ? { background: "#EDE9FE", color: "#6D5EF5" }
                : { background: plan.color, color: "#fff" }}
            >
              {plan.current ? "Current Plan" : "Upgrade"}
            </button>
          </div>
        ))}
      </div>

      {/* Billing info */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <h3 className="font-bold text-[#111827] mb-4">Payment Method</h3>
          <div className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB] mb-4">
            <div className="w-10 h-7 bg-[#1A1F71] rounded flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">VISA</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-[#111827]">•••• •••• •••• 4242</p>
              <p className="text-xs text-[#9CA3AF]">Expires 09/28</p>
            </div>
            <button className="ml-auto text-xs text-[#6D5EF5] font-medium hover:underline">Update</button>
          </div>
          <p className="text-xs text-[#9CA3AF]">Next billing date: September 1, 2026 · $29.00</p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
          <h3 className="font-bold text-[#111827] mb-4">Invoice History</h3>
          <div className="space-y-2">
            {[
              { date: "Aug 1, 2026", amount: "$29.00", status: "Paid" },
              { date: "Jul 1, 2026", amount: "$29.00", status: "Paid" },
              { date: "Jun 1, 2026", amount: "$29.00", status: "Paid" },
            ].map((inv) => (
              <div key={inv.date} className="flex items-center justify-between py-2 border-b border-[#F3F4F6] last:border-0">
                <span className="text-sm text-[#374151]">{inv.date}</span>
                <span className="text-sm font-semibold text-[#111827]">{inv.amount}</span>
                <span className="text-xs font-medium text-[#059669] bg-[#D1FAE5] px-2 py-0.5 rounded-full">{inv.status}</span>
                <button className="text-xs text-[#6D5EF5] hover:underline font-medium">PDF</button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
