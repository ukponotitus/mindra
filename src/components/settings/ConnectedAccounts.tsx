import { useEffect, useId, useState, type ReactNode } from "react";
import { LoaderCircle, RefreshCw } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../auth/context";
import ConfirmDialog from "../ui/ConfirmDialog";
import { buttonStyles } from "../ui/button";
import { ApiError } from "../../lib/api";
import { initials } from "../../lib/format";
import {
  ACCOUNT_KINDS,
  accountName,
  useCancelPending,
  useConfirmPending,
  useConnectMeta,
  useConnectedAccounts,
  useDisconnectAccount,
  usePendingConnection,
} from "../../lib/social";
import type { ConnectedAccount, PendingConnection } from "../../lib/types";

type AccountLook = Pick<ConnectedAccount, "kind" | "name" | "username" | "picture_url">;

const is404 = (error: unknown) => error instanceof ApiError && error.status === 404;

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

/** Picture, name, and "Facebook Page" or "Instagram · @handle", plus anything after (such as a status). */
function AccountSummary({ account, children }: { account: AccountLook; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 basis-48 items-center gap-3">
      <AccountPicture account={account} />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{account.name}</p>
        <p className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
          <span>{ACCOUNT_KINDS[account.kind].label}</span>
          {account.username && <span className="min-w-0 truncate">· @{account.username}</span>}
          {children}
        </p>
      </div>
    </div>
  );
}

/**
 * What came back from Facebook (?connected=meta, a confirmed ?pending=, or ?connect_error=…): what Mindra can post to
 * now, or why it didn't work.
 */
function ConnectResult({
  connected,
  error,
  accounts,
  notice = "",
}: {
  connected: boolean;
  error: string;
  accounts: ConnectedAccount[] | undefined;
  /** Something the API said about the connection, such as a Page it left out. */
  notice?: string;
}) {
  if (error) {
    return (
      <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-700">
        <p className="font-medium">Couldn't connect to Facebook</p>
        <p className="mt-0.5">{error}</p>
      </div>
    );
  }
  if (!connected || !accounts) return null;

  const active = accounts.filter((account) => account.status === "active");
  if (active.length === 0) {
    return (
      <p role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-pretty text-amber-800">
        Facebook didn't share any Pages Mindra can post to. Connect again and choose at least one Page you manage.
      </p>
    );
  }
  const pages = active.filter((account) => account.kind === "facebook_page");
  const instagram = active.filter((account) => account.kind === "instagram");
  const names = active.map((account) => `${accountName(account)} (${ACCOUNT_KINDS[account.kind].label})`);
  return (
    <div role="status" className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-pretty text-emerald-800">
      <p className="font-medium">Connected. Mindra can post to {listOf(names)}.</p>
      {notice && <p className="mt-0.5">{notice}</p>}
      {pages.length > 0 && instagram.length === 0 && (
        <p className="mt-0.5">
          No Instagram business or creator account is linked to {pages.length === 1 ? "this Page" : "these Pages"}. To post to
          Instagram, link one to your Page, then connect again.
        </p>
      )}
    </div>
  );
}

function AccountRow({ account, onReconnect, reconnecting }: { account: ConnectedAccount; onReconnect: () => void; reconnecting: boolean }) {
  const disconnect = useDisconnectAccount();
  const needsReconnect = account.status === "needs_reconnect";

  return (
    <li className="py-3 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <AccountSummary account={account}>
          {needsReconnect && <span className="rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-800">Needs reconnecting</span>}
        </AccountSummary>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          {needsReconnect && (
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
          {account.last_error || "Facebook stopped accepting Mindra's access to this account."} Reconnect to post here again.
        </p>
      )}
      {disconnect.isError && (
        <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
          {disconnect.error.message}
        </p>
      )}
    </li>
  );
}

/**
 * Back from Facebook with ?pending=<id>: "Connect these to Grace Chapel?" with what Facebook shared. Nothing is saved
 * until the signed-in person presses Connect, so a link from someone else can't connect their accounts here.
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
            Facebook shared {count === 1 ? "this account" : "these accounts"}. Mindra saves {count === 1 ? "it" : "them"} and can post
            there once you connect.
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
            Loading what Facebook shared
          </p>
          <div className="h-10 animate-pulse rounded-lg bg-white" />
          <div className="h-10 animate-pulse rounded-lg bg-white" />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-pretty text-red-600">
          {error}
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

/**
 * Settings → Connected accounts: connect Facebook Pages and their linked Instagram professional accounts through
 * Facebook Login, see them, reconnect one Facebook stopped accepting, or disconnect one.
 */
