import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";
import type { CalendarItem } from "./calendars";

// A calendar's content plan (the backend's calendars/planning.py, Phase 4): the strategy for its dates and a brief for
// each approved item, written by AI, changed by hand and approved. Approved briefs are what the Content Studio makes
// posts from.

export type Asset = { name: string; have: boolean };

export type Brief = {
  objective: string;
  audience: string;
  main_message: string;
  angle: string;
  hook: string;
  talking_points: string[];
  outline: string;
  visual_direction: string;
  cta: string;
  link: string;
  assets: Asset[];
  production_notes: string;
  updated_at: string;
};

export type Strategy = {
  status: "writing" | "draft" | "approved" | "failed";
  error: string;
  objective: string;
  audiences: string;
  pillar_balance: string;
  key_messages: string;
  tone_notes: string;
  dos_and_donts: string;
  approved_at: string | null;
  updated_at: string;
};

export type PlanItem = CalendarItem & { brief: Brief | null };
export type PlanData = { plan: Strategy | null; items: PlanItem[] };

export const STRATEGY_FIELDS: { id: keyof Strategy; label: string }[] = [
  { id: "objective", label: "Objective" },
  { id: "audiences", label: "Audiences" },
  { id: "pillar_balance", label: "How the pillars are balanced" },
  { id: "key_messages", label: "Key messages" },
  { id: "tone_notes", label: "Tone" },
  { id: "dos_and_donts", label: "Dos and don'ts" },
];

const planKey = (calendarId: string) => ["calendars", "plan", calendarId];

/** A calendar's plan, checked every few seconds while it's being written. */
export function usePlan(calendarId: string | undefined) {
  return useQuery({
    queryKey: planKey(calendarId ?? ""),
    queryFn: () => apiRequest<PlanData>(`/api/calendars/${calendarId}/plan/`),
    enabled: Boolean(calendarId),
    refetchInterval: (query) => (query.state.data?.plan?.status === "writing" ? 3000 : false),
  });
}

function usePlanChanged(calendarId: string) {
  const queryClient = useQueryClient();
  return (data?: PlanData) => {
    if (data) queryClient.setQueryData(planKey(calendarId), data);
    else queryClient.invalidateQueries({ queryKey: planKey(calendarId) });
    queryClient.invalidateQueries({ queryKey: ["calendars", "detail", calendarId] });
    queryClient.invalidateQueries({ queryKey: ["calendars", "planned"] });
    queryClient.invalidateQueries({ queryKey: ["studio-queue"] });
  };
}

export function useWritePlan(calendarId: string) {
  const changed = usePlanChanged(calendarId);
  return useMutation({
    mutationFn: (body: { request?: string; rewrite?: boolean }) => apiRequest<PlanData>(`/api/calendars/${calendarId}/plan/`, { method: "POST", body }),
    onSuccess: (data) => changed(data),
  });
}

export function useUpdateStrategy(calendarId: string) {
  const changed = usePlanChanged(calendarId);
  return useMutation({
    mutationFn: (changes: Partial<Strategy>) => apiRequest<PlanData>(`/api/calendars/${calendarId}/plan/`, { method: "PATCH", body: changes }),
    onSuccess: (data) => changed(data),
  });
}

export function useApprovePlan(calendarId: string) {
  const changed = usePlanChanged(calendarId);
  return useMutation({
    mutationFn: () => apiRequest<PlanData>(`/api/calendars/${calendarId}/plan/approve/`, { method: "POST" }),
    onSuccess: (data) => changed(data),
  });
}

export function useBriefActions(calendarId: string) {
  const changed = usePlanChanged(calendarId);
  const save = useMutation({
    mutationFn: ({ itemId, brief }: { itemId: string; brief: Partial<Brief> }) => apiRequest<PlanItem>(`/api/calendar-items/${itemId}/brief/`, { method: "PATCH", body: brief }),
    onSuccess: () => changed(),
  });
  const regenerate = useMutation({
    mutationFn: ({ itemId, request }: { itemId: string; request?: string }) => apiRequest<PlanItem>(`/api/calendar-items/${itemId}/brief/regenerate/`, { method: "POST", body: { request } }),
    onSuccess: () => changed(),
  });
  const approve = useMutation({
    mutationFn: (itemId: string) => apiRequest<PlanItem>(`/api/calendar-items/${itemId}/brief/approve/`, { method: "POST" }),
    onSuccess: () => changed(),
  });
  return { save, regenerate, approve };
}
