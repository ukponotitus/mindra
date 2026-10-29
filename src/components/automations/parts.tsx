import { ChevronRight, Clapperboard, LoaderCircle } from "lucide-react";
import { Link } from "react-router";
import { formatScheduled } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { runIsWorking, runStatus, TRIGGER_LABELS, type Run } from "../../lib/automations";

/** A small coloured label: an automation's or a run's status. */
export function StatusPill({ label, tone, className }: { label: string; tone: string; className?: string }) {
  return <span className={cn("inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium", tone, className)}>{label}</span>;
}

/** One run in a list, linking to its page. */
export function RunRow({ run, showAutomation = true }: { run: Run; showAutomation?: boolean }) {
  const state = runStatus(run);
  const when = run.slot ?? run.created_at;
  return (
    <li>
      <Link
        to={`/automations/runs/${run.id}`}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
      >
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground">
          {run.thumbnail_url ? (
            <img src={run.thumbnail_url} alt="" className="size-full object-cover" />
          ) : runIsWorking(run) ? (
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          ) : (
            <Clapperboard aria-hidden="true" className="size-4" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">{run.title || run.topic || "Choosing a topic"}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {showAutomation ? `${run.automation_name} · ` : ""}
            {run.trigger === "schedule" ? formatScheduled(when) : `${TRIGGER_LABELS[run.trigger]} · ${formatScheduled(run.created_at)}`}
            {run.status === "working" && run.step_label ? ` · ${run.step_label}` : ""}
          </span>
        </span>
        <StatusPill {...state} />
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** A card with a heading, for the side panels and sections of the Automations pages. */
export function Panel({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-white", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      <div className="p-2">{children}</div>
    </section>
  );
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
      {children}
    </p>
  );
}
