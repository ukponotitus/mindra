import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react"
import { cn } from "../../lib/cn"
import {
  TEXT_SIZE_TO_CSS,
  fontFor,
  type Composition,
  type Overlay,
  type Scene,
  type SceneEffect,
  type StudioAsset,
  type TextItem,
} from "../../lib/studio"
import {
  clipTime,
  layerStyles,
  motionScale,
  sceneMove,
  musicFrame,
  overlayShows,
  sceneVolume,
  sceneWindow,
  textFrame,
} from "./previewFrame"

// The editor's preview: the composition played in the browser, drawn the way the renderer (mindra-backend
// studio/render.py) makes the video: scenes by the timeline with their transitions, texts and the logo on top, the
// clips' sound and the music. It's close, not exact: the made video is the final one.

export type Selection = { kind: "scene" | "text" | "overlay"; id: string }

type PreviewProps = {
  composition: Composition
  assets: Record<string, StudioAsset>
  /** Seconds; the editor owns it. */
  time: number
  playing: boolean
  /** During playback, every animation frame or so. */
  onTime: (seconds: number) => void
  /** Reached the end while playing. */
  onEnded: () => void
  selected?: Selection | null
  onSelect?: (item: Selection | null) => void
  /** A text or the logo dragged to a new place: its centre (its anchor, for a text), 0 to 1. */
  onMove?: (kind: "text" | "overlay", id: string, x: number, y: number) => void
  muted?: boolean
  className?: string
}

const ACCENT = "#8B7CFF"
/** The renderer's filters (studio/render.py, EFFECT_FILTERS) as near as CSS gets. */
export const EFFECT_FILTERS: Record<SceneEffect, string | undefined> = {
  none: undefined,
  vivid: "saturate(1.35) contrast(1.08)",
  bright: "brightness(1.1) contrast(1.03) saturate(1.08)",
  warm: "sepia(0.2) saturate(1.12)",
  cool: "hue-rotate(10deg) saturate(0.9)",
  moody: "brightness(0.92) contrast(1.15) saturate(0.85) hue-rotate(-6deg)",
  matte: "contrast(0.84) brightness(1.04) saturate(0.9)",
  vintage: "sepia(0.35) saturate(0.8) contrast(1.05)",
  sepia: "sepia(1)",
  black_white: "grayscale(1)",
}

/** The stage's size in px: the canvas's aspect, as large as fits the root. A root with no height of its own takes its
 * height from its width (and a max-height on it still caps it). */
