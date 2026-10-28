import { useState, type ReactNode } from "react"
import {
  Blend,
  Check,
  ExternalLink,
  Film,
  Image as ImageIcon,
  LoaderCircle,
  Music,
  Sparkles,
  Trash2,
  Type,
  Upload,
  WandSparkles,
  X,
  type LucideIcon,
} from "lucide-react"
import { cn } from "../../lib/cn"
import { formatDuration } from "../../lib/format"
import {
  SCENE_EFFECTS,
  TRANSITIONS,
  fontFor,
  formatSeconds,
  useUploadAsset,
  type Composition,
  type SceneEffect,
  type StudioAsset,
  type TransitionType,
} from "../../lib/studio"
import ConfirmDialog from "../ui/ConfirmDialog"
import { buttonStyles } from "../ui/button"
import EarlierUploads from "./EarlierUploads"
import { usesOf, type TextStyle } from "./edits"
import MusicSearch, { PlayIcon, playLabel, usePreviewPlayer } from "./MusicSearch"
import { EFFECT_FILTERS } from "./Preview"
import { panelClass } from "./styles"

export type PanelTab = "assistant" | "media" | "audio" | "text" | "transitions" | "filters"

const TABS: { id: Exclude<PanelTab, "assistant">; label: string; icon: LucideIcon }[] = [
  { id: "media", label: "Media", icon: ImageIcon },
  { id: "audio", label: "Audio", icon: Music },
  { id: "text", label: "Text", icon: Type },
  { id: "transitions", label: "Transitions", icon: Blend },
  { id: "filters", label: "Filters", icon: Sparkles },
]

interface Props {
  projectId: string
  tab: PanelTab
  onTab: (tab: PanelTab) => void
  /** The "Ask AI" tab's content. */
  assistant: ReactNode
  /** While the AI assistant works: the other tabs wait. */
  locked: boolean
  composition: Composition
  /** The project's own media, newest first. */
  media: StudioAsset[]
  /** Every asset the editor knows, by id. */
  assets: Record<string, StudioAsset>
  /** The clip selected on the timeline, for Replace, a transition or a filter. */
  selectedScene: { index: number; id: string } | null
  /** An upload or a song added to this video's media. */
  onUploaded: (asset: StudioAsset) => void
  onAddScene: (asset: StudioAsset) => void
  onReplace: (asset: StudioAsset) => void
  onMusic: (asset: StudioAsset) => void
  /** Earlier uploads brought into this video. */
  onBringIn: (assets: StudioAsset[]) => Promise<void>
  /** Taken out of this video, with everything in it that uses it. */
  onRemove: (asset: StudioAsset) => Promise<void>
  onAddText: (style: TextStyle) => void
  onTransition: (type: TransitionType, all: boolean) => void
  onFilter: (effect: SceneEffect, all: boolean) => void
}

/** CapCut's left panel: this video's media, music, text styles, transitions and filters, and above them the AI
 * assistant. */
