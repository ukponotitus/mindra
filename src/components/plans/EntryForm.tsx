import { useId, useState, type FormEvent } from "react";
import { LoaderCircle } from "lucide-react";
import { buttonStyles } from "../ui/button";
import { ApiError } from "../../lib/api";
import { combine, dayKey, scheduleProblem, timeValue, toOffsetIso } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { PLAN_FORMATS, platformsFor, sourcesFor, useEntryAction, usePlanAction, type EntryChanges } from "../../lib/plans";
import { platformInfo } from "../../lib/projects";
import type { Platform, PlanEntry, PlanFormat, Project } from "../../lib/types";

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-60 aria-invalid:border-red-400";

const INLINE_FIELDS = ["scheduled_at", "platform", "format", "source", "brief"];

/** The longest brief the API takes. */
const BRIEF_MAX = 1000;

/** What the "written from" choice says when nothing is chosen. */
const NO_SOURCE: Record<PlanFormat, string> = {
  recording: "The newest recording",
  clip: "The newest video recording",
  pictures: "Choose a flyer or photo post",
  text: "",
};

interface Props {
  planId: string;
  /** The post to change; leave it out to add one to the plan. */
  entry?: PlanEntry;
  /** What posts can be written from (the newest projects). */
  projects: Project[];
  projectsLoading?: boolean;
  /** A new post's day ("2026-10-26"). */
  day?: string;
  onDone: () => void;
}

/** Change a post of a plan, or add one: when, where, what kind, what it's written from, and what it should say. An
 * approved post only moves: what it says can't change until it's unapproved. */
