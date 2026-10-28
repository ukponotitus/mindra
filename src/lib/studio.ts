// Motion Studio: videos made from a workspace's photos, clips, logo and music, by hand in the editor or by the AI
// creator, from one editable composition (see mindra-backend MOTION_STUDIO.md and studio/composition.py, which this
// mirrors: keep the two in step).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError, apiRequest, uploadWithProgress } from "./api"
import { uploadOptionsQuery } from "./projects"
import type { Paginated } from "./types"
import { DirectUpload, forgetSavedUpload, uploadKind } from "./upload"

// The composition --------------------------------------------------------------------------------------------------

export type Aspect = "9:16" | "16:9" | "1:1"
export type Quality = "high" | "standard"
export type SceneType = "media" | "color" | "placeholder"
export type Fit = "cover" | "contain" | "blur"
export type Motion = "none" | "zoom_in" | "zoom_out"
export type SceneEffect = "none" | "vivid" | "bright" | "warm" | "cool" | "moody" | "matte" | "vintage" | "sepia" | "black_white"
/** How a scene comes in or goes out (CapCut's clip animations). */
export type SceneAnimation = "none" | "fade" | "zoom_in" | "zoom_out" | "slide_left" | "slide_right" | "slide_up" | "slide_down"
export type TransitionType = "none" | "fade" | "fade_black" | "fade_white" | "slide_left" | "slide_right" | "slide_up" | "slide_down" | "wipe_left" | "wipe_right" | "circle_open" | "zoom_in"
export type Weight = "bold" | "extra_bold"
export type Align = "left" | "center" | "right"
export type TextAnimation = "none" | "fade" | "slide_up" | "slide_down" | "slide_left" | "slide_right" | "pop" | "zoom_in" | "bounce"
export type TextOutAnimation = "none" | "fade" | "slide_up" | "slide_down" | "slide_left" | "slide_right" | "pop" | "zoom_out"
export type TextEffect = "none" | "shadow" | "glow" | "neon" | "backdrop"
export type FontId = "inter" | "poppins" | "anton" | "bebas" | "archivo" | "abril" | "righteous" | "lobster" | "pacifico"

/** An animation in (as it appears) or out (as it goes), with its length in seconds. */
export type Animation<T extends string> = { type: T; duration: number }

export type Transition = { type: TransitionType; duration: number }

export type Scene = {
  id: string
  type: SceneType
  asset: string | null
  /** Seconds the scene lasts, transitions included. */
  duration: number
  /** Video: where in the clip it starts, in seconds. */
  trim_start: number
  fit: Fit
  /** Photos only. */
  motion: Motion
  /** A fixed colour treatment applied to this media scene. */
  effect: SceneEffect
  /** Video only: its own sound, 0 to 1. */
  volume: number
  /** Video only: remove its original soundtrack while keeping added music. */
  muted: boolean
  /** A colour scene's colour, and the bars around a "contain" picture. */
  color: string
  /** What a placeholder needs ("A photo of the choir"), or a note. */
  label: string
  /** How the scene starts: anything but "none" overlaps the end of the scene before by its duration. */
  transition: Transition
  animation_in: Animation<SceneAnimation>
  animation_out: Animation<SceneAnimation>
}

export type TextItem = {
  id: string
  text: string
  /** Timed from the start of the video when null (what the editor makes: it can run across scenes), or from this
   * scene's start (some AI drafts; dragging it makes it timed from the start). */
  scene: string | null
  start: number
  end: number
  /** The text's anchor, 0 to 1 across and down the canvas. */
  x: number
  y: number
  /** A share of the canvas height. */
  size: number
  font: FontId
  color: string
  weight: Weight
  align: Align
  /** A colour behind the text, or null. */
  box: string | null
  outline: boolean
  /** A fixed visual treatment for the text. */
  effect: TextEffect
  animation_in: Animation<TextAnimation>
  animation_out: Animation<TextOutAnimation>
}

export type Overlay = {
  id: string
  asset: string | null
  x: number
  y: number
  /** A share of the canvas width. */
  width: number
  start: number
  /** null: to the end. */
  end: number | null
  opacity: number
}

export type AudioTrack = {
  id: string
  asset: string | null
  start: number
  trim_start: number
  /** null: to the end of the video (or of the music, unless it loops). */
  duration: number | null
  volume: number
  /** Silenced without losing its volume. */
  muted: boolean
  fade_in: number
  fade_out: number
  loop: boolean
}

