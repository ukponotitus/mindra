// Changes to a composition, each returning a new one that stays within the rules the server checks (see
// studio/composition.py): scene lengths, trims inside their clip, transitions that leave some of each scene, texts
// inside the video. The editor's buttons, sliders and drags all go through these.

import {
  LIMITS,
  canvasSize,
  newId,
  textTimes,
  timeline,
  transitionOverlap,
  type Aspect,
  type AudioTrack,
  type Composition,
  type Overlay,
  type Quality,
  type Scene,
  type SceneEffect,
  type StudioAsset,
  type TextItem,
  type Transition,
} from "../../lib/studio"

const STILL = { type: "none" as const, duration: 0.5 }

const round = (value: number, digits = 2) =>
  Math.round(value * 10 ** digits) / 10 ** digits
export const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), high)

/** The longest a scene can be: its clip's length from where it's trimmed, or the scene limit. */
export function longestScene(
  scene: Scene,
  asset: StudioAsset | undefined,
): number {
  if (scene.type === "media" && asset?.kind === "video" && asset.duration) {
    return clamp(
      round(asset.duration - scene.trim_start, 2),
      LIMITS.sceneSeconds[0],
      LIMITS.sceneSeconds[1],
    )
  }
  return LIMITS.sceneSeconds[1]
}

/** Transitions shortened where they'd take more of a scene than it has, and none into the first scene. */
export function fitTransitions(scenes: Scene[]): Scene[] {
  return scenes.map((scene, index) => {
    if (index === 0)
      return scene.transition.type === "none"
        ? scene
        : { ...scene, transition: { ...scene.transition, type: "none" } }
    if (scene.transition.type === "none") return scene
    const before = scenes[index - 1]
    const roomBefore =
      before.duration - (index > 1 ? transitionOverlap(before) : 0) - 0.15
    const next = scenes[index + 1]
    const roomHere =
      scene.duration - (next ? transitionOverlap(next) : 0) - 0.15
    const most = Math.min(roomBefore, roomHere, LIMITS.transitionSeconds[1])
    if (most < LIMITS.transitionSeconds[0])
      return { ...scene, transition: { ...scene.transition, type: "none" } }
    return scene.transition.duration > most
      ? { ...scene, transition: { ...scene.transition, duration: round(most) } }
      : scene
  })
}

/** Texts on a scene kept inside it; texts on a scene that's gone moved to the video's timeline at the same moment;
 * texts timed from the start kept inside a video that got shorter. */
function fitTexts(before: Composition, after: Composition): TextItem[] {
  const oldStarts = timeline(before).starts
  const { length } = timeline(after)
  const ids = new Map(after.scenes.map((scene) => [scene.id, scene]))
  const inside = (text: TextItem) => {
    if (length <= 0 || text.end <= length) return text
    const end = round(length)
    return { ...text, end, start: round(Math.min(text.start, Math.max(end - 0.5, 0))) }
  }
  return after.texts.map((text) => {
    if (text.scene === null) return inside(text)
    const scene = ids.get(text.scene)
    if (!scene) {
      const index = before.scenes.findIndex((item) => item.id === text.scene)
      const offset = index >= 0 ? oldStarts[index] : 0
      return inside({
        ...text,
        scene: null,
        start: round(offset + text.start),
        end: round(offset + text.end),
      })
    }
    const end = Math.min(text.end, scene.duration)
    const start = Math.min(text.start, Math.max(end - 0.5, 0))
    return start === text.start && end === text.end
      ? text
      : { ...text, start: round(start), end: round(end) }
  })
}

/** The logo kept inside a video that got shorter (one shown to the end stays so). */
function fitOverlays(after: Composition): Overlay[] {
  const { length } = timeline(after)
  if (length <= 0) return after.overlays
  return after.overlays.map((overlay) => {
    if (overlay.end === null || overlay.end <= length) return overlay
    const start = round(Math.min(overlay.start, Math.max(length - 0.5, 0)))
    return { ...overlay, start, end: start === 0 ? null : round(length) }
  })
}

