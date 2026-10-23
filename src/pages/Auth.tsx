import { useState, type FormEvent, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from "react-router";
import { useAuth } from "../auth/context";
import BrandMark from "../components/BrandMark";
import { buttonStyles } from "../components/ui/button";
import { ApiError, apiRequest, type FieldErrors } from "../lib/api";
import { cn } from "../lib/cn";
import type { AuthResponse } from "../lib/types";
import { useDocumentTitle } from "../lib/useDocumentTitle";

type Mode = "login" | "signup" | "forgot" | "reset";

interface Props {
  mode: Mode;
}

/** `GET /api/auth/signup-options/`: whether sign-up needs an invite code (it never reveals the codes). */
type SignupOptions = { invite_required: boolean };

const copy: Record<Mode, { tabTitle: string; title: string; subtitle: string; submit: string }> = {
  login: { tabTitle: "Log in", title: "Welcome back", subtitle: "Log in to your Mindra workspace.", submit: "Log In" },
  signup: {
    tabTitle: "Sign up",
    title: "Create your account",
    subtitle: "Mindra is free while it's in beta.",
    submit: "Create Account",
  },
  forgot: {
    tabTitle: "Reset password",
    title: "Reset your password",
    subtitle: "Enter your email and we'll send you a reset link.",
    submit: "Send Reset Link",
  },
  reset: {
    tabTitle: "Reset password",
    title: "Choose a new password",
    subtitle: "Pick a password you don't use anywhere else.",
    submit: "Save Password",
  },
};

/** What Mindra does today. Only things that work now belong here. */
const WHAT_WORKS = [
  "Upload a video or audio recording, or paste a transcript.",
  "Get a transcript with timestamps, a summary, key quotes and hooks.",
  "Draft posts for each platform in your brand voice, then edit them.",
];

const inputClass =
  "h-11 w-full rounded-lg border border-border bg-white px-3.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden aria-invalid:border-red-300";

const linkClass =
  "rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

function Field({
  id,
  label,
  error,
  hint,
  extra,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-4">
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {extra}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-pretty text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1.5 text-xs text-pretty text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

export default function AuthPage({ mode }: Props) {
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  useDocumentTitle(copy[mode].tabTitle);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [resetSentTo, setResetSentTo] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteAsked, setInviteAsked] = useState(false);

  // A failed check (or an API without invite codes, which answers 404) leaves the field out; if the API does want a
  // code after all, its error on sign-up brings the field in, and it stays.
  const signupOptions = useQuery({
    queryKey: ["signup-options"],
    queryFn: () => apiRequest<SignupOptions>("/api/auth/signup-options/"),
    enabled: mode === "signup",
    staleTime: 5 * 60_000,
  });

  const from = (location.state as { from?: string } | null)?.from ?? "/dashboard";
  const uid = searchParams.get("uid") ?? "";
  const token = searchParams.get("token") ?? "";

  if (status === "signedIn" && mode !== "reset") return <Navigate to={from} replace />;

  const fieldError = (field: string) => fieldErrors[field]?.[0];
  /** Props that tie an input to its error or hint, so screen readers read them with the field. */
  const describe = (id: string, field: string, hasHint = false) => {
    const invalid = Boolean(fieldError(field));
    const describedBy = invalid ? `${id}-error` : hasHint ? `${id}-hint` : undefined;
    return { id, "aria-invalid": invalid || undefined, "aria-describedby": describedBy };
  };
  const askInviteCode = mode === "signup" && (signupOptions.data?.invite_required === true || inviteAsked);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (mode === "reset" && password !== confirmPassword) {
      setFieldErrors({ confirm_password: ["The two passwords don't match."] });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "forgot") {
        await apiRequest<null>("/api/auth/password-reset/", { method: "POST", body: { email } });
        setResetSentTo(email);
      } else if (mode === "reset") {
        signIn(await apiRequest<AuthResponse>("/api/auth/password-reset/confirm/", { method: "POST", body: { uid, token, password } }));
        navigate("/dashboard", { replace: true });
      } else if (mode === "signup") {
        const [firstName = "", ...rest] = name.trim().split(/\s+/);
        const invite = askInviteCode ? { invite_code: inviteCode.trim() } : {};
        const body = { email, password, first_name: firstName, last_name: rest.join(" "), ...invite };
        signIn(await apiRequest<AuthResponse>("/api/auth/register/", { method: "POST", body }));
        navigate("/dashboard", { replace: true });
      } else {
        signIn(await apiRequest<AuthResponse>("/api/auth/login/", { method: "POST", body: { email, password } }));
        navigate(from, { replace: true });
      }
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : new ApiError(0, "Something went wrong.");
      setFieldErrors(apiError.fieldErrors);
      if (apiError.fieldErrors.invite_code) setInviteAsked(true);
      const shownBelowFields = ["email", "password", "first_name", "invite_code"].some((field) => apiError.fieldErrors[field]);
      if (!shownBelowFields) setError(apiError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const { title, subtitle, submit: submitLabel } = copy[mode];
  const resetLinkMissing = mode === "reset" && (!uid || !token);
  const passwordHint = mode !== "login" ? "At least 8 characters, not too common." : undefined;

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-1/2 max-w-2xl flex-col justify-between bg-neutral-950 p-12 text-white lg:flex">
        <div className="flex items-center justify-between gap-4">
          <Link
            to="/"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
          >
            <BrandMark />
            <span className="text-lg font-semibold">Mindra</span>
          </Link>
          <Link
            to="/"
            className="inline-flex h-10 items-center gap-2 rounded-lg px-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to home
          </Link>
        </div>

        <div className="max-w-md">
          <p className="text-4xl leading-tight font-semibold text-balance">Record once. Post all month.</p>
          <ul className="mt-8 space-y-4">
            {WHAT_WORKS.map((point) => (
              <li key={point} className="flex gap-3 text-base text-pretty text-white/75">
                <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-white/50" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-white/60">Built for creators, podcasters, businesses and churches.</p>
      </aside>

      <main className="flex flex-1 items-start justify-center bg-background px-4 py-8 sm:items-center sm:px-8 sm:py-10">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-between gap-4 lg:hidden">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <BrandMark />
              <span className="font-semibold text-foreground">Mindra</span>
            </Link>
            <Link to="/" className={buttonStyles({ variant: "ghost", className: "-mr-3" })}>
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back
            </Link>
          </div>

          <h1 className="text-2xl font-semibold text-balance text-foreground">{title}</h1>
          <p className="mt-2 mb-8 text-sm text-pretty text-muted-foreground">{subtitle}</p>

          {resetSentTo ? (
            <p role="status" className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-pretty text-emerald-800">
              If an account exists for <strong className="font-semibold wrap-anywhere">{resetSentTo}</strong>, a reset link is on
              its way. It works for 24 hours.
            </p>
          ) : resetLinkMissing ? (
            <p role="alert" className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-pretty text-red-800">
              This reset link is incomplete. Open the link from your email again, or{" "}
              <Link to="/forgot-password" className="rounded font-medium underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                request a new one
              </Link>
              .
            </p>
          ) : (
            <form onSubmit={submit} noValidate aria-busy={submitting}>
              {error && (
                <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
                  {error}
                </p>
              )}

              <div className="mb-6 space-y-4">
                {mode === "signup" && (
                  <Field id="auth-name" label="Full name" error={fieldError("first_name")}>
                    <input
                      {...describe("auth-name", "first_name")}
                      type="text"
                      autoComplete="name"
                      placeholder="Ada Okafor"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}

                {mode !== "reset" && (
                  <Field id="auth-email" label="Email address" error={fieldError("email")}>
                    <input
                      {...describe("auth-email", "email")}
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}

                {mode !== "forgot" && (
                  <Field
                    id="auth-password"
                    label={mode === "reset" ? "New password" : "Password"}
                    error={fieldError("password")}
                    hint={passwordHint}
                    extra={
                      mode === "login" && (
                        <Link to="/forgot-password" className={cn(linkClass, "text-sm")}>
                          Forgot password?
                        </Link>
                      )
                    }
                  >
                    <input
                      {...describe("auth-password", "password", Boolean(passwordHint))}
                      type="password"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      required
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}

                {askInviteCode && (
                  <Field
                    id="auth-invite-code"
                    label="Invite code"
                    error={fieldError("invite_code")}
                    hint="Sign-up is by invitation during the beta."
                  >
                    <input
                      {...describe("auth-invite-code", "invite_code", true)}
                      type="text"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}

                {mode === "reset" && (
                  <Field id="auth-confirm-password" label="Confirm new password" error={fieldError("confirm_password")}>
                    <input
                      {...describe("auth-confirm-password", "confirm_password")}
                      type="password"
                      autoComplete="new-password"
                      required
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={inputClass}
                    />
                  </Field>
                )}
              </div>

              <button type="submit" disabled={submitting} className={buttonStyles({ size: "lg", className: "w-full" })}>
                {submitting ? "Please wait…" : submitLabel}
              </button>

              {mode === "signup" && (
                <p className="mt-4 text-center text-xs text-pretty text-muted-foreground">
                  By creating an account you agree to the{" "}
                  <Link to="/terms" target="_blank" className={linkClass}>
                    Terms<span className="sr-only"> (opens in a new tab)</span>
                  </Link>{" "}
                  and the{" "}
                  <Link to="/privacy" target="_blank" className={linkClass}>
                    Privacy Policy<span className="sr-only"> (opens in a new tab)</span>
                  </Link>
                  .
                </p>
              )}
            </form>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "forgot" || mode === "reset" ? (
              <>
                Remembered it?{" "}
                <Link to="/login" className={linkClass}>
                  Back to login
                </Link>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <Link to="/login" className={linkClass}>
                  Log in
                </Link>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <Link to="/signup" className={linkClass}>
                  Sign up
                </Link>
              </>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
