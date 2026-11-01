import { useEffect, useLayoutEffect, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { ArrowUp, LoaderCircle, Square } from "lucide-react";
import { useLocation } from "react-router";
import {
  pageContext,
  starters,
  useAssistantStatus,
  useCreateThread,
  useDecideProposal,
  useSendMessage,
  useThread,
  type AssistantMessage,
  type Proposal,
} from "../../lib/assistant";
import { cn } from "../../lib/cn";
import SeePlans from "../SeePlans";
import { buttonStyles } from "../ui/button";
import MessageText from "./MessageText";
import ProposalCard from "./ProposalCard";

interface Props {
  /** The conversation shown; null starts a new one with the first message. */
  threadId: string | null;
  /** A new conversation was started (with the first message). */
  onThreadCreated: (id: string) => void;
}

function Question({ text, label }: { text: string; label?: string }) {
  return (
    <div className="flex flex-col items-end gap-1">
      <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-sm whitespace-pre-wrap text-primary-foreground">{text}</p>
      {label && <p className="text-xs text-muted-foreground">From: {label}</p>}
    </div>
  );
}

function Answer({ text, children, failed }: { text: string; children?: ReactNode; failed?: string }) {
  return (
    <div className="space-y-3">
      {text && (
        <div className="text-sm leading-relaxed text-foreground">
          <MessageText text={text} />
        </div>
      )}
      {failed && <p className="text-sm text-red-600">{failed}</p>}
      {children}
    </div>
  );
}

/** A conversation with the assistant: its messages and proposals, the reply streaming in, and the box to write in. */
export default function AssistantChat({ threadId, onThreadCreated }: Props) {
  const { pathname, search } = useLocation();
  const page = pageContext(pathname, search);
  const status = useAssistantStatus();
  const thread = useThread(threadId);
  const createThread = useCreateThread();
  const decide = useDecideProposal(threadId);
  const { send, stop, reply, error, sending, clearError } = useSendMessage();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const nearBottom = useRef(true);

  const messages: AssistantMessage[] = thread.data?.messages ?? [];
  const available = status.data?.available ?? true;
  const used = status.data && status.data.limit !== null && status.data.left === 0;
  // A new conversation has no thread to load (its query is switched off), so only a real fetch counts as loading.
  const loading = Boolean(threadId) && thread.isLoading;
  const empty = messages.length === 0 && !sending && !loading;

  // Stay at the newest words while they stream in, unless the person scrolled up to read.
  useLayoutEffect(() => {
    const element = scroller.current;
    if (element && nearBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages.length, reply?.text, reply?.proposals.length, reply?.doing, pending]);

  useEffect(() => {
    if (!sending) box.current?.focus({ preventScroll: true });
  }, [sending, threadId]);

  // Another conversation was opened: an error from the last one no longer applies.
  const shownThread = useRef(threadId);
  useEffect(() => {
    if (shownThread.current !== threadId && !sending && !createThread.isPending) clearError();
    shownThread.current = threadId;
  }, [threadId, sending, createThread.isPending, clearError]);

  const submit = async (text: string) => {
    const words = text.trim();
    if (!words || sending || !available) return;
    setDraft("");
    setPending(words);
    nearBottom.current = true;
    let id = threadId;
    try {
      if (!id) {
        id = (await createThread.mutateAsync()).id;
        onThreadCreated(id);
      }
      // Refused before it started (the month's allowance, say): give the words back to edit or send again.
      if (!(await send(id, words, page))) setDraft((current) => current || words);
    } catch {
      setDraft((current) => current || words);
    } finally {
      setPending("");
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit(draft);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submit(draft);
    }
  };

  const cards = (proposals: Proposal[]) =>
    proposals.map((proposal) => (
      <ProposalCard
        key={proposal.id}
        proposal={proposal}
        deciding={decide.isPending && decide.variables?.id === proposal.id}
        onDecide={(decision) => decide.mutate({ id: proposal.id, decision })}
      />
    ));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={scroller}
        onScroll={(event) => {
          const element = event.currentTarget;
          nearBottom.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        }}
        role="log"
        aria-label="Conversation with the assistant"
        aria-busy={sending}
        className="flex-1 space-y-5 overflow-y-auto px-4 py-5"
      >
        {loading && <p className="text-sm text-muted-foreground">Loading the conversation…</p>}

        {empty && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground">How can I help?</p>
              <p className="mt-1 text-sm text-muted-foreground">
                I know your brand profile, your Planner and your posts. I suggest changes for you to apply; I never post or change anything by myself.
              </p>
            </div>
            {available && (
              <div className="flex flex-col items-start gap-2">
                {starters(page).map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => void submit(text)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-sm text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((message) =>
          message.role === "user" ? (
            <Question key={message.id} text={message.text} label={message.page_label} />
          ) : (
            <Answer
              key={message.id}
              text={message.text}
              failed={message.status === "failed" ? message.error || "The assistant couldn't answer." : message.status === "stopped" ? "Stopped." : undefined}
            >
              {cards(message.proposals)}
            </Answer>
          ),
        )}

        {sending && (
          <>
            <Question text={reply?.question?.text ?? pending} label={page.label} />
            <Answer text={reply?.text ?? ""}>
              {cards(reply?.proposals ?? [])}
              {(!reply?.text || reply?.doing) && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
                  {reply?.doing ? `${reply.doing}…` : "Thinking…"}
                </p>
              )}
            </Answer>
          </>
        )}

        {Boolean(error) && !sending && (
          <p role="alert" className="text-sm text-red-600">
            {error instanceof Error ? error.message : "Something went wrong."} <SeePlans error={error} />
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} className="border-t border-border bg-card p-3">
        {!available ? (
          <p className="rounded-lg bg-secondary px-3 py-2.5 text-sm text-muted-foreground">{status.data?.reason}</p>
        ) : (
          <>
            {page.label && <p className="mb-2 text-xs text-muted-foreground">Asking about: {page.label}</p>}
            <div className="flex items-end gap-2 rounded-xl border border-border bg-card p-1.5 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15">
              <label htmlFor="assistant-message" className="sr-only">
                Message the assistant
              </label>
              <textarea
                id="assistant-message"
                ref={box}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                rows={2}
                maxLength={4000}
                disabled={Boolean(used)}
                placeholder={used ? "This month's assistant messages are used up" : "Ask anything about your content"}
                className="max-h-40 min-h-10 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              {sending ? (
                <button type="button" onClick={stop} aria-label="Stop" className={buttonStyles({ variant: "secondary", size: "icon" })}>
                  <Square aria-hidden="true" className="size-3.5 fill-current" />
                </button>
              ) : (
                <button type="submit" aria-label="Send" disabled={!draft.trim() || Boolean(used)} className={buttonStyles({ size: "icon" })}>
                  <ArrowUp aria-hidden="true" className="size-4" />
                </button>
              )}
            </div>
            {status.data && status.data.limit !== null && (
              <p className={cn("mt-2 text-xs", used ? "text-red-600" : "text-muted-foreground")}>
                {status.data.left} of {status.data.limit} messages left this month{used && <> · <SeePlans text="See the plans in Billing" /></>}
              </p>
            )}
          </>
        )}
      </form>
    </div>
  );
}
