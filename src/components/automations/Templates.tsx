import { BookOpen, HandHeart, LoaderCircle, SlidersHorizontal, Sunrise, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { buttonStyles } from "../ui/button";
import { ApiError } from "../../lib/api";
import { formatClock, scheduleSummary, useCreateAutomation, usePresets } from "../../lib/automations";
import { ErrorNote } from "./parts";

const ICONS: Record<string, LucideIcon> = { prayer: Sunrise, lesson: BookOpen, encouragement: HandHeart, custom: SlidersHorizontal };

/** The templates to start an automation from. Choosing one makes a draft (nothing runs) and opens its setup. */
export default function Templates() {
  const presets = usePresets();
  const create = useCreateAutomation();
  const navigate = useNavigate();

  const start = (preset: string) => {
    if (create.isPending) return;
    create.mutate({ preset }, { onSuccess: (automation) => navigate(`/automations/${automation.id}/setup`) });
  };

  if (presets.isPending) {
    return (
      <div aria-busy="true" className="grid gap-3 sm:grid-cols-2">
        <p role="status" className="sr-only">
          Loading templates
        </p>
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-40 animate-pulse rounded-xl border border-border bg-white" />
        ))}
      </div>
    );
  }
  if (presets.isError) return <ErrorNote>{presets.error.message}</ErrorNote>;

  return (
    <div className="space-y-3">
      {create.error && <ErrorNote>{create.error instanceof ApiError ? create.error.message : "Mindra couldn't start the automation. Try again."}</ErrorNote>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {presets.data.map((preset) => {
          const Icon = ICONS[preset.id] ?? SlidersHorizontal;
          const starting = create.isPending && create.variables?.preset === preset.id;
          const length = `${preset.config.content.minutes} min, ${preset.config.content.shape === "16:9" ? "landscape" : "vertical"}`;
          return (
            <li key={preset.id} className="flex flex-col rounded-xl border border-border bg-white p-5">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-3 font-semibold text-foreground">{preset.name}</h3>
              <p className="mt-1 flex-1 text-sm text-pretty text-muted-foreground">{preset.description}</p>
              {preset.id !== "custom" && (
                <p className="mt-3 text-xs text-muted-foreground tabular-nums">
                  {length} ·{" "}
                  {preset.schedule.post_time
                    ? scheduleSummary({ weekdays: preset.schedule.weekdays, post_time: preset.schedule.post_time })
                    : "Your schedule"}
                </p>
              )}
              <button
                type="button"
                onClick={() => start(preset.id)}
                disabled={create.isPending}
                className={buttonStyles({ variant: preset.id === "custom" ? "secondary" : "primary", size: "sm", className: "mt-4 self-start" })}
              >
                {starting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                {preset.id === "custom" ? "Start from scratch" : "Use this template"}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-pretty text-muted-foreground">
        A template only fills in the settings. Nothing is made or posted until you switch the automation on, and every
        setting can be changed. Times like {formatClock("05:30")} are in your own time zone.
      </p>
    </div>
  );
}
