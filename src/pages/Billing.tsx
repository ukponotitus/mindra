import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import { Check, CreditCard, LoaderCircle, Minus } from "lucide-react";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import {
  naira,
  recordingAllowance,
  useBilling,
  useChangeCard,
  useChangeRenewal,
  useCheckPayment,
  useCheckout,
  type BillingInterval,
  type BillingOverview,
  type BillingPayment,
  type BillingSubscription,
  type PricingPlan,
} from "../lib/billing";
import { formatDayLong } from "../lib/calendar";
import { cn } from "../lib/cn";
import { CONTACT_EMAIL } from "../lib/legal";

/** "Saturday 30 November" for a YYYY-MM-DD day, in the browser's time zone. */
function dayText(day: string, minusDays = 0) {
  const [year, month, date] = day.split("-").map(Number);
  return formatDayLong(new Date(year, month - 1, date - minusDays));
}

function when(value: string | null) {
  return value ? formatDayLong(new Date(value)) : "";
}

/** The plan a workspace goes back to at `moment` (now when null): Beta during the beta, Free after it. */
function fallbackAt(billing: BillingOverview, moment: string | null) {
  if (!billing.in_beta) return "Free";
  if (!billing.beta_ends_on) return "Beta";
  const [year, month, date] = billing.beta_ends_on.split("-").map(Number);
  return (moment ? new Date(moment) : new Date()) < new Date(year, month - 1, date) ? "Beta" : "Free";
}

/** The plan a given or paid one gives way to when it ends. */
function afterwards(billing: BillingOverview) {
  return billing.ends_at ? fallbackAt(billing, billing.ends_at) : "Free";
}

function paidNote(billing: BillingOverview, subscription: BillingSubscription) {
  const end = when(subscription.period_end);
  if (subscription.status === "active") {
    const per = subscription.interval === "yearly" ? "a year" : "a month";
    return `Paid with Paystack: ${naira(subscription.amount)} ${per}, renewing by itself on ${end}.`;
  }
  if (subscription.status === "cancelled") {
    return `Cancelled: your workspace keeps ${subscription.plan_name} until ${end}, then moves to the ${afterwards(billing)} plan. Nothing you've made is removed.`;
  }
  return `Paystack couldn't take the renewal on ${end}. ${subscription.plan_name} keeps working until ${when(subscription.plan_ends_at)}; change the card or pay now to keep it.`;
}

/** Where the plan comes from and how long it lasts, in a sentence. */
function planNote(billing: BillingOverview) {
  const until = billing.ends_at ? formatDayLong(new Date(billing.ends_at)) : "";
  switch (billing.source) {
    case "beta":
      return billing.beta_ends_on
        ? `Everything is free while Mindra is in beta, until ${dayText(billing.beta_ends_on, 1)}. After that the Free plan stays free, and paid plans start at ${naira(5000)} a month.`
        : "Everything is free while Mindra is in beta.";
    case "given":
      return until
        ? `Mindra gave your workspace this plan until ${until}. After that it's on the ${afterwards(billing)} plan.`
        : "Mindra gave your workspace this plan, with no end date.";
    case "paid":
      if (billing.payments.subscription) return paidNote(billing, billing.payments.subscription);
      return until ? `Paid until ${until}. After that it's on the ${afterwards(billing)} plan.` : "Paid for.";
    default:
      return "The Free plan. Upgrade for more hours, clips without the watermark and posting to your accounts.";
  }
}

function Meter({ label, used, limit, detail }: { label: string; used: number; limit: number | null; detail: string }) {
  const share = limit ? Math.min(1, used / limit) : 0;
  const full = limit != null && used >= limit;
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className={cn("text-sm tabular-nums", full ? "font-medium text-amber-700" : "text-muted-foreground")}>
          {limit == null ? `${used.toLocaleString(undefined, { maximumFractionDigits: 2 })} · no limit` : `${used.toLocaleString(undefined, { maximumFractionDigits: 2 })} of ${limit.toLocaleString()}`}
        </p>
      </div>
      {limit != null && limit > 0 && (
        <div
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={limit}
          aria-valuenow={Math.min(used, limit)}
          className="mt-3 h-2 overflow-hidden rounded-full bg-secondary"
        >
          <div
            className={cn("h-full w-full origin-left transition-transform duration-200 ease-out", full ? "bg-amber-500" : "bg-primary")}
            style={{ transform: `scaleX(${share})` }}
          />
        </div>
      )}
      <p className="mt-2 text-xs text-pretty text-muted-foreground">{detail}</p>
    </div>
  );
}

