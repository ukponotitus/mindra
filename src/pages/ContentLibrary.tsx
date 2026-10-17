import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileText, Plus, Search, Star, X } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import ContentCard from "../components/content/ContentCard";
import EmptyState from "../components/EmptyState";
import { buttonStyles } from "../components/ui/button";
import { cn } from "../lib/cn";
import { useContentList } from "../lib/content";
import { PLATFORMS, useProjects } from "../lib/projects";
import type { Platform } from "../lib/types";

const PAGE_SIZE = 24;

const fieldClass =
  "h-10 rounded-lg border border-border bg-white px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden";

/** A grey stand-in shaped like a post card, shown while posts load. */
function PostSkeleton() {
  return (
    <div className="flex h-64 flex-col rounded-xl border border-border bg-white p-5">
      <div className="flex items-center gap-2">
        <div className="size-6 animate-pulse rounded-md bg-secondary" />
        <div className="h-3.5 w-24 animate-pulse rounded bg-secondary" />
      </div>
      <div className="mt-5 flex-1 space-y-2.5">
        <div className="h-3 w-full animate-pulse rounded bg-secondary" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-secondary" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-secondary" />
      </div>
      <div className="flex gap-2 border-t border-border pt-4">
        <div className="h-9 w-20 animate-pulse rounded-lg bg-secondary" />
        <div className="h-9 w-16 animate-pulse rounded-lg bg-secondary" />
      </div>
    </div>
  );
}

/** Every post Mindra has written, across all recordings, with filters kept in the address bar. */
/** What the editor passes back after a save, for the "Saved" note. */
type SavedNote = { saved?: { id: string; label: string } } | null;

export default function ContentLibrary() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // The note is read once and then cleared from the page's history entry, so a refresh doesn't show it again.
  const [saved, setSaved] = useState(() => (location.state as SavedNote)?.saved ?? null);
  useEffect(() => {
    if (location.state) navigate({ pathname: location.pathname, search: location.search }, { replace: true, state: null });
  }, [location, navigate]);
  const platform = (searchParams.get("platform") ?? "") as Platform | "";
  const project = searchParams.get("project") ?? "";
  const favorite = searchParams.get("favorite") === "true";
  const search = searchParams.get("search") ?? "";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const [searchInput, setSearchInput] = useState(search);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page"); // New filters start from the first page.
    setSearchParams(next, { replace: true });
  };

  // Search after the person pauses typing.
  useEffect(() => {
    if (searchInput === search) return;
    const id = window.setTimeout(() => update({ search: searchInput.trim() }), 300);
    return () => window.clearTimeout(id);
  });

  const content = useContentList({ platform, project, favorite, search, page });
  const projects = useProjects(1);
  const count = content.data?.count ?? 0;
  const pages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const filtered = Boolean(platform || project || favorite || search);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-balance text-foreground">Content Library</h2>
          <p className="mt-1 text-sm text-pretty text-muted-foreground tabular-nums">
            {content.data ? `${count} post${count === 1 ? "" : "s"}` : "Every post Mindra has written for you."}
          </p>
        </div>
        <Link to="/ai-studio" className={buttonStyles()}>
          <Plus aria-hidden="true" className="size-4" />
          Write posts
        </Link>
      </div>

      {saved && (
        <div role="status" className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 py-2 pr-2 pl-4 text-sm text-emerald-900">
          <Check aria-hidden="true" className="size-4 shrink-0" />
          <p className="min-w-0 flex-1 truncate">Saved “{saved.label}”.</p>
          <Link to={`/library/${saved.id}`} className="shrink-0 font-medium underline-offset-2 hover:underline">
            Edit again
          </Link>
          <button
            type="button"
            onClick={() => setSaved(null)}
            aria-label="Dismiss"
            className="grid size-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-emerald-100"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-1 basis-full sm:basis-56">
          <label htmlFor="library-search" className="sr-only">
            Search posts
          </label>
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            id="library-search"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search posts…"
            className={cn(fieldClass, "w-full pl-9 placeholder:text-muted-foreground")}
          />
        </div>
        <label htmlFor="library-platform" className="sr-only">
          Platform
        </label>
        <select
          id="library-platform"
          value={platform}
          onChange={(e) => update({ platform: e.target.value })}
          className={cn(fieldClass, "min-w-0 flex-1 basis-36 sm:flex-none sm:basis-auto")}
        >
          <option value="">All platforms</option>
          {PLATFORMS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <label htmlFor="library-recording" className="sr-only">
          Recording
        </label>
        <select
          id="library-recording"
          value={project}
          onChange={(e) => update({ project: e.target.value })}
          className={cn(fieldClass, "min-w-0 flex-1 basis-36 sm:max-w-64 sm:flex-none sm:basis-auto")}
        >
          <option value="">All recordings</option>
          {(projects.data?.results ?? []).map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => update({ favorite: favorite ? "" : "true" })}
          aria-pressed={favorite}
          className={buttonStyles({ variant: "secondary", className: cn(favorite && "border-gray-300 bg-secondary") })}
        >
          <Star aria-hidden="true" className={cn("size-4", favorite && "fill-amber-400 text-amber-500")} />
          Favourites
        </button>
      </div>

      {content.isPending ? (
        <div aria-busy="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <p role="status" className="sr-only">
            Loading posts
          </p>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      ) : content.isError ? (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
          {content.error.message}
        </p>
      ) : count === 0 ? (
        filtered ? (
          <EmptyState
            icon={Search}
            title="No posts match these filters"
            description="Try a different platform or recording, or clear the search."
            action={
              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchParams({}, { replace: true });
                }}
                className={buttonStyles()}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="Nothing written yet"
            description="Pick a recording in AI Studio and Mindra will write posts for the platforms you choose."
            action={
              <Link to="/ai-studio" className={buttonStyles()}>
                Open AI Studio
              </Link>
            }
          />
        )
      ) : (
        <>
          <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
            {content.data.results.map((piece) => (
              <ContentCard key={piece.id} piece={piece} showProject />
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
