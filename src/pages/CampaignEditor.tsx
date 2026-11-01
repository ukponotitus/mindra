import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { Check, ChevronRight, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import PlatformBadge from "../components/content/PlatformBadge";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { useBrandProfile } from "../lib/brand";
import { addDays, dayKey } from "../lib/calendar";
import {
  SOURCE_LABELS,
  objectivesFor,
  useCampaign,
  useCampaignMetrics,
  useSaveCampaign,
  type CampaignChanges,
  type CampaignObjective,
  type CampaignTarget,
} from "../lib/campaigns";
import { cn } from "../lib/cn";
import type { Platform } from "../lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-60 aria-invalid:border-red-300";
const crumbLink = "rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Where campaigns' posts can go. */
const CAMPAIGN_PLATFORMS: Platform[] = ["instagram", "facebook", "tiktok", "whatsapp", "youtube_shorts", "youtube", "linkedin", "x"];
const MOST_TARGETS = 6;

type Form = {
  name: string;
  objective: CampaignObjective | "";
  offering: string;
  promoting: string;
  audience: string;
  starts_on: string;
  ends_on: string;
  platforms: Platform[];
  budget: string;
  main_message: string;
  link: string;
  targets: { metric: string; value: string }[];
};

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

function blank(): Form {
  const today = new Date();
  return {
    name: "",
    objective: "",
    offering: "",
    promoting: "",
    audience: "",
    starts_on: dayKey(today),
    ends_on: dayKey(addDays(today, 27)),
    platforms: ["instagram", "facebook", "whatsapp"],
    budget: "",
    main_message: "",
    link: "",
    targets: [{ metric: "link_clicks", value: "" }],
  };
}

/** A new campaign, or changes to one: its goal, what it promotes, dates, platforms, budget, message, link and targets. */
export default function CampaignEditor() {
  const { campaignId } = useParams();
  const ids = useId();
  const navigate = useNavigate();
  const existing = useCampaign(campaignId);
  const brand = useBrandProfile().data;
  const metrics = useCampaignMetrics().data ?? [];
  const save = useSaveCampaign();
  const [form, setForm] = useState<Form | null>(campaignId ? null : blank());

  useEffect(() => {
    const campaign = existing.data;
    if (campaign && !form) {
      setForm({
        ...campaign,
        offering: campaign.offering ?? "",
        budget: campaign.budget ? String(Number(campaign.budget)) : "",
        targets: campaign.targets.map((target) => ({ metric: target.metric, value: String(target.value) })),
      });
    }
  }, [existing.data, form]);

  if (!form) {
    return (
      <div aria-busy="true" className="max-w-3xl space-y-4">
        <p role="status" className="sr-only">
          Loading the campaign
        </p>
        <div className="h-8 w-60 animate-pulse rounded bg-secondary" />
        <div className="h-96 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }

  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {};
  const fieldError = (name: string) => {
    const value = fieldErrors[name];
    return Array.isArray(value) ? String(value[0]) : "";
  };
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((state) => (state ? { ...state, [key]: value } : state));
  const objectives = objectivesFor(brand?.organisation_type ?? "");
  const used = new Set(form.targets.map((target) => target.metric));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (save.isPending) return;
    const changes: CampaignChanges = {
      name: form.name,
      objective: (form.objective || undefined) as CampaignObjective | undefined,
      offering: form.offering || null,
      promoting: form.promoting,
      audience: form.audience,
      starts_on: form.starts_on,
      ends_on: form.ends_on,
      platforms: form.platforms,
      budget: form.budget.trim() ? form.budget.replace(/[^\d.]/g, "") : null,
      main_message: form.main_message,
      link: form.link,
      targets: form.targets.filter((target) => target.value.trim()).map((target): CampaignTarget => ({ metric: target.metric, value: Number(target.value.replace(/[^\d]/g, "")) })),
    };
    save.mutate({ id: campaignId, changes }, { onSuccess: (campaign) => navigate(`/campaigns/${campaign.id}`) });
  };

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-6">
      <div>
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <li className="shrink-0">
              <Link to="/campaigns" className={crumbLink}>
                Campaigns
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-4 shrink-0" />
            </li>
            <li className="min-w-0 truncate">{campaignId ? existing.data?.name : "New campaign"}</li>
          </ol>
        </nav>
        <h2 className="text-2xl font-semibold text-balance text-foreground">{campaignId ? "Change the campaign" : "New campaign"}</h2>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
        <Field id={`${ids}-name`} label="Name" error={fieldError("name")}>
          <input id={`${ids}-name`} value={form.name} maxLength={120} placeholder="e.g. November Sunscreen Push" onChange={(event) => set("name", event.target.value)} className={inputClass} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">What's it for?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {objectives.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={form.objective === option.id}
                onClick={() => set("objective", option.id)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  form.objective === option.id ? "border-primary bg-primary/5" : "border-border hover:bg-background",
                )}
              >
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="block text-xs text-pretty text-muted-foreground">{option.description}</span>
              </button>
            ))}
          </div>
          {fieldError("objective") && <p className="mt-1.5 text-sm text-red-600">Choose what the campaign is for.</p>}
        </fieldset>
        {brand && brand.offerings.length > 0 && (
          <Field id={`${ids}-offering`} label="What it promotes (optional)" hint="From your brand profile.">
            <select id={`${ids}-offering`} value={form.offering} onChange={(event) => set("offering", event.target.value)} className={cn(inputClass, "h-11 py-0")}>
              <option value="">Nothing in particular</option>
              {brand.offerings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                  {item.price ? ` (${item.price})` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field id={`${ids}-promoting`} label="The details posts must get right" hint="The offer, prices, dates, place and how to buy or register. Mindra copies these and never invents them." error={fieldError("promoting")}>
          <textarea id={`${ids}-promoting`} value={form.promoting} rows={3} maxLength={3000} onChange={(event) => set("promoting", event.target.value)} className={cn(inputClass, "resize-y")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${ids}-audience`} label="Who it's for" error={fieldError("audience")}>
            <input id={`${ids}-audience`} value={form.audience} maxLength={255} placeholder={brand?.audience || "e.g. Women aged 20 to 40 in Lagos"} onChange={(event) => set("audience", event.target.value)} className={inputClass} />
          </Field>
          <Field id={`${ids}-message`} label="Main message" error={fieldError("main_message")}>
            <input id={`${ids}-message`} value={form.main_message} maxLength={500} placeholder="e.g. Protect your skin every day" onChange={(event) => set("main_message", event.target.value)} className={inputClass} />
          </Field>
          <Field id={`${ids}-starts`} label="Starts on" error={fieldError("starts_on")}>
            <input id={`${ids}-starts`} type="date" value={form.starts_on} onChange={(event) => set("starts_on", event.target.value)} className={cn(inputClass, "tabular-nums")} />
          </Field>
          <Field id={`${ids}-ends`} label="Ends on" error={fieldError("ends_on")}>
            <input id={`${ids}-ends`} type="date" value={form.ends_on} min={form.starts_on} onChange={(event) => set("ends_on", event.target.value)} className={cn(inputClass, "tabular-nums")} />
          </Field>
          <Field id={`${ids}-link`} label="Where people should go (optional)" hint="Your shop, a form or a WhatsApp chat. Posts' links to it count their clicks." error={fieldError("link")}>
            <input id={`${ids}-link`} type="url" inputMode="url" value={form.link} maxLength={2000} placeholder="https://wa.me/234…" onChange={(event) => set("link", event.target.value)} className={inputClass} />
          </Field>
          <Field id={`${ids}-budget`} label="Budget in naira (optional)" hint="Only for working out cost per result. Mindra doesn't run paid ads." error={fieldError("budget")}>
            <input id={`${ids}-budget`} inputMode="decimal" value={form.budget} placeholder="e.g. 50000" onChange={(event) => set("budget", event.target.value)} className={cn(inputClass, "tabular-nums")} />
          </Field>
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">Where it goes</legend>
          <div className="flex flex-wrap gap-2">
            {CAMPAIGN_PLATFORMS.map((platform) => {
              const on = form.platforms.includes(platform);
              return (
                <button
                  key={platform}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set("platforms", on ? form.platforms.filter((item) => item !== platform) : [...form.platforms, platform])}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    on ? "border-primary bg-primary/5" : "border-border hover:bg-background",
                  )}
                >
                  {on && <Check aria-hidden="true" className="size-3.5 text-primary" strokeWidth={3} />}
                  <PlatformBadge platform={platform} />
                </button>
              );
            })}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby={`${ids}-targets`} className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
        <div>
          <h3 id={`${ids}-targets`} className="text-base font-semibold text-foreground">
            Targets
          </h3>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
            What success means, in numbers. Each one says where its number will come from, and they&apos;re never added together.
          </p>
        </div>
        <ul className="space-y-2">
          {form.targets.map((target, index) => {
            const source = metrics.find((metric) => metric.id === target.metric)?.source;
            return (
              <li key={index} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_auto] sm:items-center">
                <div className="min-w-0">
                  <label htmlFor={`${ids}-metric-${index}`} className="sr-only">
                    Number to aim for, target {index + 1}
                  </label>
                  <select
                    id={`${ids}-metric-${index}`}
                    value={target.metric}
                    onChange={(event) => set("targets", form.targets.map((item, at) => (at === index ? { ...item, metric: event.target.value } : item)))}
                    className={cn(inputClass, "h-10 py-0")}
                  >
                    {metrics
                      .filter((metric) => metric.id === target.metric || !used.has(metric.id))
                      .map((metric) => (
                        <option key={metric.id} value={metric.id}>
                          {metric.label} ({SOURCE_LABELS[metric.source].toLowerCase()})
                        </option>
                      ))}
                  </select>
                  {source && <p className="mt-1 text-xs text-muted-foreground">{SOURCE_LABELS[source]}</p>}
                </div>
                <div>
                  <label htmlFor={`${ids}-value-${index}`} className="sr-only">
                    Target {index + 1}
                  </label>
                  <input
                    id={`${ids}-value-${index}`}
                    inputMode="numeric"
                    value={target.value}
                    placeholder="e.g. 300"
                    onChange={(event) => set("targets", form.targets.map((item, at) => (at === index ? { ...item, value: event.target.value } : item)))}
                    className={cn(inputClass, "h-10 tabular-nums")}
                  />
                </div>
                <button type="button" aria-label={`Remove target ${index + 1}`} onClick={() => set("targets", form.targets.filter((_item, at) => at !== index))} className={buttonStyles({ variant: "ghost", size: "icon", className: "size-10 hover:bg-red-50 hover:text-red-600" })}>
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
        {fieldError("targets") && <p className="text-sm text-red-600">{fieldError("targets")}</p>}
        <button
          type="button"
          disabled={form.targets.length >= MOST_TARGETS || metrics.length === 0}
          onClick={() => set("targets", [...form.targets, { metric: metrics.find((metric) => !used.has(metric.id))?.id ?? "", value: "" }])}
          className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add a target
        </button>
      </section>

      {save.isError && !Object.keys(fieldErrors).length && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {save.error.message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={save.isPending} className={buttonStyles({ size: "lg" })}>
          {save.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}
          {save.isPending ? "Saving…" : campaignId ? "Save changes" : "Create campaign"}
        </button>
        <Link to={campaignId ? `/campaigns/${campaignId}` : "/campaigns"} className={buttonStyles({ variant: "ghost", size: "lg" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
