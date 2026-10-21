import { ArrowLeft, ArrowRight, Clapperboard, Download, Search } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import { buttonStyles } from "../components/ui/button";
import { cn } from "../lib/cn";
import { clipFrame, clipPath, clipStatusLabel, useClips, type Clip, type ClipFilters } from "../lib/clips";
import { formatDuration } from "../lib/format";
import { useProjects } from "../lib/projects";

const PAGE_SIZE = 24;

const fieldClass =
  "h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden";

const STATUS_OPTIONS: { id: NonNullable<ClipFilters["status"]>; label: string }[] = [
  { id: "", label: "All clips" },
  { id: "made", label: "Made" },
  { id: "not_made", label: "Not made yet" },
];

function ClipTile({ clip }: { clip: Clip }) {
  const status = clipStatusLabel(clip);
  const downloadable = clip.status === "ready" && clip.download_url && !clip.is_stale;
  return (
    <article className="flex min-w-0 gap-4 rounded-xl border border-border bg-white p-4">
      <Link
        to={clipPath(clip)}
        tabIndex={-1}
        aria-hidden="true"
        className={cn(
          "grid shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary text-muted-foreground",
          clipFrame(clip.shape, "h-32 w-[4.5rem]", "h-[4.5rem] w-32"),
        )}
      >
        {clip.thumbnail_url ? <img src={clip.thumbnail_url} alt="" className="size-full object-cover" /> : <Clapperboard className="size-5" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-semibold text-balance text-foreground">
          <Link to={clipPath(clip)} className="hover:underline focus-visible:underline">
            {clip.title}
          </Link>
        </h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">{clip.project_name}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground tabular-nums">
          {formatDuration(clip.start)}–{formatDuration(clip.end)} · {Math.round(clip.duration)}s
          <span className={cn("rounded-full px-2 py-0.5 font-medium", status.tone)}>{status.text}</span>
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-3">
          <Link to={clipPath(clip)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Open
          </Link>
          {downloadable && (
            <a href={clip.download_url ?? undefined} download className={buttonStyles({ variant: "ghost", size: "sm" })}>
              <Download aria-hidden="true" className="size-4" />
              Download
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

function TileSkeleton() {
  return (
    <div className="flex gap-4 rounded-xl border border-border bg-white p-4">
      <div className="h-32 w-[4.5rem] shrink-0 animate-pulse rounded-lg bg-secondary" />
      <div className="flex-1 space-y-2.5 pt-1">
        <div className="h-3.5 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
      </div>
    </div>
  );
}

/** Every clip from the person's videos, newest first, with filters kept in the address bar. */
export default function Clips() {
  const [searchParams, setSearchParams] = useSearchParams();
  const project = searchParams.get("project") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const status = STATUS_OPTIONS.some((option) => option.id === statusParam) ? (statusParam as ClipFilters["status"]) : "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page"); // New filters start from the first page.
    setSearchParams(next, { replace: true });
  };

  const clips = useClips({ project, status, page });
  const projects = useProjects(1);
  const videos = (projects.data?.results ?? []).filter((option) => option.source_type === "video");
  const count = clips.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const filtered = Boolean(project || status);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Clips</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground tabular-nums">
          {clips.data ? `${count} clip${count === 1 ? "" : "s"} from your videos` : "Every clip from your videos."}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label htmlFor="clips-recording" className="sr-only">
          Recording
        </label>
        <select
          id="clips-recording"
          value={project}
          onChange={(event) => update({ project: event.target.value })}
          className={cn(fieldClass, "min-w-0 flex-1 basis-40 sm:max-w-72 sm:flex-none sm:basis-auto")}
        >
          <option value="">All videos</option>
          {videos.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <label htmlFor="clips-status" className="sr-only">
          Status
        </label>
        <select
          id="clips-status"
          value={status}
          onChange={(event) => update({ status: event.target.value })}
          className={cn(fieldClass, "min-w-0 flex-1 basis-32 sm:flex-none sm:basis-auto")}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {clips.isPending ? (
        <div aria-busy="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <p role="status" className="sr-only">
            Loading clips
          </p>
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <TileSkeleton key={item} />
          ))}
        </div>
      ) : clips.isError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
          {clips.error.message}
        </p>
      ) : count === 0 ? (
        filtered ? (
          <EmptyState
            icon={Search}
            title="No clips match these filters"
            description="Try another video, or show every clip."
            action={
              <button type="button" onClick={() => setSearchParams({}, { replace: true })} className={buttonStyles()}>
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={Clapperboard}
            title="No clips yet"
            description="Clips are cut from your video recordings. Open a video's Clips tab to find the best moments or choose your own."
            action={
              <Link to="/projects" className={buttonStyles()}>
                Go to projects
              </Link>
            }
          />
        )
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {clips.data.results.map((clip) => (
              <ClipTile key={clip.id} clip={clip} />
            ))}
          </div>
          {pages > 1 && (
            <nav aria-label="Pages" className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => update({ page: String(page - 1) })}
                disabled={page <= 1}
                className={buttonStyles({ variant: "secondary" })}
              >
                <ArrowLeft aria-hidden="true" className="size-4" />
                Previous
              </button>
              <span className="text-sm text-muted-foreground tabular-nums">
                Page {page} of {pages}
              </span>
              <button
                type="button"
                onClick={() => update({ page: String(page + 1) })}
                disabled={page >= pages}
                className={buttonStyles({ variant: "secondary" })}
              >
                Next
                <ArrowRight aria-hidden="true" className="size-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
