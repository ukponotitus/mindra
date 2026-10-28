import { useId, type ReactNode } from "react"
import { ArrowLeft, ArrowRight, Copy, ExternalLink, Image as ImageIcon, Trash2, Volume2, VolumeX } from "lucide-react"
import { cn } from "../../lib/cn"
import {
  ASPECTS,
  FITS,
  FONTS,
  LIMITS,
  MOTIONS,
  SCENE_ANIMATIONS_IN,
  SCENE_ANIMATIONS_OUT,
  SCENE_EFFECTS,
  TEXT_ANIMATIONS,
  TEXT_EFFECTS,
  TEXT_OUT_ANIMATIONS,
  TRANSITIONS,
  fontFor,
  formatSeconds,
  timeline,
  type Align,
  type Animation,
  type Composition,
  type Fit,
  type Motion,
  type SceneEffect,
  type StudioAsset,
  type TextEffect,
  type TransitionType,
  type Weight,
} from "../../lib/studio"
import { buttonStyles } from "../ui/button"
import * as edit from "./edits"
import { EFFECT_FILTERS } from "./Preview"
import { areaClass, fieldClass, labelClass, panelClass } from "./styles"
import type { Selection } from "./Timeline"

type Change = (
  next: Composition | ((current: Composition) => Composition),
  key?: string,
) => void

export type InspectorTab = "basic" | "animation" | "look" | "transition" | "text" | "style"

interface Props {
  composition: Composition
  assets: Record<string, StudioAsset>
  selected: Selection
  onSelect: (selection: Selection) => void
  change: Change
  tab: InspectorTab
  onTab: (tab: InspectorTab) => void
  /** Open the logo picker: add a logo, or change its picture. */
  onPickLogo: () => void
}

function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: (id: string) => ReactNode
  hint?: string
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children(id)}
      {hint && (
        <p className="mt-1 text-[11px] text-pretty text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}

/** A slider with its value, in seconds or as a share. */
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  show = (number) => number.toFixed(1),
  disabled,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  show?: (value: number) => string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <span className="text-xs text-foreground tabular-nums">
          {show(value)}
        </span>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={Math.max(max, min)}
        step={step}
        value={Math.min(Math.max(value, min), Math.max(max, min))}
        disabled={disabled || max <= min}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
    </div>
  )
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  return (
    <Field label={label}>
      {(id) => (
        <select
          id={id}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value as T)}
          className={fieldClass}
        >
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  )
}

const SWATCHES = ["#FFFFFF", "#111111", "#FACC15", "#F97316", "#EF4444", "#EC4899", "#8B5CF6", "#3B82F6", "#22C55E"]

function Colour({
  label,
  value,
  onChange,
  swatches = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  swatches?: boolean
}) {
  return (
    <Field label={label}>
      {(id) => (
        <div className="flex flex-wrap items-center gap-1.5">
          {swatches &&
            SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                aria-label={swatch}
                aria-pressed={value.toUpperCase() === swatch}
                onClick={() => onChange(swatch)}
                className={cn(
                  "size-6 rounded-full border border-black/15 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
                  value.toUpperCase() === swatch && "ring-2 ring-primary ring-offset-1",
                )}
                style={{ background: swatch }}
              />
            ))}
          <input
            id={id}
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value.toUpperCase())}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-white"
            title="Any colour"
          />
          {!swatches && (
            <span className="text-xs text-muted-foreground uppercase tabular-nums">
              {value}
            </span>
          )}
        </div>
      )}
    </Field>
  )
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  )
}