/** `after` with its transitions, texts and logo made to fit. */
function settle(before: Composition, after: Composition): Composition {
  const scenes = fitTransitions(after.scenes)
  const settled = { ...after, scenes }
  return { ...settled, texts: fitTexts(before, settled), overlays: fitOverlays(settled) }
}

export function updateScene(
  composition: Composition,
  id: string,
  change: Partial<Scene>,
  assets: Record<string, StudioAsset>,
): Composition {
  const scenes = composition.scenes.map((scene) => {
    if (scene.id !== id) return scene
    const next = { ...scene, ...change }
    const asset = next.asset ? assets[next.asset] : undefined
    if (asset?.kind === "video" && asset.duration) {
      next.trim_start = clamp(
        round(next.trim_start),
        0,
        Math.max(asset.duration - LIMITS.sceneSeconds[0], 0),
      )
      next.duration = clamp(
        round(next.duration),
        LIMITS.sceneSeconds[0],
        longestScene(next, asset),
      )
    } else {
      next.duration = clamp(
        round(next.duration),
        LIMITS.sceneSeconds[0],
        LIMITS.sceneSeconds[1],
      )
    }
    return next
  })
  return settle(composition, { ...composition, scenes })
}

/** A new scene for `asset`: a photo for 3 seconds, a clip for up to 5, filled when its shape matches the canvas and
 * shown whole on a blur when it doesn't. */
export function sceneFor(asset: StudioAsset, composition: Composition): Scene {
  const canvasTall = composition.canvas.height > composition.canvas.width
  const assetTall = (asset.height ?? 1) > (asset.width ?? 1)
  const square = composition.canvas.height === composition.canvas.width
  const matches = square || canvasTall === assetTall
  return {
    id: newId("s"),
    type: "media",
    asset: asset.id,
    duration:
      asset.kind === "video"
        ? clamp(
            round(Math.min(asset.duration ?? 5, 5)),
            LIMITS.sceneSeconds[0],
            LIMITS.sceneSeconds[1],
          )
        : 3,
    trim_start: 0,
    fit: matches ? "cover" : "blur",
    motion: asset.kind === "image" && matches ? "zoom_in" : "none",
    effect: "none",
    volume: 1,
    muted: false,
    color: "#000000",
    label: "",
    transition: {
      type: composition.scenes.length ? "fade" : "none",
      duration: 0.5,
    },
    animation_in: STILL,
    animation_out: STILL,
  }
}

export function addScene(
  composition: Composition,
  scene: Scene,
  at = composition.scenes.length,
): Composition {
  if (composition.scenes.length >= LIMITS.scenes) return composition
  const scenes = [...composition.scenes]
  scenes.splice(at, 0, scene)
  return settle(composition, { ...composition, scenes })
}

export function colorScene(composition: Composition, color = "#6D5EF5"): Scene {
  return {
    id: newId("s"),
    type: "color",
    asset: null,
    duration: 3,
    trim_start: 0,
    fit: "cover",
    motion: "none",
    effect: "none",
    volume: 1,
    muted: false,
    color,
    label: "",
    transition: {
      type: composition.scenes.length ? "fade" : "none",
      duration: 0.5,
    },
    animation_in: STILL,
    animation_out: STILL,
  }
}

/** Put `asset` in a scene (a placeholder becomes a media scene), keeping its length where the clip allows. */
export function replaceMedia(
  composition: Composition,
  id: string,
  asset: StudioAsset,
  assets: Record<string, StudioAsset>,
): Composition {
  const scene = composition.scenes.find((item) => item.id === id)
  if (!scene) return composition
  const fresh = sceneFor(asset, composition)
  return updateScene(
    composition,
    id,
    {
      type: "media",
      asset: asset.id,
      trim_start: 0,
      fit: fresh.fit,
      motion: asset.kind === "image" ? scene.motion : "none",
      label: "",
    },
    { ...assets, [asset.id]: asset },
  )
}

