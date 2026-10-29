import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/context";
import { apiRequest } from "./api";
import type { Paginated } from "./types";

// Automations: set up once, and Mindra makes and posts a video for each slot of the schedule, in twelve steps (the
// backend's AUTOMATIONS.md). Only workspaces that have them see them while they're being built.

export type AutomationStatus = "draft" | "active" | "paused";
export type AutomationMode = "approval" | "automatic";
export type Shape = "16:9" | "9:16";

export type AutomationConfig = {
  content: { niche: string; audience: string; language: string; tone: string; minutes: number; shape: Shape };
  topics: { source: "list" | "ai" | "both"; guidance: string; repeat_after_days: number };
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
  visuals: { assets: string[]; use_all: boolean; motion: boolean; transition: string; effect: string };
  captions: { on: boolean; style: "highlight" | "plain"; position: "bottom" | "middle" };
  branding: { logo: string | null; corner: string; accent: string; closing_text: string };
  thumbnail: { on: boolean; text_colour: string };
  publishing: { privacy: "public" | "unlisted" | "private"; made_for_kids: boolean };
};

/** Only the parts and settings being changed. */
export type ConfigChanges = { [Part in keyof AutomationConfig]?: Partial<AutomationConfig[Part]> };

export type AccountSummary = {
  id: number;
  kind: string;
  name: string;
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

export type Automation = {
  id: string;
  name: string;
  preset: string;
  status: AutomationStatus;
  mode: AutomationMode;
  account: AccountSummary | null;
  weekdays: number[];
  /** "05:30:00", or null when no time is chosen. */
  post_time: string | null;
  time_zone: string;
  next_slot: string | null;
  minutes: number | null;
  shape: Shape | null;
  posted: number;
  waiting: number;
  last_run: { id: string; status: RunStatus; waiting_for: WaitingFor; step_label: string; created_at: string } | null;
  created_at: string;
  updated_at: string;
};

export type Problem = { field: string; message: string };

export type Topic = { id: number; text: string; source: "list" | "ai"; position: number; used_at: string | null; used_by: string | null };

export type AutomationDetail = Automation & {
  config: AutomationConfig;
  starts_on: string | null;
  ends_on: string | null;
  automatic_since: string | null;
  topics: Topic[];
  /** What's in the way of switching it on. */
  problems: Problem[];
  /** What's in the way of a test video. */
  test_problems: Problem[];
  upcoming: string[];
  runs: Run[];
  approved_once: boolean;
  voice_available: boolean;
};

export type WaitingFor = "" | "script" | "video";
export type Trigger = "schedule" | "manual" | "test";

export type Run = {
  id: string;
  automation: string;
  automation_name: string;
  trigger: Trigger;
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
};

export type RunDetail = Run & {
  mode: AutomationMode;
  script: string;
  description: string;
  tags: string[];
  checks: { name: string; passed: boolean; message: string }[];
  review_note: string;
  voice_characters: number;
  script_approved_at: string | null;
  approved_at: string | null;
  waiting_since: string | null;
  project: string | null;
  render: { id: string; status: string; progress: number; video_url: string | null; thumbnail_url: string | null } | null;
  post: { id: string; scheduled_at: string | null; published_at: string | null; published_url: string; publish_error: string } | null;
  shape: Shape;
  steps: RunStep[];
};

export type Preset = {
  id: string;
  name: string;
  description: string;
  config: AutomationConfig;
  schedule: { weekdays: number[]; post_time: string };
  topics: string[];
};

export type AutomationSummary = {
  counts: Record<AutomationStatus, number>;
  waiting: number;
  needs_attention: Run[];
  coming_up: { automation: string; name: string; slot: string }[];
  recent: Run[];
};

/** The twelve steps of a run, in order (the backend's config.STEPS). */
export const STEPS: { name: string; label: string; description: string }[] = [
  { name: "trigger", label: "Trigger", description: "On the days and time you choose, or when you run it now" },
  { name: "topic", label: "Topic", description: "The next topic on your list that hasn't been used recently" },
  { name: "script", label: "Script", description: "An original script at the length you chose, checked against your rules" },
  { name: "voice", label: "Voice-over", description: "Your chosen voice reads the script; then Mindra checks every word came out right" },
  { name: "music", label: "Music", description: "One of your tracks, under the voice and faded in and out" },
  { name: "visuals", label: "Visuals", description: "Your photos and clips, matched to each part of the script" },
  { name: "render", label: "Assemble and render", description: "Put together in Motion Studio with captions and your logo, then made into a video" },
  { name: "details", label: "Title and description", description: "A clear title, a description with the music's credit, and a few tags" },
  { name: "thumbnail", label: "Thumbnail", description: "The strongest picture with a few words from the title" },
  { name: "review", label: "Check and approve", description: "Quality checks, then your approval (or straight on, in automatic mode)" },
  { name: "upload", label: "Upload and schedule", description: "Uploaded to YouTube ahead of time and set to go public at the slot" },
  { name: "monitor", label: "Monitor", description: "Checks it went out, then Analytics follows its numbers" },
];

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const TONES = ["calm", "warm", "uplifting", "friendly", "serious", "energetic"];
export const LANGUAGES: Record<string, string> = { en: "English", fr: "French", es: "Spanish", pt: "Portuguese", de: "German" };
export const TRANSLATIONS: Record<string, string> = { web: "World English Bible", kjv: "King James Version" };
export const TRANSITIONS: Record<string, string> = {
  none: "None",
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
export const CORNERS: Record<string, string> = {
  top_left: "Top left",
  top_right: "Top right",
  bottom_left: "Bottom left",
  bottom_right: "Bottom right",
};
export const PRIVACY: Record<string, string> = { public: "Public", unlisted: "Unlisted", private: "Private" };
export const MIN_VISUALS = 5;

export const AUTOMATION_STATUS: Record<AutomationStatus, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-secondary text-muted-foreground" },
  active: { label: "Active", tone: "bg-emerald-50 text-emerald-700" },
  paused: { label: "Paused", tone: "bg-amber-50 text-amber-800" },
};

/** What a run's status says, and its colour. Waiting is the one that needs the person. */
export function runStatus(run: Pick<Run, "status" | "waiting_for" | "trigger">): { label: string; tone: string } {
  switch (run.status) {
    case "queued":
      return { label: "Waiting to start", tone: "bg-secondary text-muted-foreground" };
    case "working":
      return { label: "Being made", tone: "bg-primary/10 text-primary" };
    case "waiting":
      return { label: run.waiting_for === "script" ? "Script to approve" : "Video to approve", tone: "bg-amber-50 text-amber-800" };
    case "scheduled":
      return { label: "Scheduled", tone: "bg-primary/10 text-primary" };
    case "published":
      return { label: "Posted", tone: "bg-emerald-50 text-emerald-700" };
    case "done":
      return { label: run.trigger === "test" ? "Test finished" : "Finished", tone: "bg-emerald-50 text-emerald-700" };
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

export const TRIGGER_LABELS: Record<Trigger, string> = { schedule: "On schedule", manual: "Run now", test: "Test" };

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
  return useQuery({ queryKey: listKey, queryFn: () => apiRequest<Automation[]>("/api/automations/") });
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

/** A test video, or one now outside the schedule. */
export function useStartRun(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (kind: "test" | "run-now") => apiRequest<RunDetail>(`/api/automations/${id}/${kind}/`, { method: "POST" }),
    onSuccess: (run) => {
      queryClient.setQueryData(runKey(run.id), run);
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useAddTopics(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (topics: string[]) => apiRequest<Topic[]>(`/api/automations/${id}/topics/`, { method: "POST", body: { topics } }),
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
    // While it's being made, its steps change by the minute.
    refetchInterval: (query) => (query.state.data && (runIsWorking(query.state.data) || query.state.data.status === "scheduled") ? 4000 : false),
  });
}

export type RunAction =
  | { action: "approve"; body?: { script?: string; publish_at?: string | null; privacy?: string } }
  | { action: "revise"; body: { part: string; note?: string } }
  | { action: "reject"; body?: { note?: string } }
  | { action: "retry" | "cancel"; body?: undefined };

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
    mutationFn: (changes: { script?: string; title?: string; description?: string }) =>
      apiRequest<RunDetail>(`/api/automations/runs/${id}/`, { method: "PATCH", body: changes }),
    onSuccess: (run) => queryClient.setQueryData(runKey(run.id), run),
  });
}

/** What a revision redoes: the part and how it's named. */
export const REVISABLE: { part: string; label: string }[] = [
  { part: "script", label: "Script" },
  { part: "voice", label: "Voice-over" },
  { part: "music", label: "Music" },
  { part: "visuals", label: "Visuals" },
  { part: "details", label: "Title and description" },
];
