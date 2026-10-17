import { ArrowRight, Upload } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import ProjectPosts from "../components/project/ProjectPosts";
import { buttonStyles } from "../components/ui/button";
import { formatDate } from "../lib/format";
import { useProject, useProjects } from "../lib/projects";

/** Write posts from any finished recording, without opening the project first. */
export default function AIStudio() {
  const [searchParams, setSearchParams] = useSearchParams();
  const projects = useProjects(1);
  const ready = (projects.data?.results ?? []).filter((project) => project.status === "completed");
  const selectedId = searchParams.get("project") ?? ready[0]?.id;
  const project = useProject(selectedId).data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">AI Studio</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Write posts for each platform from any of your recordings.</p>
      </div>

      {projects.isPending ? (
        <div aria-busy="true" className="rounded-xl border border-border bg-white p-5">
          <p role="status" className="sr-only">
            Loading your recordings
          </p>
          <div className="h-3.5 w-20 animate-pulse rounded bg-secondary" />
          <div className="mt-3 h-10 w-full animate-pulse rounded-lg bg-secondary" />
        </div>
      ) : ready.length === 0 ? (
        <EmptyState
          icon={Upload}
          title="No recordings ready yet"
          description="Upload a sermon, podcast or webinar. Once it's transcribed, you can write posts from it here."
          action={
            <Link to="/projects/new" className={buttonStyles()}>
              Upload a recording
            </Link>
          }
        />
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="studio-recording" className="mb-1.5 block text-sm font-semibold text-foreground">
                Recording
              </label>
              <select
                id="studio-recording"
                value={selectedId}
                onChange={(e) => setSearchParams({ project: e.target.value }, { replace: true })}
                className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
              >
                {ready.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name} · {formatDate(option.created_at)}
                  </option>
                ))}
              </select>
            </div>
            {selectedId && (
              <Link to={`/projects/${selectedId}`} className={buttonStyles({ variant: "secondary" })}>
                Open project
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            )}
          </div>

          {project && <ProjectPosts key={project.id} project={project} />}
        </>
      )}
    </div>
  );
}
