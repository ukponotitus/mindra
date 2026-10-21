import { useState } from "react";
import { ArrowRight, FileText, LoaderCircle, PenLine, Pencil } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import NextSteps from "../components/project/NextSteps";
import ProjectAnalysis from "../components/project/ProjectAnalysis";
import ProjectClips from "../components/project/ProjectClips";
import ProjectPhotos from "../components/project/ProjectPhotos";
import ProjectPosts from "../components/project/ProjectPosts";
import TranscribeAgainDialog from "../components/project/TranscribeAgainDialog";
import TranscriptPanel from "../components/project/TranscriptPanel";
import RenameProjectInput from "../components/RenameProjectInput";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { formatDate, formatDuration, languageName } from "../lib/format";
import {
  isInProgress,
  isPicturePost,
  projectLength,
  projectSourceDetail,
  SOURCE_LABELS,
  useDeleteProject,
  useProject,
  useRetryProject,
  useTranscript,
} from "../lib/projects";
import type { TranscriptSegment } from "../lib/types";

type TabId = "overview" | "transcript" | "posts" | "clips" | "photos";

const RECORDING_TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "transcript", label: "Transcript" },
  { id: "posts", label: "Posts" },
  { id: "clips", label: "Clips" },
];

// A photo or flyer post has no recording, so no transcript or clips: its pictures (with, for a flyer, the text read
// from it), and the posts written from them.
const PHOTO_TABS: { id: TabId; label: string }[] = [
  { id: "photos", label: "Photos" },
  { id: "posts", label: "Posts" },
];
const FLYER_TABS: { id: TabId; label: string }[] = [
  { id: "photos", label: "Flyer" },
  { id: "posts", label: "Posts" },
];

function countWords(segments: TranscriptSegment[]): number {
  return segments.reduce((total, segment) => total + segment.text.split(/\s+/).filter(Boolean).length, 0);
}

