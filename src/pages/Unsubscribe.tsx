import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import BrandMark from "../components/BrandMark";
import { buttonStyles } from "../components/ui/button";
import { ApiError, apiRequest } from "../lib/api";

// The link in a follow-up email: stops those emails without signing in (the token is signed by the API). Reminders for
// the posts someone plans are a separate choice, in Settings > Reminders.

type State = { kind: "working" } | { kind: "done" } | { kind: "failed"; message: string };

export default function Unsubscribe() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>({ kind: "working" });

  useEffect(() => {
    if (!token) {
      setState({ kind: "failed", message: "This link isn't complete. Turn follow-up emails off in Settings, under Reminders." });
      return;
    }
    apiRequest("/api/follow-ups/unsubscribe/", { method: "POST", body: { token } })
      .then(() => setState({ kind: "done" }))
      .catch((error) => setState({ kind: "failed", message: error instanceof ApiError ? error.message : "Something went wrong. Try the link again." }));
  }, [token]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-16 text-center">
      <BrandMark className="mx-auto mb-6 size-10" />
      {state.kind === "working" && <p role="status" className="text-sm text-muted-foreground">One moment…</p>}
      {state.kind === "done" && (
        <div role="status">
          <h1 className="text-xl font-semibold text-balance text-foreground">You won&apos;t get these emails any more</h1>
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            No more tips and follow-up emails from Mindra. Reminders for the posts you plan still come; you can change both in Settings, under
            Reminders.
          </p>
        </div>
      )}
      {state.kind === "failed" && (
        <p role="alert" className="text-sm text-pretty text-red-600">
          {state.message}
        </p>
      )}
      <Link to="/dashboard" className={buttonStyles({ variant: "secondary", className: "mx-auto mt-6" })}>
        Open Mindra
      </Link>
    </main>
  );
}
