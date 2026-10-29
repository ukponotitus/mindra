import { ArrowLeft, Clapperboard, FileText, Inbox } from "lucide-react";
import { Link, Navigate } from "react-router";
import EmptyState from "../components/EmptyState";
import { ErrorNote } from "../components/automations/parts";
import { buttonStyles } from "../components/ui/button";
import { useAutomationsEnabled, useRuns } from "../lib/automations";
import { formatScheduled } from "../lib/calendar";

/** Every script and video waiting for the person's approval, oldest slot first. */
export default function AutomationApprovals() {
  const enabled = useAutomationsEnabled();
  const runs = useRuns({ status: ["waiting"] });
  if (!enabled) return <Navigate to="/dashboard" replace />;
  const list = [...(runs.data?.results ?? [])].sort((a, b) => (a.slot ?? a.created_at).localeCompare(b.slot ?? b.created_at));

  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/automations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Automations
      </Link>
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Waiting for approval</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Scripts to read before they&apos;re voiced, and videos to check before they go out. One left unapproved for a week
          is set aside, and its topic goes back on the list.
        </p>
      </div>
      {runs.isPending ? (
        <div aria-busy="true" className="space-y-3">
          {[0, 1].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl border border-border bg-white" />
          ))}
        </div>
      ) : runs.isError ? (
        <ErrorNote>{runs.error.message}</ErrorNote>
      ) : list.length === 0 ? (
        <EmptyState icon={Inbox} title="Nothing to approve" description="When an automation has a script or a video for you to check, it appears here." />
      ) : (
        <ul className="space-y-3">
          {list.map((run) => (
            <li key={run.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-white p-4">
              <span className="grid aspect-video w-28 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground">
                {run.thumbnail_url ? (
                  <img src={run.thumbnail_url} alt="" className="size-full object-cover" />
                ) : run.waiting_for === "script" ? (
                  <FileText aria-hidden="true" className="size-5" />
                ) : (
                  <Clapperboard aria-hidden="true" className="size-5" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-medium text-amber-800">{run.waiting_for === "script" ? "Script to approve" : "Video to approve"}</span>
                <span className="block truncate font-medium text-foreground">{run.title || run.topic}</span>
                <span className="block truncate text-xs text-muted-foreground tabular-nums">
                  {run.automation_name}
                  {run.slot ? ` · for ${formatScheduled(run.slot)}` : run.trigger === "test" ? " · Test" : ""}
                </span>
              </span>
              <Link to={`/automations/runs/${run.id}`} className={buttonStyles({ variant: "primary", size: "sm" })}>
                Review
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
