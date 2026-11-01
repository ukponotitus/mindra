import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Check, LoaderCircle, Plus, Sparkles, Trash2, Upload, X } from "lucide-react";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import {
  MOST_COLOURS,
  MOST_PILLARS,
  OFFERING_KINDS,
  ORGANISATION_TYPES,
  SOCIALS,
  organisationType,
  useBrandProfile,
  useFillBrand,
  useSaveBrandProfile,
  type BrandAsset,
  type BrandProfile,
  type BrandSuggestions,
  type Offering,
  type OrganisationType,
} from "../lib/brand";
import { cn } from "../lib/cn";
import { TONES } from "../lib/content";
import { useStudioAssets, useUploadAsset } from "../lib/studio";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-60 aria-invalid:border-red-300";
const cardClass = "rounded-xl border border-border bg-white p-5 sm:p-6";

type Form = Omit<BrandProfile, "id" | "filled" | "updated_at">;

function Section({ id, title, hint, children }: { id: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cardClass}>
      <h3 id={id} className="text-base font-semibold text-foreground">
        {title}
      </h3>
      {hint && <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: ReactNode; hint?: string; error?: string; children: ReactNode }) {
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

/** Pictures from the workspace's uploads, or new ones: one for the logo, several for photos. */
function ImageChooser({ chosen, onChange, most, label }: { chosen: BrandAsset[]; onChange: (assets: BrandAsset[]) => void; most: number; label: string }) {
  const assets = useStudioAssets();
  const upload = useUploadAsset();
  const file = useRef<HTMLInputElement>(null);
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState("");
  const images = (assets.data?.results ?? []).filter((asset) => asset.kind === "image" && asset.status === "ready" && !asset.library);
  const ids = chosen.map((asset) => asset.id);

  const pick = (asset: BrandAsset) => {
    if (ids.includes(asset.id)) onChange(chosen.filter((item) => item.id !== asset.id));
    else onChange(most === 1 ? [asset] : [...chosen, asset].slice(0, most));
  };

  const send = async (files: FileList | null) => {
    setProblem("");
    for (const picked of Array.from(files ?? []).slice(0, most)) {
      setSending(true);
      try {
        const asset = await upload.mutateAsync({ file: picked });
        if (asset.status === "ready") pick({ id: asset.id, name: asset.name, url: asset.url, thumbnail_url: asset.thumbnail_url, width: asset.width, height: asset.height });
      } catch (error) {
        setProblem(error instanceof Error ? error.message : "Couldn't upload this picture.");
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <div>
      <input
        ref={file}
        type="file"
        multiple={most > 1}
        accept="image/jpeg,image/png,image/webp,image/heic,.heic,.heif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void send(event.target.files);
          event.target.value = "";
        }}
      />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={sending} onClick={() => file.current?.click()} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
          {sending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Upload aria-hidden="true" className="size-4" />}
          {sending ? "Uploading…" : `Upload ${most === 1 ? "a picture" : "pictures"}`}
        </button>
        <span className="text-xs text-muted-foreground tabular-nums">{most === 1 ? (chosen.length ? "Chosen" : "None chosen") : `${chosen.length} of up to ${most} chosen`}</span>
      </div>
      {problem && <p className="mt-2 text-sm text-pretty text-red-600">{problem}</p>}
      {images.length > 0 && (
        <ul aria-label={label} className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.slice(0, 60).map((asset) => {
            const on = ids.includes(asset.id);
            return (
              <li key={asset.id} className="shrink-0">
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={asset.name}
                  title={asset.name}
                  disabled={!on && most > 1 && chosen.length >= most}
                  onClick={() => pick({ id: asset.id, name: asset.name, url: asset.url, thumbnail_url: asset.thumbnail_url, width: asset.width, height: asset.height })}
                  className={cn(
                    "relative block size-16 overflow-hidden rounded-lg border-2 bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
                    on ? "border-primary" : "border-transparent hover:border-border",
                  )}
                >
                  {asset.thumbnail_url && <img src={asset.thumbnail_url} alt="" className="size-full object-cover" />}
                  {on && (
                    <span className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-primary text-white">
                      <Check aria-hidden="true" className="size-2.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Suggestions from pasted words or a website, field by field, to apply or leave. */
function FillPanel({ onApply, open }: { onApply: (suggestions: Partial<BrandSuggestions>) => void; open: boolean }) {
  const ids = useId();
  const fill = useFillBrand();
  const [text, setText] = useState("");
  const [website, setWebsite] = useState("");
  const [take, setTake] = useState<Record<string, boolean>>({});
  const found = fill.data;
  const rows = useMemo(() => {
    if (!found) return [];
    const list: { key: keyof BrandSuggestions; label: string; value: string }[] = [];
    const add = (key: keyof BrandSuggestions, label: string, value: string) => value && list.push({ key, label, value });
    add("organisation_type", "Kind", found.organisation_type ? organisationType(found.organisation_type).label : "");
    add("name", "Name", found.name);
    add("about", "What you do", found.about);
    add("audience", "Audience", found.audience);
    add("location", "Location", found.location);
    add("website", "Website", found.website);
    add("whatsapp", "WhatsApp", found.whatsapp);
    add("tone", "Tone", found.tone);
    add("pillars", "Pillars", found.pillars.join(", "));
    add("offerings", "Offers", found.offerings.map((item) => `${item.name}${item.price ? ` (${item.price})` : ""}`).join("; "));
    return list;
  }, [found]);

  // Not a form of its own: it sits inside the profile's form, and forms can't be nested.
  const suggest = () => fill.mutate({ text, website }, { onSuccess: () => setTake({}) });

  const apply = () => {
    if (!found) return;
    const chosen: Partial<BrandSuggestions> = {};
    for (const row of rows) if (take[row.key] !== false) (chosen as Record<string, unknown>)[row.key] = found[row.key];
    onApply(chosen);
    fill.reset();
  };

  return (
    <details open={open} className="group rounded-xl border border-primary/30 bg-primary/5">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-5 py-4 text-sm font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
        <Sparkles aria-hidden="true" className="size-4 text-primary" />
        Fill it in for me
        <span className="font-normal text-muted-foreground">from your bio, price list or website</span>
      </summary>
      <div className="space-y-3 border-t border-primary/20 px-5 py-4">
        <Field id={`${ids}-text`} label="Paste anything about your brand" hint="Your Instagram bio, About page, a price list or a flyer's words.">
          <textarea id={`${ids}-text`} value={text} rows={4} maxLength={8000} onChange={(event) => setText(event.target.value)} className={cn(inputClass, "resize-y")} />
        </Field>
        <Field id={`${ids}-site`} label="Or your website" hint="Mindra reads its main page.">
          <input
            id={`${ids}-site`}
            type="url"
            inputMode="url"
            value={website}
            placeholder="yourbrand.com"
            onChange={(event) => setWebsite(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                suggest();
              }
            }}
            className={inputClass}
          />
        </Field>
        <button type="button" onClick={suggest} disabled={fill.isPending || (!text.trim() && !website.trim())} className={buttonStyles({ size: "sm", className: "h-9" })}>
          {fill.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}
          {fill.isPending ? "Reading…" : "Suggest"}
        </button>
        {fill.isError && <p role="alert" className="text-sm text-pretty text-red-600">{fill.error.message}</p>}
        {found && (
          <div className="rounded-lg border border-border bg-white p-4">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing to suggest from that. Try more words, or a different page.</p>
            ) : (
              <>
                <p className="mb-2 text-sm font-medium text-foreground">Suggestions: untick any you don&apos;t want</p>
                <ul className="space-y-2">
                  {rows.map((row) => (
                    <li key={row.key}>
                      <label className="flex gap-2 text-sm">
                        <input type="checkbox" checked={take[row.key] !== false} onChange={(event) => setTake((state) => ({ ...state, [row.key]: event.target.checked }))} className="mt-0.5" />
                        <span className="min-w-0">
                          <span className="font-medium text-foreground">{row.label}:</span> <span className="text-pretty text-muted-foreground">{row.value}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <button type="button" onClick={apply} className={buttonStyles({ size: "sm", className: "h-9" })}>
                    Use these
                  </button>
                  <button type="button" onClick={() => fill.reset()} className={buttonStyles({ variant: "ghost", size: "sm", className: "h-9" })}>
                    Discard
                  </button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">They go into the form below. Check them, then save.</p>
              </>
            )}
          </div>
        )}
      </div>
    </details>
  );
}

function toForm(profile: BrandProfile): Form {
  const { id: _id, filled: _filled, updated_at: _updated, ...form } = profile;
  return form;
}

/** Who the workspace posts as: what it is, what it offers, its pillars, links, look and voice. Every writer uses it. */
export default function BrandProfilePage() {
  const ids = useId();
  const { data: saved, isPending, isError, error } = useBrandProfile();
  const save = useSaveBrandProfile();
  const [form, setForm] = useState<Form | null>(null);
  const [pillar, setPillar] = useState("");
  const [colour, setColour] = useState("#5B4DE0");

  useEffect(() => {
    if (saved && !form) setForm(toForm(saved));
  }, [saved, form]);

  const header = (
    <div>
      <h2 className="text-2xl font-semibold text-balance text-foreground">Brand profile</h2>
      <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
        Who you post as. Mindra uses it every time it writes, plans or creates for you, so you never explain your business twice.
      </p>
    </div>
  );

  if (isError) {
    return (
      <div className="max-w-3xl space-y-4">
        {header}
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </p>
      </div>
    );
  }
  if (isPending || !form || !saved) {
    return (
      <div className="max-w-3xl space-y-6" aria-busy="true">
        {header}
        <p role="status" className="sr-only">
          Loading your brand profile
        </p>
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-xl bg-secondary" />
        ))}
      </div>
    );
  }

  const type = organisationType(form.organisation_type);
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(saved));
  const fieldErrors = save.error instanceof ApiError ? save.error.fieldErrors : {};
  const fieldError = (name: string) => {
    const value = fieldErrors[name];
    return Array.isArray(value) ? String(value[0]) : value ? "Check this." : "";
  };
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((state) => (state ? { ...state, [key]: value } : state));
  const setOffering = (index: number, changes: Partial<Offering>) =>
    set("offerings", form.offerings.map((item, at) => (at === index ? { ...item, ...changes } : item)));
  const addPillar = (value: string) => {
    const clean = value.trim();
    if (clean && !form.pillars.includes(clean) && form.pillars.length < MOST_PILLARS) set("pillars", [...form.pillars, clean]);
    setPillar("");
  };

  const applySuggestions = (found: Partial<BrandSuggestions>) =>
    setForm((state) => {
      if (!state) return state;
      const next = { ...state };
      for (const key of ["organisation_type", "name", "about", "audience", "location", "website", "whatsapp", "tone"] as const) {
        if (found[key]) (next as Record<string, unknown>)[key] = found[key];
      }
      if (found.pillars?.length) next.pillars = [...new Set([...state.pillars, ...found.pillars])].slice(0, MOST_PILLARS);
      if (found.offerings?.length) {
        const known = new Set(state.offerings.map((item) => item.name.toLowerCase()));
        next.offerings = [...state.offerings, ...found.offerings.filter((item) => !known.has(item.name.toLowerCase())).map((item) => ({ ...item, link: "" }))];
      }
      return next;
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || save.isPending) return;
    const { logo, photos, ...rest } = form;
    save.mutate(
      { ...rest, logo: logo?.id ?? null, photos: photos.map((photo) => photo.id), offerings: form.offerings.filter((item) => item.name.trim()) },
      { onSuccess: (profile) => setForm(toForm(profile)) },
    );
  };

  const steps = [
    { label: "Who you are", done: saved.filled.basics },
    { label: type.offeringsTitle, done: saved.filled.offerings },
    { label: "Pillars", done: saved.filled.pillars },
    { label: "Voice", done: saved.filled.voice },
  ];

  return (
    <form onSubmit={submit} noValidate className="max-w-3xl space-y-6 pb-24">
      {header}
      <ol aria-label="Set-up" className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <li
            key={step.label}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              step.done ? "bg-emerald-50 text-emerald-700" : "bg-secondary text-muted-foreground",
            )}
          >
            {step.done && <Check aria-hidden="true" className="size-3.5" />}
            {step.label}
            <span className="sr-only">{step.done ? ": done" : ": to do"}</span>
          </li>
        ))}
      </ol>

      <FillPanel onApply={applySuggestions} open={!saved.filled.basics} />

      <Section id={`${ids}-who`} title="Who you are">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-foreground">What kind of organisation are you?</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {ORGANISATION_TYPES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={form.organisation_type === option.id}
                onClick={() => set("organisation_type", option.id as OrganisationType)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  form.organisation_type === option.id ? "border-primary bg-primary/5" : "border-border hover:bg-background",
                )}
              >
                <span className="block text-sm font-medium text-foreground">{option.label}</span>
                <span className="block text-xs text-pretty text-muted-foreground">{option.description}</span>
              </button>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${ids}-name`} label="Name" error={fieldError("name")}>
            <input id={`${ids}-name`} value={form.name} maxLength={120} onChange={(event) => set("name", event.target.value)} className={inputClass} />
          </Field>
          <Field id={`${ids}-location`} label="Where you are" hint="A city or area, as you'd say it." error={fieldError("location")}>
            <input id={`${ids}-location`} value={form.location} maxLength={200} placeholder="e.g. Lekki, Lagos" onChange={(event) => set("location", event.target.value)} className={inputClass} />
          </Field>
        </div>
        <Field id={`${ids}-about`} label="What you do" hint="One or two plain sentences." error={fieldError("about")}>
          <textarea id={`${ids}-about`} value={form.about} rows={3} maxLength={1000} onChange={(event) => set("about", event.target.value)} className={cn(inputClass, "resize-y")} />
        </Field>
        <Field id={`${ids}-audience`} label="Who it's for" error={fieldError("audience")}>
          <input id={`${ids}-audience`} value={form.audience} maxLength={255} placeholder="e.g. Women aged 20 to 40 in Lagos" onChange={(event) => set("audience", event.target.value)} className={inputClass} />
        </Field>
      </Section>

      <Section id={`${ids}-offers`} title={type.offeringsTitle} hint={`${type.offeringsHint} Mindra copies prices exactly and never invents one.`}>
        {form.offerings.length === 0 && <p className="text-sm text-muted-foreground">Nothing added yet.</p>}
        <ul className="space-y-3">
          {form.offerings.map((item, index) => (
            <li key={item.id ?? `new-${index}`} className="rounded-lg border border-border p-3">
              <div className="grid gap-3 sm:grid-cols-[8rem_minmax(0,1fr)_8rem_auto] sm:items-end">
                <Field id={`${ids}-kind-${index}`} label={<>Kind<span className="sr-only"> of item {index + 1}</span></>}>
                  <select id={`${ids}-kind-${index}`} value={item.kind} onChange={(event) => setOffering(index, { kind: event.target.value as Offering["kind"] })} className={cn(inputClass, "h-10 py-0")}>
                    {OFFERING_KINDS.map((kind) => (
                      <option key={kind.id} value={kind.id}>
                        {kind.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field id={`${ids}-offer-${index}`} label={<>Name<span className="sr-only"> of item {index + 1}</span></>}>
                  <input id={`${ids}-offer-${index}`} value={item.name} maxLength={120} onChange={(event) => setOffering(index, { name: event.target.value })} className={cn(inputClass, "h-10")} />
                </Field>
                <Field id={`${ids}-price-${index}`} label={<>Price<span className="sr-only"> of item {index + 1}</span></>}>
                  <input id={`${ids}-price-${index}`} value={item.price} maxLength={60} placeholder="₦8,500" onChange={(event) => setOffering(index, { price: event.target.value })} className={cn(inputClass, "h-10 tabular-nums")} />
                </Field>
                <button type="button" aria-label={`Remove ${item.name || "this one"}`} onClick={() => set("offerings", form.offerings.filter((_item, at) => at !== index))} className={buttonStyles({ variant: "ghost", size: "icon", className: "size-10 hover:bg-red-50 hover:text-red-600" })}>
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field id={`${ids}-desc-${index}`} label={<>Details (optional)<span className="sr-only"> of item {index + 1}</span></>}>
                  <input id={`${ids}-desc-${index}`} value={item.description} maxLength={600} onChange={(event) => setOffering(index, { description: event.target.value })} className={cn(inputClass, "h-10")} />
                </Field>
                <Field id={`${ids}-link-${index}`} label={<>Link (optional)<span className="sr-only"> of item {index + 1}</span></>}>
                  <input id={`${ids}-link-${index}`} type="url" value={item.link} maxLength={500} placeholder="https://" onChange={(event) => setOffering(index, { link: event.target.value })} className={cn(inputClass, "h-10")} />
                </Field>
              </div>
            </li>
          ))}
        </ul>
        {fieldError("offerings") && <p className="text-sm text-red-600">Check the offers: each needs a name, and links start with https://.</p>}
        <button type="button" onClick={() => set("offerings", [...form.offerings, { kind: type.offeringKind, name: "", price: "", description: "", link: "" }])} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
          <Plus aria-hidden="true" className="size-4" />
          Add
        </button>
      </Section>

      <Section id={`${ids}-pillars`} title="Content pillars" hint="The themes your posts keep coming back to. The planner balances them.">
        <ul aria-label="Your pillars" className="flex flex-wrap gap-2">
          {form.pillars.map((item) => (
            <li key={item} className="inline-flex items-center gap-1 rounded-full bg-primary/10 py-1 pr-1 pl-3 text-sm font-medium text-primary">
              {item}
              <button type="button" aria-label={`Remove ${item}`} onClick={() => set("pillars", form.pillars.filter((value) => value !== item))} className="grid size-6 place-items-center rounded-full hover:bg-primary/15 focus-visible:outline-2 focus-visible:outline-primary">
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </li>
          ))}
          {form.pillars.length === 0 && <li className="text-sm text-muted-foreground">None yet.</li>}
        </ul>
        <div className="flex flex-wrap gap-2">
          <label htmlFor={`${ids}-pillar`} className="sr-only">
            Add a pillar
          </label>
          <input
            id={`${ids}-pillar`}
            value={pillar}
            maxLength={60}
            placeholder="Add a pillar"
            disabled={form.pillars.length >= MOST_PILLARS}
            onChange={(event) => setPillar(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addPillar(pillar);
              }
            }}
            className={cn(inputClass, "h-9 w-48")}
          />
          <button type="button" disabled={!pillar.trim() || form.pillars.length >= MOST_PILLARS} onClick={() => addPillar(pillar)} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
            Add
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Suggested:</span>
          {type.pillars
            .filter((item) => !form.pillars.includes(item))
            .map((item) => (
              <button key={item} type="button" disabled={form.pillars.length >= MOST_PILLARS} onClick={() => addPillar(item)} className="rounded-full border border-dashed border-border px-3 py-1 text-sm text-foreground hover:bg-background focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50">
                + {item}
              </button>
            ))}
        </div>
      </Section>

      <Section id={`${ids}-links`} title="Links" hint="Where people can find you. Campaigns and posts use them.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${ids}-website`} label="Website" error={fieldError("website")}>
            <input id={`${ids}-website`} type="url" inputMode="url" value={form.website} maxLength={500} placeholder="yourbrand.com" onChange={(event) => set("website", event.target.value)} className={inputClass} />
          </Field>
          <Field id={`${ids}-whatsapp`} label="WhatsApp" hint="A number or a wa.me link." error={fieldError("whatsapp")}>
            <input id={`${ids}-whatsapp`} value={form.whatsapp} maxLength={200} placeholder="https://wa.me/234…" onChange={(event) => set("whatsapp", event.target.value)} className={inputClass} />
          </Field>
          {SOCIALS.map((social) => (
            <Field key={social.id} id={`${ids}-${social.id}`} label={social.label}>
              <input id={`${ids}-${social.id}`} value={form.socials[social.id] ?? ""} maxLength={200} placeholder={social.placeholder} onChange={(event) => set("socials", { ...form.socials, [social.id]: event.target.value })} className={inputClass} />
            </Field>
          ))}
        </div>
      </Section>

      <Section id={`${ids}-look`} title="Your look" hint="Used for graphics and videos.">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Logo</p>
          {form.logo?.thumbnail_url && <img src={form.logo.thumbnail_url} alt="Your logo" className="mb-3 size-16 rounded-lg border border-border object-contain" />}
          <ImageChooser chosen={form.logo ? [form.logo] : []} onChange={(assets) => set("logo", assets[0] ?? null)} most={1} label="Choose your logo" />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Colours</p>
          <ul aria-label="Your colours" className="flex flex-wrap gap-2">
            {form.colours.map((value) => (
              <li key={value} className="inline-flex items-center gap-2 rounded-full border border-border py-1 pr-1 pl-1.5 text-sm tabular-nums">
                <span aria-hidden="true" className="size-5 rounded-full border border-black/10" style={{ background: value }} />
                {value}
                <button type="button" aria-label={`Remove ${value}`} onClick={() => set("colours", form.colours.filter((item) => item !== value))} className="grid size-6 place-items-center rounded-full hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary">
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center gap-2">
            <label htmlFor={`${ids}-colour`} className="sr-only">
              Pick a colour
            </label>
            <input id={`${ids}-colour`} type="color" value={colour} onChange={(event) => setColour(event.target.value.toUpperCase())} className="h-9 w-12 cursor-pointer rounded-lg border border-border bg-white p-1" />
            <button
              type="button"
              disabled={form.colours.length >= MOST_COLOURS || form.colours.includes(colour)}
              onClick={() => set("colours", [...form.colours, colour])}
              className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}
            >
              Add colour
            </button>
          </div>
        </div>
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">Photos</p>
          <p className="mb-2 text-xs text-muted-foreground">Your products, place or people. AI pictures and videos can start from them.</p>
          <ImageChooser chosen={form.photos} onChange={(assets) => set("photos", assets)} most={10} label="Choose your photos" />
        </div>
      </Section>

      <Section id={`${ids}-voice`} title="Voice" hint="How you sound. Every post Mindra writes follows it.">
        <Field id={`${ids}-tone`} label="Tone" error={fieldError("tone")}>
          <select id={`${ids}-tone`} value={form.tone} onChange={(event) => set("tone", event.target.value)} className={cn(inputClass, "h-11 py-0")}>
            <option value="">Choose a tone</option>
            {TONES.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </Field>
        <Field id={`${ids}-style`} label="Style notes" hint="Anything about how you write: short sentences, pidgin is fine, always end with a question." error={fieldError("style_notes")}>
          <textarea id={`${ids}-style`} value={form.style_notes} rows={3} maxLength={2000} onChange={(event) => set("style_notes", event.target.value)} className={cn(inputClass, "resize-y")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id={`${ids}-use`} label="Words and phrases to use" hint="Separate them with commas." error={fieldError("words_to_use")}>
            <textarea id={`${ids}-use`} value={form.words_to_use} rows={2} maxLength={2000} onChange={(event) => set("words_to_use", event.target.value)} className={cn(inputClass, "resize-y")} />
          </Field>
          <Field id={`${ids}-avoid`} label="Words and phrases to avoid" error={fieldError("words_to_avoid")}>
            <textarea id={`${ids}-avoid`} value={form.words_to_avoid} rows={2} maxLength={2000} onChange={(event) => set("words_to_avoid", event.target.value)} className={cn(inputClass, "resize-y")} />
          </Field>
        </div>
        <Field id={`${ids}-samples`} label="Posts you've written before" hint="Paste a few. Mindra matches their voice, not their content." error={fieldError("sample_posts")}>
          <textarea id={`${ids}-samples`} value={form.sample_posts} rows={5} maxLength={6000} onChange={(event) => set("sample_posts", event.target.value)} className={cn(inputClass, "resize-y")} />
        </Field>
      </Section>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <button type="submit" disabled={!dirty || save.isPending} className={buttonStyles()}>
          {save.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}
          {save.isPending ? "Saving…" : "Save profile"}
        </button>
        <p role="status" className="text-sm text-muted-foreground">
          {save.isError && !Object.keys(fieldErrors).length ? <span className="text-red-600">{save.error.message}</span> : save.isError ? <span className="text-red-600">Check the fields marked above.</span> : dirty ? "Unsaved changes" : save.isSuccess ? "Saved" : "Everything is saved"}
        </p>
      </div>
    </form>
  );
}
