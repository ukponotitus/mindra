import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/context";
import { apiRequest } from "./api";
import type { Clip } from "./clips";
import type { StudioAsset } from "./studio";
import type { Paginated } from "./types";

// Automations: set up once, and for each slot of the schedule Mindra makes a new video (or takes the next clip or
// video the workspace has), saves it in the Content Library and posts it to YouTube and TikTok, in the steps of
// STEPS (the backend's AUTOMATIONS.md). Only workspaces that have them see them while they're being built.

export type AutomationStatus = "draft" | "active" | "paused";
export type AutomationMode = "draft" | "approval" | "automatic";
export type AutomationKind = "create" | "repurpose" | "publish";
export type Shape = "16:9" | "9:16";
export type PlatformId = "youtube" | "tiktok";

export type TikTokConfig = {
  /** "" until the person chooses (TikTok's rules: never chosen for them). */
  privacy_level: "" | "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";
  allow_comment: boolean;
  allow_duet: boolean;
  allow_stitch: boolean;
  disclose: boolean;
  your_brand: boolean;
  branded_content: boolean;
  music_consent: boolean;
  delay_hours: number;
};

export type AutomationConfig = {
  content: { niche: string; audience: string; language: string; tone: string; minutes: number; shape: Shape; quality: "standard" | "high" };
  topics: { source: "list" | "ai" | "both"; guidance: string; repeat_after_days: number };
  source: { clips: "chosen" | "newest" };
  script: {
    approve_first: boolean;
    opening: string;
    closing: string;
    call_to_action: string;
    scripture: boolean;
    translation: "web" | "kjv";
    rules: string;
    words_to_avoid: string;
  };
  voice: {
    provider: "elevenlabs";
    voice_id: string;
    voice_name: string;
    speed: number;
    stability: number;
    pronunciations: { word: string; say_as: string }[];
  };
  music: { tracks: string[]; volume: number; fade: boolean };
  visuals: { assets: string[]; use_all: boolean; motion: boolean; transition: string; effect: string; pace: "slow" | "medium" | "fast" };
  captions: { on: boolean; style: "highlight" | "plain"; position: "bottom" | "middle" };
  branding: { logo: string | null; corner: string; accent: string; closing_text: string };
  /** A custom YouTube thumbnail for landscape videos, with the title on it unless `title` is off. */
  thumbnail: { on: boolean; title: boolean };
  publishing: { platforms: PlatformId[]; privacy: "public" | "unlisted" | "private"; made_for_kids: boolean };
  tiktok: TikTokConfig;
};

/** Only the parts and settings being changed. */
export type ConfigChanges = { [Part in keyof AutomationConfig]?: Partial<AutomationConfig[Part]> };

export type AccountSummary = {
  id: number;
  kind: string;
  name: string;
  username: string;
  picture_url: string;
  profile_url: string;
  status: "active" | "needs_reconnect";
};

export type RunStatus =
  | "queued"
  | "working"
  | "waiting"
  | "scheduled"
  | "published"
  | "done"
  | "failed"
  | "cancelled"
  | "rejected"
  | "expired";

export type WaitingFor = "" | "script" | "video" | "tiktok";
export type Trigger = "schedule" | "manual" | "test";

export type LastRun = {
  id: string;
  status: RunStatus;
  waiting_for: WaitingFor;
  trigger: Trigger;
  mode: AutomationMode;
  step_label: string;
  error: string;
  title: string;
  created_at: string;
  finished_at: string | null;
};

export type Automation = {
  id: string;
  name: string;
  preset: string;
  kind: AutomationKind;
  status: AutomationStatus;
  mode: AutomationMode;
  account: AccountSummary | null;
  tiktok_account: AccountSummary | null;
  platforms: PlatformId[];
  weekdays: number[];
  /** "05:30:00", or null when no time is chosen. */
  post_time: string | null;
  time_zone: string;
  next_slot: string | null;
  minutes: number | null;
  shape: Shape | null;
  /** Videos saved in the Content Library. */
  made: number;
  posted: number;
  waiting: number;
  failed: number;
  last_run: LastRun | null;
  created_at: string;
  updated_at: string;
};

