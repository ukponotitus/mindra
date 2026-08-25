interface Props {
  mode: "login" | "signup" | "forgot";
  onModeChange: (m: "login" | "signup" | "forgot") => void;
  onSuccess: () => void;
  onBack: () => void;
}

export default function AuthPage({ mode, onModeChange, onSuccess, onBack }: Props) {
  const isLogin = mode === "login";
  const isForgot = mode === "forgot";
  const isSignup = mode === "signup";

  return (
    <div className="min-h-screen flex">
      {/* Left illustration panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white"
              style={{
                width: `${(i + 1) * 120}px`,
                height: `${(i + 1) * 120}px`,
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
              }}
            />
          ))}
        </div>
        <button
          onClick={onBack}
          className="relative z-10 flex items-center gap-2 text-white/80 hover:text-white transition-colors w-fit"
        >
          <span>←</span> Back to home
        </button>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <span className="text-white text-sm font-bold">CR</span>
            </div>
            <span className="font-bold text-xl">ContentRepurpose</span>
          </div>
          <h2 className="text-4xl font-extrabold leading-tight mb-6">
            Turn every recording into a content machine.
          </h2>
          <div className="space-y-4">
            {[
              "Upload once, publish everywhere",
              "AI writes in your brand voice",
              "10+ platform formats generated instantly",
              "30-day content calendar filled automatically",
            ].map((point) => (
              <div key={point} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">✓</span>
                </div>
                <span className="text-white/90 text-sm">{point}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-white/60 text-xs">
          Trusted by 12,400+ creators worldwide
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-md animate-slide-in">
          <div className="lg:hidden mb-8 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center">
                <span className="text-white text-xs font-bold">CR</span>
              </div>
              <span className="font-bold">ContentRepurpose</span>
            </div>
            <button onClick={onBack} className="text-sm text-[#6B7280] hover:text-[#111827]">← Back</button>
          </div>

          <h1 className="text-2xl font-extrabold mb-2 text-[#111827]">
            {isForgot ? "Reset your password" : isSignup ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-[#6B7280] text-sm mb-8">
            {isForgot
              ? "Enter your email and we'll send you a reset link."
              : isSignup
              ? "Start your free trial — no credit card required."
              : "Log in to your ContentRepurpose workspace."}
          </p>

          {!isForgot && (
            <button className="w-full flex items-center justify-center gap-3 border border-[#E5E7EB] rounded-xl py-3 mb-6 text-sm font-medium hover:bg-[#F9FAFB] transition-colors bg-white">
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          )}

          {!isForgot && (
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-[#E5E7EB]" />
              <span className="text-xs text-[#9CA3AF] font-medium">or</span>
              <div className="flex-1 h-px bg-[#E5E7EB]" />
            </div>
          )}

          <div className="space-y-4 mb-6">
            {isSignup && (
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="Sarah Chen"
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">Email address</label>
              <input
                type="email"
                placeholder="you@company.com"
                className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all"
              />
            </div>
            {!isForgot && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-[#374151]">Password</label>
                  {isLogin && (
                    <button
                      onClick={() => onModeChange("forgot")}
                      className="text-xs text-[#6D5EF5] hover:underline font-medium"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E7EB] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6D5EF5]/30 focus:border-[#6D5EF5] transition-all"
                />
              </div>
            )}
          </div>

          <button
            onClick={onSuccess}
            className="w-full py-3 bg-gradient-to-r from-[#6D5EF5] to-[#5a4de0] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-200"
          >
            {isForgot ? "Send Reset Link" : isSignup ? "Create Account" : "Log In"}
          </button>

          <p className="text-center text-sm text-[#6B7280] mt-6">
            {isForgot ? (
              <>
                Remembered it?{" "}
                <button onClick={() => onModeChange("login")} className="text-[#6D5EF5] font-semibold hover:underline">
                  Back to login
                </button>
              </>
            ) : isSignup ? (
              <>
                Already have an account?{" "}
                <button onClick={() => onModeChange("login")} className="text-[#6D5EF5] font-semibold hover:underline">
                  Log in
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button onClick={() => onModeChange("signup")} className="text-[#6D5EF5] font-semibold hover:underline">
                  Sign up free
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
