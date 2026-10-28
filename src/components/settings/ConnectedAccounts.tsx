import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { LoaderCircle, Plus, RefreshCw, X } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../auth/context";
import { backdropClass, popupClass } from "../calendar/dialogStyles";
import ConfirmDialog from "../ui/ConfirmDialog";
import SeePlans from "../SeePlans";
import { buttonStyles } from "../ui/button";
import { ApiError } from "../../lib/api";
import { formatDayShort } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { initials } from "../../lib/format";
import {
  ACCOUNT_KINDS,
  accessEndsSoon,
  accountName,
  useCancelPending,
  useConfirmPending,
  useConnectService,
  useConnectWordPress,
  useConnectedAccounts,
  useDisconnectAccount,
  usePendingConnection,
  useSocialServices,
} from "../../lib/social";
import type { ConnectedAccount, PendingConnection, SocialService, SocialServiceId } from "../../lib/types";

type AccountLook = Pick<ConnectedAccount, "kind" | "name" | "username" | "picture_url">;
type SignInService = Exclude<SocialServiceId, "wordpress">;

const is404 = (error: unknown) => error instanceof ApiError && error.status === 404;
const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-60 aria-invalid:border-red-400";

/** "a", "a and b", "a, b and c". */
function listOf(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** The account's picture, or its initials when it has none or the link has expired. */
function AccountPicture({ account }: { account: AccountLook }) {
  const [broken, setBroken] = useState(false);
  if (account.picture_url && !broken) {
    return (
      <img
        src={account.picture_url}
        alt=""
        onError={() => setBroken(true)}
        className="size-10 shrink-0 rounded-full bg-secondary object-cover"
      />
    );
  }
  return (
    <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
      {initials(account.name)}
    </span>
  );
}

/** Picture, name, and "YouTube channel · @handle", plus anything after (such as a status). */
function AccountSummary({ account, children }: { account: AccountLook; children?: ReactNode }) {
  const handle = account.kind !== "wordpress" && account.kind !== "linkedin" && account.username;
  return (
    <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
      <AccountPicture account={account} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          <span>{ACCOUNT_KINDS[account.kind].label}</span>
          {handle && <span className="min-w-0 truncate">· @{account.username}</span>}
          {children}
        </p>
      </div>
    </div>
  );
}

/** What came back from a sign-in (a confirmed ?pending=, or ?connect_error=…): what Mindra can post to now, or why
 * it didn't work. */
function ConnectResult({
  error,
  saved,
  service,
  notice = "",
}: {
  error: string;
  /** The accounts just connected. */
  saved: ConnectedAccount[] | null;
  service: SocialServiceId | "";
  /** Something the API said about the connection, such as a Page it left out. */
  notice?: string;
}) {
  if (error) {
    return (
      <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-700">
        <p className="font-medium">Couldn't connect the account</p>
        <p className="mt-0.5">{error}</p>
      </div>
    );
  }
  if (!saved) return null;
  const names = saved.map((account) => `${accountName(account)} (${ACCOUNT_KINDS[account.kind].label})`);
  const pages = saved.filter((account) => account.kind === "facebook_page");
  const instagram = saved.filter((account) => account.kind === "instagram");
  return (
    <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-pretty text-emerald-800">
      <p className="font-medium">Connected. Mindra can post to {listOf(names)}.</p>
      {notice && <p className="mt-0.5">{notice}</p>}
      {service === "meta" && pages.length > 0 && instagram.length === 0 && (
        <p className="mt-0.5">
          No Instagram business or creator account is linked to {pages.length === 1 ? "this Page" : "these Pages"}. To post to
          Instagram, link one to your Page, then connect again.
        </p>
      )}
    </div>
  );
}

/** When Mindra's access ends unless it's connected again: shown when the service doesn't renew it (LinkedIn). */
function AccessEnds({ account }: { account: ConnectedAccount }) {
  if (!account.access_ends_at || account.status !== "active") return null;
  const ends = new Date(account.access_ends_at);
  const soon = accessEndsSoon(account);
  return (
    <p className={cn("mt-2 text-xs text-pretty", soon ? "text-amber-800" : "text-muted-foreground")}>
      {ACCOUNT_KINDS[account.kind].service === "linkedin" ? "LinkedIn's access lasts 60 days and" : "Mindra's access"}{" "}
      ends on {formatDayShort(ends)}. {soon ? "Reconnect now to keep posting here." : "Reconnect before then to keep posting here."}
    </p>
  );
}

function AccountRow({
  account,
  onReconnect,
  reconnecting,
}: {
  account: ConnectedAccount;
  onReconnect: () => void;
  reconnecting: boolean;
}) {
  const disconnect = useDisconnectAccount();
  const needsReconnect = account.status === "needs_reconnect";
  const offerReconnect = needsReconnect || accessEndsSoon(account);

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <AccountSummary account={account}>
          {needsReconnect && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">Needs reconnecting</span>}
        </AccountSummary>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {offerReconnect && (
            <button
              type="button"
              onClick={onReconnect}
              disabled={reconnecting}
              aria-label={`Reconnect ${accountName(account)}`}
              className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}
            >
              {reconnecting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <RefreshCw aria-hidden="true" className="size-4" />}
              Reconnect
            </button>
          )}
          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={disconnect.isPending}
                aria-label={`Disconnect ${accountName(account)}`}
                className={buttonStyles({ variant: "ghost", size: "sm", className: "h-9 text-red-600 hover:bg-red-50 hover:text-red-700" })}
              >
                {disconnect.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                Disconnect
              </button>
            }
            title={`Disconnect ${accountName(account)}?`}
            description="Mindra stops posting to this account. Scheduled posts set to post here go back to reminders."
            confirmLabel="Disconnect"
            onConfirm={() => disconnect.mutate(account.id)}
          />
        </div>
      </div>
      {needsReconnect && (
        <p className="mt-2 text-sm text-pretty text-amber-800">
          {account.last_error || `${account.service} stopped accepting Mindra's access to this account.`} Reconnect to post here again.
        </p>
      )}
      <AccessEnds account={account} />
      {disconnect.isError && (
        <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
          {disconnect.error.message}
        </p>
      )}
    </li>
  );
}

