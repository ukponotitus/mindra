import { useCallback, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { matchPath } from "react-router";
import { apiRequest, ApiError, streamEvents } from "./api";

// The assistant (the backend's assistant/): conversations in threads, replies that stream in, and proposals the
// person applies or discards. It reads Mindra and proposes; it never changes anything until Apply is pressed.

export type ProposalKind = "post_text" | "brand_profile" | "campaign" | "calendar" | "new_calendar";
export type ProposalStatus = "proposed" | "applied" | "discarded" | "failed";

export type Proposal = {
  id: string;
  message: string;
  kind: ProposalKind;
  kind_label: string;
  title: string;
  payload: Record<string, unknown>;
  status: ProposalStatus;
  /** What Apply did, or why it couldn't. */
  result: string;
  decided_at: string | null;
  created_at: string;
};

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  status: "writing" | "done" | "stopped" | "failed";
  error: string;
  page_label: string;
  proposals: Proposal[];
  created_at: string;
};

export type Thread = { id: string; title: string; created_at: string; updated_at: string };
export type ThreadDetail = Thread & { messages: AssistantMessage[] };

export type AssistantStatus = {
  available: boolean;
  /** Why it can't answer, when it can't. */
  reason: string;
  used: number;
  /** The plan's monthly allowance; null for as many as wanted. */
  limit: number | null;
  left: number | null;
  plan: string;
};

/** Where a message is sent from, so the assistant knows what "this post" means. */
export type PageContext = { path: string; query: Record<string, string>; label: string; timezone: string };

type StreamEvent =
  | { type: "start"; question: AssistantMessage; answer: AssistantMessage }
  | { type: "text"; text: string }
  | { type: "status"; text: string }
  | { type: "proposal"; proposal: Proposal }
  | { type: "done"; answer: AssistantMessage }
  | { type: "error"; detail: string; answer: AssistantMessage };

const statusKey = ["assistant", "status"];
const threadsKey = ["assistant", "threads"];
const threadKey = (id: string) => ["assistant", "thread", id];

// What a page is called when the assistant is asked from it; the most specific pattern first.
const PAGE_LABELS: [pattern: string, label: string][] = [
  ["/library/:pieceId", "This post"],
  ["/campaigns/new", "New campaign"],
  ["/campaigns/:campaignId/edit", "This campaign"],
  ["/campaigns/:campaignId", "This campaign"],
  ["/projects/:projectId", "This project"],
  ["/plans/:planId", "This content plan"],
  ["/studio/:projectId", "This video"],
  ["/content-calendar/:calendarId/plan", "This calendar's plan"],
  ["/content-studio", "Content studio"],
  ["/content-calendar/:calendarId", "This calendar"],
  ["/content-calendar", "Content calendar"],
  ["/brand", "Brand profile"],
  ["/planner", "Planner"],
  ["/analytics", "Analytics"],
  ["/library", "Content Library"],
  ["/campaigns", "Campaigns"],
  ["/plans", "Content Plans"],
  ["/projects", "Projects"],
  ["/dashboard", "Home"],
];

export function pageContext(pathname: string, search: string): PageContext {
  const label = PAGE_LABELS.find(([pattern]) => matchPath(pattern, pathname))?.[1] ?? "";
  let timezone = "";
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    timezone = "";
  }
  return { path: pathname, query: Object.fromEntries(new URLSearchParams(search)), label, timezone };
}

/** Suggestions to start with, for the page the person is on. */
export function starters(page: PageContext): string[] {
  if (matchPath("/library/:pieceId", page.path)) return ["Make this post shorter", "Give me two other hooks for this post", "Is this post right for its platform?"];
  if (matchPath("/campaigns/:campaignId", page.path)) return ["What's missing from this campaign?", "Suggest targets for this campaign"];
  if (matchPath("/content-calendar/:calendarId", page.path)) return ["Add two more review posts to this draft", "Is this calendar balanced across my pillars?"];
  if (page.path === "/brand") return ["What's missing from my brand profile?", "Suggest content pillars for my brand"];
  if (page.path === "/analytics") return ["How did my posts do this month?", "Which platform works best for me?"];
  if (page.path === "/planner") return ["What's coming up this week?", "Which days have nothing planned?"];
  return ["What should I post this week?", "How did my posts do this month?", "What's missing from my brand profile?"];
}

export function useAssistantStatus() {
  return useQuery({ queryKey: statusKey, queryFn: () => apiRequest<AssistantStatus>("/api/assistant/status/") });
}

export function useThreads(enabled = true) {
  return useQuery({ queryKey: threadsKey, queryFn: () => apiRequest<Thread[]>("/api/assistant/threads/"), enabled });
}

export function useThread(id: string | null) {
  return useQuery({
    queryKey: threadKey(id ?? ""),
    queryFn: () => apiRequest<ThreadDetail>(`/api/assistant/threads/${id}/`),
    enabled: Boolean(id),
    retry: (count, error) => !(error instanceof ApiError && error.status === 404) && count < 2,
  });
}

export function useCreateThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<Thread>("/api/assistant/threads/", { method: "POST", body: {} }),
    onSuccess: (thread) => {
      queryClient.setQueryData<ThreadDetail>(threadKey(thread.id), { ...thread, messages: [] });
      queryClient.invalidateQueries({ queryKey: threadsKey });
    },
  });
}

