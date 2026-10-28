import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import { CLIP_PLATFORMS } from "./clips";
import { PHOTO_PLATFORMS } from "./photos";
import { PLATFORMS } from "./projects";
import type { ClipSummary, ContentPiece, ContentPlan, ContentPlanDetail, Paginated, Platform, PlanEntry, PlanFormat, Project } from "./types";

// Content plans: someone's plan for their posts, read by Mindra into one entry per post, written as drafts and
// approved onto the calendar (see mindra-backend README, "Content plans").

/** Files a plan can come in (planner/files.py): text, a table, a spreadsheet, or a picture of it. */
export const PLAN_TEXT_TYPES = [".txt", ".md", ".csv", ".tsv"];
export const PLAN_SHEET_TYPES = [".xlsx", ".xlsm"];
export const PLAN_MAX_MB = 10;
/** The longest plan read in one go, in characters. */
export const PLAN_TEXT_MAX = 20_000;

export type PlanFileKind = "text" | "sheet" | "picture";

/** What kind of plan file this is, by its name, or null for a type Mindra can't read. */
export function planFileKind(name: string, pictureTypes: string[]): PlanFileKind | null {
  const dot = name.lastIndexOf(".");
  const extension = dot >= 0 ? name.slice(dot).toLowerCase() : "";
  if (PLAN_TEXT_TYPES.includes(extension)) return "text";
  if (PLAN_SHEET_TYPES.includes(extension)) return "sheet";
  if (pictureTypes.includes(extension)) return "picture";
  return null;
}

export const PLAN_FORMATS: { id: PlanFormat; label: string; description: string }[] = [
  { id: "recording", label: "From a recording", description: "Written from a talk, sermon, episode or class: the one you choose, or the newest" },
  { id: "clip", label: "Video clip", description: "A clip from a video recording, with its caption" },
  { id: "pictures", label: "Flyer or photos", description: "A caption for a flyer or photo post you uploaded" },
  { id: "text", label: "From the note", description: "Written from the plan's note alone: a greeting, an announcement" },
];

export function formatLabel(format: PlanFormat) {
  return PLAN_FORMATS.find((option) => option.id === format)?.label ?? format;
}

/** Where a kind of post can go, as the API checks it. */
export function platformsFor(format: PlanFormat): Platform[] {
  if (format === "clip") return CLIP_PLATFORMS;
  if (format === "pictures") return PHOTO_PLATFORMS;
  return PLATFORMS.map((platform) => platform.id);
}

/** The projects a kind of post can be written from: finished recordings, videos, or flyer and photo posts. */
export function sourcesFor(format: PlanFormat, projects: Project[]): Project[] {
  const ready = projects.filter((project) => project.status === "completed");
  if (format === "clip") return ready.filter((project) => project.source_type === "video");
  if (format === "recording") return ready.filter((project) => ["video", "audio", "transcript"].includes(project.source_type));
  if (format === "pictures") return ready.filter((project) => (project.source_type === "photos" || project.source_type === "flyer") && project.photo_count > 0);
  return [];
}

/** Where a post came from, for its "From …" link: its project, or for a post written from a plan's note alone, the
 * plan (its own project isn't one to open). */
export function postOrigin(
  piece: Pick<ContentPiece, "project" | "project_name" | "project_source_type" | "plan"> & { clip?: Pick<ClipSummary, "studio_project" | "title"> | null },
): { to: string | null; label: string } {
  if (piece.project_source_type === "plan") {
    return { to: piece.plan ? `/plans/${piece.plan.id}` : null, label: piece.plan?.name ?? piece.project_name };
  }
  // A Motion Studio video's posts go back to the video in Motion Studio.
  if (piece.clip?.studio_project) return { to: `/studio/${piece.clip.studio_project}`, label: piece.clip.title };
  return { to: `/projects/${piece.project}`, label: piece.project_name };
}

/** Still working: being read, or a post being written. */
export function planBusy(plan: Pick<ContentPlan, "status" | "counts">) {
  return plan.status === "reading" || plan.counts.writing > 0;
}

/** What a plan's posts can be written from: the newest 100 projects (a plan's choice can be older; it's still shown). */
export function useSourceChoices(enabled = true) {
  return useQuery({
    queryKey: ["projects", "choices"],
    queryFn: () => apiRequest<Paginated<Project>>("/api/projects/?page_size=100"),
    enabled,
    staleTime: 60_000,
  });
}

const listKey = ["plans", "list"];
const detailKey = (id: string) => ["plans", "detail", id];

/** The API's page size for plans. */
export const PLANS_PAGE_SIZE = 20;

