import { Check, ChevronLeft, LoaderCircle, Plus } from "lucide-react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { ErrorNote } from "../components/automations/parts";
import { Stepper, Tag, tagTone, TEMPLATE_ICONS } from "../components/automations/widgets";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { useAutomationsEnabled, useCreateAutomation, usePresets } from "../lib/automations";
import { cn } from "../lib/cn";

export const SETUP_STEPS = ["Template", "Script", "Look and voice", "Schedule", "Review and posting"];

/** New automation, step 1: which kind of videos it makes. Every template runs the same steps; choosing one makes a
 * draft (nothing runs) and opens its setup. */
export default function AutomationNew() {
  const enabled = useAutomationsEnabled();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const presets = usePresets();
  const create = useCreateAutomation();
  const chosen = params.get("template");
  const templates = (presets.data ?? []).filter((preset) => !preset.hidden);
  const template = templates.find((preset) => preset.id === chosen) ?? null;

  if (!enabled) return <Navigate to="/dashboard" replace />;

  const start = () => {
    if (!template || create.isPending) return;
    create.mutate({ preset: template.id }, { onSuccess: (automation) => navigate(`/automations/${automation.id}/setup`) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/automations" aria-label="Back to Automations" className={buttonStyles({ variant: "secondary", size: "icon" })}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Link>
          <h2 className="text-lg font-semibold text-foreground">New automation</h2>
        </div>
        <Stepper steps={SETUP_STEPS} current={0} />
      </div>

      <div>
        <h3 className="text-2xl font-semibold text-balance text-foreground">What kind of videos should this make?</h3>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Every template runs the same steps. You can change the look, voice and schedule next.</p>
      </div>

      {presets.isError && <ErrorNote>{presets.error.message}</ErrorNote>}
      {create.error && <ErrorNote>{create.error instanceof ApiError ? create.error.message : "Mindra couldn't start the automation. Try again."}</ErrorNote>}

      {presets.isPending ? (
        <div aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <p role="status" className="sr-only">
            Loading templates
          </p>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <div key={item} className="h-72 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="radiogroup" aria-label="Templates">
          {templates.map((item) => {
            const Icon = TEMPLATE_ICONS[item.id] ?? Plus;
            const active = chosen === item.id;
            const scratch = item.id === "custom";
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setParams({ template: item.id }, { replace: true })}
                  className={cn(
                    "relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    active ? "border-primary ring-2 ring-primary/20" : scratch ? "border-dashed border-border hover:border-primary/40" : "border-border hover:border-primary/40",
                  )}
                >
                  {active && (
                    <span className="absolute top-3 right-3 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
                      <Check aria-hidden="true" className="size-4" />
                    </span>
                  )}
                  <span className={cn("grid h-36 place-items-center", scratch ? "bg-background" : "bg-primary/5")}>
                    <Icon aria-hidden="true" className={cn("size-10", scratch ? "text-muted-foreground" : "text-primary")} />
                  </span>
                  <span className="flex flex-1 flex-col p-5">
                    <span className="font-semibold text-foreground">{item.name}</span>
                    <span className="mt-1.5 flex-1 text-sm text-pretty text-muted-foreground">{item.description}</span>
                    {item.tags.length > 0 && (
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <Tag key={tag} label={tag} tone={tagTone(tag)} />
                        ))}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground tabular-nums">
          {template ? (
            template.kind === "create" ? (
              <>
                <span className="font-semibold text-foreground">{template.name}</span> selected · about {template.credits_per_video} credits per{" "}
                {template.config.content.minutes} minute video
              </>
            ) : (
              <>
                <span className="font-semibold text-foreground">{template.name}</span> selected · posts what you already have, no credits
              </>
            )
          ) : (
            "Choose a template to continue."
          )}
        </p>
        <div className="flex gap-2">
          <Link to="/automations" className={buttonStyles({ variant: "secondary" })}>
            Cancel
          </Link>
          <button type="button" disabled={!template || create.isPending} onClick={start} className={buttonStyles()}>
            {create.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