export function moveScene(
  composition: Composition,
  from: number,
  to: number,
): Composition {
  if (from === to || to < 0 || to >= composition.scenes.length)
    return composition
  const scenes = [...composition.scenes]
  const [moved] = scenes.splice(from, 1)
  scenes.splice(to, 0, moved)
  // A scene moved to the front keeps its transition for when it's moved back; fitTransitions makes the first a cut.
  const restored = scenes.map((scene, index) =>
    index > 0 && scene.transition.type === "none" && scene.id === moved.id
      ? { ...scene, transition: { type: "fade" as const, duration: 0.5 } }
      : scene,
  )
  return settle(composition, { ...composition, scenes: restored })
}

export function removeScene(composition: Composition, id: string): Composition {
  return settle(composition, {
    ...composition,
    scenes: composition.scenes.filter((scene) => scene.id !== id),
  })
}

export function duplicateScene(
  composition: Composition,
  id: string,
): Composition {
  const index = composition.scenes.findIndex((scene) => scene.id === id)
  if (index < 0) return composition
  const copy = {
    ...composition.scenes[index],
    id: newId("s"),
    transition: { type: "fade" as const, duration: 0.5 },
  }
  return addScene(composition, copy, index + 1)
}

/** Which scene is showing at `time` (the later one during a transition). */
export function sceneIndexAt(composition: Composition, time: number): number {
  const { starts } = timeline(composition)
  let found = 0
  starts.forEach((start, index) => {
    if (time >= start - 0.001) found = index
  })
  return found
}

/** How a new text looks: the text panel's presets fill these in. */
export type TextStyle = Partial<Omit<TextItem, "id" | "scene" | "start" | "end">>

/** A text at `time`, timed from the start of the video (so it can be stretched across scenes), for three seconds or to
 * the end of the video. */
export function addText(
  composition: Composition,
  time: number,
  style: TextStyle = {},
): { composition: Composition; id: string } {
  const { length } = timeline(composition)
  const room = Math.max(length, 3)
  const start = clamp(round(time), 0, Math.max(room - 0.5, 0))
  const text: TextItem = {
    id: newId("t"),
    text: "Your text",
    scene: null,
    start,
    end: round(Math.min(start + 3, room)),
    x: 0.5,
    y: 0.5,
    size: 0.06,
    font: "inter",
    color: "#FFFFFF",
    weight: "bold",
    align: "center",
    box: null,
    outline: true,
    effect: "none",
    animation_in: { type: "fade", duration: 0.4 },
    animation_out: { type: "fade", duration: 0.3 },
    ...style,
  }
  return {
    composition: {
      ...composition,
      texts: [...composition.texts, text].slice(0, LIMITS.texts),
    },
    id: text.id,
  }
}

export function updateText(
  composition: Composition,
  id: string,
  change: Partial<TextItem>,
): Composition {
  const texts = composition.texts.map((text) => {
    if (text.id !== id) return text
    const next = { ...text, ...change }
    // Moving a text to another scene (or to the whole video) keeps it where it shows if it can.
    if (change.scene !== undefined && change.scene !== text.scene) {
      const { starts } = timeline(composition)
      const indexOf = (sceneId: string | null) =>
        composition.scenes.findIndex((scene) => scene.id === sceneId)
      const from = text.scene === null ? 0 : (starts[indexOf(text.scene)] ?? 0)
      const to =
        change.scene === null ? 0 : (starts[indexOf(change.scene)] ?? 0)
      next.start = Math.max(0, round(text.start + from - to))
      next.end = round(next.start + (text.end - text.start))
    }
    const limit =
      next.scene === null
        ? Math.max(timeline(composition).length, 0.5)
        : (composition.scenes.find((scene) => scene.id === next.scene)
            ?.duration ?? 3)
    next.end = clamp(round(next.end), 0.2, limit)
    next.start = clamp(round(next.start), 0, Math.max(next.end - 0.2, 0))
    next.x = clamp(round(next.x, 3), 0, 1)
    next.y = clamp(round(next.y, 3), 0, 1)
    return next
  })
  return { ...composition, texts }
}

/** A text moved or stretched on the timeline to `start` and `end` (seconds in the video): from then on it's timed from
 * the start of the video, so it can run across as many scenes as wanted. */
