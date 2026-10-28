// What the preview shows at a moment of a composition, worked out the way the renderer does it
// (mindra-backend studio/render.py): which scenes are on screen, how a transition moves them, where a clip and the
// music are, and how far a text's animation has got. Pure functions, so scrubbing to any time gives the same frame.

import type { CSSProperties } from "react"
import {
  fittedAnimations,
  textTimes,
  timeline,
  transitionOverlap,
  type AudioTrack,
  type Composition,
  type Scene,
  type TextItem,
} from "../../lib/studio"

/** The scenes on screen at `time`, the ones to keep loaded around them, and the one that's playing. */
export type SceneWindow = {
  starts: number[]
  length: number
  /** The scene playing at `time` (the incoming one during a transition), or -1 with no scenes. */
  current: number
  /** On screen now: one scene, or two during a transition. */
  visible: number[]
  /** Kept mounted (visible, plus the one before and the next two, so they load ahead). */
  mounted: number[]
}

export function sceneWindow(
  composition: Composition,
  time: number,
): SceneWindow {
  const { starts, length } = timeline(composition)
  const count = composition.scenes.length
  if (!count) return { starts, length, current: -1, visible: [], mounted: [] }
  const t = Math.min(Math.max(time, 0), length)
  let current = 0
  for (let index = 0; index < count; index++)
    if (starts[index] <= t) current = index
  const visible: number[] = []
  composition.scenes.forEach((scene, index) => {
    const end = starts[index] + scene.duration
    // The last scene stays on screen at the very end, as the last frame does.
    if (starts[index] <= t && (t < end || (index === count - 1 && t >= end)))
      visible.push(index)
  })
  if (!visible.includes(current)) visible.push(current)
  const mounted = new Set<number>(visible)
  for (const index of [current - 1, current + 1, current + 2])
    if (index >= 0 && index < count) mounted.add(index)
  return {
    starts,
    length,
    current,
    visible: visible.sort((a, b) => a - b),
    mounted: [...mounted].sort((a, b) => a - b),
  }
}

/** How each visible scene's layer is drawn during a transition, and a colour drawn under both (fade through black or
 * white). Outside a transition only the playing scene is drawn. */
export type LayerStyles = {
  layers: Record<number, CSSProperties>
  wash: { color: string; opacity: number } | null
}