export type Composition = {
  version: 1
  canvas: {
    aspect: Aspect
    background: string
    width: number
    height: number
    fps: number
  }
  scenes: Scene[]
  texts: TextItem[]
  overlays: Overlay[]
  audio: AudioTrack[]
  export: { quality: Quality }
}

export const ASPECTS: {
  id: Aspect
  label: string
  detail: string
  size: [number, number]
}[] = [
  {
    id: "9:16",
    label: "Vertical 9:16",
    detail: "Reels, TikTok, Shorts, Status",
    size: [1080, 1920],
  },
  {
    id: "16:9",
    label: "Landscape 16:9",
    detail: "YouTube, Facebook, screens",
    size: [1920, 1080],
  },
  {
    id: "1:1",
    label: "Square 1:1",
    detail: "Instagram and Facebook feeds",
    size: [1080, 1080],
  },
]

/** Filters: a colour look for a scene, as the renderer makes it (studio/render.py) and the preview shows it. */
export const SCENE_EFFECTS: { id: SceneEffect; label: string }[] = [
  { id: "none", label: "Original" },
  { id: "vivid", label: "Vivid" },
  { id: "bright", label: "Bright" },
  { id: "warm", label: "Warm" },
  { id: "cool", label: "Cool" },
  { id: "moody", label: "Moody" },
  { id: "matte", label: "Matte" },
  { id: "vintage", label: "Vintage" },
  { id: "sepia", label: "Sepia" },
  { id: "black_white", label: "Black & white" },
]

export const SCENE_ANIMATIONS_IN: { id: SceneAnimation; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade in" },
  { id: "zoom_in", label: "Zoom in" },
  { id: "zoom_out", label: "Zoom out" },
  { id: "slide_left", label: "Slide left" },
  { id: "slide_right", label: "Slide right" },
  { id: "slide_up", label: "Slide up" },
  { id: "slide_down", label: "Slide down" },
]

export const SCENE_ANIMATIONS_OUT: { id: SceneAnimation; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade out" },
  { id: "zoom_in", label: "Zoom in" },
  { id: "zoom_out", label: "Zoom out" },
  { id: "slide_left", label: "Slide left" },
  { id: "slide_right", label: "Slide right" },
  { id: "slide_up", label: "Slide up" },
  { id: "slide_down", label: "Slide down" },
]

/** The fonts texts can use: the renderer has each one's file (clips/fonts), and the editor loads them from Google
 * Fonts. Only Inter and Poppins come in two weights. */
export const FONTS: { id: FontId; label: string; family: string; weights: number[] }[] = [
  { id: "inter", label: "Inter", family: "Inter", weights: [700, 800] },
  { id: "poppins", label: "Poppins", family: "Poppins", weights: [700, 800] },
  { id: "anton", label: "Anton", family: "Anton", weights: [400] },
  { id: "bebas", label: "Bebas Neue", family: "Bebas Neue", weights: [400] },
  { id: "archivo", label: "Archivo Black", family: "Archivo Black", weights: [400] },
  { id: "abril", label: "Abril Fatface", family: "Abril Fatface", weights: [400] },
  { id: "righteous", label: "Righteous", family: "Righteous", weights: [400] },
  { id: "lobster", label: "Lobster", family: "Lobster", weights: [400] },
  { id: "pacifico", label: "Pacifico", family: "Pacifico", weights: [400] },
]

/** The Google Fonts stylesheet for every font, loaded by the editor (not the rest of the app). */
export const FONTS_STYLESHEET =
  "https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Anton&family=Bebas+Neue&family=Archivo+Black&family=Abril+Fatface&family=Righteous&family=Lobster&family=Pacifico&display=swap"

export function fontFor(id: FontId) {
  return FONTS.find((font) => font.id === id) ?? FONTS[0]
}

export function canvasSize(
  aspect: Aspect,
  quality: Quality = "high",
): [number, number] {
  const [width, height] = ASPECTS.find((item) => item.id === aspect)!.size
  if (quality === "high") return [width, height]
  const even = (value: number) => Math.round(value / 2) * 2
  return [even((width * 2) / 3), even((height * 2) / 3)]
}