export function timeText(composition: Composition, id: string, start: number, end: number): Composition {
  const { length } = timeline(composition)
  const last = Math.max(length, 0.5)
  const from = clamp(round(start), 0, Math.max(last - 0.2, 0))
  const to = clamp(round(end), from + 0.2, last)
  return {
    ...composition,
    texts: composition.texts.map((text) => (text.id === id ? { ...text, scene: null, start: from, end: round(to) } : text)),
  }
}

/** When a text shows, in seconds in the video. */
export function textSpan(composition: Composition, text: TextItem): [number, number] {
  return textTimes(text, composition) ?? [text.start, text.end]
}

/** A copy of a text at the same time, a little lower so both can be seen. */
export function duplicateText(composition: Composition, id: string): { composition: Composition; id: string } | null {
  const text = composition.texts.find((item) => item.id === id)
  if (!text || composition.texts.length >= LIMITS.texts) return null
  const [start, end] = textSpan(composition, text)
  const copy: TextItem = { ...text, id: newId("t"), scene: null, start, end, y: clamp(round(text.y + 0.08, 3), 0, 1) }
  return { composition: { ...composition, texts: [...composition.texts, copy] }, id: copy.id }
}

export function removeText(composition: Composition, id: string): Composition {
  return {
    ...composition,
    texts: composition.texts.filter((text) => text.id !== id),
  }
}

export function addLogo(
  composition: Composition,
  asset: StudioAsset,
): { composition: Composition; id: string } {
  const overlay: Overlay = {
    id: newId("o"),
    asset: asset.id,
    x: 0.85,
    y: 0.08,
    width: 0.2,
    start: 0,
    end: null,
    opacity: 1,
  }
  return {
    composition: {
      ...composition,
      overlays: [...composition.overlays, overlay].slice(0, LIMITS.overlays),
    },
    id: overlay.id,
  }
}

export function updateOverlay(
  composition: Composition,
  id: string,
  change: Partial<Overlay>,
): Composition {
  return {
    ...composition,
    overlays: composition.overlays.map((overlay) => {
      if (overlay.id !== id) return overlay
      const next = { ...overlay, ...change }
      next.x = clamp(round(next.x, 3), 0, 1)
      next.y = clamp(round(next.y, 3), 0, 1)
      next.width = clamp(round(next.width, 3), 0.03, 1)
      next.opacity = clamp(round(next.opacity), 0.1, 1)
      return next
    }),
  }
}

/** The logo moved or stretched on the timeline; reaching the end of the video means "to the end". */
export function timeOverlay(composition: Composition, id: string, start: number, end: number): Composition {
  const { length } = timeline(composition)
  const from = clamp(round(start), 0, Math.max(length - 0.2, 0))
  const to = clamp(round(end), from + 0.2, Math.max(length, from + 0.2))
  return updateOverlay(composition, id, { start: from, end: to >= length - 0.05 ? null : to })
}

export function removeOverlay(
  composition: Composition,
  id: string,
): Composition {
  return {
    ...composition,
    overlays: composition.overlays.filter((overlay) => overlay.id !== id),
  }
}

/** Use `asset` as the music: it replaces the first track (the music), or becomes it. */
export function setMusic(
  composition: Composition,
  asset: StudioAsset,
): { composition: Composition; id: string } {
  const first = composition.audio[0]
  const track: AudioTrack = first
    ? { ...first, asset: asset.id, trim_start: 0 }
    : {
        id: newId("a"),
        asset: asset.id,
        start: 0,
        trim_start: 0,
        duration: null,
        volume: 0.7,
        muted: false,
        fade_in: 1,
        fade_out: 2,
        loop: true,
      }
  return {
    composition: {
      ...composition,
      audio: [track, ...composition.audio.slice(1)],
    },
    id: track.id,
  }
}

export function updateAudio(
  composition: Composition,
  id: string,
  change: Partial<AudioTrack>,
): Composition {
  return {
    ...composition,
    audio: composition.audio.map((track) =>
      track.id === id ? { ...track, ...change } : track,
    ),
  }
}