export function layerStyles(
  composition: Composition,
  window: SceneWindow,
  time: number,
): LayerStyles {
  const layers: Record<number, CSSProperties> = {}
  for (const index of window.visible)
    layers[index] = { opacity: 1, zIndex: index + 1 }
  const incoming = window.current
  const scene = composition.scenes[incoming]
  const overlap = scene && incoming > 0 ? transitionOverlap(scene) : 0
  const start = window.starts[incoming] ?? 0
  if (
    !overlap ||
    time < start ||
    time >= start + overlap ||
    !window.visible.includes(incoming - 1)
  ) {
    // Not in a transition: only the playing scene shows.
    for (const index of window.visible)
      if (index !== incoming) layers[index] = { opacity: 0, zIndex: index + 1 }
    return { layers, wash: null }
  }
  const p = Math.min(Math.max((time - start) / overlap, 0), 1)
  const into: CSSProperties = { opacity: 1, zIndex: incoming + 1 }
  const outOf: CSSProperties = { opacity: 1, zIndex: incoming }
  let wash: LayerStyles["wash"] = null
  const percent = (value: number) => `${(value * 100).toFixed(3)}%`
  switch (scene.transition.type) {
    case "fade":
      into.opacity = p
      break
    case "fade_black":
    case "fade_white": {
      // ffmpeg's fadeblack and fadewhite, over the colour: the old scene is gone a fifth of the way through, then the
      // new one comes up slowly. (ffmpeg mixes in YUV, so its middle is a little darker than this.)
      const progress = 1 - p
      outOf.opacity = smoothstep((progress - 0.8) / 0.2) * progress
      into.opacity = (1 - smoothstep((progress - 0.2) / 0.8)) * (1 - progress)
      wash = {
        color: scene.transition.type === "fade_black" ? "#000000" : "#FFFFFF",
        opacity: 1,
      }
      break
    }
    case "slide_left":
      outOf.transform = `translateX(-${percent(p)})`
      into.transform = `translateX(${percent(1 - p)})`
      break
    case "slide_right":
      outOf.transform = `translateX(${percent(p)})`
      into.transform = `translateX(-${percent(1 - p)})`
      break
    case "slide_up":
      outOf.transform = `translateY(-${percent(p)})`
      into.transform = `translateY(${percent(1 - p)})`
      break
    case "slide_down":
      outOf.transform = `translateY(${percent(p)})`
      into.transform = `translateY(-${percent(1 - p)})`
      break
    case "wipe_left":
      into.clipPath = `inset(0 0 0 ${percent(1 - p)})`
      break
    case "wipe_right":
      into.clipPath = `inset(0 ${percent(1 - p)} 0 0)`
      break
    case "circle_open": {
      // ffmpeg's circleopen: the new scene shows through a soft-edged circle from the middle, which starts a third
      // of the way through. Its strength at a distance r (0 in the middle, 1 at a corner) is
      // 1 - smoothstep(r + (0.5 - p) * 3).
      const shift = (0.5 - p) * 3
      const stops: string[] = []
      for (let step = 0; step <= 10; step++) {
        const r = step / 10
        stops.push(
          `rgba(0,0,0,${(1 - smoothstep(r + shift)).toFixed(3)}) ${r * 100}%`,
        )
      }
      const mask = `radial-gradient(circle farthest-corner at 50% 50%, ${stops.join(", ")})`
      into.maskImage = mask
      into.WebkitMaskImage = mask
      break
    }
    case "zoom_in": {
      // ffmpeg's zoomin: the old scene zooms into its middle for the first half, then the new one fades in.
      const progress = 1 - p
      const zoom = smoothstep((progress - 0.5) / 0.5)
      outOf.transform = `scale(${Math.min(1 / Math.max(zoom, 0.05), 20).toFixed(4)})`
      into.opacity = 1 - smoothstep(progress / 0.5)
      break
    }
    default:
      into.opacity = 1
  }
  layers[incoming] = into
  layers[incoming - 1] = outOf
  for (const index of window.visible)
    if (index !== incoming && index !== incoming - 1)
      layers[index] = { opacity: 0, zIndex: index + 1 }
  return { layers, wash }
}

/** GLSL's smoothstep from 0 to 1, as ffmpeg's xfade uses it. */
function smoothstep(value: number): number {
  const t = Math.min(Math.max(value, 0), 1)
  return t * t * (3 - 2 * t)
}

/** A photo's slow zoom at `time`: 1 to 1.12 over the scene (or back), as the renderer's zoompan does. */
export function motionScale(scene: Scene, start: number, time: number): number {
  if (scene.motion === "none") return 1
  const progress = Math.min(Math.max((time - start) / scene.duration, 0), 1)
  return scene.motion === "zoom_in"
    ? 1 + 0.12 * progress
    : 1.12 - 0.12 * progress
}

/** Where in its clip a video scene is at `time` (seconds into the source file). */
export function clipTime(scene: Scene, start: number, time: number): number {
  return scene.trim_start + Math.min(Math.max(time - start, 0), scene.duration)
}

/** A video scene's own sound at `time`: its volume, faded in over its transition and out over the next one's. */
export function sceneVolume(
  composition: Composition,
  index: number,
  starts: number[],
  time: number,
): number {
  const scene = composition.scenes[index]
  if (scene.muted) return 0
  const start = starts[index]
  const fadeIn = index ? transitionOverlap(scene) : 0
  const next = composition.scenes[index + 1]
  const fadeOut = next ? transitionOverlap(next) : 0
  const local = time - start
  let gain = 1
  if (fadeIn && local < fadeIn)
    gain = Math.min(gain, Math.max(local / fadeIn, 0))
  if (fadeOut && local > scene.duration - fadeOut)
    gain = Math.min(gain, Math.max((scene.duration - local) / fadeOut, 0))
  return Math.min(Math.max(scene.volume * gain, 0), 1)
}

