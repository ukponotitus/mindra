import { ArrowLeft } from "lucide-react";
import { Link, Navigate } from "react-router";
import Templates from "../components/automations/Templates";
import { useAutomationsEnabled } from "../lib/automations";

/** The template library: choose a starting point for a new automation. */
export default function AutomationNew() {
  const enabled = useAutomationsEnabled();
  if (!enabled) return <Navigate to="/dashboard" replace />;
  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/automations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Automations
      </Link>
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Create an automation</h2>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
          Choose where to start. You&apos;ll set up the topics, voice, look and schedule next.
        </p>
      </div>
      <Templates />
    </div>
  );
}