export default function ProjectDetails() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const startAt = searchParams.has("t") ? Number(searchParams.get("t")) : undefined;

  const { data: project, error, isPending } = useProject(projectId);
  const isPhotos = isPicturePost(project?.source_type);
  const isFlyer = project?.source_type === "flyer";
  const tabs = isFlyer ? FLYER_TABS : isPhotos ? PHOTO_TABS : RECORDING_TABS;
  const activeTab: TabId = tabs.find((tab) => tab.id === searchParams.get("tab"))?.id ?? tabs[0].id;
  const openTab = (tab: TabId, seconds?: number) =>
    setSearchParams(tab === tabs[0].id ? {} : { tab, ...(seconds != null ? { t: String(seconds) } : {}) }, { replace: true });
  const completed = project?.status === "completed";
  // The transcript is saved before the AI analysis starts, so it can be read during analysis.
  const transcriptReady = !isPhotos && (completed || project?.status === "analyzing");
  const transcript = useTranscript(projectId, transcriptReady);
  const deleteProject = useDeleteProject();
  const retry = useRetryProject();
  const [renaming, setRenaming] = useState(false);

  if (isPending) {
    return (
      <div aria-busy="true" className="space-y-6">
        <p role="status" className="sr-only">
          Loading project…
        </p>
        <div className="space-y-3">
          <div className="h-3 w-40 animate-pulse rounded bg-secondary" />
          <div className="h-7 w-72 max-w-full animate-pulse rounded bg-secondary" />
          <div className="h-4 w-56 max-w-full animate-pulse rounded bg-secondary" />
        </div>
        <div className="h-10 w-80 max-w-full animate-pulse rounded-lg bg-secondary" />
        <div className="h-24 animate-pulse rounded-xl border border-border bg-white" />
        <div className="h-48 animate-pulse rounded-xl border border-border bg-white" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h2 className="mb-2 text-xl font-semibold text-balance text-foreground">We couldn't find that project</h2>
        <p className="mb-6 text-sm text-pretty text-muted-foreground">{!error || (error instanceof ApiError && error.status === 404) ? "It may have been deleted, or the link may be wrong." : error.message}</p>
        <Link to="/projects" className={buttonStyles({ variant: "secondary" })}>
          Back to projects
        </Link>
      </div>
    );
  }

  const segments = transcript.data?.segments ?? [];
  const speakers = new Set(segments.map((segment) => segment.speaker).filter(Boolean)).size;
  const failed = project.status === "failed";
  // A recording heard in the wrong language can be transcribed again once it has stopped processing.
  const canTranscribeAgain = project.source_type !== "transcript" && (completed || failed);

  const overviewStats = [
    { label: "Duration", value: formatDuration(project.duration_seconds) },
    {
      label: "Language",
      value: languageName(project.language),
      action: canTranscribeAgain ? <TranscribeAgainDialog project={project} /> : null,
    },
    { label: "Segments", value: transcriptReady ? project.segment_count.toLocaleString() : "—" },
    { label: "Words", value: transcript.data ? countWords(segments).toLocaleString() : "—" },
    { label: "Speakers", value: speakers > 0 ? String(speakers) : "—" },
    { label: "Source", value: SOURCE_LABELS[project.source_type] },
  ];

  const remove = () => {
    deleteProject.mutate(project.id, { onSuccess: () => navigate("/projects", { replace: true }) });
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <nav aria-label="Breadcrumb" className="mb-2">
            <ol className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <li>
                <Link
                  to="/projects"
                  className="rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Projects
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="min-w-0 truncate font-medium text-foreground">
                {project.name}
              </li>
            </ol>
          </nav>
          {renaming ? (
            <div className="mb-1 max-w-xl">
              <RenameProjectInput project={project} onDone={() => setRenaming(false)} className="text-lg font-semibold" />
            </div>
          ) : (
            <div className="mb-1 flex items-start gap-1">
              <h2 className="min-w-0 text-2xl font-semibold text-balance break-words text-foreground">{project.name}</h2>
              <button
                type="button"
                onClick={() => setRenaming(true)}
                aria-label="Rename project"
                title="Rename"
                className={buttonStyles({ variant: "ghost", size: "icon", className: "-my-0.5" })}
              >
                <Pencil aria-hidden="true" className="size-4" />
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="min-w-0 text-sm break-words text-muted-foreground">
              Added <span className="tabular-nums">{formatDate(project.created_at)}</span> ·{" "}
              <span className="tabular-nums">{projectLength(project)}</span>
              {isPhotos ? (
                project.linked_recording && (
                  <>
                    {" "}
                    · With{" "}
                    <Link
                      to={`/projects/${project.linked_recording}`}
                      className="rounded font-medium text-foreground hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {project.linked_recording_name || "the connected recording"}
                    </Link>
                  </>
                )
              ) : (
                <> · {projectSourceDetail(project)}</>
              )}
            </p>
            <StatusBadge status={project.status} />
          </div>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <ConfirmDialog
            trigger={
              <button
                type="button"
                disabled={deleteProject.isPending}
                className={buttonStyles({ variant: "danger-outline" })}
              >
                {deleteProject.isPending ? "Deleting…" : "Delete"}
              </button>
            }
            title={`Delete "${project.name}"?`}
            description={
              isFlyer
                ? "Its flyer and written posts will be removed for good. This can't be undone."
                : isPhotos
                  ? "Its photos and written posts will be removed for good. This can't be undone."
                  : "Its recording, transcript and written posts will be removed for good. This can't be undone."
            }
            confirmLabel="Delete project"
            onConfirm={remove}
          />
          {deleteProject.isError && (
            <p role="alert" className="max-w-xs text-sm text-red-600 sm:text-right">
              {deleteProject.error.message}
            </p>
          )}
        </div>
      </div>

      {/* A flyer being read, or one that couldn't be, says so on its Flyer and Posts tabs instead. */}
      {isInProgress(project.status) && !isPhotos && (
        <div
          role="status"
          className="mb-6 flex flex-col gap-3 rounded-xl bg-primary/10 px-4 py-3 text-sm text-foreground sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-center gap-3 text-pretty">
            <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin text-primary" />
            {project.source_type === "transcript"
              ? "Reading your transcript. It will appear here in a moment."
              : `Processing your recording (${project.progress}%). The transcript appears here when it's ready.`}
          </span>
          <Link
            to={`/projects/${project.id}/processing`}
            className="inline-flex items-center gap-1 self-start rounded font-medium whitespace-nowrap text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:self-auto"
          >
            View progress
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      )}

      {failed && !isFlyer && (
        <div className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-pretty">{project.error || "Processing stopped."}</span>
            <button
              type="button"
              onClick={() => retry.mutate(project.id)}
              disabled={retry.isPending}
              className={buttonStyles({ variant: "secondary", size: "sm", className: "h-10 self-start sm:h-8 sm:self-auto" })}
            >
              {retry.isPending ? "Restarting…" : "Try again"}
            </button>
          </div>
          {retry.isError && (
            <p role="alert" className="mt-2 text-red-700">
              {retry.error.message}
            </p>
          )}
        </div>
      )}

      {project.status === "completed" && (
        <NextSteps project={project} postsAvailable postCount={project.content_count} onOpen={openTab} />
      )}

      <div role="group" aria-label="Project sections" className="mb-6 flex w-fit max-w-full gap-1 overflow-x-auto rounded-lg bg-secondary p-1">
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={selected}
              onClick={() => openTab(tab.id)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium whitespace-nowrap transition-colors sm:h-9 sm:px-4",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                selected ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
            {overviewStats.map((stat) => (
              <div key={stat.label} className="min-w-0 bg-white px-4 py-3.5">
                <dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 truncate text-lg font-semibold text-foreground tabular-nums">{stat.value}</dd>
                {"action" in stat && stat.action && <dd>{stat.action}</dd>}
              </div>
            ))}
          </dl>

          <ProjectAnalysis project={project} onJump={(seconds) => openTab("transcript", seconds)} />
        </div>
      )}

      {activeTab === "transcript" &&
        (transcriptReady ? (
          transcript.isPending ? (
            <div aria-busy="true" className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
              <p role="status" className="sr-only">
                Loading transcript…
              </p>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-4 w-12 shrink-0 animate-pulse rounded bg-secondary" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
                    <div className="h-4 w-full animate-pulse rounded bg-secondary" />
                  </div>
                </div>
              ))}
            </div>
          ) : transcript.isError ? (
            <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {transcript.error.message}
            </p>
          ) : (
            <TranscriptPanel project={project} segments={segments} startAt={startAt} />
          )
        ) : (
          <EmptyState
            icon={FileText}
            title="The transcript isn't ready yet"
            description={
              failed
                ? "Processing stopped before the transcript was finished. Try again from the banner above."
                : "Mindra is still working on this. This page updates by itself, and the banner above shows the progress."
            }
          />
        ))}

      {activeTab === "posts" &&
        (completed ? (
          <ProjectPosts project={project} />
        ) : isFlyer ? (
          <EmptyState
            icon={PenLine}
            title="Posts can be written once the flyer is read"
            description={
              failed
                ? "Mindra couldn't read the flyer. Try again on the Flyer tab, or type what it says there."
                : "Mindra is reading the flyer. This page updates by itself when it's done."
            }
            action={
              <button type="button" onClick={() => openTab("photos")} className={buttonStyles({ variant: "secondary" })}>
                Open the Flyer tab
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={PenLine}
            title="Posts can be written once the recording is ready"
            description={
              failed
                ? "Processing stopped before this recording was ready. Try again from the banner above."
                : "Mindra is still working on this recording. This page updates by itself, and the banner above shows the progress."
            }
          />
        ))}

      {activeTab === "clips" && <ProjectClips project={project} initialClipId={searchParams.get("clip")} />}

      {activeTab === "photos" && <ProjectPhotos project={project} />}
    </div>
  );
}
