import { useRef, useState, type DragEvent, type PointerEvent, type ReactNode } from "react";
import { Blend, Copy, Image as ImageIcon, Music, Plus, Scissors, Trash2, Type, Volume2, VolumeX, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatSeconds, textTimes, timeline, transitionOverlap, type Composition, type StudioAsset } from "../../lib/studio";
import { buttonStyles } from "../ui/button";
import { panelClass } from "./styles";

export type Selection = { kind: "scene" | "text" | "overlay" | "audio"; id: string } | null;
type Kind = NonNullable<Selection>["kind"];

interface Props {
  composition: Composition;
  assets: Record<string, StudioAsset>;
  time: number;
  onSeek: (seconds: number) => void;
  selected: Selection;
  onSelect: (selection: Selection) => void;
  onMoveScene: (from: number, to: number) => void;
  /** A scene's length dragged on the timeline. */
  onSceneLength: (id: string, seconds: number) => void;
  /** A text, logo or music moved or stretched to `start`–`end`, in seconds in the video. */
  onTime: (kind: "text" | "overlay" | "audio", id: string, start: number, end: number) => void;
  /** The marker between two scenes: choose how the second comes in. */
  onJunction: (sceneId: string) => void;
  onMuteScene: (id: string, muted: boolean) => void;
  onMuteAudio: (id: string, muted: boolean) => void;
  onAddText: () => void;
  onAddColor: () => void;
  /** The video's logo: add one, or select the one it has. */
  onLogo: () => void;
  /** Split the scene under the playhead; false when it's too near either end. */
  onSplit: () => boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}

const MIN_SECONDS = 0.2;
const LANE = 30;

type Drag = {
  kind: "text" | "overlay" | "audio" | "scene";
  id: string;
  mode: "move" | "start" | "end";
  pointer: number;
  x: number;
  from: number;
  to: number;
  start: number;
  end: number;
  /** How far the edge can go: the end of the video, or a clip's own length. */
  most: number;
  moved: boolean;
};

/** Texts put in lanes so ones at the same time sit one above the other, as CapCut's text tracks. */
function lanes(spans: { id: string; start: number; end: number }[]) {
  const ends: number[] = [];
  const lane: Record<string, number> = {};
  for (const span of [...spans].sort((a, b) => a.start - b.start)) {
    let index = ends.findIndex((end) => end <= span.start + 0.01);
    if (index < 0) index = ends.length;
    ends[index] = span.end;
    lane[span.id] = index;
  }
  return { lane, count: Math.max(ends.length, 1) };
}

/** The video laid out in time, as CapCut's: the clips (drag to reorder, drag the right edge to lengthen, the markers
 * between them for transitions, each clip's sound on or off), then texts, logo and music, each dragged to move or by
 * either edge to stretch, as long as wanted across the video. */