/**
 * Back from a sign-in with ?pending=<id>: "Connect this to Grace Chapel?" with what the service shared. Nothing is
 * saved until the signed-in person presses Connect, so a link from someone else can't connect their accounts here.
 */
function PendingPanel({
  pending,
  workspace,
  onConfirm,
  onCancel,
  confirming,
  cancelling,
  error,
  onRetry,
}: {
  /** Undefined while it loads. */
  pending: PendingConnection | undefined;
  workspace: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirming: boolean;
  cancelling: boolean;
  /** Loading it failed (other than expired), or Connect or Cancel did. */
  error: string;
  /** Present when loading it failed. */
  onRetry?: () => void;
}) {
  const headingId = useId();
  const count = pending?.accounts.length ?? 0;
  const busy = confirming || cancelling;

  return (
    <section
      aria-labelledby={headingId}
      aria-busy={!pending && !onRetry ? true : undefined}
      className="mb-4 rounded-lg border border-primary/25 bg-primary/5 p-4"
    >
      <h4 id={headingId} className="font-semibold text-balance text-foreground">
        Connect {count === 1 ? "this" : "these"} to {workspace}?
      </h4>
      {pending ? (
        <>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
            {pending.service_name} shared {count === 1 ? "this account" : "these accounts"}. Mindra saves{" "}
            {count === 1 ? "it" : "them"} and can post there once you connect.
          </p>
          <ul className="mt-3 divide-y divide-border rounded-lg border border-border bg-white">
            {pending.accounts.map((account) => (
              <li key={`${account.kind}-${account.username}-${account.name}`} className="flex px-3 py-2.5">
                <AccountSummary account={account} />
              </li>
            ))}
          </ul>
          {pending.notice && <p className="mt-3 text-sm text-pretty text-amber-800">{pending.notice}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={onConfirm} disabled={busy} className={buttonStyles()}>
              {confirming && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              Connect
            </button>
            <button type="button" onClick={onCancel} disabled={busy} className={buttonStyles({ variant: "secondary" })}>
              {cancelling && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              Cancel
            </button>
          </div>
        </>
      ) : onRetry ? null : (
        <div className="mt-3 space-y-2">
          <p role="status" className="sr-only">
            Loading what was shared
          </p>
          <div className="h-10 animate-pulse rounded-lg bg-white" />
          <div className="h-10 animate-pulse rounded-lg bg-white" />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-pretty text-red-600">
          {error} <SeePlans text={error} />
        </p>
      )}
      {onRetry && (
        <button type="button" onClick={onRetry} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })}>
          Try again
        </button>
      )}
    </section>
  );
}