export const TRANSITIONS: { id: TransitionType; label: string }[] = [
  { id: "none", label: "Cut" },
  { id: "fade", label: "Crossfade" },
  { id: "fade_black", label: "Fade through black" },
  { id: "fade_white", label: "Fade through white" },
  { id: "slide_left", label: "Slide left" },
  { id: "slide_right", label: "Slide right" },
  { id: "slide_up", label: "Slide up" },
  { id: "slide_down", label: "Slide down" },
  { id: "wipe_left", label: "Wipe left" },
  { id: "wipe_right", label: "Wipe right" },
  { id: "circle_open", label: "Circle open" },
  { id: "zoom_in", label: "Zoom in" },
]

export const FITS: { id: Fit; label: string }[] = [
  { id: "cover", label: "Fill the frame" },
  { id: "contain", label: "Show it all" },
  { id: "blur", label: "Show it all on a blur" },
]

export const MOTIONS: { id: Motion; label: string }[] = [
  { id: "none", label: "Still" },
  { id: "zoom_in", label: "Slow zoom in" },
  { id: "zoom_out", label: "Slow zoom out" },
]

export const TEXT_ANIMATIONS: { id: TextAnimation; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade in" },
  { id: "slide_up", label: "Rise up" },
  { id: "slide_down", label: "Drop in" },
  { id: "slide_left", label: "From the right" },
  { id: "slide_right", label: "From the left" },
  { id: "pop", label: "Pop" },
  { id: "zoom_in", label: "Zoom in" },
  { id: "bounce", label: "Bounce" },
]

export const TEXT_OUT_ANIMATIONS: { id: TextOutAnimation; label: string }[] = [
  { id: "none", label: "None" },
  { id: "fade", label: "Fade out" },
  { id: "slide_up", label: "Float up" },
  { id: "slide_down", label: "Drop out" },
  { id: "slide_left", label: "To the left" },
  { id: "slide_right", label: "To the right" },
  { id: "pop", label: "Pop out" },
  { id: "zoom_out", label: "Zoom out" },
]

export const TEXT_EFFECTS: { id: TextEffect; label: string }[] = [
  { id: "none", label: "None" },
  { id: "shadow", label: "Soft shadow" },
  { id: "glow", label: "Glow" },
  { id: "neon", label: "Neon" },
  { id: "backdrop", label: "Soft backdrop" },
]

export const LIMITS = {
  scenes: 60,
  texts: 60,
  overlays: 8,
  audio: 4,
  seconds: 300,
  sceneSeconds: [0.5, 60] as const,
  transitionSeconds: [0.2, 2] as const,
  animationSeconds: [0.1, 3] as const,
  textCharacters: 200,
  textLines: 4,
}

/** libass draws a size-N Inter text as wide as CSS draws it at about 0.867 N (measured against a render). */
export const TEXT_SIZE_TO_CSS = 0.867

export function newId(prefix: string) {
  return `${prefix}${Math.random().toString(36).slice(2, 12)}`
}

/** An animation's length with the in and out kept inside `length`, shortened in proportion when they'd overlap. */
export function fittedAnimations<A extends string, B extends string>(
  came: Animation<A>,
  goes: Animation<B>,
  length: number,
): [number, number] {
  const into = came.type === "none" ? 0 : came.duration
  const out = goes.type === "none" ? 0 : goes.duration
  if (into + out <= length || length <= 0) return [into, out]
  const scale = length / (into + out)
  return [into * scale, out * scale]
}

export function blankComposition(aspect: Aspect = "9:16"): Composition {
  const [width, height] = canvasSize(aspect)
  return {
    version: 1,
    canvas: { aspect, background: "#000000", width, height, fps: 30 },
    scenes: [],
    texts: [],
    overlays: [],
    audio: [],
    export: { quality: "high" },
  }
}

export function transitionOverlap(scene: Scene): number {
  return scene.transition?.type && scene.transition.type !== "none"
    ? scene.transition.duration
    : 0
}

/** Each scene's start in seconds from the start of the video, and the video's length (as the server works it out). */
export function timeline(
  composition: Pick<Composition, "scenes">,
): { starts: number[]; length: number } {
  const starts: number[] = []
  let end = 0
  composition.scenes.forEach((scene, index) => {
    const start = Math.max(0, end - (index ? transitionOverlap(scene) : 0))
    starts.push(start)
    end = start + scene.duration
  })
  return { starts, length: end }
}

