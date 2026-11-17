import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import { useAuth } from "../auth/context";
import BrandMark from "../components/BrandMark";
import PasswordInput from "../components/ui/PasswordInput";
import { buttonStyles } from "../components/ui/button";
import { ApiError, apiRequest, type FieldErrors } from "../lib/api";
import type { AuthResponse } from "../lib/types";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { trackSignup } from "../lib/metaPixel";
import { recordSignup, signupAttribution } from "../lib/visits";
import MetaAdsChoice from "../components/MetaAdsChoice";

// Where the API sends the browser back from Google (`/login/google#code=`): the one-time code is exchanged for a
// sign-in (`POST /api/auth/google/finish/`). Someone Mindra knows is signed in at once. A new person confirms they're
// 18 or older first (with the invite code while sign-up needs one); an email that already has a Mindra account gives
// that account's password once, which connects Google to it.

type Signed = AuthResponse & { next: string; created: boolean };
type Step = { step: "signup"; email: string; first_name: string; invite_required: boolean } | { step: "link"; email: string };
type Answer = Signed | Step;

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden aria-invalid:border-red-300";
const linkClass = "rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export default function GoogleSignIn() {
  useDocumentTitle("Continue with Google");
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  // The code is read once and taken out of the address, so it isn't left in the browser's history.
  const [code] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get("code") ?? "");
  const [step, setStep] = useState<Step | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [adult, setAdult] = useState(false);
  const [metaAds, setMetaAds] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const asked = useRef(false);

  const send = async (extra: Record<string, unknown> = {}) => {
    setBusy(true);
    setError("");
    setFieldErrors({});
    try {
      const answer = await apiRequest<Answer>("/api/auth/google/finish/", { method: "POST", body: { code, ...extra } });
      if ("step" in answer) {
        setStep(answer);
        return;
      }
      setDone(true);
      signIn(answer);
      if (answer.created) {
        recordSignup();
        if (metaAds) trackSignup(answer.user.id);
      }
      navigate(answer.next || "/dashboard", { replace: true });
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : new ApiError(0, "Something went wrong. Try again.");
      setFieldErrors(apiError.fieldErrors);
      if (!["confirms_age", "invite_code", "password"].some((field) => apiError.fieldErrors[field])) setError(apiError.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!code || asked.current) return;
    asked.current = true;
    window.history.replaceState(window.history.state, "", window.location.pathname);
    void send();
    // Once, with the code the page opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (!code) return <Navigate to="/login" replace />;
  if (status === "signedIn" && !done && !busy && !step) return <Navigate to="/dashboard" replace />;

  const fieldError = (field: string) => fieldErrors[field]?.[0];
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!step) return;
    if (step.step === "link") {
      void send({ password });
    } else if (!adult) {
      setFieldErrors({ confirms_age: ["Confirm that you're 18 or older."] });
    } else {
      void send({
        confirms_age: true,
        ...(step.invite_required ? { invite_code: inviteCode.trim() } : {}),
        attribution: signupAttribution(metaAds),
      });
    }
  };

  return (
    <main className="flex min-h-dvh items-start justify-center bg-background px-4 py-8 sm:items-center sm:px-8 sm:py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-10 inline-flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
          <BrandMark />
          <span className="font-semibold text-foreground">Mindra</span>
        </Link>

        {!step ? (
          error ? (
            <>
              <h1 className="text-2xl font-semibold text-balance text-foreground">Couldn't sign you in with Google</h1>
              <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
                {error}
              </p>
              <Link to="/login" className={buttonStyles({ size: "lg", className: "mt-6 w-full" })}>
                Back to log in
              </Link>
            </>
          ) : (
            <p role="status" className="text-sm text-muted-foreground">
              Signing you in…
            </p>
          )
        ) : (
          <form onSubmit={submit} noValidate aria-busy={busy}>
            <h1 className="text-2xl font-semibold text-balance text-foreground">
              {step.step === "signup" ? (step.first_name ? `Welcome, ${step.first_name}` : "Create your account") : "You already have an account"}
            </h1>
            <p className="mt-2 mb-6 text-sm text-pretty text-muted-foreground">
              {step.step === "signup" ? (
                <>
                  Your Mindra account will use <strong className="font-medium wrap-anywhere text-foreground">{step.email}</strong>, from Google.
                </>
              ) : (
                <>
                  There's a Mindra account for <strong className="font-medium wrap-anywhere text-foreground">{step.email}</strong> already. Enter
                  its password once to connect Google to it. After that, Google signs you in.
                </>
              )}
            </p>
            {error && (
              <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
                {error}
              </p>
            )}

            {step.step === "link" && (
              <div className="mb-6">
                <div className="mb-1.5 flex items-center justify-between gap-4">
                  <label htmlFor="google-password" className="block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Link to="/forgot-password" className={`${linkClass} text-sm`}>
                    Forgot password?
                  </Link>
                </div>
                <PasswordInput
                  id="google-password"
                  autoComplete="current-password"
                  autoFocus
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(fieldError("password")) || undefined}
                  aria-describedby={fieldError("password") ? "google-password-error" : undefined}
                  className={inputClass}
                />
                {fieldError("password") && (
                  <p id="google-password-error" role="alert" className="mt-1.5 text-sm text-red-600">
                    {fieldError("password")}
                  </p>
                )}
              </div>
            )}

            {step.step === "signup" && step.invite_required && (
              <div className="mb-5">
                <label htmlFor="google-invite" className="mb-1.5 block text-sm font-medium text-foreground">
                  Invite code
                </label>
                <input
                  id="google-invite"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  aria-invalid={Boolean(fieldError("invite_code")) || undefined}
                  aria-describedby={fieldError("invite_code") ? "google-invite-error" : "google-invite-hint"}
                  className={inputClass}
                />
                {fieldError("invite_code") ? (
                  <p id="google-invite-error" role="alert" className="mt-1.5 text-sm text-red-600">
                    {fieldError("invite_code")}
                  </p>
                ) : (
                  <p id="google-invite-hint" className="mt-1.5 text-xs text-muted-foreground">
                    Sign-up needs an invite code for now.
                  </p>
                )}
              </div>
            )}

            {step.step === "signup" && (
              <div className="mb-5">
                <label className="flex items-start gap-2.5 text-sm text-pretty text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={adult}
                    onChange={(event) => setAdult(event.target.checked)}
                    aria-invalid={Boolean(fieldError("confirms_age")) || undefined}
                    aria-describedby={fieldError("confirms_age") ? "google-age-error" : undefined}
                    className="mt-0.5 size-4 shrink-0 accent-primary"
                  />
                  <span>
                    I'm 18 or older, and I agree to the{" "}
                    <Link to="/terms" target="_blank" className={linkClass}>
                      Terms<span className="sr-only"> (opens in a new tab)</span>
                    </Link>{" "}
                    and the{" "}
                    <Link to="/privacy" target="_blank" className={linkClass}>
                      Privacy Policy<span className="sr-only"> (opens in a new tab)</span>
                    </Link>
                    .
                  </span>
                </label>
                {fieldError("confirms_age") && (
                  <p id="google-age-error" role="alert" className="mt-1.5 text-sm text-red-600">
                    {fieldError("confirms_age")}
                  </p>
                )}
              </div>
            )}
            {step.step === "signup" && <MetaAdsChoice checked={metaAds} onChange={setMetaAds} />}

            <button type="submit" disabled={busy || (step.step === "link" && !password)} className={buttonStyles({ size: "lg", className: "w-full" })}>
              {busy ? "Please wait…" : step.step === "signup" ? "Create Account" : "Connect and log in"}
            </button>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Not you?{" "}
              <Link to="/login" className={linkClass}>
                Back to log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
