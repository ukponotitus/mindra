import { ArrowRight, Check, Clapperboard, FileText, Images, PenLine, type LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";
import { formatDuration } from "../../lib/format";
import { projectLength } from "../../lib/projects";
import type { Project } from "../../lib/types";
import { buttonStyles } from "../ui/button";

type Tab = "transcript" | "posts" | "clips" | "photos";

interface Props {
  project: Project;
  /** Whether post writing is switched on (Milestone 3). */
  postsAvailable: boolean;
  postCount: number;
  onOpen: (tab: Tab) => void;
}

interface Step {
  icon: LucideIcon;
  title: string;
  detail: string;
  /** done: finished; ready: the one thing to do next; todo: available; soon: not possible yet. */
  state: "done" | "ready" | "todo" | "soon";
  badge?: string;
  action?: { label: string; tab: Tab };
}

/** A photos project: photos added, then posts written from them. */
function photoSteps(project: Project, postCount: number): Step[] {
  const added = project.photo_count > 0;
  return [
    {
      icon: Images,
      title: added ? `${projectLength(project)} added` : "Add photos",
      detail: added ? "In the order they'll be posted. Move, add or remove them on the Photos tab." : "Choose up to 20 pictures to post together.",
      state: added ? "done" : "ready",
      action: { label: added ? "See photos" : "Add photos", tab: "photos" },
    },
    {
      icon: PenLine,
      title: postCount > 0 ? `${postCount} posts written` : "Write posts",
      detail:
        postCount > 0
          ? "Share them with the photos, edit them, or write more for other platforms."
          : project.linked_recording
            ? "Captions for each platform, written from these photos and the connected recording, in your brand voice."
            : "Captions for each platform, written from these photos in your brand voice.",
      state: postCount > 0 ? "done" : added ? "ready" : "todo",
      action: { label: postCount > 0 ? "See posts" : "Write posts", tab: "posts" },
    },
  ];
}

/** A recording: its transcript, posts and (for videos) clips. */
function recordingSteps(project: Project, postsAvailable: boolean, postCount: number): Step[] {
  return [
    {
      icon: FileText,
      title: "Transcript ready",
      detail: `${project.segment_count} segments · ${formatDuration(project.duration_seconds)}`,
      state: "done",
      action: { label: "Read transcript", tab: "transcript" },
    },
    {
      icon: PenLine,
      title: postCount > 0 ? `${postCount} posts written` : "Write posts",
      detail:
        postCount > 0
          ? "Edit, copy or write more for other platforms."
          : "Posts for the platforms you choose, written in your brand voice.",
      state: !postsAvailable ? "soon" : postCount > 0 ? "done" : "ready",
      badge: postsAvailable ? undefined : "Coming next",
      action: postsAvailable ? { label: postCount > 0 ? "See posts" : "Write posts", tab: "posts" } : undefined,
    },
    project.source_type === "video"
      ? {
          icon: Clapperboard,
          title: "Make clips",
          detail: "Short vertical clips from the strongest moments, framed on the speaker and captioned.",
          // The main next step once posts are written; until then it waits its turn.
          state: postCount > 0 ? "ready" : "todo",
          action: { label: "See clips", tab: "clips" },
        }
      : {
          icon: Clapperboard,
          title: "Make clips",
          detail: "Clips are made from video recordings. Upload the video to get them.",
          state: "soon",
          badge: "Video only",
        },
  ];
}

/** What a finished project can turn into, in order, with the one thing to do next made obvious. */
export default function NextSteps({ project, postsAvailable, postCount, onOpen }: Props) {
  const isPhotos = project.source_type === "photos";
  const steps = isPhotos ? photoSteps(project, postCount) : recordingSteps(project, postsAvailable, postCount);

  return (
    <section aria-labelledby="next-steps" className="mb-6 rounded-xl border border-border bg-white p-5">
      <h3 id="next-steps" className="mb-4 font-semibold text-balance text-foreground">
        Next steps
      </h3>
      <ol className={cn("grid gap-3", isPhotos ? "md:grid-cols-2" : "md:grid-cols-3")}>
        {steps.map((step, i) => {
          const Icon = step.state === "done" ? Check : step.icon;
          const highlighted = step.state === "ready";
          const soon = step.state === "soon";
          return (
            <li
              key={step.title}
              className={cn(
                "flex flex-col rounded-lg border p-4",
                highlighted ? "border-primary bg-white" : soon ? "border-dashed border-border bg-background" : "border-border bg-white",
              )}
            >
              <div className="mb-2 flex items-center gap-3">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    step.state === "done"
                      ? "bg-emerald-50 text-emerald-600"
                      : highlighted
                        ? "bg-primary/10 text-primary"
                        : "bg-secondary text-muted-foreground",
                  )}
                >
                  <Icon aria-hidden="true" className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">
                    Step {i + 1}
                    {step.state === "done" && <span className="sr-only">, done</span>}
                  </p>
                  <p className={cn("truncate font-medium", soon ? "text-muted-foreground" : "text-foreground")}>{step.title}</p>
                </div>
                {step.badge && (
                  <span className="ml-auto rounded-full border border-border bg-white px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
                    {step.badge}
                  </span>
                )}
              </div>
              <p className="mb-3 text-sm text-pretty text-muted-foreground tabular-nums">{step.detail}</p>
              {step.action && (
                <button
                  type="button"
                  onClick={() => onOpen(step.action!.tab)}
                  className={buttonStyles({
                    variant: highlighted ? "primary" : "secondary",
                    size: "sm",
                    className: "mt-auto h-10 self-start sm:h-8",
                  })}
                >
                  {step.action.label}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