export default function EntryForm({ planId, entry, projects, projectsLoading = false, day, onDone }: Props) {
  const ids = useId();
  const scheduled = entry?.scheduled_at ? new Date(entry.scheduled_at) : null;
  const [dayValue, setDayValue] = useState(scheduled ? dayKey(scheduled) : (day ?? ""));
  const [time, setTime] = useState(scheduled ? timeValue(scheduled) : day ? "09:00" : "");
  const [platform, setPlatform] = useState<Platform | "">(entry?.platform ?? "");
  const [format, setFormat] = useState<PlanFormat>(entry?.format ?? "text");
  const [source, setSource] = useState(entry?.source ?? "");
  const [brief, setBrief] = useState(entry?.brief ?? "");
  const [problem, setProblem] = useState("");
  const entryAction = useEntryAction(planId);
  const planAction = usePlanAction(planId);
  const saving = entryAction.isPending || planAction.isPending;
  const error = entryAction.error ?? planAction.error;
  const fieldErrors = error instanceof ApiError ? error.fieldErrors : {};
  const fieldError = (field: string) => fieldErrors[field]?.[0] ?? "";
  const approved = Boolean(entry?.approved);

  const allowed = platformsFor(format);
  const platformOptions = platform && !allowed.includes(platform) ? [platform, ...allowed] : allowed;
  const mismatch = platform !== "" && !allowed.includes(platform);
  const choices = sourcesFor(format, projects);
  // The chosen project can be older than the newest ones listed: keep it as a choice.
  const sourceMissing = source !== "" && !choices.some((project) => project.id === source);

  const changeFormat = (next: PlanFormat) => {
    setFormat(next);
    if (next === "text" || !sourcesFor(next, projects).some((project) => project.id === source)) setSource("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (saving) return;
    let when: Date | null = null;
    if (dayValue || time) {
      when = combine(dayValue, time);
      if (!when) {
        setProblem("Choose both a day and a time, or leave both empty.");
        return;
      }
    }
    if (approved) {
      const timeProblem = scheduleProblem(when);
      if (timeProblem) {
        setProblem(timeProblem);
        return;
      }
    }
    if (!brief.trim()) {
      setProblem("Say what this post should be.");
      return;
    }
    if (format === "pictures" && !source) {
      setProblem("Choose the flyer or photos to post.");
      return;
    }
    setProblem("");
    const scheduledAt = when ? toOffsetIso(when) : null;

    if (!entry) {
      planAction.mutate(
        { action: "entries", body: { scheduled_at: scheduledAt, platform, format, brief: brief.trim(), source: source || null } },
        { onSuccess: onDone },
      );
      return;
    }
    const changes: EntryChanges = {};
    const before = entry.scheduled_at ? new Date(entry.scheduled_at).getTime() : null;
    if ((when?.getTime() ?? null) !== before) changes.scheduled_at = scheduledAt;
    if (!approved) {
      if (platform !== entry.platform) changes.platform = platform;
      if (format !== entry.format) changes.format = format;
      if (brief.trim() !== entry.brief) changes.brief = brief.trim();
      if ((source || null) !== entry.source) changes.source = source || null;
    }
    if (Object.keys(changes).length === 0) {
      onDone();
      return;
    }
    entryAction.mutate({ id: entry.id, action: "update", changes }, { onSuccess: onDone });
  };

  const rewrites = Boolean(entry?.piece) && !approved;
  // Errors about a field show under it; anything else (such as "it has already gone out") here.
  const otherError = Object.entries(fieldErrors).find(([field]) => !INLINE_FIELDS.includes(field))?.[1]?.[0] ?? "";
  const message = problem || otherError || (error && Object.keys(fieldErrors).length === 0 ? error.message : "");

  return (
    <form onSubmit={submit} noValidate aria-busy={saving} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-day`} className="mb-1.5 block text-sm font-medium text-foreground">
            Day
          </label>
          <input
            id={`${ids}-day`}
            type="date"
            value={dayValue}
            disabled={saving}
            aria-invalid={fieldError("scheduled_at") ? true : undefined}
            onChange={(event) => {
              setDayValue(event.target.value);
              if (event.target.value && !time) setTime("09:00");
            }}
            className={cn(fieldClass, "tabular-nums")}
          />
        </div>
        <div>
          <label htmlFor={`${ids}-time`} className="mb-1.5 block text-sm font-medium text-foreground">
            Time
          </label>
          <input
            id={`${ids}-time`}
            type="time"
            value={time}
            disabled={saving}
            aria-invalid={fieldError("scheduled_at") ? true : undefined}
            onChange={(event) => setTime(event.target.value)}
            className={cn(fieldClass, "tabular-nums")}
          />
        </div>
        {fieldError("scheduled_at") && (
          <p role="alert" className="text-xs text-pretty text-red-600 sm:col-span-2">
            {fieldError("scheduled_at")}
          </p>
        )}
      </div>

      {approved && (
        <p className="rounded-lg bg-background px-3.5 py-2.5 text-xs text-pretty text-muted-foreground">
          This post is approved, so only its time can change here (it moves on the calendar too). To change what it
          says, unapprove it first.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-format`} className="mb-1.5 block text-sm font-medium text-foreground">
            Kind of post
          </label>
          <select
            id={`${ids}-format`}
            value={format}
            disabled={saving || approved}
            aria-describedby={`${ids}-format-hint`}
            aria-invalid={fieldError("format") ? true : undefined}
            onChange={(event) => changeFormat(event.target.value as PlanFormat)}
            className={fieldClass}
          >
            {PLAN_FORMATS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p id={`${ids}-format-hint`} className="mt-1 text-xs text-pretty text-muted-foreground">
            {fieldError("format") || PLAN_FORMATS.find((option) => option.id === format)?.description}
          </p>
        </div>
        <div>
          <label htmlFor={`${ids}-platform`} className="mb-1.5 block text-sm font-medium text-foreground">
            Platform
          </label>
          <select
            id={`${ids}-platform`}
            value={platform}
            disabled={saving || approved}
            aria-invalid={mismatch || fieldError("platform") ? true : undefined}
            aria-describedby={mismatch || fieldError("platform") ? `${ids}-platform-hint` : undefined}
            onChange={(event) => setPlatform(event.target.value as Platform | "")}
            className={fieldClass}
          >
            <option value="">Choose a platform</option>
            {platformOptions.map((option) => (
              <option key={option} value={option}>
                {platformInfo(option).label}
              </option>
            ))}
          </select>
          {(mismatch || fieldError("platform")) && (
            <p id={`${ids}-platform-hint`} className="mt-1 text-xs text-pretty text-amber-700">
              {fieldError("platform") ||
                `${platformInfo(platform as Platform).label} posts can't take ${format === "clip" ? "a video clip" : "pictures"}. Choose another platform.`}
            </p>
          )}
        </div>
      </div>

      {format !== "text" && (
        <div>
          <label htmlFor={`${ids}-source`} className="mb-1.5 block text-sm font-medium text-foreground">
            Written from
          </label>
          <select
            id={`${ids}-source`}
            value={source}
            disabled={saving || approved || projectsLoading}
            aria-invalid={fieldError("source") ? true : undefined}
            aria-describedby={`${ids}-source-hint`}
            onChange={(event) => setSource(event.target.value)}
            className={fieldClass}
          >
            <option value="">{projectsLoading ? "Loading your projects…" : NO_SOURCE[format]}</option>
            {sourceMissing && entry?.source === source && <option value={source}>{entry.source_name || "The chosen project"}</option>}
            {choices.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
          <p id={`${ids}-source-hint`} className={cn("mt-1 text-xs text-pretty", fieldError("source") ? "text-red-600" : "text-muted-foreground")}>
            {fieldError("source") ||
              (choices.length === 0 && !projectsLoading
                ? format === "pictures"
                  ? "Make a Photos or Flyer project first, then choose it here."
                  : format === "clip"
                    ? "Upload a video recording first; Mindra picks a clip from it."
                    : "Upload a recording first."
                : format === "clip"
                  ? "Mindra picks the best clip this plan doesn't use yet, and makes it."
                  : format === "recording"
                    ? "Leave it to use the newest recording when the post is written."
                    : "The pictures go out with the caption.")}
          </p>
        </div>
      )}

      <div>
        <label htmlFor={`${ids}-brief`} className="mb-1.5 block text-sm font-medium text-foreground">
          What it should be
        </label>
        <textarea
          id={`${ids}-brief`}
          value={brief}
          rows={3}
          maxLength={BRIEF_MAX}
          disabled={saving || approved}
          aria-invalid={fieldError("brief") ? true : undefined}
          aria-describedby={fieldError("brief") ? `${ids}-brief-error` : undefined}
          placeholder="e.g. A quote from this week's episode on patience"
          onChange={(event) => setBrief(event.target.value)}
          className={cn(fieldClass, "h-auto resize-y py-2.5 leading-relaxed")}
        />
        {fieldError("brief") && (
          <p id={`${ids}-brief-error`} role="alert" className="mt-1 text-xs text-pretty text-red-600">
            {fieldError("brief")}
          </p>
        )}
      </div>

      {rewrites && <p className="text-xs text-pretty text-muted-foreground">Changing what it says, its kind or its platform means writing it again.</p>}
      {message && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-pretty text-red-700">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={saving} className={buttonStyles()}>
          {saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {entry ? "Save" : "Add post"}
        </button>
        <button type="button" onClick={onDone} disabled={saving} className={buttonStyles({ variant: "secondary" })}>
          Cancel
        </button>
      </div>
    </form>
  );
}