export default function LeftPanel(props: Props) {
  return (
    <section aria-label="Media and effects" className={cn(panelClass, "flex min-h-0 flex-1 flex-col overflow-hidden")}>
      <div role="tablist" aria-label="Panels" className="grid grid-cols-5 border-b border-border">
        <button
          role="tab"
          type="button"
          aria-selected={props.tab === "assistant"}
          onClick={() => props.onTab("assistant")}
          className={cn(
            "col-span-5 flex items-center justify-center gap-1.5 border-b border-border px-2 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
            props.tab === "assistant" ? "bg-primary/5 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          <WandSparkles aria-hidden="true" className="size-4" />
          Ask AI to change it
        </button>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={props.tab === id}
            disabled={props.locked}
            onClick={() => props.onTab(id)}
            className={cn(
              "flex flex-col items-center gap-0.5 border-b-2 px-1 py-2 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
              props.tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-y-auto p-3">
        {props.tab === "assistant" && props.assistant}
        {props.tab === "media" && <MediaTab {...props} />}
        {props.tab === "audio" && <AudioTab {...props} />}
        {props.tab === "text" && <TextTab onAddText={props.onAddText} />}
        {props.tab === "transitions" && <TransitionsTab {...props} />}
        {props.tab === "filters" && <FiltersTab {...props} />}
      </div>
    </section>
  )
}

/* ---------- Media ---------- */

type Sending = { id: string; name: string; fraction: number; error: string }

/** Uploads into this video, one after another, with their progress. */
function useSend(projectId: string, onUploaded: (asset: StudioAsset) => void) {
  const upload = useUploadAsset()
  const [sending, setSending] = useState<Sending[]>([])
  const send = async (files: FileList | File[] | null, after?: (asset: StudioAsset) => void) => {
    if (!files) return
    for (const file of Array.from(files)) {
      const id = `${file.name}-${file.size}-${Date.now()}`
      setSending((items) => [...items, { id, name: file.name, fraction: 0, error: "" }])
      try {
        const asset = await upload.mutateAsync({
          file,
          project: projectId,
          onProgress: (fraction) => setSending((items) => items.map((item) => (item.id === id ? { ...item, fraction } : item))),
        })
        setSending((items) => items.filter((item) => item.id !== id))
        onUploaded(asset)
        after?.(asset)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Couldn't upload this file."
        setSending((items) => items.map((item) => (item.id === id ? { ...item, error: message } : item)))
      }
    }
  }
  return { sending, send, dismiss: (id: string) => setSending((items) => items.filter((item) => item.id !== id)) }
}

function SendingList({ sending, dismiss }: { sending: Sending[]; dismiss: (id: string) => void }) {
  if (!sending.length) return null
  return (
    <ul className="space-y-1.5">
      {sending.map((item) => (
        <li key={item.id} className="text-xs">
          <div className="flex items-center gap-1">
            <p className="min-w-0 flex-1 truncate text-foreground">{item.name}</p>
            {item.error && (
              <button type="button" aria-label="Dismiss" onClick={() => dismiss(item.id)} className="text-muted-foreground hover:text-foreground">
                <X aria-hidden="true" className="size-3.5" />
              </button>
            )}
          </div>
          {item.error ? (
            <p role="alert" className="text-pretty text-red-700">
              {item.error}
            </p>
          ) : (
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label={`Uploading ${item.name}`} aria-valuenow={Math.round(item.fraction * 100)}>
              <div className="h-full origin-left bg-primary transition-transform" style={{ transform: `scaleX(${item.fraction})` }} />
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function MediaTab({ projectId, composition, media, selectedScene, onUploaded, onAddScene, onReplace, onMusic, onBringIn, onRemove }: Props) {
  const { sending, send, dismiss } = useSend(projectId, onUploaded)
  const [earlier, setEarlier] = useState(false)
  const visual = media.filter((asset) => asset.kind !== "audio")
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label htmlFor="studio-upload" className={buttonStyles({ size: "sm", className: "cursor-pointer" })}>
          <Upload aria-hidden="true" className="size-3.5" />
          Import
        </label>
        <button type="button" onClick={() => setEarlier(true)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          Earlier uploads
        </button>
      </div>
      <input
        id="studio-upload"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp,image/heic,.heic,.heif,video/mp4,video/quicktime,video/webm,.m4v,.mkv,audio/mpeg,audio/mp4,audio/wav,audio/aac,.m4a,.flac,.ogg"
        className="sr-only"
        onChange={(event) => {
          void send(event.target.files)
          event.target.value = ""
        }}
      />
      <SendingList sending={sending} dismiss={dismiss} />
      {visual.length === 0 && !sending.length ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-pretty text-muted-foreground">
          Import the photos and clips for this video, or bring in earlier uploads. Add a logo from the timeline or the Video panel.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2">
          {visual.map((asset) => (
            <MediaTile
              key={asset.id}
              asset={asset}
              composition={composition}
              canReplace={selectedScene !== null}
              onAddScene={onAddScene}
              onReplace={onReplace}
              onMusic={onMusic}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
      <p className="text-[11px] text-pretty text-muted-foreground">Click a photo or clip to add it to the end, or after the selected one.</p>
      <EarlierUploads open={earlier} onOpenChange={setEarlier} inProject={media} onBringIn={onBringIn} />
    </div>
  )
}

function MediaTile({
  asset,
  composition,
  canReplace,
  onAddScene,
  onReplace,
  onMusic,
  onRemove,
}: {
  asset: StudioAsset
  composition: Composition
  canReplace: boolean
  onAddScene: Props["onAddScene"]
  onReplace: Props["onReplace"]
  onMusic: Props["onMusic"]
  onRemove: Props["onRemove"]
}) {
  const ready = asset.status === "ready"
  const Icon = asset.kind === "video" ? Film : ImageIcon
  const uses = usesOf(composition, asset.id)
  const used = uses.scenes + uses.overlays + uses.audio
  const description = used
    ? `It's used ${[uses.scenes ? `in ${uses.scenes} scene${uses.scenes > 1 ? "s" : ""}` : "", uses.overlays ? "as the logo" : "", uses.audio ? "as music" : ""].filter(Boolean).join(" and ")}. Those are taken out of the video too. The file stays in your earlier uploads.`
    : "It's taken out of this video's media. The file stays in your earlier uploads, so you can bring it back."
  return (
    <li className="group relative flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-white">
      <button
        type="button"
        disabled={!ready}
        onClick={() => onAddScene(asset)}
        aria-label={`Add ${asset.name} to the video`}
        className="relative aspect-video bg-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary disabled:cursor-wait"
      >
        {asset.thumbnail_url ? (
          <img src={asset.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="absolute inset-0 grid place-items-center text-muted-foreground">
            <Icon aria-hidden="true" className="size-5" />
          </span>
        )}
        {asset.kind === "video" && asset.duration ? (
          <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] text-white tabular-nums">{formatSeconds(asset.duration)}</span>
        ) : null}
        {used > 0 && (
          <span className="absolute top-1 left-1 grid size-4 place-items-center rounded-full bg-primary text-white" title="In the video">
            <Check aria-hidden="true" className="size-2.5" strokeWidth={3} />
          </span>
        )}
        {asset.status === "processing" && (
          <span className="absolute inset-0 grid place-items-center bg-white/75 text-[11px] font-medium text-foreground">
            <span className="flex items-center gap-1">
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
              Getting ready
            </span>
          </span>
        )}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-1.5">
        <p className="truncate text-[11px] font-medium text-foreground" title={asset.name}>
          {asset.name}
        </p>
        {asset.status === "failed" ? (
          <p className="text-[11px] text-pretty text-red-700">{asset.error}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-1">
            {canReplace && (
              <button type="button" disabled={!ready} onClick={() => onReplace(asset)} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-6 px-1.5 text-[11px]" })}>
                Replace
              </button>
            )}
            {asset.kind === "video" && asset.has_audio && (
              <button type="button" disabled={!ready} onClick={() => onMusic(asset)} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-6 px-1.5 text-[11px]" })}>
                Sound
              </button>
            )}
            <ConfirmDialog
              trigger={
                <button type="button" aria-label={`Remove ${asset.name} from this video`} className={buttonStyles({ variant: "ghost", size: "icon", className: "ml-auto size-6" })}>
                  <Trash2 aria-hidden="true" className="size-3.5" />
                </button>
              }
              title={`Remove “${asset.name}” from this video?`}
              description={description}
              confirmLabel="Remove"
              onConfirm={() => void onRemove(asset)}
            />
          </div>
        )}
      </div>
    </li>
  )
}

/* ---------- Audio ---------- */

function AudioTab({ projectId, composition, media, assets, onUploaded, onMusic }: Props) {
  const player = usePreviewPlayer()
  const { listen } = player
  const { sending, send, dismiss } = useSend(projectId, onUploaded)
  const music = composition.audio.find((track) => !track.muted) ?? composition.audio[0]
  const ownMusic = media.filter((asset) => asset.kind === "audio")
  const chosenUrl = music?.asset ? assets[music.asset]?.source_url : null

  return (
    <div className="space-y-3">
      <MusicSearch project={projectId} chosenUrl={chosenUrl} onPick={onMusic} player={player} />

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground">Your music</h4>
          <label htmlFor="studio-music-upload" className={buttonStyles({ variant: "secondary", size: "sm", className: "h-7 cursor-pointer px-2" })}>
            <Upload aria-hidden="true" className="size-3.5" />
            Upload
          </label>
          <input
            id="studio-music-upload"
            type="file"
            multiple
            accept="audio/mpeg,audio/mp4,audio/wav,audio/aac,.m4a,.flac,.ogg"
            className="sr-only"
            onChange={(event) => {
              void send(event.target.files, (asset) => onMusic(asset))
              event.target.value = ""
            }}
          />
        </div>
        <SendingList sending={sending} dismiss={dismiss} />
        {ownMusic.length === 0 ? (
          <p className="text-[11px] text-muted-foreground">Music you upload, or use from the search, shows here.</p>
        ) : (
          <ul className="divide-y divide-border">
            {ownMusic.map((asset) => (
              <li key={asset.id} className="flex items-center gap-2 py-1.5">
                <button
                  type="button"
                  disabled={asset.status !== "ready"}
                  onClick={() => listen(asset.id, asset.url)}
                  aria-label={playLabel(player, asset.id, asset.name)}
                  className={buttonStyles({ variant: "secondary", size: "icon", className: "size-7" })}
                >
                  {asset.status === "processing" ? (
                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  ) : (
                    <PlayIcon player={player} id={asset.id} className="size-3.5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-foreground">{asset.name}</p>
                  <p className={cn("truncate text-[11px]", player.failed === asset.id ? "text-red-700" : "text-muted-foreground")}>
                    {asset.status === "processing"
                      ? "Getting ready…"
                      : asset.status === "failed"
                        ? asset.error
                        : player.failed === asset.id
                          ? "Couldn't play it. Try again."
                          : formatDuration(asset.duration ?? 0)}
                  </p>
                </div>
                {asset.source_url && (
                  <a href={asset.source_url} target="_blank" rel="noreferrer" aria-label={`${asset.name} on Jamendo`} className="text-muted-foreground hover:text-foreground">
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                  </a>
                )}
                {music?.asset === asset.id ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">In use</span>
                ) : (
                  <button type="button" disabled={asset.status === "failed"} onClick={() => onMusic(asset)} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-7 px-2" })}>
                    Use
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

/* ---------- Text ---------- */

/** Ready-made text styles, as CapCut's text templates: click one to add it at the playhead. */
export const TEXT_PRESETS: { name: string; sample: string; style: TextStyle }[] = [
  { name: "Title", sample: "Sunday Service", style: { text: "Sunday Service", size: 0.08, font: "anton", y: 0.22, animation_in: { type: "slide_up", duration: 0.5 }, animation_out: { type: "fade", duration: 0.3 } } },
  { name: "Heading", sample: "Welcome home", style: { text: "Welcome home", size: 0.065, font: "poppins", weight: "extra_bold", y: 0.3, animation_in: { type: "pop", duration: 0.4 } } },
  { name: "Subtitle", sample: "Join us live", style: { text: "Join us live", size: 0.045, font: "inter", y: 0.78, outline: true, animation_in: { type: "fade", duration: 0.4 } } },
  { name: "Lower third", sample: "Pastor Ada · Lead pastor", style: { text: "Pastor Ada · Lead pastor", size: 0.035, font: "poppins", align: "left", x: 0.06, y: 0.84, box: "#6D5EF5", outline: false, animation_in: { type: "slide_right", duration: 0.5 }, animation_out: { type: "slide_left", duration: 0.4 } } },
  { name: "Quote", sample: "Be still, and know", style: { text: "“Be still, and know”", size: 0.06, font: "abril", outline: false, effect: "shadow", animation_in: { type: "zoom_in", duration: 0.6 } } },
  { name: "Neon", sample: "Tonight", style: { text: "Tonight", size: 0.08, font: "righteous", color: "#FF4FD8", outline: false, effect: "neon", animation_in: { type: "bounce", duration: 0.6 } } },
  { name: "Script", sample: "With love", style: { text: "With love", size: 0.07, font: "pacifico", outline: false, effect: "glow", animation_in: { type: "fade", duration: 0.6 } } },
  { name: "Bold box", sample: "SALE THIS WEEK", style: { text: "SALE THIS WEEK", size: 0.055, font: "archivo", color: "#111111", box: "#FACC15", outline: false, animation_in: { type: "pop", duration: 0.4 }, animation_out: { type: "pop", duration: 0.3 } } },
  { name: "Caption", sample: "Every word, on screen", style: { text: "Every word, on screen", size: 0.04, font: "inter", y: 0.72, effect: "backdrop", outline: false, animation_in: { type: "slide_up", duration: 0.3 } } },
  { name: "Headline", sample: "BIG NEWS", style: { text: "BIG NEWS", size: 0.1, font: "bebas", y: 0.4, animation_in: { type: "zoom_in", duration: 0.5 }, animation_out: { type: "zoom_out", duration: 0.4 } } },
]

function TextTab({ onAddText }: { onAddText: Props["onAddText"] }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-muted-foreground">Click a style to add it at the playhead, then type your words.</p>
      <ul className="grid grid-cols-2 gap-2">
        {TEXT_PRESETS.map((preset) => {
          const font = fontFor(preset.style.font ?? "inter")
          const style = preset.style
          return (
            <li key={preset.name}>
              <button
                type="button"
                onClick={() => onAddText(preset.style)}
                className="flex h-16 w-full flex-col items-center justify-center overflow-hidden rounded-lg bg-[#1D1B26] px-1.5 text-center transition-colors hover:bg-[#2A2736] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label={`Add a ${preset.name.toLowerCase()} text`}
              >
                <span
                  className="max-w-full truncate leading-tight"
                  style={{
                    fontFamily: `"${font.family}", Inter, sans-serif`,
                    fontWeight: font.weights.length > 1 ? (style.weight === "extra_bold" ? 800 : 700) : 400,
                    fontSize: 15,
                    color: style.effect === "neon" ? "#FFFFFF" : (style.color ?? "#FFFFFF"),
                    background: style.box ?? (style.effect === "backdrop" ? "rgba(12,16,28,0.8)" : undefined),
                    padding: style.box || style.effect === "backdrop" ? "1px 5px" : undefined,
                    textShadow:
                      style.effect === "neon"
                        ? `0 0 4px ${style.color}, 0 0 10px ${style.color}`
                        : style.effect === "glow"
                          ? "0 0 6px rgba(255,255,255,0.7)"
                          : style.outline !== false && !style.box
                            ? "0 0 2px #000, 0 0 2px #000"
                            : undefined,
                  }}
                >
                  {preset.sample}
                </span>
                <span className="mt-1 text-[10px] text-white/55">{preset.name}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ---------- Transitions ---------- */

/** A tiny looping picture of each transition: two coloured cards, the second coming in. */
const TRANSITION_DEMO: Record<TransitionType, string> = {
  none: "",
  fade: "studio-demo-fade",
  fade_black: "studio-demo-fade-black",
  fade_white: "studio-demo-fade-white",
  slide_left: "studio-demo-slide-left",
  slide_right: "studio-demo-slide-right",
  slide_up: "studio-demo-slide-up",
  slide_down: "studio-demo-slide-down",
  wipe_left: "studio-demo-wipe-left",
  wipe_right: "studio-demo-wipe-right",
  circle_open: "studio-demo-circle",
  zoom_in: "studio-demo-zoom",
}

function TransitionsTab({ composition, selectedScene, onTransition }: Props) {
  const scene = selectedScene ? composition.scenes[selectedScene.index] : null
  const canSet = selectedScene !== null && selectedScene.index > 0
  const current = scene?.transition.type ?? "none"
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-pretty text-muted-foreground">
        {canSet
          ? `Click one for the change into clip ${selectedScene!.index + 1}, or apply it to every change of clip.`
          : "Select a clip on the timeline (not the first), or click the marker between two clips, then choose how it comes in."}
      </p>
      <ul className="grid grid-cols-3 gap-2">
        {TRANSITIONS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={!canSet}
              aria-pressed={canSet && current === item.id}
              onClick={() => onTransition(item.id, false)}
              className={cn(
                "group flex w-full flex-col items-center gap-1 rounded-lg border p-1.5 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60",
                canSet && current === item.id ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-secondary",
              )}
            >
              <span className="relative block aspect-video w-full overflow-hidden rounded bg-[#4F46E5]">
                {item.id !== "none" && <span className={cn("absolute inset-0 bg-[#F59E0B]", TRANSITION_DEMO[item.id])} />}
              </span>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" disabled={!canSet || current === "none"} onClick={() => onTransition(current, true)} className={buttonStyles({ variant: "secondary", size: "sm", className: "w-full" })}>
        Apply “{TRANSITIONS.find((item) => item.id === current)?.label ?? "Cut"}” to all
      </button>
    </div>
  )
}

/* ---------- Filters ---------- */

function FiltersTab({ composition, media, selectedScene, onFilter }: Props) {
  const scene = selectedScene ? composition.scenes[selectedScene.index] : null
  const picture = scene?.asset ? media.find((asset) => asset.id === scene.asset)?.thumbnail_url : null
  const sample = picture ?? media.find((asset) => asset.thumbnail_url)?.thumbnail_url ?? null
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-pretty text-muted-foreground">
        {scene ? `Click a look for clip ${selectedScene!.index + 1}, or apply it to every clip.` : "Select a clip on the timeline, then choose its look."}
      </p>
      <ul className="grid grid-cols-3 gap-2">
        {SCENE_EFFECTS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              disabled={!scene}
              aria-pressed={scene?.effect === item.id}
              onClick={() => onFilter(item.id, false)}
              className={cn(
                "flex w-full flex-col items-center gap-1 rounded-lg border p-1 text-[10px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60",
                scene?.effect === item.id ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-secondary",
              )}
            >
              <span className="relative block aspect-square w-full overflow-hidden rounded bg-secondary">
                {sample ? (
                  <img src={sample} alt="" className="absolute inset-0 size-full object-cover" style={{ filter: EFFECT_FILTERS[item.id] }} />
                ) : (
                  // Three colours to show the look on, until there's a picture.
                  <span className="absolute inset-0 flex" style={{ filter: EFFECT_FILTERS[item.id] }}>
                    <span className="flex-1 bg-[#F59E0B]" />
                    <span className="flex-1 bg-[#EC4899]" />
                    <span className="flex-1 bg-[#3B82F6]" />
                  </span>
                )}
              </span>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" disabled={!scene} onClick={() => scene && onFilter(scene.effect, true)} className={buttonStyles({ variant: "secondary", size: "sm", className: "w-full" })}>
        Apply this look to every clip
      </button>
    </div>
  )
}