/** Connecting a WordPress site: its address, a username and an application password made in WordPress. */
function WordPressDialog({
  open,
  onOpenChange,
  site: startSite,
  onConnected,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site: string;
  onConnected: (account: ConnectedAccount) => void;
}) {
  const ids = { site: useId(), username: useId(), password: useId(), help: useId() };
  const connect = useConnectWordPress();
  const [site, setSite] = useState(startSite);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const fieldErrors = connect.error instanceof ApiError ? connect.error.fieldErrors : {};
  const fieldError = (name: string) => fieldErrors[name]?.[0] ?? "";
  const generalError = connect.error && !fieldError("site") && !fieldError("username") && !fieldError("password") ? connect.error.message : "";

  useEffect(() => {
    if (open) {
      setSite(startSite);
      connect.reset();
    }
    // Each time it opens.
  }, [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (connect.isPending) return;
    connect.mutate(
      { site: site.trim(), username: username.trim(), password },
      {
        onSuccess: (account) => {
          setPassword("");
          onConnected(account);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={cn(popupClass, "w-[min(32rem,calc(100vw-2rem))]")}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="text-lg font-semibold text-balance text-foreground">Connect a WordPress site</Dialog.Title>
              <Dialog.Description id={ids.help} className="mt-1 text-sm text-pretty text-muted-foreground">
                In WordPress, open Users, then your profile, and under Application Passwords add one named “Mindra”.
                Paste it here: Mindra posts blog posts with it, and you can revoke it there at any time.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-1 -mr-2" })}>
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <label htmlFor={ids.site} className="mb-1.5 block text-sm font-medium text-foreground">
                Site address
              </label>
              <input
                id={ids.site}
                type="url"
                inputMode="url"
                autoComplete="url"
                value={site}
                disabled={connect.isPending}
                placeholder="https://yoursite.com"
                aria-invalid={fieldError("site") ? true : undefined}
                onChange={(event) => setSite(event.target.value)}
                className={fieldClass}
              />
              {fieldError("site") && (
                <p role="alert" className="mt-1.5 text-xs text-pretty text-red-600">
                  {fieldError("site")}
                </p>
              )}
            </div>
            <div>
              <label htmlFor={ids.username} className="mb-1.5 block text-sm font-medium text-foreground">
                WordPress username
              </label>
              <input
                id={ids.username}
                type="text"
                autoComplete="username"
                value={username}
                disabled={connect.isPending}
                aria-invalid={fieldError("username") ? true : undefined}
                onChange={(event) => setUsername(event.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor={ids.password} className="mb-1.5 block text-sm font-medium text-foreground">
                Application password
              </label>
              <input
                id={ids.password}
                type="password"
                autoComplete="off"
                value={password}
                disabled={connect.isPending}
                placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                aria-invalid={fieldError("password") ? true : undefined}
                onChange={(event) => setPassword(event.target.value)}
                className={fieldClass}
              />
              <p className="mt-1.5 text-xs text-pretty text-muted-foreground">Not your WordPress password: the one WordPress makes for Mindra.</p>
            </div>
            {generalError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-pretty text-red-700">
                {generalError} <SeePlans error={connect.error} />
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-border pt-4">
              <Dialog.Close className={buttonStyles({ variant: "secondary" })}>Cancel</Dialog.Close>
              <button type="submit" disabled={connect.isPending || !site.trim() || !username.trim() || !password} className={buttonStyles()}>
                {connect.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                Connect site
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** A button for each service that's set up on the server. */
function ConnectButtons({
  services,
  connecting,
  onConnect,
  onWordPress,
  variant,
}: {
  services: SocialService[];
  connecting: string | null;
  onConnect: (service: SignInService) => void;
  onWordPress: () => void;
  variant: "primary" | "secondary";
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {services.map((service) => {
        const busy = connecting === `connect-${service.id}`;
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => (service.id === "wordpress" ? onWordPress() : onConnect(service.id))}
            disabled={connecting !== null}
            className={buttonStyles({ variant, size: "sm", className: "h-9" })}
          >
            {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
            {busy ? `Opening ${service.name}…` : service.name}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Settings → Connected accounts: connect the accounts Mindra posts to by itself (Facebook Pages and Instagram, YouTube,
 * LinkedIn, X, TikTok and WordPress sites), see them, reconnect one a service stopped accepting, or disconnect one.
 */
export default function ConnectedAccounts() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Back from a sign-in: /settings?pending=<id>#accounts (confirm it here), or ?connect_error=<message>.
  const [result] = useState(() => {
    const params = new URLSearchParams(location.search);
    return { error: params.get("connect_error") ?? "", pending: params.get("pending") ?? "" };
  });
  const accounts = useConnectedAccounts();
  const services = useSocialServices();
  const connect = useConnectService();
  const list = accounts.data ?? [];
  const available = (services.data ?? []).filter((service) => service.available);
  const clearAddress = () => navigate({ search: "", hash: location.hash }, { replace: true });
  const [wordPress, setWordPress] = useState<{ open: boolean; site: string }>({ open: false, site: "" });
  const [saved, setSaved] = useState<ConnectedAccount[] | null>(null);

  // Show the result once: take it out of the address so a reload doesn't show it again.
  useEffect(() => {
    if (result.error) clearAddress();
    // Only when the page opens.
  }, []);

  // ?pending=: what the service shared, saved only once the person confirms it.
  const pending = usePendingConnection(result.pending);
  const confirm = useConfirmPending();
  const cancel = useCancelPending();
  const [outcome, setOutcome] = useState<"" | "connected" | "cancelled">("");
  const [outcomeNotice, setOutcomeNotice] = useState("");
  const waiting = Boolean(result.pending) && !outcome;
  const expired = waiting && (is404(pending.error) || is404(confirm.error));
  const nothingShared = waiting && !expired && pending.data?.accounts.length === 0;
  const askToConfirm = waiting && !expired && !nothingShared;
  const confirmPending = () =>
    confirm.mutate(result.pending, {
      onSuccess: ({ accounts: confirmed, notice }) => {
        setOutcome("connected");
        setOutcomeNotice(notice);
        setSaved(confirmed);
        clearAddress();
      },
    });
  const cancelPending = () => {
    const done = () => {
      setOutcome("cancelled");
      clearAddress();
    };
    // Already gone: nothing was connected either way.
    cancel.mutate(result.pending, { onSuccess: done, onError: (error) => is404(error) && done() });
  };
  const panelError =
    pending.error?.message ||
    (confirm.error && !expired ? confirm.error.message : "") ||
    (cancel.error && !is404(cancel.error) ? cancel.error.message : "");
  // Nothing left to decide: take ?pending= out of the address.
  useEffect(() => {
    if (expired || nothingShared) clearAddress();
  }, [expired, nothingShared]);

  const connectError = connect.error;
  const connecting = connect.isPending ? connect.variables.source : null;
  const startConnect = (service: SignInService, source: string) => connect.mutate({ service, source });
  const reconnect = (account: ConnectedAccount) => {
    const service = ACCOUNT_KINDS[account.kind].service;
    if (service === "wordpress") setWordPress({ open: true, site: account.profile_url });
    else startConnect(service, `account-${account.id}`);
  };
  const buttons = (variant: "primary" | "secondary") =>
    available.length > 0 ? (
      <ConnectButtons
        services={available}
        connecting={connecting}
        onConnect={(service) => startConnect(service, `connect-${service}`)}
        onWordPress={() => setWordPress({ open: true, site: "" })}
        variant={variant}
      />
    ) : services.isPending ? null : (
      <p className="text-sm text-pretty text-muted-foreground">Automatic posting isn't set up yet. Until it is, Mindra reminds you at each post's time.</p>
    );

  return (
    <div>
      <p className="mb-4 text-sm text-pretty text-muted-foreground">
        Connect your accounts and Mindra posts for you at each post's time: when you schedule a post, turn on “Post
        automatically”. Posts for other places (WhatsApp, newsletters) still get a reminder, and so does a post without
        the video or photos its platform needs.
      </p>

      <ConnectResult error={result.error} saved={outcome === "connected" ? saved : null} service={pending.data?.service ?? ""} notice={outcomeNotice} />
      {outcome === "cancelled" && (
        <p role="status" className="mb-4 rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-pretty text-foreground">
          Nothing was connected.
        </p>
      )}
      {askToConfirm && (
        <PendingPanel
          pending={pending.data}
          workspace={user?.workspaces[0]?.name ?? "your workspace"}
          onConfirm={confirmPending}
          onCancel={cancelPending}
          confirming={confirm.isPending}
          cancelling={cancel.isPending}
          error={panelError}
          onRetry={pending.isError ? () => pending.refetch() : undefined}
        />
      )}
      {(expired || nothingShared) && (
        <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-pretty text-amber-800">
          <p>
            {expired
              ? "This connection link has expired or isn't yours. Connect again."
              : `${pending.data?.service_name ?? "The service"} didn't share an account Mindra can post to. Connect again.`}
          </p>
          {nothingShared && pending.data?.notice && <p className="mt-0.5">{pending.data.notice}</p>}
        </div>
      )}

      {accounts.isPending ? (
        <div aria-busy="true" className="space-y-3">
          <p role="status" className="sr-only">
            Loading connected accounts
          </p>
          {[0, 1].map((index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="size-10 animate-pulse rounded-full bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                <div className="h-2.5 w-1/4 animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : accounts.isError ? (
        <div>
          <p role="alert" className="text-sm text-pretty text-red-600">
            {accounts.error.message}
          </p>
          <button type="button" onClick={() => accounts.refetch()} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })}>
            Try again
          </button>
        </div>
      ) : list.length === 0 ? (
        !waiting && (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">No accounts connected yet</p>
            <p className="mx-auto mt-1 mb-4 max-w-sm text-sm text-pretty text-muted-foreground">
              Choose where Mindra can post for you. You sign in on each service and choose what to share.
            </p>
            <div className="flex justify-center">{buttons("secondary")}</div>
          </div>
        )
      ) : (
        <>
          <ul className="divide-y divide-border">
            {list.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onReconnect={() => reconnect(account)}
                reconnecting={connecting === `account-${account.id}`}
              />
            ))}
          </ul>
          {!waiting && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="mb-2 text-sm font-medium text-foreground">Connect another account</p>
              {buttons("secondary")}
            </div>
          )}
        </>
      )}

      {connectError && (
        <p role="alert" className="mt-3 text-sm text-pretty text-red-600">
          {connectError.message}
        </p>
      )}

      {list.length > 0 && (
        <p className="mt-4 text-xs text-pretty text-muted-foreground">
          Disconnecting deletes Mindra's access to that account. You can also remove Mindra in each service's own settings
          (for a WordPress site, revoke its application password).
        </p>
      )}

      <WordPressDialog
        open={wordPress.open}
        site={wordPress.site}
        onOpenChange={(open) => setWordPress((current) => ({ ...current, open }))}
        onConnected={(account) => {
          setSaved([account]);
          setOutcome("connected");
          setOutcomeNotice("");
        }}
      />
    </div>
  );
}