function PlanCard({ plan, current, interval, action }: { plan: PricingPlan; current: boolean; interval: BillingInterval; action?: ReactNode }) {
  const yearly = interval === "yearly" && plan.monthly_price > 0;
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-xl border bg-white p-5",
        current ? "border-primary ring-2 ring-primary/20" : plan.recommended ? "border-primary/40" : "border-border",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-semibold text-foreground">{plan.name}</h4>
        {current ? (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Your plan</span>
        ) : (
          plan.recommended && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-foreground">Recommended</span>
        )}
      </div>
      {plan.tagline && <p className="mt-1 min-h-10 text-sm text-pretty text-muted-foreground">{plan.tagline}</p>}
      <p className="mt-3 text-2xl font-semibold text-foreground tabular-nums">
        {naira(yearly ? plan.yearly_price : plan.monthly_price)}
        <span className="ml-1 text-sm font-normal text-muted-foreground">{yearly ? "/year" : "/month"}</span>
      </p>
      <p className="mt-0.5 h-4 text-xs text-muted-foreground tabular-nums">
        {plan.monthly_price > 0 ? (yearly ? "2 months free" : `or ${naira(plan.yearly_price)} a year (2 months free)`) : ""}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm">
        <li className="flex gap-2 text-foreground">
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          {recordingAllowance(plan.hours_per_month)}
        </li>
        {plan.features.map(({ text, soon, included }) => {
          const Icon = included ? Check : Minus;
          return (
            <li key={text} className={cn("flex gap-2", soon || !included ? "text-muted-foreground" : "text-foreground")}>
              <Icon aria-hidden="true" className={cn("mt-0.5 size-4 shrink-0", soon || !included ? "text-gray-300" : "text-primary")} />
              <span>
                {text}
                {soon && <span className="ml-1.5 rounded-full bg-secondary px-1.5 py-px text-[10px] font-medium text-muted-foreground">Soon</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {action}
    </article>
  );
}

function PaymentList({ payments }: { payments: BillingPayment[] }) {
  if (payments.length === 0) {
    return <p className="rounded-xl border border-dashed border-border bg-white px-4 py-6 text-center text-sm text-muted-foreground">No payments yet.</p>;
  }
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-white">
      {payments.map((payment) => (
        <li key={payment.reference} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-1 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">
              {payment.plan_name}, {payment.interval}
            </p>
            <p className="text-xs text-pretty text-muted-foreground">
              Paid {when(payment.paid_at)}
              {payment.period_end ? `, for the period until ${when(payment.period_end)}` : ""}
            </p>
          </div>
          <div className="min-w-0 sm:text-right">
            <p className="text-sm font-medium text-foreground tabular-nums">{naira(payment.amount)}</p>
            <p className="text-xs break-all text-muted-foreground">
              {payment.card || payment.channel || "Paystack"} · {payment.reference}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

type Notice = { tone: "ok" | "info" | "problem"; text: string; reference?: string };

const NOTICE_STYLES: Record<Notice["tone"], string> = {
  ok: "border-primary/30 bg-primary/5 text-foreground",
  info: "border-border bg-secondary text-foreground",
  problem: "border-red-200 bg-red-50 text-red-800",
};

/** Billing: the workspace's plan, what it has used this month, paying for a plan through Paystack, and the plans. */
export default function Billing() {
  const billing = useBilling();
  const checkout = useCheckout();
  const checkPayment = useCheckPayment();
  const renewal = useChangeRenewal();
  const card = useChangeCard();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [chosenInterval, setChosenInterval] = useState<BillingInterval | null>(null);
  const returned = useRef(false);

  function check(reference: string) {
    setNotice({ tone: "info", text: "Checking your payment with Paystack…" });
    checkPayment.mutate(reference, {
      onSuccess: ({ status, plan_name }) => {
        if (status === "paid") setNotice({ tone: "ok", text: `Payment received. Your workspace is on the ${plan_name} plan now.` });
        else if (status === "pending")
          setNotice({ tone: "info", text: "Paystack is still processing your payment. Check again in a minute.", reference });
        else setNotice({ tone: "problem", text: "The payment didn't go through, so nothing was charged and your plan hasn't changed." });
      },
      onError: (error) => setNotice({ tone: "problem", text: error.message, reference }),
    });
  }

  // Back from Paystack's checkout: with the payment's reference, or from its "Cancel payment".
  useEffect(() => {
    if (returned.current) return;
    const reference = searchParams.get("reference") ?? searchParams.get("trxref");
    const left = searchParams.get("checkout") === "cancelled";
    if (!reference && !left) return;
    returned.current = true;
    setSearchParams({}, { replace: true });
    if (reference) check(reference);
    else setNotice({ tone: "info", text: "You left Paystack's page before paying, so nothing was charged." });
  }, [searchParams]);

  if (billing.isPending) {
    return (
      <div aria-busy="true" className="space-y-6">
        <p role="status" className="sr-only">
          Loading your plan
        </p>
        <div className="h-8 w-48 animate-pulse rounded bg-secondary" />
        <div className="h-32 animate-pulse rounded-xl bg-secondary" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="h-64 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    );
  }
  if (billing.isError) {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
        {billing.error.message}
      </p>
    );
  }

  const data = billing.data;
  const plan = data.plan;
  const usage = data.usage;
  const accountsLimit = usage.connected_accounts_limit;
  const { available, can_manage: canManage, subscription, invoices } = data.payments;
  const pay = available && canManage;
  const interval = chosenInterval ?? subscription?.interval ?? "monthly";
  const busy = checkout.isPending || renewal.isPending || card.isPending;
  const actionError = [checkout.error, renewal.error, card.error].find(Boolean);

  /** Before another change: the last one's message and errors go. */
  function fresh() {
    setNotice(null);
    checkout.reset();
    renewal.reset();
    card.reset();
  }

  function choose(item: PricingPlan, period: BillingInterval) {
    fresh();
    checkout.mutate({ workspace: data.workspace, plan: item.id, interval: period });
  }

  /** The button on a paid plan's card: choose it, or switch to it from the plan paid for now. */
  function planAction(item: PricingPlan): ReactNode {
    if (!pay || item.monthly_price === 0) return null;
    const own = subscription?.plan === item.id && subscription.interval === interval;
    if (own && subscription.status !== "past_due") return null;
    const label = own
      ? "Pay now"
      : !subscription
        ? `Choose ${item.name}`
        : subscription.plan === item.id
          ? `Pay ${interval} instead`
          : `Switch to ${item.name}`;
    const working = checkout.isPending && checkout.variables?.plan === item.id;
    const button = (onClick?: () => void) => (
      <button
        type="button"
        disabled={busy}
        onClick={onClick}
        className={buttonStyles({ variant: item.recommended || own ? "primary" : "secondary", className: "mt-5 w-full" })}
      >
        {working && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        {label}
      </button>
    );
    if (!subscription || own) return button(() => choose(item, interval));
    const price = interval === "yearly" ? item.yearly_price : item.monthly_price;
    return (
      <ConfirmDialog
        tone="primary"
        trigger={button()}
        title={`${item.name}, paid ${interval}?`}
        description={`You'll pay ${naira(price)} on Paystack's page, and ${item.name} starts once it's paid. Your ${subscription.plan_name} plan (${subscription.interval}) ends then, and what's left of its period isn't refunded.`}
        confirmLabel="Continue to Paystack"
        cancelLabel="Not now"
        onConfirm={() => choose(item, interval)}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Billing</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Your plan, what you've used this month, and the plans.</p>
      </div>

      {notice && (
        <div role="status" className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm text-pretty", NOTICE_STYLES[notice.tone])}>
          <p className="flex items-center gap-2">
            {checkPayment.isPending && <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin" />}
            {notice.text}
          </p>
          {notice.reference && !checkPayment.isPending && (
            <button type="button" onClick={() => check(notice.reference!)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Check again
            </button>
          )}
        </div>
      )}

      <section aria-labelledby="current-plan" className="rounded-xl border border-border bg-white p-5">
        <div className="flex items-start gap-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <CreditCard aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <h3 id="current-plan" className="text-lg font-semibold text-foreground">
              {plan.name} plan
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">{planNote(data)}</p>
            {pay && subscription && (
              <div className="mt-4 flex flex-wrap gap-2">
                {subscription.status === "cancelled" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      fresh();
                      renewal.mutate({ workspace: data.workspace, action: "resume" });
                    }}
                    className={buttonStyles({ size: "sm" })}
                  >
                    {renewal.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                    Keep {subscription.plan_name}
                  </button>
                )}
                {subscription.status === "past_due" && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => choose(data.plans.find((item) => item.id === subscription.plan) ?? plan, subscription.interval)}
                    className={buttonStyles({ size: "sm" })}
                  >
                    {checkout.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                    Pay now
                  </button>
                )}
                {subscription.status !== "cancelled" && (
                  <>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        fresh();
                        card.mutate(data.workspace);
                      }}
                      className={buttonStyles({ variant: "secondary", size: "sm" })}
                    >
                      {card.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                      Change card
                    </button>
                    <ConfirmDialog
                      trigger={
                        <button type="button" disabled={busy} className={buttonStyles({ variant: "danger-outline", size: "sm" })}>
                          Cancel plan
                        </button>
                      }
                      title={`Cancel ${subscription.plan_name}?`}
                      description={
                        subscription.status === "past_due"
                          ? `Its renewal wasn't paid, so your workspace moves to the ${fallbackAt(data, null)} plan now. Nothing you've made is removed.`
                          : `It won't renew. Your workspace keeps ${subscription.plan_name} until ${when(subscription.period_end)}, then moves to the ${fallbackAt(data, subscription.period_end)} plan. Nothing you've made is removed.`
                      }
                      confirmLabel="Cancel plan"
                      cancelLabel="Keep it"
                      onConfirm={() => {
                        fresh();
                        renewal.mutate({ workspace: data.workspace, action: "cancel" });
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {usage.hours_limit != null && usage.hours_limit < 1 ? (
            <Meter
              label="Minutes of video this month"
              used={Math.round(usage.hours_used * 60)}
              limit={Math.round(usage.hours_limit * 60)}
              detail={`More recording time from ${dayText(usage.resets_on)}. Pasted transcripts don't count.`}
            />
          ) : (
            <Meter
              label="Hours of video this month"
              used={usage.hours_used}
              limit={usage.hours_limit}
              detail={`More recording time from ${dayText(usage.resets_on)}. Pasted transcripts don't count.`}
            />
          )}
          <Meter
            label="Connected accounts"
            used={usage.connected_accounts}
            limit={accountsLimit}
            detail={accountsLimit === 0 ? "This plan doesn't post to accounts by itself: you get a reminder at each post's time." : "Accounts Mindra posts to by itself."}
          />
          <Meter
            label="AI-generated posts this month"
            used={usage.posts_used}
            limit={usage.posts_limit}
            detail={`Each post Mindra writes counts, deleted or not. Rewrites and suggestions don't. More from ${dayText(usage.resets_on)}.`}
          />
          <Meter
            label="Clips this month"
            used={usage.clips_used}
            limit={usage.clips_limit}
            detail={[
              plan.clips_per_recording == null ? "Each clip counts the first time it's made" : `Up to ${plan.clips_per_recording} from each recording`,
              plan.watermark ? ", with a small “Made with Mindra” mark." : ", without a watermark.",
              plan.max_recording_minutes != null ? ` Recordings up to ${Math.round(plan.max_recording_minutes)} minutes long.` : "",
            ].join("")}
          />
          <Meter
            label="Image or flyer projects this month"
            used={usage.picture_projects_used}
            limit={usage.picture_projects_limit}
            detail="Photo and flyer posts started this month. Adding pictures to one doesn't count."
          />
        </div>
      </section>

      <section aria-labelledby="all-plans" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h3 id="all-plans" className="text-lg font-semibold text-foreground">
              Plans
            </h3>
            {!available ? (
              <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
                Paying online is coming soon. To move to a paid plan before then, email{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Mindra plan")}`}
                  className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            ) : !canManage ? (
              <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">Only the workspace's owner or an admin can change its plan.</p>
            ) : (
              <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
                Pay by card on Paystack's secure page. A paid plan starts as soon as it's paid and renews by itself each{" "}
                {interval === "yearly" ? "year" : "month"} until you cancel; cancelling keeps it until the end of the period paid for.
                {data.in_beta && " During the beta, paying moves your workspace to the plan you choose from today."}
              </p>
            )}
          </div>
          {pay && (
            <div role="group" aria-label="How often to pay" className="inline-flex rounded-lg bg-secondary p-1">
              {(
                [
                  ["monthly", "Monthly"],
                  ["yearly", "Yearly · 2 months free"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={interval === id}
                  onClick={() => setChosenInterval(id)}
                  className={cn(
                    "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    interval === id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
        {actionError && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
            {actionError.message}
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.plans.map((item) => (
            <PlanCard key={item.id} plan={item} current={item.id === plan.id} interval={pay ? interval : "monthly"} action={planAction(item)} />
          ))}
        </div>
        {!available && (
          <a
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Upgrading my Mindra plan")}`}
            className={buttonStyles({ variant: "secondary", className: "w-fit" })}
          >
            Ask about upgrading
          </a>
        )}
      </section>

      {(available || invoices.length > 0) && (
        <section aria-labelledby="payments" className="space-y-4">
          <div>
            <h3 id="payments" className="text-lg font-semibold text-foreground">
              Payments
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
              Every payment for this workspace's plan, newest first. Quote the reference if you ask us about one.
            </p>
          </div>
          <PaymentList payments={invoices} />
        </section>
      )}
    </div>
  );
}