/** How a text is drawn at `time`, or null when it isn't showing. `rise` is down and `shiftX` right, in canvas heights
 * and widths. As the renderer draws it (studio/render.py, text_events): its animation in over its first moments, then
 * still, then its animation out; moves and scales are linear, as libass's \\move and \\t are, and the short fades
 * last up to a quarter of a second. */
export type TextFrame = { opacity: number; rise: number; scale: number; shiftX: number }

const RISE = 0.04
const SLIDE = 0.12

export function textFrame(
  text: TextItem,
  composition: Composition,
  starts: number[],
  length: number,
  time: number,
): TextFrame | null {
  const times = textTimes(text, composition, starts)
  if (!times) return null
  const start = times[0]
  const end = Math.min(times[1], length)
  if (end - start < 0.05 || time < start || time >= end) return null
  const [came, goes] = fittedAnimations(text.animation_in, text.animation_out, end - start)
  const since = time - start
  const frame: TextFrame = { opacity: 1, rise: 0, scale: 1, shiftX: 0 }
  if (came > 0 && since < came) {
    const p = since / came
    const fade = Math.min(since / Math.min(came, 0.25), 1)
    switch (text.animation_in.type) {
      case "fade":
        return { ...frame, opacity: p }
      case "slide_up":
        return { ...frame, opacity: fade, rise: RISE * (1 - p) }
      case "slide_down":
        return { ...frame, opacity: fade, rise: -RISE * (1 - p) }
      case "slide_left":
        return { ...frame, opacity: fade, shiftX: SLIDE * (1 - p) }
      case "slide_right":
        return { ...frame, opacity: fade, shiftX: -SLIDE * (1 - p) }
      case "pop":
        return { ...frame, opacity: fade, scale: p < 0.7 ? 0.6 + 0.48 * (p / 0.7) : 1.08 - 0.08 * ((p - 0.7) / 0.3) }
      case "zoom_in":
        return { ...frame, opacity: fade, scale: 0.4 + 0.6 * p }
      case "bounce": {
        const scale = p < 0.55 ? 0.3 + 0.85 * (p / 0.55) : p < 0.8 ? 1.15 - 0.21 * ((p - 0.55) / 0.25) : 0.94 + 0.06 * ((p - 0.8) / 0.2)
        return { ...frame, opacity: fade, scale }
      }
    }
  }
  const leaving = end - goes
  if (goes > 0 && time >= leaving) {
    const q = (time - leaving) / goes
    const fade = Math.min((end - time) / Math.min(goes, 0.25), 1)
    switch (text.animation_out.type) {
      case "fade":
        return { ...frame, opacity: 1 - q }
      case "slide_up":
        return { ...frame, opacity: fade, rise: -RISE * q }
      case "slide_down":
        return { ...frame, opacity: fade, rise: RISE * q }
      case "slide_left":
        return { ...frame, opacity: fade, shiftX: -SLIDE * q }
      case "slide_right":
        return { ...frame, opacity: fade, shiftX: SLIDE * q }
      case "pop":
        return { ...frame, scale: q < 0.3 ? 1 + 0.1 * (q / 0.3) : 1.1 * (1 - (q - 0.3) / 0.7) }
      case "zoom_out":
        return { ...frame, opacity: fade, scale: 1 - 0.6 * q }
    }
  }
  return frame
}

/** How a scene is moved by its animations in and out at `time`, as the renderer's filters do (studio/render.py,
 * animation_filters): eased in as it comes, eased out as it goes. Shifts are in canvas widths and heights. */
export type SceneMove = { scale: number; shiftX: number; shiftY: number; opacity: number; moving: boolean }