export function usePlans(page = 1) {
  return useQuery({
    queryKey: [...listKey, page],
    queryFn: () => apiRequest<Paginated<ContentPlan>>(`/api/plans/?page=${page}`),
    placeholderData: keepPreviousData,
    refetchInterval: (query) => (query.state.data?.results.some(planBusy) ? 3000 : false),
  });
}

/** A post's clip being made, or a post being posted: the page shows the outcome when it comes. */
function planWaiting(plan: ContentPlanDetail) {
  return plan.entries.some((entry) => entry.piece?.clip?.status === "rendering" || entry.piece?.schedule_status === "publishing");
}

export function usePlan(id: string | undefined) {
  return useQuery({
    queryKey: detailKey(id ?? ""),
    queryFn: () => apiRequest<ContentPlanDetail>(`/api/plans/${id}/`),
    enabled: Boolean(id),
    // While it's read or its posts are written, keep the page up to date; less often while a clip is made.
    refetchInterval: (query) => {
      const plan = query.state.data;
      if (!plan) return false;
      if (planBusy(plan)) return 2000;
      return planWaiting(plan) ? 5000 : false;
    },
  });
}

function useStorePlan() {
  const queryClient = useQueryClient();
  return (plan: ContentPlanDetail) => {
    queryClient.setQueryData(detailKey(plan.id), plan);
    queryClient.invalidateQueries({ queryKey: listKey });
    // Approving and writing change posts in the Library and on the calendar.
    queryClient.invalidateQueries({ queryKey: ["content"] });
  };
}

export type NewPlan = { text?: string; file?: File | null; name?: string; startsOn?: string };

export function useCreatePlan() {
  const store = useStorePlan();
  return useMutation({
    mutationFn: ({ text, file, name, startsOn }: NewPlan) => {
      const form = new FormData();
      if (file) form.append("file", file);
      if (text?.trim()) form.append("text", text);
      if (name?.trim()) form.append("name", name.trim());
      if (startsOn) form.append("starts_on", startsOn);
      try {
        form.append("time_zone", Intl.DateTimeFormat().resolvedOptions().timeZone);
      } catch {
        // Without the browser's time zone, Mindra's default is used.
      }
      return apiRequest<ContentPlanDetail>("/api/plans/", { method: "POST", body: form });
    },
    onSuccess: store,
  });
}

export function usePlanAction(planId: string) {
  const store = useStorePlan();
  return useMutation({
    mutationFn: ({ action, body }: { action: "read" | "write" | "approve" | "entries"; body?: Record<string, unknown> }) =>
      apiRequest<ContentPlanDetail>(`/api/plans/${planId}/${action}/`, { method: "POST", body: body ?? {} }),
    onSuccess: store,
  });
}

export function useRenamePlan(planId: string) {
  const store = useStorePlan();
  return useMutation({
    mutationFn: (name: string) => apiRequest<ContentPlanDetail>(`/api/plans/${planId}/`, { method: "PATCH", body: { name } }),
    onSuccess: store,
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/plans/${id}/`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: detailKey(id) });
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
  });
}

export type EntryChanges = Partial<Pick<PlanEntry, "scheduled_at" | "platform" | "format" | "brief" | "source">>;

/** Change, write, approve, unapprove or remove one post of a plan. The plan is fetched again afterwards, so its
 * counts and the other posts stay right. */
export function useEntryAction(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action, changes }: { id: string; action: "update" | "write" | "approve" | "unapprove" | "remove"; changes?: EntryChanges }) => {
      if (action === "update") return apiRequest<PlanEntry>(`/api/plan-entries/${id}/`, { method: "PATCH", body: changes ?? {} });
      if (action === "remove") return apiRequest<null>(`/api/plan-entries/${id}/`, { method: "DELETE" });
      return apiRequest<PlanEntry>(`/api/plan-entries/${id}/${action}/`, { method: "POST", body: {} });
    },
    onSuccess: (entry, { id, action }) => {
      queryClient.setQueryData<ContentPlanDetail>(detailKey(planId), (plan) => {
        if (!plan) return plan;
        if (action === "remove") return { ...plan, entries: plan.entries.filter((item) => item.id !== id) };
        return entry ? { ...plan, entries: plan.entries.map((item) => (item.id === id ? entry : item)) } : plan;
      });
      queryClient.invalidateQueries({ queryKey: detailKey(planId) });
      queryClient.invalidateQueries({ queryKey: listKey });
      queryClient.invalidateQueries({ queryKey: ["content"] });
    },
  });
}

/** The next Monday, as YYYY-MM-DD in the browser's time zone: when a weekly plan usually starts. */
export function nextMonday(from = new Date()) {
  const day = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  day.setDate(day.getDate() + (((8 - day.getDay()) % 7) || 7));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
}
