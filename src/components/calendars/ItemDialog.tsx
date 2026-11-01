import { useEffect, useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { RefreshCw, Trash2, X } from "lucide-react";
import { ApiError } from "../../lib/api";
import { dayKey } from "../../lib/calendar";
import { FORMATS, OBJECTIVES, useAddItem, useDeleteItem, useRegenerateItem, useUpdateItem, type CalendarItem, type ItemChanges } from "../../lib/calendars";
import { PLATFORMS } from "../../lib/projects";
import type { Platform } from "../../lib/types";
import { buttonStyles } from "../ui/button";

// Changing one calendar item, or adding one to a draft. Once its brief or post is under way only its date and time can
// change (the API says so too).

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-60";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

function timeOf(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

type Draft = { day: string; time: string; platform: Platform; format: string; objective: string; pillar: string; topic: string; angle: string; description: string; cta: string };

function fromItem(item: CalendarItem | null, day: string, platform: Platform): Draft {
  if (!item) return { day, time: "19:00", platform, format: "post", objective: "", pillar: "", topic: "", angle: "", description: "", cta: "" };
  const moment = new Date(item.scheduled_for);
  return {
    day: dayKey(moment),
    time: timeOf(moment),
    platform: item.platform,
    format: item.format,
    objective: item.objective,
    pillar: item.pillar,
    topic: item.topic,
    angle: item.angle,
    description: item.description,
    cta: item.cta,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The item to change; null to add one to `versionId`. */
  item: CalendarItem | null;
  versionId?: string;
  defaultDay: string;
  platforms: Platform[];
  pillars: string[];
}

export default function ItemDialog({ open, onOpenChange, item, versionId, defaultDay, platforms, pillars }: Props) {
  const [draft, setDraft] = useState<Draft>(() => fromItem(item, defaultDay, platforms[0] ?? "instagram"));
  const [error, setError] = useState("");
  const add = useAddItem();
  const update = useUpdateItem();
  const remove = useDeleteItem();
  const regenerate = useRegenerateItem();
  const lockedText = Boolean(item && !["proposed", "calendar_approved", "plan_generated", "plan_approved"].includes(item.status));

  useEffect(() => {
    if (open) {
      setDraft(fromItem(item, defaultDay, platforms[0] ?? "instagram"));
      setError("");
    }
  }, [open, item, defaultDay, platforms]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const busy = add.isPending || update.isPending || remove.isPending || regenerate.isPending;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    const scheduled_for = new Date(`${draft.day}T${draft.time}`).toISOString();
    const changes: ItemChanges = lockedText
      ? { scheduled_for }
      : { scheduled_for, platform: draft.platform, format: draft.format, objective: draft.objective, pillar: draft.pillar, topic: draft.topic, angle: draft.angle, description: draft.description, cta: draft.cta };
    try {
      if (item) await update.mutateAsync({ id: item.id, changes });
      else if (versionId) await add.mutateAsync({ ...changes, version: versionId });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't save it. Try again.");
    }
  };

  const again = async () => {
    if (!item) return;
    setError("");
    try {
      const fresh = await regenerate.mutateAsync(item.id);
      setDraft(fromItem(fresh, defaultDay, platforms[0] ?? "instagram"));
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't draft it again. Try again.");
    }
  };

  const deleteItem = async () => {
    if (!item) return;
    try {
      await remove.mutateAsync(item.id);
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't remove it.");
    }
  };

  const platformChoices = Array.from(new Set([...platforms, draft.platform]));

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 z-50 max-h-[90dvh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-card p-5 shadow-xl transition-[opacity,scale] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">{item ? "Change this item" : "Add an item"}</Dialog.Title>
              {item && <p className="mt-0.5 text-sm text-muted-foreground">{item.status_label}</p>}
            </div>
            <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon" })}>
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="item-day" className={labelClass}>
                  Day
                </label>
                <input id="item-day" type="date" value={draft.day} onChange={(event) => set("day", event.target.value)} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="item-time" className={labelClass}>
                  Time
                </label>
                <input id="item-time" type="time" value={draft.time} onChange={(event) => set("time", event.target.value)} className={inputClass} required />
              </div>
            </div>
            {lockedText ? (
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">Its post is under way, so only its day and time can change here.</p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="item-platform" className={labelClass}>
                      Platform
                    </label>
                    <select id="item-platform" value={draft.platform} onChange={(event) => set("platform", event.target.value as Platform)} className={inputClass}>
                      {platformChoices.map((platform) => (
                        <option key={platform} value={platform}>
                          {PLATFORMS.find((info) => info.id === platform)?.label ?? platform}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="item-format" className={labelClass}>
                      Format
                    </label>
                    <select id="item-format" value={draft.format} onChange={(event) => set("format", event.target.value)} className={inputClass}>
                      {FORMATS.map((format) => (
                        <option key={format.id} value={format.id}>
                          {format.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="item-topic" className={labelClass}>
                    Topic
                  </label>
                  <input id="item-topic" value={draft.topic} onChange={(event) => set("topic", event.target.value)} className={inputClass} maxLength={200} required />
                </div>
                <div>
                  <label htmlFor="item-angle" className={labelClass}>
                    Angle, in one line
                  </label>
                  <input id="item-angle" value={draft.angle} onChange={(event) => set("angle", event.target.value)} className={inputClass} maxLength={300} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="item-pillar" className={labelClass}>
                      Pillar
                    </label>
                    <input id="item-pillar" list="item-pillars" value={draft.pillar} onChange={(event) => set("pillar", event.target.value)} className={inputClass} maxLength={60} />
                    <datalist id="item-pillars">
                      {pillars.map((pillar) => (
                        <option key={pillar} value={pillar} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label htmlFor="item-objective" className={labelClass}>
                      Objective
                    </label>
                    <select id="item-objective" value={draft.objective} onChange={(event) => set("objective", event.target.value)} className={inputClass}>
                      <option value="">Not set</option>
                      {OBJECTIVES.map((objective) => (
                        <option key={objective.id} value={objective.id}>
                          {objective.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="item-description" className={labelClass}>
                    Description
                  </label>
                  <textarea id="item-description" value={draft.description} onChange={(event) => set("description", event.target.value)} rows={3} className={inputClass} maxLength={1000} />
                </div>
                <div>
                  <label htmlFor="item-cta" className={labelClass}>
                    Call to action
                  </label>
                  <input id="item-cta" value={draft.cta} onChange={(event) => set("cta", event.target.value)} className={inputClass} maxLength={200} />
                </div>
              </>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              <div className="flex gap-2">
                {item?.status === "proposed" && (
                  <button type="button" onClick={again} disabled={busy} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                    <RefreshCw aria-hidden="true" className="size-4" />
                    {regenerate.isPending ? "Drafting…" : "Another idea"}
                  </button>
                )}
                {item && !item.post_id && (
                  <button type="button" onClick={deleteItem} disabled={busy} className={buttonStyles({ variant: "danger-outline", size: "sm" })}>
                    <Trash2 aria-hidden="true" className="size-4" />
                    Remove
                  </button>
                )}
              </div>
              <button type="submit" disabled={busy} className={buttonStyles({ size: "sm" })}>
                {item ? "Save" : "Add"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
