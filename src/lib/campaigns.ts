import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { Platform } from "./types";

// Campaigns (the backend's campaigns/): a goal with dates and targets. Optional; calendar items are tagged with one
// once the Content calendar arrives, and results are measured against the targets later.

export type CampaignObjective =
  | "sales"
  | "bookings"
  | "registrations"
  | "attendance"
  | "traffic"
  | "followers"
  | "awareness"
  | "donations"
  | "other";

export type MetricSource = "mindra" | "platform" | "owner";
export type CampaignTarget = { metric: string; value: number };

export type Campaign = {
  id: string;
  name: string;
  objective: CampaignObjective;
  offering: string | null;
  offering_name: string;
  promoting: string;
  audience: string;
  starts_on: string;
  ends_on: string;
  days: number;
  status: "upcoming" | "running" | "ended";
  platforms: Platform[];
  /** Naira, for reporting cost per result; null when not given. */
  budget: string | null;
  main_message: string;
  link: string;
  targets: CampaignTarget[];
  created_at: string;
  updated_at: string;
};

export type CampaignChanges = Partial<Omit<Campaign, "id" | "offering_name" | "days" | "status" | "created_at" | "updated_at">>;

export const OBJECTIVES: { id: CampaignObjective; label: string; description: string }[] = [
  { id: "sales", label: "Sell a product or service", description: "Show its value and ask people to buy" },
  { id: "bookings", label: "Get bookings", description: "Appointments, sessions or reservations" },
  { id: "registrations", label: "Get registrations or sign-ups", description: "A form, a course, a newsletter" },
  { id: "attendance", label: "Fill an event", description: "A launch, programme, class or service" },
  { id: "traffic", label: "Bring people to a link", description: "A website, shop or WhatsApp chat" },
  { id: "followers", label: "Grow followers", description: "Posts worth sharing, with a reason to follow" },
  { id: "awareness", label: "Get known", description: "What you do, and why it matters" },
  { id: "donations", label: "Raise support", description: "Giving, donations or volunteers" },
  { id: "other", label: "Something else", description: "Any other goal" },
];

/** The goals each kind of organisation sees first; the rest follow. */
export const OBJECTIVES_FIRST: Record<string, CampaignObjective[]> = {
  business: ["sales", "traffic", "awareness", "followers"],
  church: ["attendance", "registrations", "awareness", "donations"],
  creator: ["followers", "sales", "registrations", "awareness"],
  coach: ["registrations", "bookings", "sales", "awareness"],
  nonprofit: ["donations", "attendance", "awareness", "registrations"],
};

export function objectivesFor(type: string) {
  const first = OBJECTIVES_FIRST[type] ?? [];
  return [...first.map((id) => OBJECTIVES.find((item) => item.id === id)!), ...OBJECTIVES.filter((item) => !first.includes(item.id))];
}

export function objectiveLabel(id: CampaignObjective) {
  return OBJECTIVES.find((item) => item.id === id)?.label ?? id;
}

/** Where a target's number will come from, in words. */
export const SOURCE_LABELS: Record<MetricSource, string> = {
  mindra: "Counted by Mindra",
  platform: "From each platform",
  owner: "Reported by you",
};

export const STATUS_LABELS: Record<Campaign["status"], string> = { upcoming: "Upcoming", running: "Running", ended: "Ended" };

const listKey = ["campaigns", "list"];
const detailKey = (id: string) => ["campaigns", "detail", id];

export function useCampaigns() {
  return useQuery({ queryKey: listKey, queryFn: () => apiRequest<Campaign[]>("/api/campaigns/") });
}

export function useCampaign(id: string | undefined) {
  return useQuery({ queryKey: detailKey(id ?? ""), queryFn: () => apiRequest<Campaign>(`/api/campaigns/${id}/`), enabled: Boolean(id) });
}

/** What a target can measure, and where each number comes from. */
export function useCampaignMetrics() {
  return useQuery({
    queryKey: ["campaigns", "metrics"],
    queryFn: () => apiRequest<{ id: string; label: string; source: MetricSource }[]>("/api/campaigns/metrics/"),
    staleTime: Infinity,
  });
}

export function useSaveCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id?: string; changes: CampaignChanges }) =>
      id
        ? apiRequest<Campaign>(`/api/campaigns/${id}/`, { method: "PATCH", body: changes })
        : apiRequest<Campaign>("/api/campaigns/", { method: "POST", body: changes }),
    onSuccess: (campaign) => {
      queryClient.setQueryData(detailKey(campaign.id), campaign);
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

export function useDeleteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/campaigns/${id}/`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: detailKey(id) });
      queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

// A campaign's results (Phase 6, the backend's campaigns/results.py): each target's number from its own source.
export type TargetResult = {
  metric: string;
  label: string;
  source: MetricSource;
  target: number;
  /** null: no number yet (a platform that doesn't share it, or nothing recorded). */
  actual: number | null;
  progress: number | null;
  cost_per_result?: number;
};

export type CampaignReport = { id: number; metric: string; label: string; value: number; note: string; reported_on: string };

export type CampaignResults = {
  posts: { planned: number; made: number; out: number; followed: number; links: number };
  targets: TargetResult[];
  reports: CampaignReport[];
  summary: string;
};

export function useCampaignResults(id: string | undefined) {
  return useQuery({
    queryKey: ["campaigns", "results", id ?? ""],
    queryFn: () => apiRequest<CampaignResults>(`/api/campaigns/${id}/results/`),
    enabled: Boolean(id),
  });
}

export function useRecordResult(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (report: { metric: string; value: number; note?: string; reported_on?: string }) =>
      apiRequest<CampaignResults>(`/api/campaigns/${id}/reports/`, { method: "POST", body: report }),
    onSuccess: (data) => queryClient.setQueryData(["campaigns", "results", id], data),
  });
}

export function useDeleteResult(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: number) => apiRequest<CampaignResults>(`/api/campaigns/${id}/reports/${reportId}/`, { method: "DELETE" }),
    onSuccess: (data) => queryClient.setQueryData(["campaigns", "results", id], data),
  });
}
