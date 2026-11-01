import { useId, useState, type FormEvent } from "react";
import { LoaderCircle, Send } from "lucide-react";
import { useLocation } from "react-router";
import { FEELINGS, useSendFeedback, type Feeling } from "../../lib/feedback";
import { cn } from "../../lib/cn";
import { buttonStyles } from "../ui/button";

// Home's feedback form: how Mindra is working for them (optional) and what they want to say. The team reads each one.

export default function FeedbackCard() {
  const ids = { title: useId(), message: useId() };
  const { pathname } = useLocation();
  const send = useSendFeedback();
  const [feeling, setFeeling] = useState<Feeling | "">("");
  const [message, setMessage] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!message.trim() || send.isPending) return;
    send.mutate(
      { feeling, message: message.trim(), page: pathname },
      {
        onSuccess: () => {
          setFeeling("");
          setMessage("");
        },
      },
    );
  };

  return (
    <section id="feedback" aria-labelledby={ids.title} className="scroll-mt-20 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h3 id={ids.title} className="font-semibold text-balance text-foreground">
        How is Mindra working for you?
      </h3>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        Tell us what works, what's confusing and what's missing. The team reads every message, and it shapes what we build next.
      </p>

      {send.isSuccess ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p role="status" className="text-sm font-medium text-emerald-700">
            Thank you, it's sent.
          </p>
          <button type="button" onClick={() => send.reset()} className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Send more
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">So far it's working… (optional)</legend>
            <div className="flex flex-wrap gap-2">
              {FEELINGS.map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary",
                    feeling === option.id ? "border-primary bg-primary/5 text-primary" : "border-border text-foreground hover:bg-secondary",
                  )}
                >
                  <input
                    type="radio"
                    name="feedback-feeling"
                    value={option.id}
                    checked={feeling === option.id}
                    onChange={() => setFeeling(option.id)}
                    className="sr-only"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor={ids.message} className="mb-1.5 block text-sm font-medium text-foreground">
              Your feedback
            </label>
            <textarea
              id={ids.message}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              maxLength={4000}
              placeholder="e.g. Writing posts was quick, but I couldn't find where to connect TikTok"
              className="w-full resize-y rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
            />
          </div>
          {send.isError && (
            <p role="alert" className="text-sm text-pretty text-red-600">
              {send.error.message}
            </p>
          )}
          <button type="submit" disabled={!message.trim() || send.isPending} className={buttonStyles()}>
            {send.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : <Send aria-hidden="true" className="size-4" />}
            Send feedback
          </button>
        </form>
      )}
    </section>
  );
}
