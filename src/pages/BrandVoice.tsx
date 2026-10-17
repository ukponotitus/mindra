import { useEffect, useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { TONES, useBrandVoice, useSaveBrandVoice } from "../lib/content";
import type { BrandVoice } from "../lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden aria-invalid:border-red-300";

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
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

/** How Mindra should sound. Used every time it writes for this workspace. */
export default function BrandVoicePage() {
  const { data: saved, isPending } = useBrandVoice();
  const save = useSaveBrandVoice();
  const [form, setForm] = useState<BrandVoice | null>(null);

  useEffect(() => {
    if (saved && !form) setForm(saved);
  }, [saved, form]);

  const header = (
    <div>
      <h2 className="text-2xl font-semibold text-balance text-foreground">Brand Voice</h2>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        Tell Mindra how you sound. It uses this every time it writes for you.
      </p>
    </div>
  );

  if (isPending || !form) {
    return (
      <div className="max-w-3xl">
        <div className="mb-8">{header}</div>
        <div aria-busy="true" className="space-y-5">
          <p role="status" className="sr-only">
            Loading your brand voice
          </p>
          {[0, 1].map((i) => (
            <div key={i} className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
              <div className="h-4 w-28 animate-pulse rounded bg-secondary" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-secondary" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-secondary" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const set = (field: keyof BrandVoice) => (event: { target: { value: string } }) =>
    setForm({ ...form, [field]: event.target.value });
  const fieldError = (field: string) => (save.error instanceof ApiError ? save.error.fieldErrors[field]?.[0] : undefined);
  const dirty = (Object.keys(form) as (keyof BrandVoice)[]).some((key) => key !== "updated_at" && form[key] !== saved?.[key]);
  /** Links a field to its error (or hint) and marks it invalid when the server rejected it. */
  const describe = (id: string, field: string, hasHint = false) => {
    const invalid = Boolean(fieldError(field));
    return {
      id,
      "aria-invalid": invalid || undefined,
      "aria-describedby": invalid ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
    };
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-8">{header}</div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(form, { onSuccess: (voice) => setForm(voice) });
        }}
        className="space-y-5"
      >
        <section aria-labelledby="voice-who" className="space-y-5 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h3 id="voice-who" className="font-semibold text-balance text-foreground">
            Who you are
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <Field id="voice-brand-name" label="Church, ministry or brand name" error={fieldError("brand_name")}>
              <input
                {...describe("voice-brand-name", "brand_name")}
                value={form.brand_name}
                onChange={set("brand_name")}
                placeholder="Grace Chapel"
                maxLength={120}
                className={cn(inputClass, "h-11 py-0")}
              />
            </Field>
            <Field id="voice-tone" label="Preferred tone" error={fieldError("tone")}>
              <select {...describe("voice-tone", "tone")} value={form.tone} onChange={set("tone")} className={cn(inputClass, "h-11 py-0")}>
                <option value="">No preference (Warm)</option>
                {TONES.map((tone) => (
                  <option key={tone}>{tone}</option>
                ))}
              </select>
            </Field>
          </div>
          <Field
            id="voice-audience"
            label="Who you're speaking to"
            hint="For example: young professionals in Lagos, new believers, small-business owners."
            error={fieldError("audience")}
          >
            <input
              {...describe("voice-audience", "audience", true)}
              value={form.audience}
              onChange={set("audience")}
              maxLength={255}
              className={cn(inputClass, "h-11 py-0")}
            />
          </Field>
          <Field
            id="voice-style"
            label="How you write"
            hint="Short sentences? Scripture in every post? Emojis or none? Describe it in your own words."
            error={fieldError("style_notes")}
          >
            <textarea
              {...describe("voice-style", "style_notes", true)}
              value={form.style_notes}
              onChange={set("style_notes")}
              rows={4}
              className={cn(inputClass, "resize-y")}
            />
          </Field>
        </section>

        <section aria-labelledby="voice-words" className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h3 id="voice-words" className="font-semibold text-balance text-foreground">
            Words
          </h3>
          <Field id="voice-use" label="Words and phrases to use" hint="Separate them with commas." error={fieldError("words_to_use")}>
            <textarea
              {...describe("voice-use", "words_to_use", true)}
              value={form.words_to_use}
              onChange={set("words_to_use")}
              rows={2}
              placeholder="church family, grace, testimony"
              className={cn(inputClass, "resize-y")}
            />
          </Field>
          <Field id="voice-avoid" label="Words and phrases to avoid" error={fieldError("words_to_avoid")}>
            <textarea
              {...describe("voice-avoid", "words_to_avoid")}
              value={form.words_to_avoid}
              onChange={set("words_to_avoid")}
              rows={2}
              placeholder="synergy, hustle"
              className={cn(inputClass, "resize-y")}
            />
          </Field>
        </section>

        <section aria-labelledby="voice-samples" className="rounded-xl border border-border bg-white p-5 sm:p-6">
          <h3 id="voice-samples" className="font-semibold text-balance text-foreground">
            Past posts
          </h3>
          <p id="voice-samples-hint" className="mt-1 mb-4 text-sm text-pretty text-muted-foreground">
            Paste a few of your best past posts, separated by a blank line. Mindra matches their voice, not their content.
          </p>
          <textarea
            id="voice-samples-input"
            aria-labelledby="voice-samples"
            aria-describedby={fieldError("sample_posts") ? "voice-samples-error" : "voice-samples-hint"}
            aria-invalid={Boolean(fieldError("sample_posts")) || undefined}
            value={form.sample_posts}
            onChange={set("sample_posts")}
            rows={8}
            className={cn(inputClass, "resize-y")}
          />
          {fieldError("sample_posts") && (
            <p id="voice-samples-error" className="mt-1.5 text-sm text-pretty text-red-600">
              {fieldError("sample_posts")}
            </p>
          )}
        </section>

        {save.isError && !Object.keys(save.error instanceof ApiError ? save.error.fieldErrors : {}).length && (
          <p role="alert" className="text-sm text-pretty text-red-600">
            {save.error.message}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={!dirty || save.isPending} className={buttonStyles({ size: "lg" })}>
            {save.isPending ? "Saving…" : "Save brand voice"}
          </button>
          <p role="status" className="text-sm">
            {save.isSuccess && !dirty ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                <Check aria-hidden="true" className="size-4" />
                Saved
              </span>
            ) : dirty ? (
              <span className="text-amber-700">Unsaved changes</span>
            ) : (
              <span className="text-muted-foreground">No changes to save</span>
            )}
          </p>
        </div>
      </form>
    </div>
  );
}
