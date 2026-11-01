import { useState, type FormEvent, type ReactNode } from "react";
import { ChevronRight, LoaderCircle, Minus, Plus } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import PlatformBadge from "../components/content/PlatformBadge";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { addDays, dayKey } from "../lib/calendar";
import { useCreateCalendar, type NewCalendar } from "../lib/calendars";
import { useCampaigns } from "../lib/campaigns";
import { cn } from "../lib/cn";
import type { Platform } from "../lib/types";

// Starting a content calendar: its dates, how often to post where, a campaign if it's for one, and what to plan in the
// person's own words. The AI drafts the first version from that and the brand profile; the calendar's page shows it.

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-60 aria-invalid:border-red-300";
const crumbLink = "rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const PLATFORMS: Platform[] = ["instagram", "facebook", "tiktok", "whatsapp", "youtube_shorts", "youtube", "linkedin", "x"];
const MOST_A_WEEK = 21;

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 text-sm text-pretty text-red-600">{error}</p> : hint && <p className="mt-1.5 text-xs text-pretty text-muted-foreground">{hint}</p>}
    </div>
  );
}

function nextMonth() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const last = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  return { first, last };
}

export default function ContentCalendarNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const campaigns = useCampaigns();
  const create = useCreateCalendar();
  const month = nextMonth();
  // From Home's "Plan next month": the whole of next month, planned from what worked.
  const nextMonthPlan = params.get("next") === "1";
  const [form, setForm] = useState<NewCalendar>({
    name: month.first.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    starts_on: nextMonthPlan ? dayKey(month.first) : dayKey(addDays(new Date(), 1)),
    ends_on: dayKey(month.last),
    cadence: { instagram: 3 },
    instructions: "",
    campaign: params.get("campaign"),
    from_results: nextMonthPlan,
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const set = <K extends keyof NewCalendar>(key: K, value: NewCalendar[K]) => setForm((current) => ({ ...current, [key]: value }));
  const count = (platform: Platform) => form.cadence[platform] ?? 0;
  const setCount = (platform: Platform, value: number) => set("cadence", { ...form.cadence, [platform]: Math.max(0, Math.min(MOST_A_WEEK, value)) });

  const chosenCampaign = campaigns.data?.find((campaign) => campaign.id === form.campaign);
  const useCampaignDates = () => {
    if (!chosenCampaign) return;
    const today = dayKey(new Date());
    setForm((current) => ({
      ...current,
      name: chosenCampaign.name,
      starts_on: chosenCampaign.starts_on < today ? today : chosenCampaign.starts_on,
      ends_on: chosenCampaign.ends_on,
      cadence: Object.fromEntries(chosenCampaign.platforms.map((platform) => [platform, current.cadence[platform] || 3])),
    }));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setErrors({});
    try {
      const calendar = await create.mutateAsync({ ...form, cadence: Object.fromEntries(Object.entries(form.cadence).filter(([, value]) => value)) });
      navigate(`/content-calendar/${calendar.id}`);
    } catch (error) {
      if (error instanceof ApiError) setErrors(Object.keys(error.fieldErrors).length ? error.fieldErrors : { detail: [error.message] });
    }
  };

  const fieldError = (field: string) => errors[field]?.[0];

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link to="/content-calendar" className={crumbLink}>
          Content calendar
        </Link>
        <ChevronRight aria-hidden="true" className="size-4" />
        <span aria-current="page" className="text-foreground">
          New calendar
        </span>
      </nav>
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">New content calendar</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Say when, where and how often. Mindra drafts what goes out each day from your brand profile; you change it, ask for
          another version, and approve it. Nothing is written until then.
        </p>
      </div>

      <section className="space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6">
        <Field id="calendar-name" label="Name" error={fieldError("name")}>
          <input id="calendar-name" value={form.name} onChange={(event) => set("name", event.target.value)} className={inputClass} maxLength={120} required />
        </Field>

        {(campaigns.data?.length ?? 0) > 0 && (
          <Field id="calendar-campaign" label="For a campaign (optional)" hint="Most items then serve the campaign; regular content needs none.">
            <div className="flex flex-col gap-2 sm:flex-row">
              <select id="calendar-campaign" value={form.campaign ?? ""} onChange={(event) => set("campaign", event.target.value || null)} className={inputClass}>
                <option value="">No campaign</option>
                {campaigns.data?.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
              {chosenCampaign && (
                <button type="button" onClick={useCampaignDates} className={buttonStyles({ variant: "secondary", className: "shrink-0" })}>
                  Use its dates and platforms
                </button>
              )}
            </div>
          </Field>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="calendar-start" label="Starts on" error={fieldError("starts_on")}>
            <input id="calendar-start" type="date" value={form.starts_on} onChange={(event) => set("starts_on", event.target.value)} className={inputClass} required />
          </Field>
          <Field id="calendar-end" label="Ends on" hint="Up to 3 months." error={fieldError("ends_on")}>
            <input id="calendar-end" type="date" value={form.ends_on} onChange={(event) => set("ends_on", event.target.value)} className={inputClass} required />
          </Field>
        </div>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-foreground">Posts a week</legend>
          {fieldError("cadence") && <p className="mb-2 text-sm text-red-600">{fieldError("cadence")}</p>}
          <ul className="grid gap-2 sm:grid-cols-2">
            {PLATFORMS.map((platform) => {
              const value = count(platform);
              return (
                <li
                  key={platform}
                  className={cn("flex items-center justify-between gap-3 rounded-lg border px-3 py-2", value ? "border-primary/40 bg-primary/5" : "border-border")}
                >
                  <PlatformBadge platform={platform} />
                  <span className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCount(platform, value - 1)}
                      disabled={!value}
                      aria-label={`Fewer posts a week on ${platform}`}
                      className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
                    >
                      <Minus aria-hidden="true" className="size-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-foreground tabular-nums" aria-live="polite">
                      {value}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCount(platform, value + 1)}
                      aria-label={`More posts a week on ${platform}`}
                      className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
                    >
                      <Plus aria-hidden="true" className="size-4" />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <label className="flex items-start gap-2.5 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.from_results}
            onChange={(event) => set("from_results", event.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-primary"
          />
          <span>
            Plan from what worked
            <span className="block text-xs text-muted-foreground">Mindra looks at how your posts did in the last 28 days and plans more of what worked.</span>
          </span>
        </label>

        <Field
          id="calendar-instructions"
          label="What should it plan?"
          hint="In your words: what to focus on, dates to avoid, events, offers. Prices and dates are copied, never invented."
          error={fieldError("instructions")}
        >
          <textarea
            id="calendar-instructions"
            value={form.instructions}
            onChange={(event) => set("instructions", event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="e.g. Mostly the sunscreen launch, keep my weekly skincare tips, a giveaway on the 15th"
            className={inputClass}
          />
        </Field>
      </section>

      {fieldError("detail") && (
        <p role="alert" className="text-sm text-red-600">
          {fieldError("detail")}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={create.isPending} className={buttonStyles()}>
          {create.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
          Draft the calendar
        </button>
        <Link to="/content-calendar" className={buttonStyles({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