/** When a text shows, in seconds from the start of the video, or null when it isn't in the video. */
export function textTimes(
  text: TextItem,
  composition: Composition,
  starts = timeline(composition).starts,
): [number, number] | null {
  let offset = 0
  if (text.scene !== null) {
    const index = composition.scenes.findIndex(
      (scene) => scene.id === text.scene,
    )
    if (index < 0) return null
    offset = starts[index]
  }
  return [offset + text.start, offset + text.end]
}

export function formatSeconds(seconds: number): string {
  const whole = Math.max(0, seconds)
  const minutes = Math.floor(whole / 60)
  const rest = whole - minutes * 60
  return `${minutes}:${rest.toFixed(1).padStart(4, "0")}`
}

// The API ----------------------------------------------------------------------------------------------------------

export type AssetKind = "image" | "video" | "audio"

export type StudioAsset = {
  id: string
  workspace: number | null
  kind: AssetKind
  name: string
  original_filename: string
  status: "processing" | "ready" | "failed"
  error: string
  width: number | null
  height: number | null
  duration: number | null
  has_audio: boolean
  has_alpha: boolean
  /** A track in Mindra's music library. */
  library: boolean
  mood: string
  /** For music found with the music search: who made it and its licence, to put in the post's caption. */
  credit: string
  /** "jamendo" for music found with the music search, or "" for an upload. */
  source: string
  /** The music's page where it came from. */
  source_url: string
  /** The rendition: what the editor shows and plays. */
  url: string | null
  thumbnail_url: string | null
  created_at: string
}

export type RenderStatus = "queued" | "rendering" | "ready" | "failed"

export type StudioRender = {
  id: string
  project: string
  version: number
  status: RenderStatus
  progress: number
  error: string
  width: number | null
  height: number | null
  duration: number | null
  video_url: string | null
  download_url: string | null
  thumbnail_url: string | null
  /** Once posts are written for this video: the clip (and its project) that carries it into the Content Library. */
  post_clip: string | null
  post_project: string | null
  created_at: string
  updated_at: string
}

export type ProjectStatus = "ready" | "generating" | "failed"

export type StudioProjectSummary = {
  id: string
  workspace: number
  name: string
  origin: "manual" | "ai"
  status: ProjectStatus
  error: string
  version: number
  aspect: Aspect
  duration: number
  scene_count: number
  latest_render: StudioRender | null
  created_at: string
  updated_at: string
}

export type VideoType = "church_recap" | "event_promo" | "business_ad" | "testimonial" | "slideshow"
export type VideoStyle = "cinematic" | "energetic" | "minimal" | "inspirational"

/** What was asked of the AI creator. */
export type AiBrief = {
  prompt: string
  video_type: VideoType
  duration: 15 | 30 | 45 | 60
  aspect: Aspect
  style: VideoStyle
  /** A library track's or an uploaded track's id, or null for no music. */
  music: string | null
  /** A picture's id for the logo, or null. */
  logo: string | null
  colors: string[]
  /** The photos and clips to use, in the order given. */
  assets: string[]
}

export type StudioProject = StudioProjectSummary & {
  brief: Partial<AiBrief>
  composition: Composition
  /** The ids of the project's own media (what its media panel shows), newest first. */
  media: string[]
  /** The assets the editor needs (the project's media and what the composition uses), by id. */
  assets: Record<string, StudioAsset>
}

export type Revision = {
  version: number
  source: string
  note: string
  created_by: string | null
  created_at: string
}

export const VIDEO_TYPES: { id: VideoType; label: string }[] = [
  { id: "church_recap", label: "Church service recap" },
  { id: "event_promo", label: "Event promo" },
  { id: "business_ad", label: "Business ad" },
  { id: "testimonial", label: "Testimonial" },
  { id: "slideshow", label: "Slideshow" },
]

export const VIDEO_STYLES: { id: VideoStyle; label: string }[] = [
  { id: "inspirational", label: "Inspirational" },
  { id: "cinematic", label: "Cinematic" },
  { id: "energetic", label: "Energetic" },
  { id: "minimal", label: "Minimal" },
]

export const VIDEO_LENGTHS = [15, 30, 45, 60] as const

const projectsKey = ["studio", "projects"]
const projectKey = (id: string) => ["studio", "project", id]
const assetsKey = ["studio", "assets"]

