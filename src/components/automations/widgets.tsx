import { Check, Clapperboard, Film, Image as ImageIcon, type LucideIcon, Plus, Repeat2, Smile, Sun, Smartphone } from "lucide-react";
import { cn } from "../../lib/cn";
import { PIPELINE, type StageState } from "../../lib/automations";

/** The small parts the Automations screens share. */

export const TEMPLATE_ICONS: Record<string, LucideIcon> = {
  ai_clips: Film,
  images_voice: ImageIcon,
  kids: Smile,
  prayer: Sun,
  tips: Smartphone,
  custom: Plus,
  clips: Repeat2,
  videos: Clapperboard,
};

export type TagTone = "cost_high" | "cost_mid" | "cost_low" | "plain";

/** The tone a template's tag is shown in, from its words. */
export function tagTone(label: string): TagTone {
  const words = label.toLowerCase();
  if (words.startsWith("most")) return "cost_high";
  if (words.startsWith("more")) return "cost_mid";
  if (words.startsWith("fewest") || words.startsWith("no credits")) return "cost_low";
  return "plain";
}

export function Tag({ label, tone = "plain" }: { label: string; tone?: TagTone }) {
  const tones = {
    cost_high: "bg-amber-50 text-amber-800",
    cost_mid: "bg-amber-50 text-amber-800",
    cost_low: "bg-emerald-50 text-emerald-800",
    plain: "bg-secondary text-secondary-foreground",
  };
  return <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", tones[tone])}>{label}</span>;
}

const STEP_TONES: Record<StageState, string> = {
  done: "bg-primary",
  working: "bg-primary/60",
  waiting: "bg-amber-500",
  failed: "bg-red-500",
  pending: "bg-border",
};

/** The six steps of a video as a bar: filled as far as it's got, amber where it waits for someone, red where it stopped. */
export function ProgressBar({ steps, compact = false }: { steps: Record<string, StageState>; compact?: boolean }) {
  return (
    <ol className={cn("grid gap-2", compact ? "grid-cols-6" : "grid-cols-3 sm:grid-cols-6")} aria-label="Steps">
      {PIPELINE.map((step) => {
        const state = steps[step.id] ?? "pending";
        return (
          <li key={step.id} className="min-w-0">
            <span className={cn("block h-1.5 rounded-full", STEP_TONES[state])} />
            <span
              className={cn(
                "mt-1.5 block truncate text-xs",
                state === "waiting" ? "font-medium text-amber-800" : state === "failed" ? "font-medium text-red-700" : state === "working" ? "font-medium text-primary" : "text-muted-foreground",
              )}
            >
              {step.label}
              <span className="sr-only">: {state === "done" ? "done" : state === "working" ? "working" : state === "waiting" ? "waiting for you" : state === "failed" ? "stopped" : "not started"}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** A shape or kind tile standing in for a thumbnail, with the picture when there is one. */
export function Thumb({ label, tone = "muted", className }: { label: string; tone?: "muted" | "primary" | "failed"; className?: string }) {
  const tones = { muted: "bg-secondary text-muted-foreground", primary: "bg-primary/10 text-primary", failed: "bg-red-50 text-red-700" };
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-lg text-xs font-medium", tones[tone], className)} aria-hidden="true">
      {label}
    </span>
  );
}

/** A choice shown as a card with a radio, as the setup's script source and review mode. */
export function ChoiceCard({
  name,
  value,
  current,
  onChange,
  title,
  detail,
  badge,
  disabled,
}: {
  name: string;
  value: string;
  current: string;
  onChange: (value: string) => void;
  title: string;
  detail?: string;
  badge?: string;
  disabled?: boolean;
}) {
  const active = current === value;
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-primary",
        active ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary/60",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input type="radio" name={name} value={value} checked={active} disabled={disabled} onChange={() => onChange(value)} className="mt-0.5 size-4 shrink-0 accent-primary" />
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
          {title}
          {badge && <Tag label={badge} tone="cost_low" />}
        </span>
        {detail && <span className="mt-0.5 block text-sm text-pretty text-muted-foreground">{detail}</span>}
      </span>
    </label>
  );
}

export function CheckRow({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <label className={cn("inline-flex items-center gap-2 text-sm text-foreground", disabled && "opacity-60")}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="size-4 rounded accent-primary" />
      {label}
    </label>
  );
}

export function Section({ title, hint, children, className }: { title: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <h3 className="font-semibold text-foreground">{title}</h3>
      {hint && <p className="mt-1 text-sm text-pretty text-muted-foreground">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

/** The numbered steps across the top of the template, setup and review pages, like a wizard's. */
export function Stepper({ steps, current, done = [] }: { steps: string[]; current: number; done?: number[] }) {
  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="Setup steps">
      {steps.map((label, index) => {
        const active = index === current;
        const finished = done.includes(index);
        return (
          <li
            key={label}
            aria-current={active ? "step" : undefined}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium tabular-nums",
              active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground",
            )}
          >
            {index + 1} {label}
            {finished && <Check aria-hidden="true" className="size-3.5" />}
          </li>
        );
      })}
    </ol>
  );
}

