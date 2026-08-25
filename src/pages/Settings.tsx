import { useState } from "react";

const sections = ["Profile", "Workspace", "Notifications", "Security", "API Keys", "Connected Accounts"];

export default function Settings() {
  const [activeSection, setActiveSection] = useState("Profile");
  const [notifications, setNotifications] = useState({
    processingComplete: true,
    weeklyDigest: true,
    creditsLow: true,
    newFeatures: false,
  });

  return (
    <div className="animate-slide-in">
      <div className="mb-6">
        <h2 className="text-2xl font-extrabold text-[#111827] mb-1">Settings</h2>
        <p className="text-sm text-[#6B7280]">Manage your account and workspace preferences.</p>
      </div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Section nav */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-2 h-fit">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeSection === s
                  ? "bg-[#EDE9FE] text-[#6D5EF5]"
                  : "text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="lg:col-span-3 space-y-5">
          {activeSection === "Profile" && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5">
              <h3 className="font-bold text-[#111827]">Profile Information</h3>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center text-white font-bold text-xl">SC</div>
                <div>
                  <button className="text-sm font-medium text-[#6D5EF5] hover:underline">Upload Photo</button>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">JPG, PNG up to 5MB</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { label: "First Name", value: "Sarah" },
                  { label: "Last Name", value: "Chen" },
                  { label: "Email", value: "sarah@example.com" },
                  { label: "Job Title", value: "Marketing Lead" },
                ].map((f) => (
                  <div key={f.label}>
                    <label className="block text-sm font-medium text-[#374151] mb-1.5">{f.label}</label>
                    <input defaultValue={f.value} className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all" />
                  </div>
                ))}
              </div>
              <button className="px-6 py-2.5 bg-[#6D5EF5] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                Save Changes
              </button>
            </div>
          )}

          {activeSection === "Notifications" && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
              <h3 className="font-bold text-[#111827] mb-5">Notification Preferences</h3>
              <div className="space-y-4">
                {Object.entries(notifications).map(([key, val]) => {
                  const labels: Record<string, { label: string; desc: string }> = {
                    processingComplete: { label: "Processing Complete", desc: "When your video or audio finishes processing" },
                    weeklyDigest: { label: "Weekly Digest", desc: "Summary of your content performance every Monday" },
                    creditsLow: { label: "Credits Running Low", desc: "When AI credits drop below 20% remaining" },
                    newFeatures: { label: "New Features", desc: "Product updates and new capabilities" },
                  };
                  const info = labels[key];
                  return (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-[#F3F4F6] last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{info.label}</p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">{info.desc}</p>
                      </div>
                      <button
                        onClick={() => setNotifications((n) => ({ ...n, [key]: !n[key as keyof typeof n] }))}
                        className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${val ? "bg-[#6D5EF5]" : "bg-[#D1D5DB]"}`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${val ? "translate-x-6" : "translate-x-1"}`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeSection === "API Keys" && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
              <h3 className="font-bold text-[#111827] mb-2">API Keys</h3>
              <p className="text-sm text-[#6B7280] mb-5">Use these keys to integrate ContentRepurpose with your own tools.</p>
              <div className="space-y-3">
                {[
                  { label: "Production Key", key: "cr_live_••••••••••••••••••••••••••••••••" },
                  { label: "Test Key", key: "cr_test_••••••••••••••••••••••••••••••" },
                ].map((k) => (
                  <div key={k.label} className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E5E7EB]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#374151]">{k.label}</span>
                      <div className="flex gap-2">
                        <button className="text-xs text-[#6D5EF5] font-medium hover:underline">Reveal</button>
                        <button className="text-xs text-[#6D5EF5] font-medium hover:underline">Rotate</button>
                      </div>
                    </div>
                    <code className="text-xs text-[#6B7280] font-mono">{k.key}</code>
                  </div>
                ))}
              </div>
              <button className="mt-4 px-5 py-2.5 bg-[#6D5EF5] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                Generate New Key
              </button>
            </div>
          )}

          {activeSection === "Connected Accounts" && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
              <h3 className="font-bold text-[#111827] mb-5">Connected Accounts</h3>
              <div className="space-y-3">
                {[
                  { platform: "LinkedIn", icon: "in", color: "#0A66C2", connected: true, account: "@sarahchen" },
                  { platform: "Instagram", icon: "📸", color: "#E1306C", connected: true, account: "@sarahchenbuilds" },
                  { platform: "X (Twitter)", icon: "𝕏", color: "#000", connected: false, account: "" },
                  { platform: "TikTok", icon: "♪", color: "#010101", connected: false, account: "" },
                  { platform: "Beehiiv", icon: "✉", color: "#6D5EF5", connected: true, account: "The Growthly Newsletter" },
                ].map((acc) => (
                  <div key={acc.platform} className="flex items-center justify-between p-4 rounded-xl border border-[#E5E7EB]">
                    <div className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl text-sm font-bold flex items-center justify-center text-white" style={{ background: acc.color }}>
                        {acc.icon}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{acc.platform}</p>
                        {acc.connected && <p className="text-xs text-[#9CA3AF]">{acc.account}</p>}
                      </div>
                    </div>
                    <button
                      className={`text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors ${
                        acc.connected
                          ? "text-[#EF4444] bg-[#FEF2F2] hover:bg-[#FEE2E2]"
                          : "text-white bg-[#6D5EF5] hover:opacity-90"
                      }`}
                    >
                      {acc.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeSection === "Security" || activeSection === "Workspace") && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
              <h3 className="font-bold text-[#111827] mb-5">{activeSection}</h3>
              {activeSection === "Security" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1.5">Current Password</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#374151] mb-1.5">New Password</label>
                    <input type="password" placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all" />
                  </div>
                  <button className="px-6 py-2.5 bg-[#6D5EF5] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                    Update Password
                  </button>
                </div>
              )}
              {activeSection === "Workspace" && (
                <div className="space-y-4">
                  {[{ label: "Workspace Name", value: "Growthly HQ" }, { label: "Workspace URL", value: "growthly.contentrepurpose.com" }].map((f) => (
                    <div key={f.label}>
                      <label className="block text-sm font-medium text-[#374151] mb-1.5">{f.label}</label>
                      <input defaultValue={f.value} className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all" />
                    </div>
                  ))}
                  <button className="px-6 py-2.5 bg-[#6D5EF5] text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
                    Save
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