export function isRendering(
  render: Pick<StudioRender, "status"> | null | undefined,
) {
  return render?.status === "queued" || render?.status === "rendering"
}

export function useStudioProjects() {
  return useQuery({
    queryKey: projectsKey,
    queryFn: () =>
      apiRequest<Paginated<StudioProjectSummary>>(
        "/api/studio/projects/?page_size=100",
      ),
    refetchInterval: (query) =>
      query.state.data?.results.some(
        (project) =>
          project.status === "generating" || isRendering(project.latest_render),
      )
        ? 3000
        : false,
  })
}

export function useStudioProject(id: string | undefined) {
  return useQuery({
    queryKey: projectKey(id ?? ""),
    queryFn: () => apiRequest<StudioProject>(`/api/studio/projects/${id}/`),
    enabled: Boolean(id),
    // While the AI creator writes the draft, keep checking.
    refetchInterval: (query) =>
      query.state.data?.status === "generating" ? 2500 : false,
    // The editor holds its own copy while editing; don't swap it underneath on focus.
    refetchOnWindowFocus: false,
  })
}

export function useCreateProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: {
      name: string
      aspect: Aspect
      composition?: Composition
    }) =>
      apiRequest<StudioProject>("/api/studio/projects/", {
        method: "POST",
        body,
      }),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKey(project.id), project)
      queryClient.invalidateQueries({ queryKey: projectsKey })
    },
  })
}

export function useCreateWithAi() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AiBrief & { name: string }) =>
      apiRequest<StudioProject>("/api/studio/projects/ai/", {
        method: "POST",
        body,
      }),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKey(project.id), project)
      queryClient.invalidateQueries({ queryKey: projectsKey })
    },
  })
}

/** Save the composition, with the version it was edited from (a 409 means it changed elsewhere). */
export function saveComposition(
  id: string,
  composition: Composition,
  version: number,
) {
  return apiRequest<StudioProject>(`/api/studio/projects/${id}/composition/`, {
    method: "PUT",
    body: { composition, version },
  })
}

export function useRenameProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiRequest<StudioProject>(`/api/studio/projects/${id}/`, {
        method: "PATCH",
        body: { name },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKey }),
  })
}

