// The plans (billing/plans.py in the backend, the one list of prices and limits), the workspace's own plan and usage,
// and paying for a plan through Paystack (billing/payments.py), for the landing page's pricing cards and the Billing
// page.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./api";

export type PricingPlanId = "beta" | "free" | "creator" | "pro" | "teams";

export type PricingPlan = {
  id: PricingPlanId;
  name: string;
  /** Naira a month; a year is `yearly_price` (ten months). */
  monthly_price: number;
  yearly_price: number;
  /** Null: no limit. */
  hours_per_month: number | null;
  max_recording_minutes: number | null;
  connected_accounts: number | null;
  clips_per_recording: number | null;
  watermark: boolean;
  /** What's counted each month (billing/usage.py); null: as many as wanted. */
  posts_per_month: number | null;
  clips_per_month: number | null;
  picture_projects_per_month: number | null;
  /** Who the plan is for, under its name. */
  tagline: string;
  /** What the card lists after the recording time; `soon` for what isn't built yet, `included` false for what the
   * plan doesn't have. */
  features: { text: string; soon: boolean; included: boolean }[];
  recommended: boolean;
};

export type PlanList = { plans: PricingPlan[]; in_beta: boolean; beta_ends_on: string | null };

export type BillingInterval = "monthly" | "yearly";

/** A subscription that's paid for now. "active" renews by itself; "cancelled" ends with its period; "past_due": the
 * renewal payment failed, and the plan lasts until `plan_ends_at` (the grace days) unless it's paid. */
export type BillingSubscription = {
  plan: PricingPlanId;
  plan_name: string;
  interval: BillingInterval;
  /** Naira a period. */
  amount: number;
  status: "active" | "cancelled" | "past_due";
  /** The end of the period paid for. */
  period_end: string | null;
  /** When the plan ends if nothing more is paid. */
  plan_ends_at: string | null;
};

/** One payment Paystack took (the first one or a renewal). */
export type BillingPayment = {
  reference: string;
  paid_at: string;
  plan: PricingPlanId;
  plan_name: string;
  interval: BillingInterval;
  amount: number;
  currency: string;
  /** "card", "bank", "ussd"..., and the card ("Visa ending 4081") when one was used. */
  channel: string;
  card: string;
  period_end: string | null;
};

/** GET /api/billing/: the workspace's plan and what it has used this month. */
export type BillingOverview = PlanList & {
  workspace: number;
  plan: PricingPlan;
  /** "beta" or "free": the default plan; "given" by Mindra; "paid" for. */
  source: "beta" | "free" | "given" | "paid";
  /** When a given or paid plan ends (then it's back to the default plan), or null. */
  ends_at: string | null;
  usage: {
    hours_used: number;
    hours_limit: number | null;
    /** The first day of next month (YYYY-MM-DD), when the hours start again. */
    resets_on: string;
    connected_accounts: number;
    connected_accounts_limit: number | null;
    /** This month's counts; a null limit is as many as wanted. Deleting something doesn't give it back. */
    posts_used: number;
    posts_limit: number | null;
    clips_used: number;
    clips_limit: number | null;
    picture_projects_used: number;
    picture_projects_limit: number | null;
  };
  payments: {
    /** Paying online is switched on (the API has Paystack's key). */
    available: boolean;
    /** The person is the workspace's owner or an admin, who can change its plan. */
    can_manage: boolean;
    grace_days: number;
    subscription: BillingSubscription | null;
    /** Newest first. */
    invoices: BillingPayment[];
  };
};

/** "₦12,000". */
export function naira(amount: number): string {
  return `₦${amount.toLocaleString("en-NG")}`;
}

/** "30 recording minutes a month", "5 recording hours a month". */
export function recordingAllowance(hours: number | null): string {
  if (hours == null) return "Recordings without a monthly limit";
  if (hours < 1) return `${Math.round(hours * 60)} recording minutes a month`;
  return `${hours.toLocaleString(undefined, { maximumFractionDigits: 2 })} recording hour${hours === 1 ? "" : "s"} a month`;
}

/** The pricing cards' plans as the API lists them, so the landing page shows them at once (and if the API can't be
 * reached). Keep in step with billing/plans.py. */
