import { useState } from "react";
import { ChevronLeft, ChevronRight, FolderOpen, Plus } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import RenameProjectInput from "../components/RenameProjectInput";
import StatusBadge from "../components/StatusBadge";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { cn } from "../lib/cn";
import { formatDate, formatDuration } from "../lib/format";
import { PAGE_SIZE, projectPath, SOURCE_ICONS, SOURCE_LABELS, useDeleteProject, useProjects } from "../lib/projects";
import type { Project } from "../lib/types";


// Name, type, length, status, created, actions.
const COLUMNS = "md:grid-cols-[minmax(0,1fr)_96px_72px_96px_80px_160px]";

export default function Projects() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const projects = useProjects(page);
  const deleteProject = useDeleteProject();
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const count = projects.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const goToPage = (next: number) => setSearchParams(next === 1 ? {} : { page: String(next) });

  const remove = (project: Project) => {
    deleteProject.mutate(project.id, {
      // If that was the last project on this page, step back a page.
      onSuccess: () => projects.data?.results.length === 1 && page > 1 && goToPage(page - 1),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-balance text-foreground">Projects</h2>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {projects.data ? `${count} project${count === 1 ? "" : "s"}` : "Every recording you've uploaded."}
          </p>
        </div>
        {/* With no projects yet, the empty state below carries the one action. */}
        {!(projects.isSuccess && count === 0) && (
          <Link to="/projects/new" className={buttonStyles({ variant: "secondary" })}>
            <Plus aria-hidden="true" className="size-4" />
            New Project
          </Link>
        )}
      </div>

      {projects.isPending ? (
        <ul aria-busy="true" aria-label="Loading projects" className="divide-y divide-border rounded-xl border border-border bg-white">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="flex items-center gap-3 px-4 py-4 sm:px-6">
              <div className="size-9 animate-pulse rounded-lg bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                <div className="h-2.5 w-1/5 animate-pulse rounded bg-secondary" />
              </div>
            </li>
          ))}
        </ul>
      ) : projects.isError ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {projects.error.message}
        </p>
      ) : count === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No projects yet"
          description="Each recording you upload becomes a project with its own transcript."
          action={
            <Link to="/projects/new" className={buttonStyles()}>
              Upload a recording
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <div
            aria-hidden="true"
            className={cn("hidden gap-4 border-b border-border px-6 py-3 text-xs font-medium text-muted-foreground md:grid", COLUMNS)}
          >
            <span>Name</span>
            <span>Type</span>
            <span>Length</span>
            <span>Status</span>
            <span>Created</span>
            <span />
          </div>
          <ul className="divide-y divide-border">
            {projects.data.results.map((project) => {
              const Icon = SOURCE_ICONS[project.source_type];
              const renaming = renamingId === project.id;
              const deleting = deleteProject.isPending && deleteProject.variables === project.id;
              const deleteFailed = deleteProject.isError && deleteProject.variables === project.id;
              return (
                <li key={project.id}>
                  <div
                    className={cn(
                      "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-background sm:px-6",
                      COLUMNS,
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                        <Icon aria-hidden="true" className="size-4" />
                      </span>
                      {renaming ? (
                        <RenameProjectInput project={project} onDone={() => setRenamingId(null)} />
                      ) : (
                        <div className="min-w-0">
                          {/* The link covers the whole row, so anywhere on it opens the project. */}
                          <Link
                            to={projectPath(project)}
                            className="block truncate rounded text-sm font-medium text-foreground after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                          >
                            {project.name}
                          </Link>
                          <p className="truncate text-xs text-muted-foreground">{project.source_filename || "Pasted transcript"}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums md:hidden">
                            {SOURCE_LABELS[project.source_type]} · {formatDuration(project.duration_seconds)} ·{" "}
                            {formatDate(project.created_at)}
                          </p>
                        </div>
                      )}
                    </div>
                    <span className="hidden text-sm text-muted-foreground md:block">{SOURCE_LABELS[project.source_type]}</span>
                    <span className="hidden text-sm text-muted-foreground tabular-nums md:block">
                      {formatDuration(project.duration_seconds)}
                    </span>
                    <span>
                      <StatusBadge status={project.status} />
                    </span>
                    <span className="hidden text-sm text-muted-foreground tabular-nums md:block">
                      {formatDate(project.created_at)}
                    </span>
                    <div className="relative col-span-2 flex gap-2 md:col-span-1 md:justify-end">
                      <button
                        type="button"
                        onClick={() => setRenamingId(project.id)}
                        disabled={renaming}
                        className={buttonStyles({ variant: "secondary", size: "sm", className: "h-10 md:h-8" })}
                      >
                        Rename
                      </button>
                      <ConfirmDialog
                        trigger={
                          <button
                            type="button"
                            disabled={deleteProject.isPending}
                            className={buttonStyles({ variant: "danger-outline", size: "sm", className: "h-10 md:h-8" })}
                          >
                            {deleting ? "Deleting…" : "Delete"}
                          </button>
                        }
                        title={`Delete "${project.name}"?`}
                        description="Its recording, transcript and written posts will be removed for good. This can't be undone."
                        confirmLabel="Delete project"
                        onConfirm={() => remove(project)}
                      />
                    </div>
                    {deleteFailed && (
                      <p role="alert" className="col-span-2 text-sm text-red-600 md:col-span-6 md:text-right">
                        {deleteProject.error.message}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-4 border-t border-border px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className={buttonStyles({ variant: "ghost", size: "sm", className: "h-10 md:h-8" })}
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
                Previous
              </button>
              <span className="text-xs text-muted-foreground tabular-nums">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= pages}
                className={buttonStyles({ variant: "ghost", size: "sm", className: "h-10 md:h-8" })}
              >
                Next
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
