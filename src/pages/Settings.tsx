import { useId, useState, type ReactNode } from "react";
import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { Tabs } from "@base-ui/react/tabs";
import { BellRing, KeyRound, Link2, LogOut, Monitor, Moon, Palette, Sun, UserRound, Users, type LucideIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { fullName, useAuth } from "../auth/context";
import ReminderSettings from "../components/calendar/ReminderSettings";
import ConnectedAccounts from "../components/settings/ConnectedAccounts";
import { buttonStyles } from "../components/ui/button";
import { ApiError, apiRequest } from "../lib/api";
import { cn } from "../lib/cn";
import { initials } from "../lib/format";
import { THEME_CHOICES, useTheme, type ThemeChoice } from "../lib/theme";

const roleLabels = { owner: "Owner", admin: "Admin", member: "Member" };

// Each group of settings has its tab; the address's #part names it, so links such as /settings#accounts open it.
const TABS = [
  { id: "account", label: "Account" },
  { id: "appearance", label: "Appearance" },
  { id: "accounts", label: "Connected accounts" },
  { id: "reminders", label: "Reminders" },
  { id: "workspace", label: "Workspace" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function Card({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="rounded-xl border border-border bg-card p-5 sm:p-6">
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

const themeIcons = { light: Sun, dark: Moon, system: Monitor };

function AppearanceChoice() {
  const { choice, setTheme } = useTheme();
  const labelId = useId();
  return (
    <>
      <p id={labelId} className="mb-4 text-sm text-pretty text-muted-foreground">
        How Mindra looks on this device. The landing page stays light.
      </p>
      <RadioGroup aria-labelledby={labelId} value={choice} onValueChange={(value) => setTheme(value as ThemeChoice)} className="grid gap-3 sm:grid-cols-3">
        {THEME_CHOICES.map(({ id, label, description }) => {
          const Icon = themeIcons[id];
          return (
            <label
              key={id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors",
                choice === id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
              )}
            >
              <Radio.Root
                value={id}
                className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border border-border bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[checked]:border-primary"
              >
                <Radio.Indicator className="size-2 rounded-full bg-primary" />
              </Radio.Root>
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
                  {label}
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
              </span>
            </label>
          );
        })}
      </RadioGroup>
    </>
  );
}

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { hash, search } = useLocation();
  const [resetState, setResetState] = useState<"idle" | "sending" | "sent">("idle");
  const [resetError, setResetError] = useState("");

  // Back from connecting an account (?pending=, ?connect_error=), the Connected accounts tab is the one to show.
  const fromHash = TABS.find((tab) => `#${tab.id}` === hash)?.id;
  const connecting = /[?&](pending|connect_error)=/.test(search);
  const tab: TabId = fromHash ?? (connecting ? "accounts" : "account");

  if (!user) return null;
  const name = fullName(user);

  const choose = (value: TabId) => navigate({ search, hash: value === "account" ? "" : `#${value}` }, { replace: true });

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
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Your account, how Mindra looks, connected accounts, reminders and workspace.</p>
      </div>

      <Tabs.Root value={tab} onValueChange={(value) => choose(value as TabId)}>
        <Tabs.List aria-label="Settings" className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {TABS.map(({ id, label }) => (
            <Tabs.Tab
              key={id}
              value={id}
              className="shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary data-[active]:bg-card data-[active]:text-foreground data-[active]:shadow-sm"
            >
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="account" className="space-y-5 outline-none">
          <Card icon={UserRound} title="Profile">
            <div className="flex min-w-0 items-center gap-4">
              <div aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-semibold text-primary">
                {initials(name)}
              </div>
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{name}</p>
                <p className="text-sm wrap-anywhere text-muted-foreground">{user.email}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-pretty text-muted-foreground">Editing your name and email is coming soon.</p>
          </Card>

          <Card icon={KeyRound} title="Password">
            <p className="mb-4 text-sm text-pretty text-muted-foreground">
              We'll email a link to <strong className="font-medium wrap-anywhere text-foreground">{user.email}</strong> where you can choose a new password.
            </p>
            {resetState === "sent" ? (
              <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                Check your inbox for the reset link.
              </p>
            ) : (
              <button type="button" onClick={sendResetLink} disabled={resetState === "sending"} className={buttonStyles({ variant: "secondary" })}>
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
        </Tabs.Panel>

        <Tabs.Panel value="appearance" className="outline-none">
          <Card icon={Palette} title="Appearance">
            <AppearanceChoice />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="accounts" className="outline-none">
          <Card icon={Link2} title="Connected accounts">
            <ConnectedAccounts />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="reminders" className="outline-none">
          <Card icon={BellRing} title="Reminders">
            <p className="mb-4 text-sm text-pretty text-muted-foreground">
              At each scheduled post's time, Mindra reminds whoever scheduled it, with a link that opens the post ready to share.
            </p>
            <ReminderSettings />
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="workspace" className="outline-none">
          <Card icon={Users} title="Workspace">
            <ul className="divide-y divide-border">
              {user.workspaces.map((workspace) => (
                <li key={workspace.id} className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">{workspace.name}</span>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">{roleLabels[workspace.role]}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm text-pretty text-muted-foreground">Inviting teammates is coming soon.</p>
          </Card>
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
