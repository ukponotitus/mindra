import { AudioLines, Clock, FileText, FolderOpen, Hourglass, PenLine, Video, type LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { displayName, useAuth } from "../auth/context";
import ComingUp from "../components/calendar/ComingUp";
import EmptyState from "../components/EmptyState";
import StatusBadge from "../components/StatusBadge";
import { buttonStyles } from "../components/ui/button";
import { formatDate, formatExtensions, formatMegabytes } from "../lib/format";
import { projectLength, projectPath, SOURCE_ICONS, useProjects, useProjectSummary, useUploadOptions } from "../lib/projects";
import type { SourceType } from "../lib/types";


function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const summary = useProjectSummary();
  const projects = useProjects();
  const uploadOptions = useUploadOptions();

  const s = summary.data;
  const recent = projects.data?.results.slice(0, 5) ?? [];
  const options = uploadOptions.data;
  const maxSize = options ? ` up to ${formatMegabytes(options.max_upload_mb)}` : "";
  const videoFormats = options ? formatExtensions(options.extensions.video) : "Video files";
  const audioFormats = options ? formatExtensions(options.extensions.audio) : "Audio files";

  const stats: { label: string; value?: number; note: string; icon: LucideIcon }[] = [
    {
      label: "Total Projects",
      value: s?.total_projects,
      note: s ? `${s.projects_this_week} new this week` : "",
      icon: FolderOpen,
    },
    { label: "Minutes Processed", value: s?.minutes_processed, note: "All time", icon: Clock },
    {
      label: "Posts Written",
      value: s?.content_pieces,
      note: s ? `From ${plural(s.completed_projects, "recording")}` : "",
      icon: PenLine,
    },
    {
      label: "Processing Jobs",
      value: s?.processing_jobs,
      note: s ? `${s.queued_jobs} in queue` : "",
      icon: Hourglass,
    },
  ];

  const quickActions: { label: string; icon: LucideIcon; desc: string; type: SourceType }[] = [
    { label: "Upload Video", icon: Video, desc: `${videoFormats}${maxSize}`, type: "video" },
    { label: "Upload Audio or Podcast", icon: AudioLines, desc: `${audioFormats}${maxSize}`, type: "audio" },
    { label: "Paste Transcript", icon: FileText, desc: "Plain text, SRT or WebVTT", type: "transcript" },
  ];

  let subtitle = "Upload a recording to turn it into a transcript you can reuse.";
  if (s && s.processing_jobs > 0) subtitle = `${plural(s.processing_jobs, "recording")} processing right now.`;
  else if (s && s.total_projects > 0) subtitle = `${plural(s.completed_projects, "transcript")} ready to use.`;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">
          {greeting()}
          {user ? `, ${displayName(user)}` : ""}
        </h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-busy={summary.isPending}>
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-white p-4 sm:p-5">
            <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:text-sm">
              <stat.icon aria-hidden="true" className="size-4 shrink-0" />
              {stat.label}
            </p>
            <p className="mt-3 text-2xl font-semibold text-foreground tabular-nums">
              {stat.value ?? (summary.isError ? "—" : <span className="inline-block h-7 w-10 animate-pulse rounded bg-secondary align-middle" />)}
            </p>
            {stat.note && <p className="mt-1 text-xs text-muted-foreground tabular-nums">{stat.note}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="recent-projects" className="overflow-hidden rounded-xl border border-border bg-white lg:col-span-2 lg:self-start">
          <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <h3 id="recent-projects" className="font-semibold text-balance text-foreground">
              Recent Projects
            </h3>
            {!(projects.isSuccess && recent.length === 0) && (
              <Link
                to="/projects"
                className="rounded text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                View all
              </Link>
            )}
          </div>

          {projects.isPending ? (
            <ul aria-busy="true" aria-label="Loading projects" className="divide-y divide-border">
              {[0, 1, 2].map((i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-4 sm:px-6">
                  <div className="size-9 animate-pulse rounded-lg bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
                    <div className="h-2.5 w-1/4 animate-pulse rounded bg-secondary" />
                  </div>
                </li>
              ))}
            </ul>
          ) : projects.isError ? (
            <p role="alert" className="px-6 py-8 text-sm text-red-600">
              {projects.error.message}
            </p>
          ) : recent.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                className="border-0 py-8"
                icon={Video}
                title="No projects yet"
                description="Upload a sermon, podcast episode or webinar and Mindra will transcribe it."
                action={
                  <Link to="/projects/new" className={buttonStyles()}>
                    Upload your first recording
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((project) => {
                const Icon = SOURCE_ICONS[project.source_type];
                return (
                  <li key={project.id}>
                    <Link
                      to={projectPath(project)}
                      className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-6"
                    >
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary text-muted-foreground">
                        {project.cover_url ? (
                          <img src={project.cover_url} alt="" loading="lazy" className="size-full object-cover" />
                        ) : (
                          <Icon aria-hidden="true" className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">{project.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">
                          {projectLength(project)} · {formatDate(project.created_at)}
                        </span>
                      </span>
                      <StatusBadge status={project.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <ComingUp />

          <section aria-labelledby="start-project" className="rounded-xl border border-border bg-white p-5">
            <h3 id="start-project" className="mb-4 font-semibold text-balance text-foreground">
              Start a project
            </h3>
            <ul className="space-y-2">
              {quickActions.map((action) => (
                <li key={action.type}>
                  <Link
                    to={`/projects/new?type=${action.type}`}
                    className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                      <action.icon aria-hidden="true" className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-foreground">{action.label}</span>
                      <span className="block text-xs text-pretty text-muted-foreground">{action.desc}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