/** A grid of choices, as CapCut's animation and effect pickers. */
function Choices<T extends string>({
  label,
  value,
  options,
  onChange,
  columns = 3,
  render,
}: {
  label: string
  value: T
  options: { id: T; label: string }[]
  onChange: (value: T) => void
  columns?: number
  render?: (id: T) => ReactNode
}) {
  return (
    <fieldset>
      <legend className={labelClass}>{label}</legend>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              "flex min-h-8 flex-col items-center justify-center gap-1 rounded-md border px-1 py-1 text-center text-[11px] leading-tight font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
              value === option.id ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-secondary",
            )}
          >
            {render?.(option.id)}
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/** An animation's kind and, when it has one, its length. */
function AnimationPicker<T extends string>({
  label,
  value,
  options,
  most,
  onChange,
}: {
  label: string
  value: Animation<T>
  options: { id: T; label: string }[]
  most: number
  onChange: (value: Animation<T>) => void
}) {
  return (
    <div className="space-y-2">
      <Choices
        label={label}
        value={value.type}
        options={options}
        onChange={(type) => onChange({ type, duration: value.duration })}
      />
      {value.type !== "none" && (
        <Slider
          label="Length"
          value={value.duration}
          min={LIMITS.animationSeconds[0]}
          max={Math.max(Math.min(LIMITS.animationSeconds[1], most), LIMITS.animationSeconds[0])}
          step={0.1}
          show={(seconds) => `${seconds.toFixed(1)} s`}
          onChange={(duration) => onChange({ type: value.type, duration })}
        />
      )}
    </div>
  )
}

function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <div className="flex gap-1">{children}</div>
    </div>
  )
}