export default function Timeline(props: Props) {
  const { composition, assets, time, onSeek, selected, onSelect } = props;
  const [scale, setScale] = useState(48); // pixels a second
  const [dragging, setDragging] = useState<number | null>(null);
  const [dropAt, setDropAt] = useState<number | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [note, setNote] = useState("");
  const dragRef = useRef<Drag | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const { starts, length } = timeline(composition);
  const width = Math.max(length * scale + 160, 320);
  const at = (seconds: number) => seconds * scale;
  const isSelected = (kind: Kind, id: string) => selected?.kind === kind && selected.id === id;

  const seekFrom = (event: PointerEvent<HTMLElement>) => {
    const box = track.current?.getBoundingClientRect();
    if (!box) return;
    onSeek(Math.min(Math.max((event.clientX - box.left) / scale, 0), length));
  };

  const drop = (event: DragEvent, index: number) => {
    event.preventDefault();
    if (dragging !== null && dragging !== index) props.onMoveScene(dragging, index);
    setDragging(null);
    setDropAt(null);
  };

  // Moving and stretching ------------------------------------------------------------------------------------------

  const dragged = (event: PointerEvent, current: Drag): Drag => {
    const change = (event.clientX - current.x) / scale;
    const moved = current.moved || Math.abs(event.clientX - current.x) > 3;
    if (current.mode === "move") {
      const span = current.to - current.from;
      const start = Math.min(Math.max(current.from + change, 0), Math.max(current.most - span, 0));
      return { ...current, moved, start, end: start + span };
    }
    if (current.mode === "start") {
      return { ...current, moved, start: Math.min(Math.max(current.from + change, 0), current.to - MIN_SECONDS) };
    }
    return { ...current, moved, end: Math.max(Math.min(current.to + change, current.most), current.from + MIN_SECONDS) };
  };

  const grab = (kind: Drag["kind"], id: string, mode: Drag["mode"], span: [number, number], most: number) => ({
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const next: Drag = { kind, id, mode, pointer: event.pointerId, x: event.clientX, from: span[0], to: span[1], start: span[0], end: span[1], most, moved: false };
      dragRef.current = next;
      setDrag(next);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = dragRef.current;
      if (!current || current.pointer !== event.pointerId) return;
      const next = dragged(event, current);
      dragRef.current = next;
      setDrag(next);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const current = dragRef.current;
      if (!current || current.pointer !== event.pointerId) return;
      const next = dragged(event, current);
      dragRef.current = null;
      setDrag(null);
      if (next.kind !== "scene") onSelect({ kind: next.kind, id: next.id });
      if (!next.moved) return;
      if (next.kind === "scene") props.onSceneLength(next.id, next.end - next.start);
      else props.onTime(next.kind, next.id, next.start, next.end);
    },
    onPointerCancel: (event: PointerEvent<HTMLElement>) => {
      if (dragRef.current?.pointer !== event.pointerId) return;
      dragRef.current = null;
      setDrag(null);
    },
  });

  /** Where an item shows while it's being dragged. */
  const live = (kind: Drag["kind"], id: string, span: [number, number]): [number, number] =>
    drag?.kind === kind && drag.id === id ? [drag.start, drag.end] : span;

  /** A text, logo or music bar: drag it to move it, or an edge to stretch it. */
  const bar = (kind: "text" | "overlay" | "audio", id: string, span: [number, number], top: number, label: string, icon: ReactNode, tone: string, extra?: ReactNode) => {
    const [start, end] = live(kind, id, span);
    const chosen = isSelected(kind, id);
    const name = kind === "text" ? "text" : kind === "overlay" ? "logo" : "music";
    return (
      <div
        key={id}
        className={cn("absolute h-6", chosen && "z-10")}
        style={{ left: at(start), width: Math.max(at(end - start), 24), top }}
      >
        <button
          type="button"
          {...grab(kind, id, "move", span, length)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onSelect({ kind, id });
            }
          }}
          aria-pressed={chosen}
          aria-label={`${label}, ${formatSeconds(span[0])} to ${formatSeconds(span[1])}. Drag to move.`}
          title="Drag to move; drag either edge to stretch"
          className={cn(
            "absolute inset-0 flex cursor-grab touch-none items-center gap-1 overflow-hidden rounded-md border px-2.5 text-[11px] active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-primary",
            tone,
            chosen && "ring-2 ring-primary",
          )}
        >
          {icon}
          <span className="truncate">{label}</span>
        </button>
        {extra}
        {(["start", "end"] as const).map((edge) => (
          <span
            key={edge}
            role="presentation"
            {...grab(kind, id, edge, span, length)}
            title={edge === "start" ? `Drag to change when the ${name} starts` : `Drag to change when the ${name} ends`}
            className={cn(
              "absolute inset-y-0 z-10 w-2 cursor-ew-resize touch-none bg-black/25 hover:bg-primary",
              edge === "start" ? "left-0 rounded-l-md" : "right-0 rounded-r-md",
              chosen ? "opacity-100" : "opacity-0 hover:opacity-100",
            )}
          />
        ))}
      </div>
    );
  };

  // Rows ---------------------------------------------------------------------------------------------------------------

  const textSpans = composition.texts
    .map((text) => ({ text, span: textTimes(text, composition, starts) }))
    .filter((item): item is { text: Composition["texts"][number]; span: [number, number] } => item.span !== null);
  const textLanes = lanes(textSpans.map(({ text, span }) => ({ id: text.id, start: span[0], end: span[1] })));
  const selectedScene = selected?.kind === "scene" ? composition.scenes.find((scene) => scene.id === selected.id) : undefined;

  return (
    <section aria-label="Timeline" className={cn(panelClass, "p-3")}>
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setNote(props.onSplit() ? "" : "Move the playhead inside a clip, at least half a second from its ends, to split it.")}
          disabled={!composition.scenes.length}
          title="Split the clip at the playhead"
          className={buttonStyles({ variant: "secondary", size: "sm" })}
        >
          <Scissors aria-hidden="true" className="size-3.5" />
          Split
        </button>
        <button type="button" onClick={props.onDuplicate} disabled={!selectedScene} title="Duplicate the selected clip" className={buttonStyles({ variant: "secondary", size: "sm" })}>
          <Copy aria-hidden="true" className="size-3.5" />
          Duplicate
        </button>
        <button type="button" onClick={props.onDelete} disabled={!selected} title="Delete what's selected (Delete key)" className={buttonStyles({ variant: "secondary", size: "sm" })}>
          <Trash2 aria-hidden="true" className="size-3.5" />
          Delete
        </button>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-border" />
        <button type="button" onClick={props.onAddText} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          <Type aria-hidden="true" className="size-3.5" />
          Text
        </button>
        <button type="button" onClick={props.onAddColor} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          <Plus aria-hidden="true" className="size-3.5" />
          Title card
        </button>
        <button
          type="button"
          onClick={props.onLogo}
          title={composition.overlays.length ? "Select the logo" : "Add a logo to the whole video"}
          className={buttonStyles({ variant: "secondary", size: "sm" })}
        >
          <ImageIcon aria-hidden="true" className="size-3.5" />
          Logo
        </button>
        <p className="ml-auto text-sm font-medium text-foreground tabular-nums">
          {formatSeconds(time)} <span className="text-muted-foreground">/ {formatSeconds(length)}</span>
        </p>
        <button type="button" aria-label="Zoom out the timeline" onClick={() => setScale((value) => Math.max(value / 1.5, 8))} className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}>
          <ZoomOut aria-hidden="true" className="size-4" />
        </button>
        <button type="button" aria-label="Zoom in the timeline" onClick={() => setScale((value) => Math.min(value * 1.5, 240))} className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}>
          <ZoomIn aria-hidden="true" className="size-4" />
        </button>
      </div>
      {note && (
        <p role="status" className="mb-2 text-xs text-amber-800">
          {note}
        </p>
      )}

      <div className="overflow-x-auto pb-1">
        <div ref={track} className="relative select-none" style={{ width }}>
          {/* The ruler: click or drag on it to move the playhead. */}
          <div
            title="Click or drag to move the playhead"
            className="relative h-6 cursor-pointer border-b border-border"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              seekFrom(event);
            }}
            onPointerMove={(event) => event.buttons === 1 && seekFrom(event)}
          >
            {Array.from({ length: Math.floor(length) + 1 }, (_, second) =>
              second % (scale < 14 ? 10 : scale < 30 ? 5 : 1) === 0 ? (
                <span key={second} className="absolute top-0 h-full border-l border-border pl-1 text-[10px] text-muted-foreground tabular-nums" style={{ left: at(second) }}>
                  {second}s
                </span>
              ) : null,
            )}
          </div>

          <div className="mt-1.5 space-y-1.5" onPointerDown={(event) => event.target === event.currentTarget && seekFrom(event)}>
            {/* Clips */}
            <ol className="relative h-16" aria-label="Clips">
              {composition.scenes.map((scene, index) => {
                const asset = scene.asset ? assets[scene.asset] : undefined;
                const placeholder = scene.type === "placeholder";
                const [, end] = live("scene", scene.id, [starts[index], starts[index] + scene.duration]);
                const shown = end - starts[index];
                // Drawn edge to edge, as CapCut does: a transition's overlap is split between the two clips, with
                // its marker at the join.
                const lead = index > 0 ? transitionOverlap(scene) / 2 : 0;
                const next = composition.scenes[index + 1];
                const tail = next ? transitionOverlap(next) / 2 : 0;
                const sounding = scene.type === "media" && asset?.kind === "video" && asset.has_audio;
                const most = asset?.kind === "video" && asset.duration ? starts[index] + Math.min(asset.duration - scene.trim_start, 60) : starts[index] + 60;
                const name = placeholder ? scene.label || "Add media" : (asset?.name ?? (scene.type === "color" ? "Title card" : "Media"));
                return (
                  <li
                    key={scene.id}
                    className={cn("absolute top-0 h-full", isSelected("scene", scene.id) && "z-10")}
                    style={{ left: at(starts[index] + lead), width: Math.max(at(shown - lead - tail) - 2, 14) }}
                    draggable={!drag}
                    onDragStart={(event) => {
                      // Not while an edge is being dragged.
                      if (dragRef.current) {
                        event.preventDefault();
                        return;
                      }
                      setDragging(index);
                      event.dataTransfer.effectAllowed = "move";
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDropAt(index);
                    }}
                    onDragLeave={() => setDropAt((value) => (value === index ? null : value))}
                    onDrop={(event) => drop(event, index)}
                    onDragEnd={() => {
                      setDragging(null);
                      setDropAt(null);
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect({ kind: "scene", id: scene.id })}
                      aria-pressed={isSelected("scene", scene.id)}
                      aria-label={`Clip ${index + 1}: ${name}, ${scene.duration} seconds`}
                      className={cn(
                        "relative size-full overflow-hidden rounded-md text-left focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                        placeholder ? "border-2 border-dashed border-amber-500 bg-amber-50" : "border border-black/10 bg-gray-800",
                        isSelected("scene", scene.id) && "ring-2 ring-primary ring-offset-1",
                        dropAt === index && dragging !== index && "outline-2 outline-primary",
                        dragging === index && "opacity-50",
                      )}
                      style={scene.type === "color" ? { background: scene.color } : undefined}
                    >
                      {asset?.thumbnail_url && (
                        <span
                          aria-hidden="true"
                          className="absolute inset-0 bg-repeat-x"
                          style={{ backgroundImage: `url("${asset.thumbnail_url}")`, backgroundSize: "auto 100%" }}
                        />
                      )}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        {index + 1}. {name} · {shown.toFixed(1)}s
                      </span>
                    </button>
                    {sounding && (
                      <button
                        type="button"
                        onClick={() => props.onMuteScene(scene.id, !scene.muted)}
                        aria-pressed={scene.muted}
                        aria-label={scene.muted ? `Turn on clip ${index + 1}'s sound` : `Mute clip ${index + 1}`}
                        title={scene.muted ? "This clip's sound is off" : "Mute this clip's sound"}
                        className={cn(
                          "absolute top-1 left-1 grid size-6 place-items-center rounded bg-black/60 text-white hover:bg-black/80 focus-visible:outline-2 focus-visible:outline-primary",
                          scene.muted && "bg-red-600/90 hover:bg-red-600",
                        )}
                      >
                        {scene.muted ? <VolumeX aria-hidden="true" className="size-3.5" /> : <Volume2 aria-hidden="true" className="size-3.5" />}
                      </button>
                    )}
                    {/* Drag the right edge to make the clip longer or shorter. */}
                    <span
                      role="presentation"
                      {...grab("scene", scene.id, "end", [starts[index], starts[index] + scene.duration], most)}
                      title="Drag to change how long this clip lasts"
                      className={cn(
                        "absolute inset-y-0 right-0 z-10 w-2.5 cursor-ew-resize touch-none rounded-r-md bg-white/70 hover:bg-primary",
                        isSelected("scene", scene.id) ? "opacity-100" : "opacity-0 hover:opacity-100",
                      )}
                    />
                    {/* The marker between this clip and the one before: how this one comes in. */}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => props.onJunction(scene.id)}
                        aria-label={scene.transition.type === "none" ? `Add a transition into clip ${index + 1}` : `Change the transition into clip ${index + 1}`}
                        title={scene.transition.type === "none" ? "Add a transition" : "Change the transition"}
                        className={cn(
                          "absolute top-1/2 z-20 grid size-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded border text-[10px] font-bold shadow-sm focus-visible:outline-2 focus-visible:outline-primary",
                          scene.transition.type === "none" ? "border-border bg-white text-muted-foreground hover:text-foreground" : "border-primary bg-primary text-white",
                        )}
                        style={{ left: -1 }}
                      >
                        {scene.transition.type === "none" ? <Plus aria-hidden="true" className="size-3" /> : <Blend aria-hidden="true" className="size-3" />}
                      </button>
                    )}
                  </li>
                );
              })}
              {composition.scenes.length === 0 && (
                <li className="absolute inset-y-0 left-0 grid w-80 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
                  Add photos or clips from your media
                </li>
              )}
            </ol>

            {/* Texts, in as many lanes as overlap */}
            {textSpans.length > 0 && (
              <div className="relative" style={{ height: textLanes.count * LANE }} aria-label="Texts">
                {textSpans.map(({ text, span }) =>
                  bar(
                    "text",
                    text.id,
                    span,
                    textLanes.lane[text.id] * LANE + 2,
                    text.text.split("\n")[0] || "Text",
                    <Type aria-hidden="true" className="size-3 shrink-0" />,
                    "border-sky-300 bg-sky-50 text-sky-900",
                  ),
                )}
              </div>
            )}

            {/* Logo */}
            {composition.overlays.length > 0 && (
              <div className="relative" style={{ height: composition.overlays.length * LANE }} aria-label="Logo">
                {composition.overlays.map((overlay, index) =>
                  bar(
                    "overlay",
                    overlay.id,
                    [overlay.start, overlay.end ?? length],
                    index * LANE + 2,
                    (overlay.asset && assets[overlay.asset]?.name) || "Logo",
                    <ImageIcon aria-hidden="true" className="size-3 shrink-0" />,
                    "border-violet-300 bg-violet-50 text-violet-900",
                  ),
                )}
              </div>
            )}

            {/* Music */}
            {composition.audio.length > 0 && (
              <div className="relative" style={{ height: composition.audio.length * LANE }} aria-label="Music">
                {composition.audio.map((audioTrack, index) => {
                  const asset = audioTrack.asset ? assets[audioTrack.asset] : undefined;
                  const end = audioTrack.duration !== null ? Math.min(audioTrack.start + audioTrack.duration, length) : length;
                  return bar(
                    "audio",
                    audioTrack.id,
                    [audioTrack.start, Math.max(end, audioTrack.start + MIN_SECONDS)],
                    index * LANE + 2,
                    `${asset?.name ?? "Music"}${audioTrack.muted ? " (muted)" : ""}`,
                    audioTrack.muted ? <VolumeX aria-hidden="true" className="size-3 shrink-0" /> : <Music aria-hidden="true" className="size-3 shrink-0" />,
                    cn("border-emerald-300 bg-emerald-50 pr-9 text-emerald-900", audioTrack.muted && "border-red-300 bg-red-50 text-red-900"),
                    <button
                      type="button"
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => props.onMuteAudio(audioTrack.id, !audioTrack.muted)}
                      aria-pressed={audioTrack.muted}
                      aria-label={audioTrack.muted ? `Turn on ${asset?.name ?? "the music"}` : `Mute ${asset?.name ?? "the music"}`}
                      title={audioTrack.muted ? "The music is off" : "Mute the music"}
                      className={cn(
                        "absolute top-1/2 right-3 z-20 grid size-5 -translate-y-1/2 place-items-center rounded focus-visible:outline-2 focus-visible:outline-primary",
                        audioTrack.muted ? "bg-red-600 text-white" : "bg-white/80 text-emerald-900 hover:bg-white",
                      )}
                    >
                      {audioTrack.muted ? <VolumeX aria-hidden="true" className="size-3" /> : <Volume2 aria-hidden="true" className="size-3" />}
                    </button>,
                  );
                })}
              </div>
            )}
          </div>

          {/* The playhead */}
          <span aria-hidden="true" className="pointer-events-none absolute top-0 bottom-0 z-30 w-0.5 bg-red-500" style={{ left: at(Math.min(time, length)) }} />
        </div>
      </div>
      <p className="mt-1 text-[11px] text-pretty text-muted-foreground">
        Drag clips to reorder them and their right edge to change their length. Drag a text, the logo or the music to
        move it, or either edge to stretch it across as many clips as you like. The marker between two clips sets the
        transition.
      </p>
    </section>
  );
}