export const BUILT_IN_PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    monthly_price: 0,
    yearly_price: 0,
    hours_per_month: 0.5,
    max_recording_minutes: 30,
    connected_accounts: 0,
    clips_per_recording: 2,
    watermark: true,
    posts_per_month: 15,
    clips_per_month: 2,
    picture_projects_per_month: 3,
    tagline: "Explore AI content creation",
    features: [
      { text: "15 AI-generated posts", soon: false, included: true },
      { text: "2 watermarked video clips", soon: false, included: true },
      { text: "3 image or flyer projects", soon: false, included: true },
      { text: "1 brand profile", soon: false, included: true },
      { text: "Content library", soon: false, included: true },
      { text: "Manual downloads and sharing", soon: false, included: true },
      { text: "No automatic publishing", soon: false, included: false },
    ],
    recommended: false,
  },
  {
    id: "creator",
    name: "Creator",
    monthly_price: 5000,
    yearly_price: 50000,
    hours_per_month: 5,
    max_recording_minutes: 120,
    connected_accounts: 3,
    clips_per_recording: null,
    watermark: false,
    posts_per_month: 100,
    clips_per_month: 15,
    picture_projects_per_month: 25,
    tagline: "Create and publish consistently",
    features: [
      { text: "100 AI-generated posts", soon: false, included: true },
      { text: "15 watermark-free clips", soon: false, included: true },
      { text: "25 image or flyer projects", soon: false, included: true },
      { text: "3 connected social accounts", soon: false, included: true },
      { text: "Automatic post publishing", soon: false, included: true },
      { text: "Content calendar and scheduling", soon: false, included: true },
      { text: "1 brand profile", soon: false, included: true },
    ],
    recommended: false,
  },
  {
    id: "pro",
    name: "Pro",
    monthly_price: 12000,
    yearly_price: 120000,
    hours_per_month: 15,
    max_recording_minutes: 180,
    connected_accounts: 10,
    clips_per_recording: null,
    watermark: false,
    posts_per_month: 300,
    clips_per_month: 50,
    picture_projects_per_month: 100,
    tagline: "Automate your content workflow",
    features: [
      { text: "300 AI-generated posts", soon: false, included: true },
      { text: "50 watermark-free clips", soon: false, included: true },
      { text: "100 image or flyer projects", soon: false, included: true },
      { text: "10 connected social accounts", soon: false, included: true },
      { text: "Automatic multi-platform publishing", soon: false, included: true },
      { text: "Content plans", soon: false, included: true },
      { text: "Recurring content scheduling", soon: true, included: true },
      { text: "Advanced brand voice", soon: true, included: true },
    ],
    recommended: true,
  },
  {
    id: "teams",
    name: "Ministry & Teams",
    monthly_price: 25000,
    yearly_price: 250000,
    hours_per_month: 30,
    max_recording_minutes: 180,
    connected_accounts: 20,
    clips_per_recording: null,
    watermark: false,
    posts_per_month: 750,
    clips_per_month: 100,
    picture_projects_per_month: 200,
    tagline: "Manage content across your organisation",
    features: [
      { text: "750 AI-generated posts", soon: false, included: true },
      { text: "100 watermark-free clips", soon: false, included: true },
      { text: "200 image or flyer projects", soon: false, included: true },
      { text: "20 connected social accounts", soon: false, included: true },
      { text: "Automatic multi-platform publishing", soon: false, included: true },
      { text: "Multiple brand profiles", soon: true, included: true },
      { text: "Team roles and approval workflows", soon: true, included: true },
    ],
    recommended: false,
  },
];

const BUILT_IN_LIST: PlanList = { plans: BUILT_IN_PLANS, in_beta: true, beta_ends_on: null };

/** The pricing cards' plans, for the landing page (no sign-in needed). */
export function usePricingPlans() {
  return useQuery({
    queryKey: ["billing", "plans"],
    queryFn: () => apiRequest<PlanList>("/api/billing/plans/"),
    placeholderData: BUILT_IN_LIST,
    staleTime: 10 * 60_000,
    retry: false,
  });
}

/** The workspace's plan and usage. */
export function useBilling() {
  return useQuery({
    queryKey: ["billing", "overview"],
    queryFn: () => apiRequest<BillingOverview>("/api/billing/"),
    staleTime: 60_000,
  });
}

const BILLING_KEY = ["billing"];

/** Pay for a plan: goes to Paystack's checkout page, which comes back to /billing with the payment's reference. */
export function useCheckout() {
  return useMutation({
    mutationFn: async (choice: { workspace: number; plan: PricingPlanId; interval: BillingInterval }) => {
      const { url } = await apiRequest<{ url: string }>("/api/billing/checkout/", { method: "POST", body: choice });
      window.location.assign(url);
      // Stay busy while the browser leaves for Paystack.
      await new Promise((resolve) => window.setTimeout(resolve, 10_000));
    },
  });
}

export type PaymentCheck = { status: "paid" | "pending" | "failed"; plan_name: string };

/** Check a checkout's payment on the return from Paystack; a paid one has already changed the plan. The page's first
 * load of the plan runs at the same time and may answer from before the payment, so it's cancelled and loaded again
 * (invalidating alone would wait for that first load). */
export function useCheckPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reference: string) =>
      apiRequest<PaymentCheck>("/api/billing/verify/", { method: "POST", body: { reference } }),
    onSettled: async () => {
      await queryClient.cancelQueries({ queryKey: BILLING_KEY });
      await queryClient.invalidateQueries({ queryKey: BILLING_KEY });
    },
  });
}

/** Cancel the plan (it lasts until the end of the period paid for), or turn its renewals back on. */
export function useChangeRenewal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspace, action }: { workspace: number; action: "cancel" | "resume" }) =>
      apiRequest<BillingSubscription>(`/api/billing/${action}/`, { method: "POST", body: { workspace } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: BILLING_KEY }),
  });
}

/** Go to Paystack's page for changing the card the plan renews with. */
export function useChangeCard() {
  return useMutation({
    mutationFn: async (workspace: number) => {
      const { url } = await apiRequest<{ url: string }>("/api/billing/card/", { method: "POST", body: { workspace } });
      window.location.assign(url);
      await new Promise((resolve) => window.setTimeout(resolve, 10_000));
    },
  });
}