function useStage(
  ratio: number,
  className: string | undefined,
): {
  rootRef: RefObject<HTMLDivElement | null>
  rootStyle?: CSSProperties
  width: number
  height: number
} {
  const rootRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{
    width: number
    height: number
    auto: boolean | null
  }>({ width: 0, height: 0, auto: null })
  // New classes may give the root a height of its own: look again, without the height set here.
  useLayoutEffect(
    () =>
      setBox((previous) =>
        previous.auto === null ? previous : { ...previous, auto: null },
      ),
    [className],
  )
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const measure = () => {
      const rect = root.getBoundingClientRect()
      setBox((previous) => {
        const auto = previous.auto ?? rect.height < 1
        return previous.width === rect.width &&
          previous.height === rect.height &&
          previous.auto === auto
          ? previous
          : { width: rect.width, height: rect.height, auto }
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [box.auto === null])
  const room = box.auto
    ? box.height > 0
      ? box.height
      : box.width / ratio
    : box.height
  const width = Math.max(Math.min(box.width, room * ratio), 0)
  return {
    rootRef,
    rootStyle: box.auto ? { height: box.width / ratio } : undefined,
    width,
    height: width / ratio,
  }
}

/** Keeps an <audio> or <video> at `target` seconds: seeking when paused or when it drifts, playing while `running`. */
function useFollow(
  ref: RefObject<HTMLMediaElement | null>,
  target: number,
  running: boolean,
  volume: number,
  muted: boolean,
) {
  const latest = useRef(target)
  latest.current = target
  useEffect(() => {
    const media = ref.current
    if (!media) return
    media.muted = muted
    media.volume = Math.min(Math.max(volume, 0), 1)
    const known = Number.isFinite(media.duration) ? media.duration : null
    const goal =
      known !== null ? Math.min(target, Math.max(known - 0.05, 0)) : target
    const ended = known !== null && target >= known - 0.05
    if (!running || ended) {
      if (!media.paused) media.pause()
      if (media.readyState >= 1 && Math.abs(media.currentTime - goal) > 0.04)
        media.currentTime = goal
      return
    }
    if (media.readyState >= 1 && Math.abs(media.currentTime - goal) > 0.2)
      media.currentTime = goal
    if (media.paused) media.play().catch(() => undefined)
  }, [ref, target, running, volume, muted])
  // Once it knows its length, start from the right place.
  return () => {
    const media = ref.current
    if (media && Math.abs(media.currentTime - latest.current) > 0.04)
      media.currentTime = latest.current
  }
}

/** Media that isn't there yet: its thumbnail, or a grey frame with its name. Never a broken picture. */
function Missing({ asset, label }: { asset?: StudioAsset; label?: string }) {
  const [broken, setBroken] = useState(false)
  const note = !asset
    ? "Missing media"
    : asset.status === "processing"
      ? "Getting ready…"
      : asset.status === "failed"
        ? "Couldn't be used"
        : ""
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#2A2A30]">
      {asset?.thumbnail_url && !broken ? (
        <img
          src={asset.thumbnail_url}
          alt=""
          draggable={false}
          onError={() => setBroken(true)}
          className="absolute inset-0 size-full object-cover opacity-70"
        />
      ) : null}
      <span
        className="relative max-w-[80%] truncate rounded-md bg-black/60 px-[0.6em] py-[0.3em] text-white/85"
        style={{ fontSize: "clamp(9px, 2.4cqh, 14px)" }}
      >
        {label ?? asset?.name ?? "Missing media"}
        {note ? ` · ${note}` : ""}
      </span>
    </div>
  )
}

/** A photo or a frame filling the scene the way its `fit` says: covering, contained in the scene colour, or contained
 * over a blurred, enlarged copy (`backdrop`, a picture: for a clip, its thumbnail). */
function Fitted({
  scene,
  backdrop,
  blurPx,
  children,
}: {
  scene: Scene
  backdrop?: string | null
  blurPx: number
  children: ReactNode
}) {
  if (scene.fit === "contain") {
    return (
      <div className="absolute inset-0" style={{ background: scene.color }}>
        {children}
      </div>
    )
  }
  if (scene.fit === "blur") {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        {backdrop ? (
          <img
            src={backdrop}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full object-cover"
            style={{ filter: `blur(${blurPx}px)`, transform: "scale(1.15)" }}
          />
        ) : null}
        {children}
      </div>
    )
  }
  return <div className="absolute inset-0">{children}</div>
}

function ScenePhoto({
  scene,
  asset,
  blurPx,
}: {
  scene: Scene
  asset: StudioAsset
  blurPx: number
}) {
  const [broken, setBroken] = useState(false)
  if (broken || !asset.url) return <Missing asset={asset} />
  const fit = scene.fit === "cover" ? "object-cover" : "object-contain"
  return (
    <Fitted scene={scene} backdrop={asset.url} blurPx={blurPx}>
      <img
        src={asset.url}
        alt=""
        draggable={false}
        onError={() => setBroken(true)}
        className={cn("absolute inset-0 size-full", fit)}
      />
    </Fitted>
  )
}

