import { AlignLeft, Flag, ListChecks, LoaderCircle, Quote, RefreshCw, ScanText } from "lucide-react";
import { cn } from "../../lib/cn";
import { AI_PROVIDER_NAMES } from "../../lib/content";
import { formatDuration } from "../../lib/format";
import { useAnalyzeProject } from "../../lib/projects";
import type { Analysis, Moment, Project } from "../../lib/types";
import { buttonStyles } from "../ui/button";

interface Props {
  project: Project;
  /** Open the transcript at this moment. */
  onJump: (seconds: number) => void;
}

const cardClass = "rounded-xl border border-border bg-white p-5 sm:p-6";

function MomentList({ moments, onJump, quoted }: { moments: Moment[]; onJump: (seconds: number) => void; quoted?: boolean }) {
  return (
    <ul className="space-y-3">
      {moments.map((moment, i) => (
        <li key={i} className="flex gap-3">
          <button
            type="button"
            onClick={() => onJump(moment.start)}
            title="Open the transcript here"
            aria-label={`Open the transcript at ${formatDuration(moment.start)}`}
            className="h-7 shrink-0 rounded-md bg-secondary px-2 font-mono text-xs font-medium text-foreground tabular-nums transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {formatDuration(moment.start)}
          </button>
          <p className={cn("pt-0.5 text-sm leading-relaxed text-pretty text-foreground", quoted && "italic")}>
            {quoted ? `“${moment.text}”` : moment.text}
          </p>
        </li>
      ))}
    </ul>
  );
}

function SectionTitle({ icon: Icon, children }: { icon: typeof Quote; children: string }) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <Icon aria-hidden="true" className="size-4 text-muted-foreground" />
      <h3 className="font-semibold text-balance text-foreground">{children}</h3>
    </div>
  );
}

/** The AI's read of the recording: summary, topics, takeaways, quotes and hooks. */
export default function ProjectAnalysis({ project, onJump }: Props) {
  const analyze = useAnalyzeProject();
  const analysis = project.analysis as Partial<Analysis>;
  const rerun = () => analyze.mutate(project.id);
  const rerunError = analyze.isError && (
    <p role="alert" className="text-sm text-red-600">
      {analyze.error.message}
    </p>
  );

  if (project.status === "analyzing") {
    return (
      <div role="status" className={cn(cardClass, "flex items-center gap-3 text-sm text-foreground")}>
        <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin text-primary" />
        Analysing this recording: finding the summary, topics, quotes and hooks…
      </div>
    );
  }

  if (!analysis.summary) {
    if (project.status !== "completed") return null;
    return (
      <div className={cardClass}>
        <h3 className="mb-1 font-semibold text-balance text-foreground">AI analysis</h3>
        <p className="mb-4 text-sm text-pretty text-muted-foreground">
          {project.analysis_error || "This recording hasn't been analysed yet."}
        </p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={rerun}
            disabled={analyze.isPending}
            className={buttonStyles({ variant: "secondary" })}
          >
            <ScanText aria-hidden="true" className="size-4" />
            {analyze.isPending ? "Starting…" : project.analysis_error ? "Try again" : "Analyse now"}
          </button>
          {rerunError}
        </div>
      </div>
    );
  }

  const sample = analysis.provider === "fake";

  return (
    <div className="space-y-6">
      <section className={cardClass}>
        <div className="mb-3 flex items-center gap-2">
          <AlignLeft aria-hidden="true" className="size-4 text-muted-foreground" />
          <h3 className="font-semibold text-balance text-foreground">Summary</h3>
          {sample && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">Sample</span>
          )}
        </div>
        <p className="leading-relaxed text-pretty text-foreground">{analysis.summary}</p>
        {(analysis.topics?.length ?? 0) > 0 && (
          <ul aria-label="Topics" className="mt-4 flex flex-wrap gap-2">
            {analysis.topics!.map((topic) => (
              <li key={topic} className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                {topic}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className={cardClass}>
          <SectionTitle icon={Quote}>Quotes worth sharing</SectionTitle>
          <MomentList moments={analysis.quotes ?? []} onJump={onJump} quoted />
        </section>
        <section className={cardClass}>
          <SectionTitle icon={Flag}>Hooks for short videos</SectionTitle>
          <MomentList moments={analysis.hooks ?? []} onJump={onJump} />
        </section>
      </div>

      {(analysis.takeaways?.length ?? 0) > 0 && (
        <section className={cardClass}>
          <SectionTitle icon={ListChecks}>Key takeaways</SectionTitle>
          <ol className="space-y-2">
            {analysis.takeaways!.map((takeaway, i) => (
              <li key={i} className="flex gap-3 text-sm text-pretty text-foreground">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-medium text-muted-foreground tabular-nums">
                  {i + 1}
                </span>
                {takeaway}
              </li>
            ))}
          </ol>
        </section>
      )}

      <div className="space-y-2">
        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="text-pretty">
            {sample
              ? "Sample analysis from the stand-in writer. Add a Gemini API key and re-run it for a real analysis."
              : `Analysed by ${analysis.provider ? AI_PROVIDER_NAMES[analysis.provider] : "AI"} (${analysis.model}).`}
          </p>
          <button
            type="button"
            onClick={rerun}
            disabled={analyze.isPending}
            className={buttonStyles({ variant: "ghost", size: "sm", className: "-ml-3 self-start sm:ml-0 sm:self-auto" })}
          >
            <RefreshCw aria-hidden="true" className="size-3.5" />
            {analyze.isPending ? "Starting…" : "Re-run analysis"}
          </button>
        </div>
        {rerunError}
      </div>
    </div>
  );
}
