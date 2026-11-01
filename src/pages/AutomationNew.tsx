import { useState } from "react";
import { ArrowLeft, Clapperboard, LoaderCircle, Repeat2, SlidersHorizontal, Sparkles, type LucideIcon } from "lucide-react";
import { Link, Navigate } from "react-router";
import Templates, { useStartFrom } from "../components/automations/Templates";
import { ErrorNote } from "../components/automations/parts";
import { ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { KINDS, useAutomationsEnabled } from "../lib/automations";

const CHOICES: { id: "create" | "repurpose" | "publish" | "scratch"; title: string; description: string; icon: LucideIcon; preset?: string }[] = [
  { id: "create", title: KINDS.create.label, description: KINDS.create.description, icon: Sparkles },
  { id: "repurpose", title: KINDS.repurpose.label, description: KINDS.repurpose.description, icon: Repeat2, preset: "clips" },
  { id: "publish", title: KINDS.publish.label, description: KINDS.publish.description, icon: Clapperboard, preset: "videos" },
  { id: "scratch", title: "Start from scratch", description: "New videos with every setting chosen by you, without a template.", icon: SlidersHorizontal, preset: "custom" },
];

/** What to automate: new videos (from a template), clips from recordings, videos the workspace has, or from scratch. */
export default function AutomationNew() {
  const enabled = useAutomationsEnabled();
  const [chosen, setChosen] = useState<string | null>(null);
  const { start, create } = useStartFrom();
  if (!enabled) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/automations" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Automations
      </Link>
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">What do you want to automate?</h2>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
          Choose one. You&apos;ll set up the content, the video, where it&apos;s posted and when next, with sensible settings already filled in. Nothing is made or posted
          until you switch it on.
        </p>
      </div>
      {create.error && <ErrorNote>{create.error instanceof ApiError ? create.error.message : "Mindra couldn't start the automation. Try again."}</ErrorNote>}
      <ul className="grid gap-3 sm:grid-cols-2">
        {CHOICES.map((choice) => {
          const Icon = choice.icon;
          const starting = create.isPending && create.variables?.preset === choice.preset;
          return (
            <li key={choice.id}>
              <button
                type="button"
                aria-pressed={choice.id === "create" ? chosen === "create" : undefined}
                disabled={create.isPending}
                onClick={() => (choice.preset ? start(choice.preset) : setChosen("create"))}
                className={cn(
                  "flex h-full w-full items-start gap-4 rounded-xl border bg-card p-5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-70",
                  chosen === choice.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  {starting ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <Icon aria-hidden="true" className="size-5" />}
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">{choice.title}</span>
                  <span className="mt-1 block text-sm text-pretty text-muted-foreground">{choice.description}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {chosen === "create" && (
        <section aria-labelledby="templates" className="space-y-3">
          <div>
            <h3 id="templates" className="text-lg font-semibold text-foreground">
              Start from a template
            </h3>
            <p className="mt-0.5 text-sm text-pretty text-muted-foreground">Each fills in the settings for that kind of video. You can change any of them.</p>
          </div>
          <Templates />
        </section>
      )}
    </div>
  );
}