export type Problem = { field: string; message: string };

/** What the API sends of a clip on an automation's list. */
export type ClipSummary = Pick<Clip, "id" | "title" | "duration" | "shape" | "status" | "video_url" | "thumbnail_url">;

export type Topic = {
  id: number;
  text: string;
  source: "list" | "ai";
  position: number;
  used_at: string | null;
  used_by: string | null;
  clip: ClipSummary | null;
  video: StudioAsset | null;
};

export type AutomationDetail = Automation & {
  config: AutomationConfig;
  starts_on: string | null;
  ends_on: string | null;
  automatic_since: string | null;
  topics: Topic[];
  /** What's in the way of switching it on. */
  problems: Problem[];
  /** What's in the way of a sample. */
  test_problems: Problem[];
  upcoming: string[];
  runs: Run[];
  approved_once: boolean;
  services: { voice: boolean; writing: boolean; tiktok_public: boolean };
  can_post_automatically: boolean;
};

export type Run = {
  id: string;
  automation: string;
  automation_name: string;
  kind: AutomationKind;
  platforms: PlatformId[];
  trigger: Trigger;
  mode: AutomationMode;
  slot: string | null;
  publish_at: string | null;
  status: RunStatus;
  waiting_for: WaitingFor;
  step: string;
  step_label: string;
  error: string;
  topic: string;
  title: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

export type StepStatus = "pending" | "running" | "waiting" | "done" | "failed" | "skipped";

/** Where a run's post stands, read from the post itself. */
export type PostState = {
  id: string;
  platform: string;
  status: "draft" | "saved" | "planned" | "reminded" | "publishing" | "published" | "posted" | "missed" | "failed";
  scheduled_at: string | null;
  published_at: string | null;
  published_url: string;
  publish_error: string;
  account: string;
};

export type RunStep = {
  name: string;
  label: string;
  status: StepStatus;
  attempt: number;
  retry_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  error: string;
  detail: Record<string, unknown>;
  /** For the YouTube and TikTok steps. */
  post?: PostState | null;
};

/** A passage the script draws on, checked against the translation (the backend's automations/scripture.py). */
export type ScripturePassage = {
  reference: string;
  quoted: boolean;
  quote: string;
  ok: boolean;
  status: "matches" | "paraphrase" | "mismatch" | "not_quoted_now" | "not_listed" | "not_checked" | "unknown";
  problem: string;
  /** The passage in the translation. */
  text: string;
};

export type RunCheck = { name: string; passed: boolean; message: string; passages?: ScripturePassage[] };

export type RunDetail = Run & {
  script: string;
  description: string;
  tags: string[];
  caption: string;
  checks: RunCheck[];
  /** The custom YouTube thumbnail: "" until the video is made, then ready, set (on YouTube), refused (by YouTube) or
   * none, with why (`note`). */
  custom_thumbnail: { status: "" | "ready" | "set" | "refused" | "none"; note: string; url: string | null };
  review_note: string;
  voice_characters: number;
  narration_seconds: number | null;
  script_approved_at: string | null;
  approved_at: string | null;
  waiting_since: string | null;
  project: string | null;
  render: { id: string; status: string; progress: number; video_url: string | null; thumbnail_url: string | null; error?: string } | null;
  posts: Partial<Record<PlatformId, PostState | null>>;
  shape: Shape;
  minutes: number | null;
  source: ({ kind: "clip" } & ClipSummary) | ({ kind: "video" } & StudioAsset) | null;
  tiktok: TikTokConfig;
  tiktok_account: AccountSummary | null;
  /** TikTok has audited Mindra's app, so posts can be public. */
  tiktok_public: boolean;
  youtube_privacy: "public" | "unlisted" | "private";
  steps: RunStep[];
};

export type Preset = {
  id: string;
  kind: AutomationKind;
  name: string;
  description: string;
  config: AutomationConfig;
  schedule: { weekdays: number[]; post_time: string };
  topics: string[];
};

export type AutomationSummary = {
  counts: Record<AutomationStatus, number>;
  stats: { made: number; posted: number; failed: number; days: number };
  waiting: number;
  needs_attention: Run[];
  coming_up: { automation: string; name: string; slot: string }[];
  recent: Run[];
};

export type Voice = {
  id: string;
  name: string;
  description: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
};

/** What each kind of automation does, in the person's words. */
export const KINDS: Record<AutomationKind, { label: string; description: string }> = {
  create: {
    label: "Create new videos",
    description: "Mindra writes a script on each topic, reads it in a voice you choose, and puts it over your photos, clips and music.",
  },
  repurpose: {
    label: "Repurpose your recordings",
    description: "Posts the clips Mindra found in your sermons, talks and podcasts, one for each slot, with a title and caption for each.",
  },
  publish: {
    label: "Publish your videos",
    description: "Posts videos you've already made, in the order you choose, with a title and caption written for each.",
  },
};

/** A run's steps, in order (the backend's config.STEPS), and what each does for each kind. */
export const STEPS: { name: string; label: string; description: string; kinds?: AutomationKind[] }[] = [
  { name: "topic", label: "Topic", description: "The next topic on your list, or a new idea from the AI" },
  { name: "script", label: "Script", description: "An original script at your length, with the YouTube title and description and the TikTok caption" },
  { name: "voice", label: "Narration", description: "Your chosen voice reads the script, word by word, for the captions", kinds: ["create"] },
  { name: "visuals", label: "Visuals and music", description: "Your photos and clips under the narration, with music, captions and your logo", kinds: ["create"] },
  { name: "render", label: "Video", description: "Made into a video in Motion Studio, where you can open and change it", kinds: ["create"] },
  { name: "review", label: "Approval", description: "Quality checks, then your approval when the mode asks for it" },
  { name: "library", label: "Content Library", description: "The video and its posts saved in your Content Library" },
  { name: "youtube", label: "YouTube", description: "Planned on your calendar to post on your channel at its time" },
  { name: "tiktok", label: "TikTok", description: "Planned to post on your TikTok account (TikTok asks you to approve each post)" },
  { name: "monitor", label: "Posted", description: "Checks each post went out; then Analytics follows its numbers" },
];

const KIND_STEP_LABELS: Partial<Record<AutomationKind, Record<string, { label: string; description: string }>>> = {
  repurpose: {
    topic: { label: "Next clip", description: "The next clip from your recordings" },
    script: { label: "Title and caption", description: "A title, description and caption written for the clip" },
  },
  publish: {
    topic: { label: "Next video", description: "The next video on your list" },
    script: { label: "Title and caption", description: "A title, description and caption written for the video" },
  },
};

/** The steps as they apply to `kind`: the ones it skips are left out. */
export function stepsFor(kind: AutomationKind) {
  return STEPS.filter((step) => !step.kinds || step.kinds.includes(kind)).map((step) => ({ ...step, ...(KIND_STEP_LABELS[kind]?.[step.name] ?? {}) }));
}

export const MODES: Record<AutomationMode, { label: string; description: string }> = {
  draft: { label: "Save as drafts", description: "Each video is made and saved in your Content Library. Nothing is posted until you post it." },
  approval: { label: "Approve each video", description: "Each video waits for you to watch and approve it before it's posted at its time." },
  automatic: {
    label: "Post automatically",
    description:
      "Mindra uploads each video that passes the checks to your YouTube channel at its time, without asking you each time. TikTok posts still wait for your approval.",
  },
};

export const PLATFORM_LABELS: Record<PlatformId, string> = { youtube: "YouTube", tiktok: "TikTok" };

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const TONES = ["calm", "warm", "uplifting", "friendly", "serious", "energetic"];
/** How many words a minute the voice reads, by tone (the backend's WORDS_A_MINUTE). */
export const WORDS_A_MINUTE: Record<string, number> = { calm: 120, warm: 135, uplifting: 140, friendly: 145, serious: 135, energetic: 155 };
export const LANGUAGES: Record<string, string> = { en: "English", fr: "French", es: "Spanish", pt: "Portuguese", de: "German" };
export const TRANSLATIONS: Record<string, string> = { web: "World English Bible", kjv: "King James Version" };
export const TRANSITIONS: Record<string, string> = {
  none: "None (a cut)",
  fade: "Fade",
  fade_black: "Fade through black",
  slide_left: "Slide left",
  slide_right: "Slide right",
  wipe_left: "Wipe left",
  wipe_right: "Wipe right",
  zoom_in: "Zoom in",
};
export const EFFECTS: Record<string, string> = {
  none: "None",
  vivid: "Vivid",
  bright: "Bright",
  warm: "Warm",
  cool: "Cool",
  moody: "Moody",
  matte: "Matte",
  vintage: "Vintage",
  sepia: "Sepia",
  black_white: "Black and white",
};
export const PACES: Record<AutomationConfig["visuals"]["pace"], { label: string; detail: string }> = {
  slow: { label: "Slow", detail: "A new picture about every 12 seconds: calm, for prayer and reflection" },
  medium: { label: "Medium", detail: "About every 8 seconds" },
  fast: { label: "Fast", detail: "About every 5 seconds: lively, for short videos" },
};
export const CORNERS: Record<string, string> = {
  top_left: "Top left",
  top_right: "Top right",
  bottom_left: "Bottom left",
  bottom_right: "Bottom right",
};
export const PRIVACY: Record<string, string> = { public: "Public", unlisted: "Unlisted", private: "Private" };
export const MIN_VISUALS = 5;

export const AUTOMATION_STATUS: Record<AutomationStatus, { label: string; tone: string }> = {
  draft: { label: "Not switched on", tone: "bg-secondary text-muted-foreground" },
  active: { label: "Active", tone: "bg-emerald-50 text-emerald-700" },
  paused: { label: "Paused", tone: "bg-amber-50 text-amber-800" },
};

/** What a run's status says, and its colour: a sample, a saved draft, one waiting for approval, a posted video. */
export function runStatus(run: Pick<Run, "status" | "waiting_for" | "trigger" | "mode">): { label: string; tone: string } {
  switch (run.status) {
    case "queued":
      return { label: "Waiting to start", tone: "bg-secondary text-muted-foreground" };
    case "working":
      return { label: "Being made", tone: "bg-primary/10 text-primary" };
    case "waiting":
      return {
        label: run.waiting_for === "script" ? "Script to approve" : run.waiting_for === "tiktok" ? "TikTok post to approve" : "Video to approve",
        tone: "bg-amber-50 text-amber-800",
      };
    case "scheduled":
      return { label: "Scheduled", tone: "bg-primary/10 text-primary" };
    case "published":
      return { label: "Posted", tone: "bg-emerald-50 text-emerald-700" };
    case "done":
      if (run.trigger === "test") return { label: "Sample ready", tone: "bg-emerald-50 text-emerald-700" };
      return { label: run.mode === "draft" ? "Saved as a draft" : "Saved", tone: "bg-emerald-50 text-emerald-700" };
    case "failed":
      return { label: "Stopped", tone: "bg-red-50 text-red-700" };
    case "cancelled":
      return { label: "Cancelled", tone: "bg-secondary text-muted-foreground" };
    case "rejected":
      return { label: "Rejected", tone: "bg-secondary text-muted-foreground" };
    case "expired":
      return { label: "Not approved in time", tone: "bg-secondary text-muted-foreground" };
  }
}

export const TRIGGER_LABELS: Record<Trigger, string> = { schedule: "On schedule", manual: "Run now", test: "Sample" };

const WORKING: RunStatus[] = ["queued", "working"];

export function runIsWorking(run: Pick<Run, "status">) {
  return WORKING.includes(run.status);
}

/** "Mon, Wed and Fri at 5:30 am", or what's missing. */
export function scheduleSummary(automation: Pick<Automation, "weekdays" | "post_time">): string {
  if (!automation.weekdays.length || !automation.post_time) return "No days or time chosen";
  const days =
    automation.weekdays.length === 7
      ? "Every day"
      : automation.weekdays.length === 5 && [0, 1, 2, 3, 4].every((day) => automation.weekdays.includes(day))
        ? "Weekdays"
        : automation.weekdays.map((day) => WEEKDAYS[day]).join(", ").replace(/, ([^,]*)$/, " and $1");
  return `${days} at ${formatClock(automation.post_time)}`;
}

/** "05:30:00" as "5:30 am" in the browser's style. */
export function formatClock(value: string): string {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** Every time zone the browser knows, with the browser's own first. */
export function timeZones(): string[] {
  const own = Intl.DateTimeFormat().resolvedOptions().timeZone;
  let zones: string[] = [];
  try {
    zones = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];
  } catch {
    zones = [];
  }
  return [own, ...zones.filter((zone) => zone !== own)].filter(Boolean);
}

/** Whether the person's workspace has Automations. */
export function useAutomationsEnabled(): boolean {
  const { user } = useAuth();
  return Boolean(user?.workspaces.some((workspace) => workspace.automations));
}

const listKey = ["automations"];
const summaryKey = ["automations", "summary"];
const automationKey = (id: string) => ["automations", "detail", id];
const runKey = (id: string) => ["automations", "run", id];
const runsKey = ["automations", "runs"];

export function useAutomations() {
  return useQuery({
    queryKey: listKey,
    queryFn: () => apiRequest<Automation[]>("/api/automations/"),
    refetchInterval: (query) => (query.state.data?.some((item) => item.last_run && runIsWorking(item.last_run)) ? 8000 : false),
  });
}

export function useAutomationSummary(enabled = true) {
  return useQuery({
    queryKey: summaryKey,
    queryFn: () => apiRequest<AutomationSummary>("/api/automations/summary/"),
    enabled,
    refetchInterval: (query) => (query.state.data?.recent.some(runIsWorking) ? 5000 : false),
  });
}

export function usePresets() {
  return useQuery({
    queryKey: ["automations", "presets"],
    queryFn: () => apiRequest<Preset[]>("/api/automations/presets/"),
    staleTime: Infinity,
  });
}

/** The voices the narration can be read in. */
export function useVoices(enabled = true) {
  return useQuery({
    queryKey: ["automations", "voices"],
    queryFn: () => apiRequest<Voice[]>("/api/automations/voices/"),
    enabled,
    staleTime: 30 * 60 * 1000,
    retry: false,
  });
}

export function useAutomation(id: string | undefined) {
  return useQuery({
    queryKey: automationKey(id ?? ""),
    queryFn: () => apiRequest<AutomationDetail>(`/api/automations/${id}/`),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.runs.some(runIsWorking) ? 5000 : false),
  });
}