/** Music moved or stretched on the timeline; reaching the end of the video means "to the end". */
export function timeAudio(composition: Composition, id: string, start: number, end: number): Composition {
  const { length } = timeline(composition)
  const from = clamp(round(start), 0, Math.max(length - 0.2, 0))
  const to = clamp(round(end), from + 0.2, Math.max(length, from + 0.2))
  return updateAudio(composition, id, { start: from, duration: to >= length - 0.05 ? null : round(to - from) })
}

export function removeAudio(composition: Composition, id: string): Composition {
  return {
    ...composition,
    audio: composition.audio.filter((track) => track.id !== id),
  }
}

export function setCanvas(
  composition: Composition,
  change: { aspect?: Aspect; quality?: Quality; background?: string },
): Composition {
  const aspect = change.aspect ?? composition.canvas.aspect
  const quality = change.quality ?? composition.export.quality
  const [width, height] = canvasSize(aspect, quality)
  return {
    ...composition,
    canvas: {
      ...composition.canvas,
      aspect,
      width,
      height,
      background: change.background ?? composition.canvas.background,
    },
    export: { quality },
  }
}

export function placeholderCount(composition: Composition) {
  return composition.scenes.filter((scene) => scene.type === "placeholder")
    .length
}

/** Split the scene playing at `time` into two at that moment (as CapCut's Split): the first keeps how it comes in, the
 * second how it goes, with a cut between them; a clip's second part carries on where the first stopped. Null when the
 * playhead is too near either end of the scene. */
export function splitScene(composition: Composition, time: number): { composition: Composition; id: string } | null {
  const { starts } = timeline(composition)
  const index = sceneIndexAt(composition, time)
  const scene = composition.scenes[index]
  if (!scene) return null
  const at = round(time - starts[index])
  if (at < LIMITS.sceneSeconds[0] || scene.duration - at < LIMITS.sceneSeconds[0]) return null
  const first: Scene = { ...scene, duration: at, animation_out: STILL }
  const second: Scene = {
    ...scene,
    id: newId("s"),
    duration: round(scene.duration - at),
    trim_start: scene.type === "media" ? round(scene.trim_start + at) : scene.trim_start,
    transition: { type: "none", duration: 0.5 },
    animation_in: STILL,
  }
  const scenes = [...composition.scenes]
  scenes.splice(index, 1, first, second)
  // Texts on the scene after the cut go with the second part.
  const texts = composition.texts.map((text) =>
    text.scene === scene.id && text.start >= at ? { ...text, scene: second.id, start: round(text.start - at), end: round(text.end - at) } : text,
  )
  return { composition: settle(composition, { ...composition, scenes, texts }), id: second.id }
}

/** The same transition into every scene after the first (CapCut's "Apply to all"). */
export function transitionAll(composition: Composition, transition: Transition): Composition {
  return settle(composition, {
    ...composition,
    scenes: composition.scenes.map((scene, index) => (index ? { ...scene, transition: { ...transition } } : scene)),
  })
}

/** The same filter on every scene. */
export function filterAll(composition: Composition, effect: SceneEffect): Composition {
  return { ...composition, scenes: composition.scenes.map((scene) => ({ ...scene, effect })) }
}

/** Where an asset is used: how many scenes, logos and music tracks. */
export function usesOf(composition: Composition, assetId: string) {
  return {
    scenes: composition.scenes.filter((scene) => scene.asset === assetId).length,
    overlays: composition.overlays.filter((overlay) => overlay.asset === assetId).length,
    audio: composition.audio.filter((track) => track.asset === assetId).length,
  }
}

/** Everything that uses an asset taken out of the video: its scenes, logos and music. */
export function removeUses(composition: Composition, assetId: string): Composition {
  return settle(composition, {
    ...composition,
    scenes: composition.scenes.filter((scene) => scene.asset !== assetId),
    overlays: composition.overlays.filter((overlay) => overlay.asset !== assetId),
    audio: composition.audio.filter((track) => track.asset !== assetId),
  })
}
