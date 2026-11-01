import { BookOpen, HandHeart, LoaderCircle, SlidersHorizontal, Sunrise, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router";
import { buttonStyles } from "../ui/button";
import { ApiError } from "../../lib/api";
import { scheduleSummary, useCreateAutomation, usePresets, type Preset } from "../../lib/automations";
import { ErrorNote } from "./parts";

const ICONS: Record<string, LucideIcon> = { prayer: Sunrise, lesson: BookOpen, encouragement: HandHeart, custom: SlidersHorizontal };
const TEMPLATES = ["prayer", "lesson", "encouragement"];

/** What a template gives, in a few words: its length, look, voice and schedule. */
function outline(preset: Preset): string[] {
  const config = preset.config;
  return [
    `${config.content.minutes}-minute ${config.content.shape === "16:9" ? "landscape" : "vertical"} video, ${config.content.tone} narration`,
    `Your photos and music, captions${config.script.scripture ? ", Scripture drawn on" : ""}`,
    preset.schedule.post_time ? scheduleSummary({ weekdays: preset.schedule.weekdays, post_time: preset.schedule.post_time }) : "Your schedule",
    preset.topics.length ? `${preset.topics.length} example topics to start with` : config.topics.source === "list" ? "Your own topics" : "Your topics, then AI ideas",
  ];
}

export function useStartFrom() {
  const create = useCreateAutomation();
  const navigate = useNavigate();
  const start = (preset: string) => {
    if (create.isPending) return;
    create.mutate({ preset }, { onSuccess: (automation) => navigate(`/automations/${automation.id}/setup`) });
  };
  return { start, create };
}

/** The templates for new videos. Choosing one makes a draft (nothing runs) and opens its setup. */
export default function Templates() {
  const presets = usePresets();
  const { start, create } = useStartFrom();

  if (presets.isPending) {
    return (
      <div aria-busy="true" className="grid gap-3 sm:grid-cols-3">
        <p role="status" className="sr-only">
          Loading templates
        </p>
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-52 animate-pulse rounded-xl border border-border bg-card" />
        ))}
      </div>
    );
  }
  if (presets.isError) return <ErrorNote>{presets.error.message}</ErrorNote>;

  const templates = presets.data.filter((preset) => TEMPLATES.includes(preset.id));
  return (
    <div className="space-y-3">
      {create.error && <ErrorNote>{create.error instanceof ApiError ? create.error.message : "Mindra couldn't start the automation. Try again."}</ErrorNote>}
      <ul className="grid gap-3 sm:grid-cols-3">
        {templates.map((preset) => {
          const Icon = ICONS[preset.id] ?? SlidersHorizontal;
          const starting = create.isPending && create.variables?.preset === preset.id;
          return (
            <li key={preset.id} className="flex flex-col rounded-xl border border-border bg-card p-5">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <h3 className="mt-3 font-semibold text-foreground">{preset.name}</h3>
              <p className="mt-1 text-sm text-pretty text-muted-foreground">{preset.description}</p>
              <ul className="mt-3 flex-1 space-y-1 text-xs text-muted-foreground">
                {outline(preset).map((line) => (
                  <li key={line} className="tabular-nums">
                    {line}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => start(preset.id)} disabled={create.isPending} className={buttonStyles({ variant: "primary", size: "sm", className: "mt-4 self-start" })}>
                {starting && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                Use this template
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