export default function ConnectedAccounts() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  // Back from Facebook: /settings?pending=<id>#accounts (confirm it here), ?connected=meta, or ?connect_error=<message>.
  const [result] = useState(() => {
    const params = new URLSearchParams(location.search);
    return { connected: params.get("connected") === "meta", error: params.get("connect_error") ?? "", pending: params.get("pending") ?? "" };
  });
  const accounts = useConnectedAccounts();
  const connect = useConnectMeta();
  const list = accounts.data ?? [];
  const clearAddress = () => navigate({ search: "", hash: location.hash }, { replace: true });

  // Show the result once: take it out of the address so a reload doesn't show it again.
  useEffect(() => {
    if (result.connected || result.error) clearAddress();
    // Only when the page opens.
  }, []);

  // ?pending=: what Facebook shared, saved only once the person confirms it.
  const pending = usePendingConnection(result.pending);
  const confirm = useConfirmPending();
  const cancel = useCancelPending();
  const [outcome, setOutcome] = useState<"" | "connected" | "cancelled">("");
  const [outcomeNotice, setOutcomeNotice] = useState("");
  const waiting = Boolean(result.pending) && !outcome;
  const expired = waiting && (is404(pending.error) || is404(confirm.error));
  const nothingShared = waiting && !expired && pending.data?.accounts.length === 0;
  const askToConfirm = waiting && !expired && !nothingShared;
  // While it asks, or says why it can't, the Connect button is there and the list's own is hidden.
  const pendingShown = waiting;
  const confirmPending = () =>
    confirm.mutate(result.pending, {
      onSuccess: ({ notice }) => {
        setOutcome("connected");
        setOutcomeNotice(notice);
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
  const notSetUp = connectError instanceof ApiError && connectError.status === 400;
  const connectButton = (variant: "primary" | "secondary") => (
    <button
      type="button"
      onClick={() => connect.mutate("connect")}
      disabled={connect.isPending}
      className={buttonStyles({ variant })}
    >
      {connect.isPending && connect.variables === "connect" && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
      {connect.isPending && connect.variables === "connect" ? "Opening Facebook…" : "Connect Facebook and Instagram"}
    </button>
  );

  return (
    <div>
      <p className="mb-4 text-sm text-pretty text-muted-foreground">
        Mindra can post for you to Facebook Pages, and to Instagram business or creator accounts linked to a Page. When you
        schedule a Facebook or Instagram post, turn on "Post automatically" and it goes out at its time. Other platforms, and
        Instagram posts without a photo or video, still get a reminder.
      </p>

      <ConnectResult
        connected={result.connected || outcome === "connected"}
        error={result.error}
        accounts={accounts.data}
        notice={outcomeNotice}
      />
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
              : "Facebook didn't share any Pages Mindra can post to. Connect again and choose at least one Page you manage."}
          </p>
          {nothingShared && pending.data?.notice && <p className="mt-0.5">{pending.data.notice}</p>}
          <div className="mt-3">{connectButton("primary")}</div>
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
        !pendingShown && (
          <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
            <p className="text-sm font-medium text-foreground">No accounts connected yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-pretty text-muted-foreground">
              Sign in with Facebook to choose the Pages, and their linked Instagram accounts, that Mindra can post to.
            </p>
            <div className="mt-4">{connectButton("primary")}</div>
          </div>
        )
      ) : (
        <>
          <ul className="divide-y divide-border">
            {list.map((account) => (
              <AccountRow
                key={account.id}
                account={account}
                onReconnect={() => connect.mutate(String(account.id))}
                reconnecting={connect.isPending && connect.variables === String(account.id)}
              />
            ))}
          </ul>
          {!pendingShown && <div className="mt-4 border-t border-border pt-4">{connectButton("secondary")}</div>}
        </>
      )}

      {connectError && (
        <div role="alert" className="mt-3 text-sm text-pretty text-red-600">
          <p>{connectError.message}</p>
          {notSetUp && <p className="mt-0.5 text-muted-foreground">Until it is, Mindra reminds you at each post's time.</p>}
        </div>
      )}

      {list.length > 0 && (
        <p className="mt-4 text-xs text-pretty text-muted-foreground">
          Disconnecting deletes Mindra's access to that account. You can also remove Mindra in Facebook's settings, under
          Business integrations.
        </p>
      )}
    </div>
  );
}