function Tabs({
  tabs,
  tab,
  onTab,
}: {
  tabs: { id: InspectorTab; label: string }[]
  tab: InspectorTab
  onTab: (tab: InspectorTab) => void
}) {
  return (
    <div role="tablist" aria-label="Settings" className="-mx-4 flex border-b border-border px-2">
      {tabs.map((item) => (
        <button
          key={item.id}
          role="tab"
          type="button"
          aria-selected={tab === item.id}
          onClick={() => onTab(item.id)}
          className={cn(
            "-mb-px border-b-2 px-2.5 py-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
            tab === item.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}

const iconButton = buttonStyles({
  variant: "ghost",
  size: "icon",
  className: "size-8",
})
const percent = (value: number) => `${Math.round(value * 100)}%`
const seconds = (value: number) => `${value.toFixed(1)} s`

const SCENE_TABS: { id: InspectorTab; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "animation", label: "Animation" },
  { id: "look", label: "Filter" },
  { id: "transition", label: "Transition" },
]
const TEXT_TABS: { id: InspectorTab; label: string }[] = [
  { id: "text", label: "Text" },
  { id: "style", label: "Style" },
  { id: "animation", label: "Animation" },
]

/** What's selected, to change: a clip, a text, the logo, the music, or the whole video. */
export default function Inspector({
  composition,
  assets,
  selected,
  onSelect,
  change,
  tab,
  onTab,
  onPickLogo,
}: Props) {
  const { starts, length } = timeline(composition)

  if (selected?.kind === "scene") {
    const index = composition.scenes.findIndex(
      (scene) => scene.id === selected.id,
    )
    const scene = composition.scenes[index]
    if (!scene) return <Empty />
    const asset = scene.asset ? assets[scene.asset] : undefined
    const set = (patch: Parameters<typeof edit.updateScene>[2], key: string) =>
      change(
        (current) => edit.updateScene(current, scene.id, patch, assets),
        `${scene.id}.${key}`,
      )
    const longest = edit.longestScene(scene, asset)
    const current = SCENE_TABS.some((item) => item.id === tab) ? tab : "basic"
    const sounding = asset?.kind === "video" && asset.has_audio
    return (
      <Panel>
        <Heading title={`Clip ${index + 1}`}>
          <button
            type="button"
            aria-label="Move earlier"
            disabled={index === 0}
            onClick={() =>
              change((value) => edit.moveScene(value, index, index - 1))
            }
            className={iconButton}
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Move later"
            disabled={index === composition.scenes.length - 1}
            onClick={() =>
              change((value) => edit.moveScene(value, index, index + 1))
            }
            className={iconButton}
          >
            <ArrowRight aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Duplicate clip"
            onClick={() =>
              change((value) => edit.duplicateScene(value, scene.id))
            }
            className={iconButton}
          >
            <Copy aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Delete clip"
            onClick={() => {
              change((value) => edit.removeScene(value, scene.id))
              onSelect(null)
            }}
            className={iconButton}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </Heading>
        <Tabs tabs={SCENE_TABS} tab={current} onTab={onTab} />

        {current === "basic" && (
          <>
            {scene.type === "placeholder" ? (
              <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-pretty text-amber-900">
                {scene.label || "This clip needs media."} Choose a photo or clip
                under Media and press <strong>Replace</strong>.
              </p>
            ) : scene.type === "color" ? (
              <Colour
                label="Colour"
                value={scene.color}
                onChange={(value) => set({ color: value }, "color")}
              />
            ) : (
              <p className="truncate text-sm text-muted-foreground">
                {asset?.kind === "video" ? "Clip" : "Photo"}:{" "}
                {asset?.name ?? "Missing media"}
              </p>
            )}
            <Slider
              label="Length"
              value={scene.duration}
              min={LIMITS.sceneSeconds[0]}
              max={Math.min(longest, 30)}
              step={0.1}
              show={seconds}
              onChange={(value) => set({ duration: value }, "duration")}
            />
            {asset?.kind === "video" && asset.duration ? (
              <Slider
                label="Starts at (trim)"
                value={scene.trim_start}
                min={0}
                max={Math.max(asset.duration - scene.duration, 0)}
                step={0.1}
                show={(value) =>
                  `${formatSeconds(value)} of ${formatSeconds(asset.duration ?? 0)}`
                }
                onChange={(value) => set({ trim_start: value }, "trim")}
              />
            ) : null}
            {scene.type === "media" && (
              <Select
                label="Fit"
                value={scene.fit}
                options={FITS}
                onChange={(value: Fit) => set({ fit: value }, "fit")}
              />
            )}
            {scene.type === "media" && scene.fit === "contain" && (
              <Colour
                label="Around the picture"
                value={scene.color}
                onChange={(value) => set({ color: value }, "color")}
              />
            )}
            {asset?.kind === "image" && (
              <Select
                label="Movement"
                value={scene.motion}
                options={MOTIONS}
                onChange={(value: Motion) => set({ motion: value }, "motion")}
              />
            )}
            {sounding && (
              <div className="flex items-end gap-2 border-t border-border pt-3">
                <button
                  type="button"
                  aria-pressed={scene.muted}
                  aria-label={scene.muted ? "Turn this clip's sound on" : "Mute this clip"}
                  title={scene.muted ? "This clip's sound is off" : "Mute this clip"}
                  onClick={() => set({ muted: !scene.muted }, "mute")}
                  className={buttonStyles({
                    variant: scene.muted ? "primary" : "secondary",
                    size: "icon",
                    className: "size-9 shrink-0",
                  })}
                >
                  {scene.muted ? (
                    <VolumeX aria-hidden="true" className="size-4" />
                  ) : (
                    <Volume2 aria-hidden="true" className="size-4" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <Slider
                    label={scene.muted ? "This clip's sound (muted)" : "This clip's sound"}
                    value={scene.volume}
                    min={0}
                    max={1}
                    step={0.05}
                    show={percent}
                    disabled={scene.muted}
                    onChange={(value) => set({ volume: value }, "volume")}
                  />
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground tabular-nums">
              Shows from {formatSeconds(starts[index])} to{" "}
              {formatSeconds(starts[index] + scene.duration)}
            </p>
          </>
        )}

        {current === "animation" && (
          <>
            <AnimationPicker
              label="In"
              value={scene.animation_in}
              options={SCENE_ANIMATIONS_IN}
              most={scene.duration}
              onChange={(value) => set({ animation_in: value }, "animationIn")}
            />
            <AnimationPicker
              label="Out"
              value={scene.animation_out}
              options={SCENE_ANIMATIONS_OUT}
              most={scene.duration}
              onChange={(value) => set({ animation_out: value }, "animationOut")}
            />
            <p className="text-[11px] text-pretty text-muted-foreground">
              How this clip moves as it starts and ends. To blend two clips
              together, use a transition.
            </p>
          </>
        )}

        {current === "look" && (
          <>
            <Choices
              label="Filter"
              value={scene.effect}
              options={SCENE_EFFECTS}
              onChange={(value: SceneEffect) => set({ effect: value }, "effect")}
              render={(id) => (
                <span
                  aria-hidden="true"
                  className="relative block aspect-square w-full overflow-hidden rounded bg-secondary"
                >
                  {asset?.thumbnail_url ? (
                    <img
                      src={asset.thumbnail_url}
                      alt=""
                      className="absolute inset-0 size-full object-cover"
                      style={{ filter: EFFECT_FILTERS[id] }}
                    />
                  ) : (
                    <span
                      className="absolute inset-0"
                      style={{ background: scene.type === "color" ? scene.color : "#8B7FF7", filter: EFFECT_FILTERS[id] }}
                    />
                  )}
                </span>
              )}
            />
            <button
              type="button"
              onClick={() => change((value) => edit.filterAll(value, scene.effect))}
              className={buttonStyles({ variant: "secondary", size: "sm", className: "w-full" })}
            >
              Apply to every clip
            </button>
          </>
        )}

        {current === "transition" &&
          (index === 0 ? (
            <p className="text-sm text-pretty text-muted-foreground">
              The first clip starts the video, so it has no transition. Select a
              later clip, or click the marker between two clips on the
              timeline.
            </p>
          ) : (
            <>
              <Choices
                label={`Into clip ${index + 1}`}
                value={scene.transition.type}
                options={TRANSITIONS}
                onChange={(value: TransitionType) =>
                  set({ transition: { ...scene.transition, type: value } }, "transition")
                }
              />
              {scene.transition.type !== "none" && (
                <Slider
                  label="Length"
                  value={scene.transition.duration}
                  min={LIMITS.transitionSeconds[0]}
                  max={LIMITS.transitionSeconds[1]}
                  step={0.1}
                  show={seconds}
                  onChange={(value) =>
                    set({ transition: { ...scene.transition, duration: value } }, "transitionLength")
                  }
                />
              )}
              <button
                type="button"
                onClick={() => change((value) => edit.transitionAll(value, scene.transition))}
                className={buttonStyles({ variant: "secondary", size: "sm", className: "w-full" })}
              >
                Apply to every change of clip
              </button>
            </>
          ))}
      </Panel>
    )
  }

  if (selected?.kind === "text") {
    const text = composition.texts.find((item) => item.id === selected.id)
    if (!text) return <Empty />
    const set = (patch: Parameters<typeof edit.updateText>[2], key: string) =>
      change(
        (current) => edit.updateText(current, text.id, patch),
        `${text.id}.${key}`,
      )
    const [from, to] = edit.textSpan(composition, text)
    const time = (start: number, end: number) =>
      change((current) => edit.timeText(current, text.id, start, end), `${text.id}.time`)
    const font = fontFor(text.font)
    const followsIndex = text.scene ? composition.scenes.findIndex((scene) => scene.id === text.scene) : -1
    const current = TEXT_TABS.some((item) => item.id === tab) ? tab : "text"
    return (
      <Panel>
        <Heading title="Text">
          <button
            type="button"
            aria-label="Duplicate text"
            onClick={() => {
              const result = edit.duplicateText(composition, text.id)
              if (!result) return
              change(result.composition)
              onSelect({ kind: "text", id: result.id })
            }}
            className={iconButton}
          >
            <Copy aria-hidden="true" className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Delete text"
            onClick={() => {
              change((value) => edit.removeText(value, text.id))
              onSelect(null)
            }}
            className={iconButton}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </Heading>
        <Tabs tabs={TEXT_TABS} tab={current} onTab={onTab} />

        {current === "text" && (
          <>
            <Field
              label="Words"
              hint={`Up to ${LIMITS.textLines} lines. Press Enter for a new line.`}
            >
              {(id) => (
                <textarea
                  id={id}
                  rows={3}
                  maxLength={LIMITS.textCharacters}
                  value={text.text}
                  onChange={(event) =>
                    set(
                      {
                        text: event.target.value
                          .split("\n")
                          .slice(0, LIMITS.textLines)
                          .join("\n"),
                      },
                      "text",
                    )
                  }
                  className={`${areaClass} min-h-20 resize-y`}
                />
              )}
            </Field>
            <fieldset>
              <legend className={labelClass}>Font</legend>
              <div className="grid grid-cols-3 gap-1.5">
                {FONTS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={text.font === item.id}
                    onClick={() => set({ font: item.id }, "font")}
                    className={cn(
                      "truncate rounded-md border px-1 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                      text.font === item.id ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-secondary",
                    )}
                    style={{ fontFamily: `"${item.family}", Inter, sans-serif`, fontWeight: item.weights[0] }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <Slider
              label="Size"
              value={text.size}
              min={0.02}
              max={0.2}
              step={0.005}
              show={(value) => `${Math.round(value * 1000) / 10}`}
              onChange={(value) => set({ size: value }, "size")}
            />
            <Colour
              label="Colour"
              value={text.color}
              swatches
              onChange={(value) => set({ color: value }, "color")}
            />
            <div className="grid grid-cols-2 gap-3">
              {font.weights.length > 1 && (
                <Select
                  label="Weight"
                  value={text.weight}
                  options={[
                    { id: "bold" as Weight, label: "Bold" },
                    { id: "extra_bold" as Weight, label: "Extra bold" },
                  ]}
                  onChange={(value: Weight) => set({ weight: value }, "weight")}
                />
              )}
              <Select
                label="Align"
                value={text.align}
                options={[
                  { id: "left" as Align, label: "Left" },
                  { id: "center" as Align, label: "Centre" },
                  { id: "right" as Align, label: "Right" },
                ]}
                onChange={(value: Align) => set({ align: value }, "align")}
              />
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <div className="grid grid-cols-2 gap-3">
                <Slider
                  label="From"
                  value={from}
                  min={0}
                  max={Math.max(length - 0.2, 0)}
                  step={0.1}
                  show={seconds}
                  onChange={(value) => time(value, Math.max(to, value + 0.2))}
                />
                <Slider
                  label="To"
                  value={to}
                  min={0.2}
                  max={Math.max(length, 0.2)}
                  step={0.1}
                  show={seconds}
                  onChange={(value) => time(Math.min(from, value - 0.2), value)}
                />
              </div>
              <button
                type="button"
                onClick={() => time(0, length)}
                className={buttonStyles({ variant: "secondary", size: "sm", className: "w-full" })}
              >
                Show for the whole video
              </button>
              <p className="text-[11px] text-pretty text-muted-foreground">
                {followsIndex >= 0
                  ? `It moves with clip ${followsIndex + 1}. Changing when it shows lets it run across other clips. `
                  : ""}
                Drag its bar on the timeline to move it, or either edge to
                stretch it. Drag it on the preview to place it.
              </p>
            </div>
          </>
        )}

        {current === "style" && (
          <>
            <Choices
              label="Effect"
              value={text.effect}
              options={TEXT_EFFECTS}
              onChange={(value: TextEffect) => set({ effect: value }, "effect")}
            />
            <div className="space-y-2">
              <Toggle
                label="Dark outline"
                checked={text.outline}
                onChange={(checked) => set({ outline: checked }, "outline")}
              />
              <Toggle
                label="Box behind it"
                checked={text.box !== null}
                onChange={(checked) =>
                  set({ box: checked ? "#000000" : null }, "box")
                }
              />
              {text.box !== null && (
                <Colour
                  label="Box colour"
                  value={text.box}
                  swatches
                  onChange={(value) => set({ box: value }, "boxColour")}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Slider
                label="Across"
                value={text.x}
                min={0}
                max={1}
                step={0.01}
                show={percent}
                onChange={(value) => set({ x: value }, "x")}
              />
              <Slider
                label="Down"
                value={text.y}
                min={0}
                max={1}
                step={0.01}
                show={percent}
                onChange={(value) => set({ y: value }, "y")}
              />
            </div>
          </>
        )}

        {current === "animation" && (
          <>
            <AnimationPicker
              label="In"
              value={text.animation_in}
              options={TEXT_ANIMATIONS}
              most={to - from}
              onChange={(value) => set({ animation_in: value }, "animationIn")}
            />
            <AnimationPicker
              label="Out"
              value={text.animation_out}
              options={TEXT_OUT_ANIMATIONS}
              most={to - from}
              onChange={(value) => set({ animation_out: value }, "animationOut")}
            />
          </>
        )}
      </Panel>
    )
  }

  if (selected?.kind === "overlay") {
    const overlay = composition.overlays.find((item) => item.id === selected.id)
    if (!overlay) return <Empty />
    const set = (
      patch: Parameters<typeof edit.updateOverlay>[2],
      key: string,
    ) =>
      change(
        (current) => edit.updateOverlay(current, overlay.id, patch),
        `${overlay.id}.${key}`,
      )
    const corners: { label: string; x: number; y: number }[] = [
      { label: "Top left", x: 0.15, y: 0.08 },
      { label: "Top right", x: 0.85, y: 0.08 },
      { label: "Bottom left", x: 0.15, y: 0.92 },
      { label: "Bottom right", x: 0.85, y: 0.92 },
    ]
    const end = overlay.end ?? length
    const time = (start: number, finish: number) =>
      change((current) => edit.timeOverlay(current, overlay.id, start, finish), `${overlay.id}.time`)
    return (
      <Panel>
        <Heading title="Logo">
          <button
            type="button"
            aria-label="Delete logo"
            onClick={() => {
              change((current) => edit.removeOverlay(current, overlay.id))
              onSelect(null)
            }}
            className={iconButton}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </Heading>
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {(overlay.asset && assets[overlay.asset]?.name) || "Picture"}
          </p>
          <button type="button" onClick={onPickLogo} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Change picture
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {corners.map((corner) => (
            <button
              key={corner.label}
              type="button"
              onClick={() => set({ x: corner.x, y: corner.y }, "corner")}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              {corner.label}
            </button>
          ))}
        </div>
        <Slider
          label="Size"
          value={overlay.width}
          min={0.05}
          max={0.6}
          step={0.01}
          show={percent}
          onChange={(value) => set({ width: value }, "width")}
        />
        <div className="grid grid-cols-2 gap-3">
          <Slider
            label="Across"
            value={overlay.x}
            min={0}
            max={1}
            step={0.01}
            show={percent}
            onChange={(value) => set({ x: value }, "x")}
          />
          <Slider
            label="Down"
            value={overlay.y}
            min={0}
            max={1}
            step={0.01}
            show={percent}
            onChange={(value) => set({ y: value }, "y")}
          />
        </div>
        <Slider
          label="Opacity"
          value={overlay.opacity}
          min={0.1}
          max={1}
          step={0.05}
          show={percent}
          onChange={(value) => set({ opacity: value }, "opacity")}
        />
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <Slider
            label="From"
            value={overlay.start}
            min={0}
            max={Math.max(length - 0.2, 0)}
            step={0.1}
            show={seconds}
            onChange={(value) => time(value, Math.max(end, value + 0.2))}
          />
          <Slider
            label="To"
            value={end}
            min={0.2}
            max={Math.max(length, 0.2)}
            step={0.1}
            show={(value) => (value >= length - 0.05 ? "The end" : seconds(value))}
            onChange={(value) => time(Math.min(overlay.start, value - 0.2), value)}
          />
        </div>
        <button
          type="button"
          onClick={() => time(0, length)}
          className={buttonStyles({ variant: "secondary", size: "sm", className: "w-full" })}
        >
          Show for the whole video
        </button>
      </Panel>
    )
  }

  if (selected?.kind === "audio") {
    const track = composition.audio.find((item) => item.id === selected.id)
    if (!track) return <Empty />
    const asset = track.asset ? assets[track.asset] : undefined
    const set = (patch: Parameters<typeof edit.updateAudio>[2], key: string) =>
      change(
        (current) => edit.updateAudio(current, track.id, patch),
        `${track.id}.${key}`,
      )
    return (
      <Panel>
        <Heading title="Music">
          <button
            type="button"
            aria-label="Delete music"
            onClick={() => {
              change((current) => edit.removeAudio(current, track.id))
              onSelect(null)
            }}
            className={iconButton}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </Heading>
        <p className="truncate text-sm text-muted-foreground">
          {asset?.name ?? "Music"} · choose another under Audio
        </p>
        <div className="flex items-end gap-2">
          <button
            type="button"
            aria-pressed={track.muted}
            aria-label={track.muted ? "Turn the music on" : "Mute the music"}
            title={track.muted ? "The music is off" : "Mute the music"}
            onClick={() => set({ muted: !track.muted }, "mute")}
            className={buttonStyles({
              variant: track.muted ? "primary" : "secondary",
              size: "icon",
              className: "size-9 shrink-0",
            })}
          >
            {track.muted ? (
              <VolumeX aria-hidden="true" className="size-4" />
            ) : (
              <Volume2 aria-hidden="true" className="size-4" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <Slider
              label={track.muted ? "Volume (muted)" : "Volume"}
              value={track.volume}
              min={0}
              max={1.5}
              step={0.05}
              show={percent}
              disabled={track.muted}
              onChange={(value) => set({ volume: value }, "volume")}
            />
          </div>
        </div>
        {asset?.duration ? (
          <Slider
            label="Starts in the song at"
            value={track.trim_start}
            min={0}
            max={Math.max(asset.duration - 1, 0)}
            step={0.5}
            show={(value) => formatSeconds(value)}
            onChange={(value) => set({ trim_start: value }, "trim")}
          />
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Slider
            label="Fade in"
            value={track.fade_in}
            min={0}
            max={5}
            step={0.5}
            show={seconds}
            onChange={(value) => set({ fade_in: value }, "fadeIn")}
          />
          <Slider
            label="Fade out"
            value={track.fade_out}
            min={0}
            max={5}
            step={0.5}
            show={seconds}
            onChange={(value) => set({ fade_out: value }, "fadeOut")}
          />
        </div>
        <Toggle
          label="Repeat it if it's shorter than the video"
          checked={track.loop}
          onChange={(checked) => set({ loop: checked }, "loop")}
        />
        <p className="text-[11px] text-pretty text-muted-foreground">
          Drag the music on the timeline to move it, or either edge to set
          where it starts and stops.
        </p>
        {asset?.credit && (
          <div className="rounded-lg bg-secondary p-2.5 text-[11px] text-pretty text-foreground">
            <p className="font-medium">Credit the artist in your caption:</p>
            <p className="mt-0.5 text-muted-foreground">{asset.credit}</p>
            {asset.source_url && (
              <a
                href={asset.source_url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                The song on Jamendo
                <ExternalLink aria-hidden="true" className="size-3" />
              </a>
            )}
          </div>
        )}
      </Panel>
    )
  }

  // Nothing selected: the whole video.
  return (
    <Panel>
      <Heading title="Video" />
      <Select
        label="Shape"
        value={composition.canvas.aspect}
        options={ASPECTS.map((item) => ({
          id: item.id,
          label: `${item.label} · ${item.detail}`,
        }))}
        onChange={(value) =>
          change(
            (current) => edit.setCanvas(current, { aspect: value }),
            "aspect",
          )
        }
      />
      <Select
        label="Quality"
        value={composition.export.quality}
        options={[
          { id: "high" as const, label: "High (1080p)" },
          { id: "standard" as const, label: "Standard (720p, quicker)" },
        ]}
        onChange={(value) =>
          change(
            (current) => edit.setCanvas(current, { quality: value }),
            "quality",
          )
        }
      />
      <VideoLogo composition={composition} assets={assets} onSelect={onSelect} onPickLogo={onPickLogo} />
      <p className="text-sm text-muted-foreground tabular-nums">
        {composition.scenes.length} clip
        {composition.scenes.length === 1 ? "" : "s"} · {formatSeconds(length)}
      </p>
      <p className="text-xs text-pretty text-muted-foreground">
        Click a clip, a text, the logo or the music on the timeline to change
        it. Press Esc to come back here.
      </p>
    </Panel>
  )
}

/** The Video panel's logo: add one, or see the one the video has, change it or edit it. */
function VideoLogo({
  composition,
  assets,
  onSelect,
  onPickLogo,
}: {
  composition: Composition
  assets: Record<string, StudioAsset>
  onSelect: (selection: Selection) => void
  onPickLogo: () => void
}) {
  const logo = composition.overlays[0]
  const picture = logo?.asset ? assets[logo.asset] : undefined
  return (
    <div>
      <p className={labelClass}>Logo</p>
      {logo ? (
        <div className="flex items-center gap-2">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-secondary">
            {picture?.thumbnail_url ? (
              <img src={picture.thumbnail_url} alt="" className="size-full object-contain" />
            ) : (
              <ImageIcon aria-hidden="true" className="size-4 text-muted-foreground" />
            )}
          </span>
          <p className="min-w-0 flex-1 truncate text-sm text-foreground">{picture?.name ?? "Picture"}</p>
          <button type="button" onClick={onPickLogo} className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Change
          </button>
          <button
            type="button"
            onClick={() => onSelect({ kind: "overlay", id: logo.id })}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            Edit
          </button>
        </div>
      ) : (
        <button type="button" onClick={onPickLogo} className={buttonStyles({ variant: "secondary", className: "w-full" })}>
          <ImageIcon aria-hidden="true" className="size-4" />
          Add a logo
        </button>
      )}
    </div>
  )
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="Properties"
      className={cn(panelClass, "space-y-3 p-4")}
    >
      {children}
    </section>
  )
}

function Empty() {
  return (
    <Panel>
      <p className="text-sm text-muted-foreground">This was removed.</p>
    </Panel>
  )
}