function SceneClip({
  scene,
  asset,
  target,
  running,
  volume,
  muted,
  blurPx,
}: {
  scene: Scene
  asset: StudioAsset
  target: number
  running: boolean
  volume: number
  muted: boolean
  blurPx: number
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const [broken, setBroken] = useState(false)
  const jump = useFollow(ref, target, running, volume, muted)
  if (broken || !asset.url) return <Missing asset={asset} />
  const fit = scene.fit === "cover" ? "object-cover" : "object-contain"
  return (
    <Fitted scene={scene} backdrop={asset.thumbnail_url} blurPx={blurPx}>
      <video
        ref={ref}
        src={asset.url}
        poster={asset.thumbnail_url ?? undefined}
        preload="auto"
        playsInline
        muted={muted}
        disablePictureInPicture
        onLoadedMetadata={jump}
        onError={() => setBroken(true)}
        className={cn("absolute inset-0 size-full", fit)}
      />
    </Fitted>
  )
}

/** One scene's picture: a photo (with its slow zoom), a clip, a colour or a placeholder. */
function SceneContent({
  scene,
  asset,
  start,
  time,
  playing,
  visible,
  volume,
  muted,
  stageWidth,
}: {
  scene: Scene
  asset?: StudioAsset
  start: number
  time: number
  playing: boolean
  visible: boolean
  volume: number
  muted: boolean
  stageWidth: number
}) {
  const blurPx = Math.max(stageWidth * 0.03, 4)
  if (scene.type === "color")
    return (
      <div className="absolute inset-0" style={{ background: scene.color }} />
    )
  if (scene.type === "placeholder") {
    return (
      <div className="absolute inset-0 bg-[#1C1C22]">
        <div className="absolute inset-[4%] grid place-items-center rounded-[2%] border-2 border-dashed border-white/50 text-center">
          <div className="px-[8%]">
            <p
              className="font-semibold text-white"
              style={{ fontSize: "clamp(10px, 4.2cqw, 18px)" }}
            >
              {scene.label || "Placeholder"}
            </p>
            <p
              className="mt-[0.4em] text-white/60"
              style={{ fontSize: "clamp(9px, 3.2cqw, 14px)" }}
            >
              Add media here
            </p>
          </div>
        </div>
      </div>
    )
  }
  if (!asset || asset.status !== "ready" || !asset.url)
    return <Missing asset={asset} />
  if (asset.kind === "video") {
    return (
      <SceneClip
        scene={scene}
        asset={asset}
        target={clipTime(scene, start, time)}
        running={playing && visible}
        volume={volume}
        muted={muted}
        blurPx={blurPx}
      />
    )
  }
  const scale = motionScale(scene, start, time)
  return (
    <div
      className="absolute inset-0"
      style={
        scale !== 1 ? { transform: `scale(${scale.toFixed(4)})` } : undefined
      }
    >
      <ScenePhoto scene={scene} asset={asset} blurPx={blurPx} />
    </div>
  )
}

/** A text or the logo on the stage: click to select, drag to move (shown moving, saved on release), arrow keys to
 * nudge. */
function Placeable({
  kind,
  id,
  x,
  y,
  label,
  selected,
  stage,
  onSelect,
  onMove,
  style,
  className,
  children,
}: {
  kind: "text" | "overlay"
  id: string
  x: number
  y: number
  label: string
  selected: boolean
  stage: { width: number; height: number }
  onSelect?: PreviewProps["onSelect"]
  onMove?: PreviewProps["onMove"]
  style: (x: number, y: number) => CSSProperties
  className?: string
  children: ReactNode
}) {
  const drag = useRef<{
    pointer: number
    fromX: number
    fromY: number
    moved: boolean
  } | null>(null)
  const [offset, setOffset] = useState<{ x: number; y: number } | null>(null)
  const clamp = (value: number) => Math.min(Math.max(value, 0), 1)
  const at = offset
    ? { x: clamp(x + offset.x), y: clamp(y + offset.y) }
    : { x, y }

  const down = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.stopPropagation()
    onSelect?.({ kind, id })
    if (!onMove || !stage.width) return
    drag.current = {
      pointer: event.pointerId,
      fromX: event.clientX,
      fromY: event.clientY,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointer !== event.pointerId) return
    const dx = event.clientX - state.fromX
    const dy = event.clientY - state.fromY
    if (!state.moved && Math.hypot(dx, dy) < 3) return
    state.moved = true
    setOffset({ x: dx / stage.width, y: dy / stage.height })
  }
  const up = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current
    if (!state || state.pointer !== event.pointerId) return
    drag.current = null
    if (state.moved && offset)
      onMove?.(kind, id, clamp(x + offset.x), clamp(y + offset.y))
    setOffset(null)
  }
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect?.({ kind, id })
      return
    }
    const step = event.shiftKey ? 0.05 : 0.01
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    }
    const by = moves[event.key]
    if (!by || !onMove) return
    event.preventDefault()
    onMove(kind, id, clamp(x + by[0]), clamp(y + by[1]))
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={selected}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={() => {
        drag.current = null
        setOffset(null)
      }}
      onKeyDown={key}
      className={cn(
        "absolute touch-none select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8B7CFF]",
        onMove ? "cursor-move" : "cursor-pointer",
        className,
      )}
      style={{
        ...style(at.x, at.y),
        ...(selected
          ? {
              outline: `2px solid ${ACCENT}`,
              outlineOffset: 4,
              boxShadow: "0 0 0 1px rgba(0,0,0,0.45)",
            }
          : null),
      }}
    >
      {children}
    </div>
  )
}