/** Keeps every view of automations in step after a change. */
function useStore() {
  const queryClient = useQueryClient();
  return (automation?: AutomationDetail) => {
    if (automation) queryClient.setQueryData(automationKey(automation.id), automation);
    queryClient.invalidateQueries({ queryKey: listKey, refetchType: "active" });
  };
}

export function useCreateAutomation() {
  const store = useStore();
  return useMutation({
    mutationFn: (body: { preset: string; name?: string }) =>
      apiRequest<AutomationDetail>("/api/automations/", {
        method: "POST",
        body: { ...body, time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      }),
    onSuccess: store,
  });
}

export type AutomationChanges = {
  name?: string;
  config?: ConfigChanges;
  account?: number | null;
  tiktok_account?: number | null;
  mode?: "draft" | "approval";
  weekdays?: number[];
  post_time?: string | null;
  time_zone?: string;
  starts_on?: string | null;
  ends_on?: string | null;
};

export function useUpdateAutomation(id: string) {
  const store = useStore();
  return useMutation({
    mutationFn: (changes: AutomationChanges) => apiRequest<AutomationDetail>(`/api/automations/${id}/`, { method: "PATCH", body: changes }),
    onSuccess: store,
  });
}

export function useAutomationAction(id: string) {
  const store = useStore();
  return useMutation({
    mutationFn: ({ action, body }: { action: "activate" | "pause" | "duplicate" | "automatic"; body?: unknown }) =>
      apiRequest<AutomationDetail>(`/api/automations/${id}/${action}/`, { method: "POST", body: body ?? {} }),
    onSuccess: (automation, { action }) => store(action === "duplicate" ? undefined : automation),
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/automations/${id}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });
}

/** A sample (a short one of about a minute, or full length), or a video now outside the schedule. */
export function useStartRun(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kind, length }: { kind: "test" | "run-now"; length?: "short" | "full" }) =>
      apiRequest<RunDetail>(`/api/automations/${id}/${kind}/`, { method: "POST", body: kind === "test" ? { length: length ?? "short" } : {} }),
    onSuccess: (run) => {
      queryClient.setQueryData(runKey(run.id), run);
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

/** Adds topics, clips or videos to the end of the list. */
export function useAddTopics(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items: { topics: string[] } | { clips: string[] } | { videos: string[] }) =>
      apiRequest<Topic[]>(`/api/automations/${id}/topics/`, { method: "POST", body: items }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: automationKey(id) }),
  });
}