export function useDeleteThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<void>(`/api/assistant/threads/${id}/`, { method: "DELETE" }),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: threadKey(id) });
      queryClient.invalidateQueries({ queryKey: threadsKey });
    },
  });
}

function replaceProposal(thread: ThreadDetail | undefined, proposal: Proposal): ThreadDetail | undefined {
  if (!thread) return thread;
  return {
    ...thread,
    messages: thread.messages.map((message) =>
      message.id === proposal.message ? { ...message, proposals: message.proposals.map((item) => (item.id === proposal.id ? proposal : item)) } : message,
    ),
  };
}

/** Apply or discard a proposal. Applying changes Mindra, so what it changed is fetched again. */
export function useDecideProposal(threadId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "apply" | "discard" }) =>
      apiRequest<Proposal>(`/api/assistant/proposals/${id}/${decision}/`, { method: "POST" }),
    onSuccess: (proposal) => {
      if (threadId) queryClient.setQueryData<ThreadDetail>(threadKey(threadId), (thread) => replaceProposal(thread, proposal));
      if (proposal.status !== "applied") return;
      const changed: Record<ProposalKind, string[][]> = {
        post_text: [["content"], ["plans"]],
        brand_profile: [["brand"], ["brand-voice"]],
        campaign: [["campaigns"]],
        calendar: [["calendars"]],
        new_calendar: [["calendars"]],
      };
      for (const queryKey of changed[proposal.kind]) queryClient.invalidateQueries({ queryKey });
    },
  });
}

export type Reply = {
  question: AssistantMessage | null;
  text: string;
  /** What it's doing ("Checking the Planner"), while it works. */
  doing: string;
  proposals: Proposal[];
};

/** Sending a message and showing its reply as it streams in. When it's finished, the thread holds both messages. */
export function useSendMessage() {
  const queryClient = useQueryClient();
  const [reply, setReply] = useState<Reply | null>(null);
  const [error, setError] = useState<unknown>(null);
  const controller = useRef<AbortController | null>(null);

  const send = useCallback(
    /** Resolves to whether the message was taken (false when it was refused before any reply started). */
    async (threadId: string, text: string, page: PageContext): Promise<boolean> => {
      if (controller.current) return false;
      const abort = new AbortController();
      controller.current = abort;
      setError(null);
      setReply({ question: null, text: "", doing: "", proposals: [] });
      const finish = (messages: AssistantMessage[]) => {
        queryClient.setQueryData<ThreadDetail>(threadKey(threadId), (thread) => (thread ? { ...thread, messages: [...thread.messages, ...messages] } : thread));
      };
      let question: AssistantMessage | null = null;
      let ended = false;
      try {
        await streamEvents<StreamEvent>(
          `/api/assistant/threads/${threadId}/messages/`,
          { text, page },
          (event) => {
            if (event.type === "start") {
              question = event.question;
              setReply((current) => (current ? { ...current, question: event.question } : current));
            } else if (event.type === "text") {
              setReply((current) => (current ? { ...current, text: current.text + event.text, doing: "" } : current));
            } else if (event.type === "status") {
              setReply((current) => (current ? { ...current, doing: event.text } : current));
            } else if (event.type === "proposal") {
              setReply((current) => (current ? { ...current, proposals: [...current.proposals, event.proposal] } : current));
            } else if (event.type === "done" || event.type === "error") {
              ended = true;
              finish(question ? [question, event.answer] : [event.answer]);
              if (event.type === "error") setError(new ApiError(0, event.detail));
            }
          },
          abort.signal,
        );
      } catch (caught) {
        if (!abort.signal.aborted) setError(caught);
      } finally {
        controller.current = null;
        setReply(null);
        // A reply cut short is saved by the server as it stood; fetch the thread to show it.
        if (!ended) queryClient.invalidateQueries({ queryKey: threadKey(threadId) });
        queryClient.invalidateQueries({ queryKey: statusKey });
        queryClient.invalidateQueries({ queryKey: threadsKey });
      }
      return question !== null;
    },
    [queryClient],
  );

  const stop = useCallback(() => controller.current?.abort(new DOMException("Stopped", "AbortError")), []);

  const clearError = useCallback(() => setError(null), []);
  return { send, stop, reply, error, sending: reply !== null, clearError };
}

const ACTIVE_KEY = "mindra.assistant.thread";

function savedThread(): string | null {
  try {
    return localStorage.getItem(ACTIVE_KEY);
  } catch {
    return null;
  }
}

/** The conversation the panel shows, remembered on this device. It falls back to a new one if it's gone. */
export function useActiveThread() {
  const [threadId, setThreadId] = useState<string | null>(savedThread);
  const choose = useCallback((id: string | null) => {
    setThreadId(id);
    try {
      if (id) localStorage.setItem(ACTIVE_KEY, id);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      // Not remembered (private mode); it still works for this visit.
    }
  }, []);
  const thread = useThread(threadId);
  const missing = thread.error instanceof ApiError && thread.error.status === 404;
  return { threadId: missing ? null : threadId, choose, title: thread.data?.title ?? "" };
}