/** The ring of shadows that stands in for libass's outline. */
function outlineShadow(px: number) {
  if (px <= 0) return undefined
  const shadows: string[] = []
  for (let step = 0; step < 16; step++) {
    const angle = (step / 16) * Math.PI * 2
    shadows.push(
      `${(Math.cos(angle) * px).toFixed(2)}px ${(Math.sin(angle) * px).toFixed(2)}px 0 #000`,
    )
  }
  return shadows.join(",")
}

function TextLayer({
  text,
  frame,
  composition,
  stage,
  selected,
  onSelect,
  onMove,
}: {
  text: TextItem
  frame: { opacity: number; rise: number; scale: number; shiftX: number }
  composition: Composition
  stage: { width: number; height: number }
  selected: boolean
  onSelect?: PreviewProps["onSelect"]
  onMove?: PreviewProps["onMove"]
}) {
  const canvasHeight = composition.canvas.height
  const toStage = stage.height / canvasHeight
  // The renderer's sizes, in canvas pixels, then scaled to the stage.
  const canvasSize = Math.max(Math.round(text.size * canvasHeight), 8)
  const fontPx = canvasSize * toStage * TEXT_SIZE_TO_CSS
  const border = text.box
    ? Math.max(Math.round(canvasSize * 0.3), 2)
    : text.outline
      ? Math.max(Math.round(canvasSize * 0.07), 1)
      : 0
  const borderPx = border * toStage
  const horizontalRoom =
    text.align === "left"
      ? 1 - text.x
      : text.align === "right"
        ? text.x
        : Math.min(text.x, 1 - text.x) * 2
  const textWidth = Math.max(stage.width * horizontalRoom, 1)
  const anchorX =
    text.align === "left" ? "0%" : text.align === "right" ? "-100%" : "-50%"
  const origin =
    text.align === "left"
      ? "left center"
      : text.align === "right"
        ? "right center"
        : "center center"
  const effectShadows: string[] = []
  if (!text.box && text.outline) effectShadows.push(outlineShadow(borderPx) ?? "")
  if (text.effect === "shadow") effectShadows.push(`0 ${fontPx * 0.08}px ${fontPx * 0.2}px rgba(0,0,0,0.82)`)
  // The renderer's halo: a see-through, blurred border in the text's colour (neon: white letters, a stronger halo,
  // cyan when the text is white).
  const halo = text.effect === "neon" && text.color.toUpperCase() === "#FFFFFF" ? "#22D3EE" : text.color
  if (text.effect === "glow") effectShadows.push(`0 0 ${fontPx * 0.12}px ${halo}99, 0 0 ${fontPx * 0.3}px ${halo}80`)
  if (text.effect === "neon") effectShadows.push(`0 0 ${fontPx * 0.1}px ${halo}, 0 0 ${fontPx * 0.24}px ${halo}D0, 0 0 ${fontPx * 0.45}px ${halo}A0`)
  const font = fontFor(text.font)
  const weight = font.weights.length > 1 ? (text.weight === "extra_bold" ? 800 : 700) : 400
  const backdrop = text.effect === "backdrop" && !text.box
  return (
    <Placeable
      kind="text"
      id={text.id}
      x={text.x}
      y={text.y}
      label={`Text: ${text.text}`}
      selected={selected}
      stage={stage}
      onSelect={onSelect}
      onMove={onMove}
      style={(x, y) => ({
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${textWidth}px`,
        zIndex: 200,
        opacity: frame.opacity,
        transformOrigin: origin,
        transform: `translate(${anchorX}, -50%) translate(${(frame.shiftX * stage.width).toFixed(2)}px, ${(frame.rise * stage.height).toFixed(2)}px) scale(${frame.scale.toFixed(4)})`,
      })}
    >
      <div
        style={{
          fontFamily: `"${font.family}", Inter, sans-serif`,
          fontWeight: weight,
          fontSize: `${fontPx}px`,
          lineHeight: 1.21,
          whiteSpace: "pre-wrap",
          textAlign: text.align,
          color: text.effect === "neon" ? "#FFFFFF" : text.color,
          textShadow: effectShadows.filter(Boolean).join(", ") || undefined,
          background: backdrop ? "rgba(12, 16, 28, 0.76)" : undefined,
          borderRadius: backdrop ? "0.4em" : undefined,
          padding: backdrop ? `${fontPx * 0.2}px ${fontPx * 0.42}px` : undefined,
          boxDecorationBreak: backdrop ? "clone" : undefined,
          WebkitBoxDecorationBreak: backdrop ? "clone" : undefined,
        }}
      >
        {text.box ? (
          <span
            style={{
              background: text.box,
              padding: `${borderPx}px`,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
            }}
          >
            {text.text}
          </span>
        ) : (
          text.text
        )}
      </div>
    </Placeable>
  )
}

function OverlayLayer({
  overlay,
  asset,
  stage,
  selected,
  onSelect,
  onMove,
}: {
  overlay: Overlay
  asset?: StudioAsset
  stage: { width: number; height: number }
  selected: boolean
  onSelect?: PreviewProps["onSelect"]
  onMove?: PreviewProps["onMove"]
}) {
  const [broken, setBroken] = useState(false)
  const source = asset?.status === "ready" ? asset.url : null
  return (
    <Placeable
      kind="overlay"
      id={overlay.id}
      x={overlay.x}
      y={overlay.y}
      label={`Logo: ${asset?.name ?? "picture"}`}
      selected={selected}
      stage={stage}
      onSelect={onSelect}
      onMove={onMove}
      style={(x, y) => ({
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        width: `${overlay.width * 100}%`,
        zIndex: 150,
        opacity: overlay.opacity,
        transform: "translate(-50%, -50%)",
      })}
    >
      {source && !broken ? (
        <img
          src={source}
          alt=""
          draggable={false}
          onError={() => setBroken(true)}
          className="block h-auto w-full"
        />
      ) : (
        <div
          className="grid aspect-[2/1] w-full place-items-center rounded-sm border border-dashed border-white/60 bg-black/40 text-white/80"
          style={{ fontSize: "clamp(8px, 2.2cqw, 12px)" }}
        >
          Logo
        </div>
      )}
    </Placeable>
  )
}

function MusicTrack({
  url,
  frame,
  playing,
  muted,
}: {
  url: string
  frame: { sounding: boolean; position: number; volume: number }
  playing: boolean
  muted: boolean
}) {
  const ref = useRef<HTMLAudioElement>(null)
  const jump = useFollow(
    ref,
    frame.position,
    playing && frame.sounding,
    frame.volume,
    muted,
  )
  return <audio ref={ref} src={url} preload="auto" onLoadedMetadata={jump} />
}

export default function Preview({
  composition,
  assets,
  time,
  playing,
  onTime,
  onEnded,
  selected = null,
  onSelect,
  onMove,
  muted = false,
  className,
}: PreviewProps) {
  const { width: canvasWidth, height: canvasHeight } = composition.canvas
  const stage = useStage(canvasWidth / canvasHeight, className)
  const view = sceneWindow(composition, time)
  const { starts, length } = view
  const styles = layerStyles(composition, view, time)

  // The clock: while playing it runs from `time`, and an outside jump (the editor seeking) carries on from there.
  const latest = useRef({ time, length, onTime, onEnded })
  latest.current = { time, length, onTime, onEnded }
  useEffect(() => {
    if (!playing) return
    let frame = 0
    let base =
      latest.current.time >= latest.current.length - 0.01
        ? 0
        : latest.current.time
    let began = performance.now()
    let last = base
    if (base !== latest.current.time) latest.current.onTime(base)
    const tick = (now: number) => {
      const { time: outside, length: end } = latest.current
      if (Math.abs(outside - last) > 0.25) {
        base = outside
        began = now
      }
      const t = base + (now - began) / 1000
      if (t >= end) {
        latest.current.onTime(end)
        latest.current.onEnded()
        return
      }
      last = t
      latest.current.onTime(t)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing])

  const sceneAt = view.current >= 0 ? composition.scenes[view.current] : null
  const stageSize = { width: stage.width, height: stage.height }

  return (
    <div
      ref={stage.rootRef}
      className={cn("relative w-full overflow-hidden", className)}
      style={stage.rootStyle}
    >
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden bg-black [container-type:size]"
        style={{ width: stage.width, height: stage.height }}
        onPointerDown={(event) => {
          if (event.button !== 0 || !onSelect) return
          onSelect(sceneAt ? { kind: "scene", id: sceneAt.id } : null)
        }}
      >
        {view.mounted.map((index) => {
          const scene = composition.scenes[index]
          const visible = view.visible.includes(index)
          const layer = styles.layers[index] ?? { opacity: 0, zIndex: 0 }
          const move = sceneMove(scene, starts[index], visible ? time : starts[index])
          return (
            <div
              key={scene.id}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 overflow-hidden"
              style={{
                ...layer,
                // An animated scene is drawn over the canvas colour, as the renderer makes it.
                background: move.moving ? composition.canvas.background : undefined,
                visibility: visible ? "visible" : "hidden",
              }}
            >
              <div
                className="absolute inset-0"
                style={{
                  filter: EFFECT_FILTERS[scene.effect],
                  opacity: move.opacity,
                  transform: move.moving
                    ? `translate(${(move.shiftX * 100).toFixed(3)}%, ${(move.shiftY * 100).toFixed(3)}%) scale(${move.scale.toFixed(4)})`
                    : undefined,
                }}
              >
              <SceneContent
                scene={scene}
                asset={scene.asset ? assets[scene.asset] : undefined}
                start={starts[index]}
                time={visible ? time : starts[index]}
                playing={playing}
                visible={visible}
                volume={sceneVolume(composition, index, starts, time)}
                muted={muted || scene.muted}
                stageWidth={stage.width}
              />
              </div>
            </div>
          )
        })}
        {styles.wash ? (
          // Under the scenes: a fade through black or white goes through this colour.
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background: styles.wash.color,
              opacity: styles.wash.opacity,
              zIndex: 0,
            }}
          />
        ) : null}

        {composition.overlays.map((overlay) =>
          overlayShows(overlay.start, overlay.end, length, time) ? (
            <OverlayLayer
              key={overlay.id}
              overlay={overlay}
              asset={overlay.asset ? assets[overlay.asset] : undefined}
              stage={stageSize}
              selected={
                selected?.kind === "overlay" && selected.id === overlay.id
              }
              onSelect={onSelect}
              onMove={onMove}
            />
          ) : null,
        )}
        {composition.texts.map((text) => {
          const frame = textFrame(text, composition, starts, length, time)
          return frame ? (
            <TextLayer
              key={text.id}
              text={text}
              frame={frame}
              composition={composition}
              stage={stageSize}
              selected={selected?.kind === "text" && selected.id === text.id}
              onSelect={onSelect}
              onMove={onMove}
            />
          ) : null
        })}

        {composition.scenes.length === 0 ? (
          <div
            className="pointer-events-none absolute inset-0 grid place-items-center px-[10%] text-center text-white/55"
            style={{ fontSize: "clamp(11px, 3.4cqw, 15px)" }}
          >
            Add a photo, clip or colour to start.
          </div>
        ) : null}
      </div>

      {composition.audio.map((track) => {
        const asset = track.asset ? assets[track.asset] : undefined
        if (!asset || asset.status !== "ready" || !asset.url) return null
        return (
          <MusicTrack
            key={track.id}
            url={asset.url}
            frame={musicFrame(track, length, asset.duration, time)}
            playing={playing}
            muted={muted || track.muted}
          />
        )
      })}
    </div>
  )
}