const ZOOM_FROM = 0.4

export function sceneMove(scene: Scene, start: number, time: number): SceneMove {
  const still: SceneMove = { scale: 1, shiftX: 0, shiftY: 0, opacity: 1, moving: false }
  const came = scene.animation_in ?? { type: "none", duration: 0.5 }
  const goes = scene.animation_out ?? { type: "none", duration: 0.5 }
  if (came.type === "none" && goes.type === "none") return still
  const [into, out] = fittedAnimations(came, goes, scene.duration)
  const local = Math.min(Math.max(time - start, 0), scene.duration)
  const leave = scene.duration - out
  const p = into > 0 ? Math.min(local / into, 1) : 1
  const q = out > 0 ? Math.min(Math.max((local - leave) / out, 0), 1) : 0
  const easedIn = 1 - (1 - p) ** 3
  const easedOut = q ** 3
  const move: SceneMove = { ...still, moving: true }
  if (came.type === "zoom_in") move.scale *= 1 - ZOOM_FROM * (1 - easedIn)
  if (came.type === "zoom_out") move.scale *= 1 + ZOOM_FROM * (1 - easedIn)
  if (goes.type === "zoom_in") move.scale *= 1 + ZOOM_FROM * easedOut
  if (goes.type === "zoom_out") move.scale *= 1 - ZOOM_FROM * easedOut
  const slides: Record<string, [axis: "shiftX" | "shiftY", sign: number]> = {
    slide_left: ["shiftX", 1],
    slide_right: ["shiftX", -1],
    slide_up: ["shiftY", 1],
    slide_down: ["shiftY", -1],
  }
  if (slides[came.type]) {
    const [axis, sign] = slides[came.type]
    move[axis] += sign * (1 - easedIn)
  }
  if (slides[goes.type]) {
    const [axis, sign] = slides[goes.type]
    move[axis] += -sign * easedOut
  }
  // ffmpeg's fade filter is linear, to black.
  if (came.type === "fade") move.opacity *= p
  if (goes.type === "fade") move.opacity *= 1 - q
  return move
}

/** Whether an overlay (the logo) shows at `time`. */
export function overlayShows(
  start: number,
  end: number | null,
  length: number,
  time: number,
): boolean {
  const last = end === null ? length : Math.min(end, length)
  return time >= start && (time < last || (time >= length && last >= length))
}

/** Where a music track is at `time`: whether it's sounding, the position in its file, and its volume with fades.
 * A looped track starts at `trim_start`, then plays the whole file again and again (ffmpeg's -stream_loop with -ss). */
export type MusicFrame = { sounding: boolean; position: number; volume: number }

export function musicFrame(
  track: AudioTrack,
  length: number,
  sourceDuration: number | null,
  time: number,
): MusicFrame {
  const silent = { sounding: false, position: track.trim_start, volume: 0 }
  if (track.start >= length) return silent
  let span = length - track.start
  if (track.duration !== null) span = Math.min(span, track.duration)
  const source = sourceDuration ?? 0
  if (!track.loop && source)
    span = Math.min(span, Math.max(source - track.trim_start, 0))
  if (span < 0.05) return silent
  const elapsed = time - track.start
  if (elapsed < 0 || elapsed >= span)
    return {
      ...silent,
      position: track.trim_start + Math.max(Math.min(elapsed, span), 0),
    }
  let position = track.trim_start + elapsed
  if (track.loop && source > 0) {
    const first = Math.max(source - track.trim_start, 0)
    position =
      elapsed < first ? track.trim_start + elapsed : (elapsed - first) % source
  }
  let gain = 1
  if (track.fade_in > 0)
    gain = Math.min(gain, elapsed / Math.min(track.fade_in, span))
  if (track.fade_out > 0)
    gain = Math.min(gain, (span - elapsed) / Math.min(track.fade_out, span))
  return {
    sounding: true,
    position,
    volume: Math.min(Math.max(track.volume * gain, 0), 1),
  }
}
