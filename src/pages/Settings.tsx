import { useId, useState, type ReactNode } from "react";
import { KeyRound, LogOut, UserRound, Users, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { fullName, useAuth } from "../auth/context";
import { buttonStyles } from "../components/ui/button";
import { ApiError, apiRequest } from "../lib/api";
import { initials } from "../lib/format";

const roleLabels = { owner: "Owner", admin: "Admin", member: "Member" };

function Card({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-border bg-white p-5 sm:p-6">
      <div className="mb-5 flex items-center gap-2.5">
        <Icon aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
        <h3 id={headingId} className="font-semibold text-balance text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </section>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [resetState, setResetState] = useState<"idle" | "sending" | "sent">("idle");
  const [resetError, setResetError] = useState("");

  if (!user) return null;
  const name = fullName(user);

  const sendResetLink = async () => {
    setResetState("sending");
    setResetError("");
    try {
      await apiRequest<null>("/api/auth/password-reset/", { method: "POST", body: { email: user.email } });
      setResetState("sent");
    } catch (error) {
      setResetError(error instanceof ApiError ? error.message : "Something went wrong.");
      setResetState("idle");
    }
  };

  const logOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-balance text-foreground">Settings</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Your account and workspace.</p>
      </div>

      <div className="space-y-5">
        <Card icon={UserRound} title="Profile">
          <div className="flex min-w-0 items-center gap-4">
            <div
              aria-hidden="true"
              className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary"
            >
              {initials(name)}
            </div>
            <div className="min-w-0">
              <p className="truncate font-medium text-foreground">{name}</p>
              <p className="text-sm wrap-anywhere text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <p className="mt-4 text-sm text-pretty text-muted-foreground">Editing your name and email is coming soon.</p>
        </Card>

        <Card icon={Users} title="Workspace">
          <ul className="divide-y divide-border">
            {user.workspaces.map((workspace) => (
              <li key={workspace.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0 truncate text-sm font-medium text-foreground">{workspace.name}</span>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-gray-700">
                  {roleLabels[workspace.role]}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-pretty text-muted-foreground">Inviting teammates is coming soon.</p>
        </Card>

        <Card icon={KeyRound} title="Password">
          <p className="mb-4 text-sm text-pretty text-muted-foreground">
            We'll email a link to <strong className="font-medium wrap-anywhere text-foreground">{user.email}</strong> where you
            can choose a new password.
          </p>
          {resetState === "sent" ? (
            <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Check your inbox for the reset link.
            </p>
          ) : (
            <button
              type="button"
              onClick={sendResetLink}
              disabled={resetState === "sending"}
              className={buttonStyles({ variant: "secondary" })}
            >
              {resetState === "sending" ? "Sending…" : "Send me a reset link"}
            </button>
          )}
          {resetError && (
            <p role="alert" className="mt-3 text-sm text-pretty text-red-600">
              {resetError}
            </p>
          )}
        </Card>

        <button type="button" onClick={logOut} className={buttonStyles({ variant: "secondary" })}>
          <LogOut aria-hidden="true" className="size-4" />
          Log out
        </button>
      </div>
    </div>
  );
}
