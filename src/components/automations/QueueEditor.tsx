import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Clapperboard, LoaderCircle, Trash2 } from "lucide-react";
import MediaPicker from "./MediaPicker";
import { ErrorNote } from "./parts";
import { buttonStyles } from "../ui/button";
import { cn } from "../../lib/cn";
import { useClips } from "../../lib/clips";
import { formatDuration } from "../../lib/format";
import { useAddTopics, useOrderTopics, useRemoveTopic, type AutomationDetail, type Topic } from "../../lib/automations";

function Thumb({ url }: { url: string | null | undefined }) {
  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground">
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <Clapperboard aria-hidden="true" className="size-4" />}
    </span>
  );
}

/** The clips or videos waiting to be posted, in order: move them, take them out, add more. */
export default function QueueEditor({ automation, what }: { automation: AutomationDetail; what: "clips" | "videos" }) {
  const add = useAddTopics(automation.id);
  const order = useOrderTopics(automation.id);
  const remove = useRemoveTopic(automation.id);
  const items = automation.topics.filter((item) => (what === "clips" ? item.clip : item.video));
  const waiting = items.filter((item) => !item.used_at);
  const posted = items.filter((item) => item.used_at);

  const move = (item: Topic, by: number) => {
    const ids = waiting.map((entry) => entry.id);
    const at = ids.indexOf(item.id);
    const to = at + by;
    if (to < 0 || to >= ids.length) return;
    [ids[at], ids[to]] = [ids[to], ids[at]];
    order.mutate([...ids, ...posted.map((entry) => entry.id)]);
  };

  return (
    <div className="space-y-4">
      {(add.error || order.error || remove.error) && <ErrorNote>{(add.error || order.error || remove.error)?.message}</ErrorNote>}
      {waiting.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No {what} waiting yet. Add some below; they&apos;re posted in this order, one for each slot.
        </p>
      ) : (
        <ol className="divide-y divide-border rounded-lg border border-border" aria-label={`${what === "clips" ? "Clips" : "Videos"} waiting to be posted`}>
          {waiting.map((item, index) => {
            const media = item.clip ?? item.video;
            const seconds = item.clip?.duration ?? item.video?.duration;
            return (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                <span className="w-5 text-right text-xs text-muted-foreground tabular-nums">{index + 1}</span>
                <Thumb url={media?.thumbnail_url} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{item.text}</span>
                  <span className="block text-xs text-muted-foreground tabular-nums">{seconds ? formatDuration(seconds) : ""}</span>
                </span>
                <button type="button" onClick={() => move(item, -1)} disabled={index === 0 || order.isPending} aria-label={`Move “${item.text}” up`} className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}>
                  <ArrowUp aria-hidden="true" className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(item, 1)}
                  disabled={index === waiting.length - 1 || order.isPending}
                  aria-label={`Move “${item.text}” down`}
                  className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
                >
                  <ArrowDown aria-hidden="true" className="size-4" />
                </button>
                <button type="button" onClick={() => remove.mutate(item.id)} disabled={remove.isPending} aria-label={`Take “${item.text}” off the list`} className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}>
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
      {posted.length > 0 && <p className="text-xs text-muted-foreground tabular-nums">{posted.length} already posted by this automation.</p>}
      {what === "clips" ? <AddClips automation={automation} adding={add.isPending} onAdd={(ids) => add.mutate({ clips: ids })} /> : <AddVideos adding={add.isPending} onAdd={(ids) => add.mutate({ videos: ids })} />}
    </div>
  );
}

function AddClips({ automation, adding, onAdd }: { automation: AutomationDetail; adding: boolean; onAdd: (ids: string[]) => void }) {
  const clips = useClips({ status: "made" });
  const [chosen, setChosen] = useState<string[]>([]);
  const listed = new Set(automation.topics.filter((item) => item.clip && !item.used_at).map((item) => item.clip!.id));
  const usable = (clips.data?.results ?? []).filter((clip) => clip.status === "ready" && clip.video_url && !listed.has(clip.id));
  const toggle = (id: string) => setChosen((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));

  return (
    <div className="space-y-3 rounded-lg bg-secondary/50 p-3">
      <p className="text-sm font-medium text-foreground">Add clips from your recordings</p>
      {clips.isPending ? (
        <div aria-busy="true" className="h-20 animate-pulse rounded-lg bg-secondary" />
      ) : clips.isError ? (
        <ErrorNote>{clips.error.message}</ErrorNote>
      ) : usable.length === 0 ? (
        <p className="text-sm text-pretty text-muted-foreground">No more made clips. Make clips from a recording on its Clips tab, then add them here.</p>
      ) : (
        <ul className="grid max-h-80 gap-2 overflow-y-auto sm:grid-cols-2">
          {usable.map((clip) => {
            const on = chosen.includes(clip.id);
            return (
              <li key={clip.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(clip.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border bg-card p-2 text-left focus-visible:outline-2 focus-visible:outline-primary",
                    on ? "border-primary" : "border-border hover:border-muted-foreground/40",
                  )}
                >
                  <Thumb url={clip.thumbnail_url} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{clip.title}</span>
                    <span className="block truncate text-xs text-muted-foreground tabular-nums">
                      {clip.project_name} · {formatDuration(clip.duration)}
                    </span>
                  </span>
                  <span className={cn("grid size-5 shrink-0 place-items-center rounded border", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                    {on && <Check aria-hidden="true" className="size-3.5" />}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        disabled={!chosen.length || adding}
        onClick={() => {
          onAdd(chosen);
          setChosen([]);
        }}
        className={buttonStyles({ variant: "secondary", size: "sm" })}
      >
        {adding && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Add {chosen.length || ""} {chosen.length === 1 ? "clip" : "clips"} to the list
      </button>
    </div>
  );
}

function AddVideos({ adding, onAdd }: { adding: boolean; onAdd: (ids: string[]) => void }) {
  const [chosen, setChosen] = useState<string[]>([]);
  return (
    <div className="space-y-3 rounded-lg bg-secondary/50 p-3">
      <p className="text-sm font-medium text-foreground">Add videos</p>
      <p className="text-xs text-pretty text-muted-foreground">Choose from your uploads, or upload more (up to 10 minutes each). They&apos;re added in the order you choose them.</p>
      <MediaPicker kinds={["video"]} selected={chosen} onChange={setChosen} label="videos" />
      <button
        type="button"
        disabled={!chosen.length || adding}
        onClick={() => {
          onAdd(chosen);
          setChosen([]);
        }}
        className={buttonStyles({ variant: "secondary", size: "sm" })}
      >
        {adding && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
        Add {chosen.length || ""} {chosen.length === 1 ? "video" : "videos"} to the list
      </button>
    </div>
  );
}