export function useOrderTopics(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => apiRequest<Topic[]>(`/api/automations/${id}/topics/order/`, { method: "POST", body: { ids } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: automationKey(id) }),
  });
}

export function useRemoveTopic(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (topic: number) => apiRequest<void>(`/api/automations/${id}/topics/${topic}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: automationKey(id) }),
  });
}

export function useRuns(filter: { status?: RunStatus[]; automation?: string } = {}) {
  const params = new URLSearchParams();
  if (filter.status?.length) params.set("status", filter.status.join(","));
  if (filter.automation) params.set("automation", filter.automation);
  const query = params.toString();
  return useQuery({
    queryKey: [...runsKey, query],
    queryFn: () => apiRequest<Paginated<Run>>(`/api/automations/runs/${query ? `?${query}` : ""}`),
    refetchInterval: (state) => (state.state.data?.results.some(runIsWorking) ? 5000 : false),
  });
}

export function useRun(id: string | undefined) {
  return useQuery({
    queryKey: runKey(id ?? ""),
    queryFn: () => apiRequest<RunDetail>(`/api/automations/runs/${id}/`),
    enabled: Boolean(id),
    // While it's being made, its steps change by the minute; once scheduled, its posts do.
    refetchInterval: (query) => {
      const run = query.state.data;
      if (!run) return false;
      return runIsWorking(run) ? 4000 : run.status === "scheduled" ? 15000 : false;
    },
  });
}

export type ApproveBody = {
  script?: string;
  publish_at?: string | null;
  privacy?: string;
  title?: string;
  description?: string;
  caption?: string;
  tiktok?: Partial<TikTokConfig>;
};

export type RunAction =
  | { action: "approve"; body?: ApproveBody }
  | { action: "revise"; body: { part: string; note?: string } }
  | { action: "reject"; body?: { note?: string } }
  | { action: "retry" | "cancel"; body?: undefined }
  | { action: "thumbnail"; body: { choice: "another" | "none" | "custom" } };

export function useRunAction(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ action, body }: RunAction) => apiRequest<RunDetail>(`/api/automations/runs/${id}/${action}/`, { method: "POST", body: body ?? {} }),
    onSuccess: (run) => {
      queryClient.setQueryData(runKey(run.id), run);
      queryClient.invalidateQueries({ queryKey: ["automations"], refetchType: "active" });
    },
  });
}

export function useEditRun(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: { script?: string; title?: string; description?: string; caption?: string }) =>
      apiRequest<RunDetail>(`/api/automations/runs/${id}/`, { method: "PATCH", body: changes }),
    onSuccess: (run) => queryClient.setQueryData(runKey(run.id), run),
  });
}

/** What a revision redoes: the part and how it's named. */
export const REVISABLE: { part: string; label: string }[] = [
  { part: "script", label: "Script" },
  { part: "voice", label: "Narration" },
  { part: "visuals", label: "Visuals and music" },
];