export function useDeleteProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<null>(`/api/studio/projects/${id}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectsKey }),
  })
}

export function useRevisions(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ["studio", "revisions", id],
    queryFn: () =>
      apiRequest<Revision[]>(`/api/studio/projects/${id}/revisions/`),
    enabled,
  })
}

export function restoreRevision(id: string, number: number, version: number) {
  return apiRequest<StudioProject>(
    `/api/studio/projects/${id}/revisions/${number}/restore/`,
    { method: "POST", body: { version } },
  )
}

/** The AI assistant's answer: the project (a new version when something changed), what changed and what couldn't be
 * done (in words, from Mindra, not the AI), and the assistant's own reply. */
export interface AssistantAnswer {
  project: StudioProject
  changes: string[]
  skipped: string[]
  reply: string
}

/** What's selected in the editor, as the assistant names it. */
export type AssistantSelection = { kind: "clip" | "text" | "logo" | "music"; id: string } | null

/** Ask the AI assistant to change the video, from the version on screen (saved first). A 409 means it changed
 * elsewhere; nothing is applied then. */
export function askAssistant(
  id: string,
  body: { request: string; version: number; selected: AssistantSelection; time: number },
) {
  return apiRequest<AssistantAnswer>(`/api/studio/projects/${id}/assistant/`, {
    method: "POST",
    body,
  })
}

export function useStudioAssets() {
  return useQuery({
    queryKey: assetsKey,
    queryFn: () =>
      apiRequest<Paginated<StudioAsset>>("/api/studio/assets/?page_size=200"),
    refetchInterval: (query) =>
      query.state.data?.results.some((asset) => asset.status === "processing")
        ? 3000
        : false,
  })
}

/** Bring earlier uploads into a video's media, or take them out (the files stay in the workspace's uploads). */
export function changeProjectMedia(id: string, assets: string[], remove = false) {
  return apiRequest<StudioProject>(`/api/studio/projects/${id}/media/${remove ? "remove/" : ""}`, {
    method: "POST",
    body: { assets },
  })
}

/** A song from the music search (real songs by independent artists, from Jamendo, licensed for use in videos). */
export type MusicTrack = {
  id: string
  title: string
  artist: string
  album: string
  duration: number
  image: string
  /** Its stream, to listen to before choosing. */
  preview_url: string
  license: string
  license_url: string
  page_url: string
  genres: string[]
}

export type MusicSearch = {
  available: boolean
  results: MusicTrack[]
  page: number
  more: boolean
  moods: [label: string, tag: string][]
}

/** Songs for words or a quick search's tag, most popular first; `available` false when it isn't switched on. */
export function useMusicSearch(query: string, tag: string, page: number) {
  return useQuery({
    queryKey: ["studio", "music-search", query, tag, page],
    queryFn: async (): Promise<MusicSearch> => {
      const params = new URLSearchParams({ q: query, tag, page: String(page) })
      try {
        return await apiRequest<MusicSearch>(`/api/studio/music/search/?${params}`)
      } catch (error) {
        if (error instanceof ApiError && error.status === 503) {
          return { available: false, results: [], page: 1, more: false, moods: [] }
        }
        throw error
      }
    },
    staleTime: 10 * 60_000,
    placeholderData: (previous) => previous,
    retry: false,
  })
}

/** Use a song: it's downloaded into the workspace (and the video's media) as music, made ready on the server. */
export function useImportMusic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ track, project }: { track: string; project?: string }) =>
      apiRequest<StudioAsset>("/api/studio/music/import/", { method: "POST", body: { track, ...(project ? { project } : {}) } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assetsKey }),
  })
}

/** The clip that carries a finished video into the Content Library, to write posts for. */
export function postRender(id: string) {
  return apiRequest<{ project: string; clip: string }>(`/api/studio/renders/${id}/post/`, { method: "POST" })
}

export function assetKind(file: File): AssetKind | null {
  const name = file.name.toLowerCase()
  if (/\.(jpe?g|png|webp|heic|heif)$/.test(name)) return "image"
  if (/\.(mp4|mov|m4v|webm|mkv|avi)$/.test(name)) return "video"
  if (/\.(mp3|m4a|aac|wav|flac|ogg)$/.test(name)) return "audio"
  return null
}

/** Add a photo, clip, logo or piece of music. Pictures go with the request; videos and music straight to storage
 * when the server offers that. `onProgress` hears how much is sent, 0 to 1. */
export function useUploadAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      file,
      project,
      onProgress,
    }: {
      file: File
      /** The video it's uploaded into: it goes in that video's media. */
      project?: string
      onProgress?: (fraction: number) => void
    }) => {
      const kind = assetKind(file)
      if (!kind)
        throw new Error(
          `${file.name}: use a photo (JPEG, PNG, WebP, HEIC), a video (MP4, MOV, WEBM) or music (MP3, M4A, WAV).`,
        )
      if (kind !== "image") {
        const options = await queryClient
          .ensureQueryData(uploadOptionsQuery)
          .catch(() => undefined)
        if (options?.direct_upload) {
          const settings = { sourceType: kind, purpose: "studio" as const }
          const upload = new DirectUpload(file, {
            ...settings,
            onProgress: (transfer) =>
              onProgress?.(transfer.loaded / transfer.total),
          })
          const { key } = await upload.start()
          const created = await apiRequest<StudioAsset>("/api/studio/assets/", {
            method: "POST",
            body: { source_key: key, ...(project ? { project } : {}) },
          })
          forgetSavedUpload(file, uploadKind(settings))
          return created
        }
      }
      const form = new FormData()
      form.append("file", file)
      if (project) form.append("project", project)
      return uploadWithProgress<StudioAsset>(
        "/api/studio/assets/",
        form,
        (fraction) => onProgress?.(fraction),
      )
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assetsKey }),
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiRequest<null>(`/api/studio/assets/${id}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: assetsKey }),
  })
}

export function useStartRender() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      apiRequest<StudioRender>(`/api/studio/projects/${id}/render/`, {
        method: "POST",
        body: { version },
      }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["studio", "renders", id] })
      queryClient.invalidateQueries({ queryKey: projectsKey })
    },
  })
}

export function useProjectRenders(id: string) {
  return useQuery({
    queryKey: ["studio", "renders", id],
    queryFn: () =>
      apiRequest<StudioRender[]>(`/api/studio/projects/${id}/renders/`),
    refetchInterval: (query) =>
      query.state.data?.some(isRendering) ? 2500 : false,
  })
}
