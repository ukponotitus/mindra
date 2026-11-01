import { CalendarClock } from "lucide-react";
import { Link } from "react-router";
import { useBilling, type PricingPlan } from "../../lib/billing";
import { addDays, parseDayKey } from "../../lib/calendar";

// Home's note on full access, first on the page in the brand colour: until when, how many days are left and what happens
// after, so nobody has to guess. For everyone during the launch offer, and for a new account's first week after it;
// nothing on a given or paid plan.

const longDay = (date: Date) => date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

function hours(value: number) {
  if (value < 1) return `${Math.round(value * 60)} minutes`;
  return `${value} hour${value === 1 ? "" : "s"}`;
}

/** "10 AI-written posts, 1 hour of recordings and 3 clips a month, with Mindra's mark on clips". */
function allowances(plan: PricingPlan | undefined) {
  if (!plan) return "smaller monthly allowances";
  const parts = [
    plan.posts_per_month != null && `${plan.posts_per_month} AI-written posts`,
    plan.hours_per_month != null && `${hours(plan.hours_per_month)} of recordings`,
    plan.clips_per_month != null && `${plan.clips_per_month} clips`,
  ].filter(Boolean) as string[];
  if (!parts.length) return "smaller monthly allowances";
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts[0];
  return `${list} a month${plan.watermark ? ", with Mindra's mark on clips" : ""}`;
}

export default function AccessBanner() {
  const billing = useBilling().data;
  if (!billing) return null;
  // The last day with everything open, in the browser's time.
  let lastDay: Date | null = null;
  if (billing.source === "beta") {
    const after = parseDayKey(billing.beta_ends_on);
    lastDay = after ? addDays(after, -1) : null;
  } else if (billing.source === "trial" && billing.ends_at) {
    const ends = new Date(billing.ends_at);
    lastDay = new Date(ends.getFullYear(), ends.getMonth(), ends.getDate());
  }
  if (!lastDay) return null;
  const today = new Date();
  const left = Math.round((lastDay.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000) + 1;
  if (left < 1) return null;
  const free = billing.plans.find((plan) => plan.id === "free");
  const trial = billing.source === "trial";

  return (
    <section aria-labelledby="access-banner" className="flex flex-col gap-4 rounded-xl bg-primary p-5 text-primary-foreground sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-foreground/15">
        <CalendarClock aria-hidden="true" className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h3 id="access-banner" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-base font-semibold">
          {trial ? `Full access for your first week, until ${longDay(lastDay)}` : `Mindra is free in full until ${longDay(lastDay)}`}
          <span className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-xs font-medium tabular-nums">
            {left === 1 ? "Last day today" : `${left} days left`}
          </span>
        </h3>
        <p className="mt-1 text-sm text-pretty text-primary-foreground/90">
          {trial ? "Every feature is open while you get started." : "Every feature is open to everyone while Mindra is new."} From{" "}
          {longDay(addDays(lastDay, 1))} your workspace moves to the Free plan: {allowances(free)}. Everything you've made stays
          yours. To keep everything open, choose a plan before then.
        </p>
      </div>
      <Link
        to="/billing"
        className="shrink-0 self-start rounded-lg bg-primary-foreground px-3.5 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary-foreground/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground sm:self-center"
      >
        See the plans
      </Link>
    </section>
  );
}
