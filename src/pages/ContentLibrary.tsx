import { useEffect, useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { ArrowLeft, ArrowRight, CalendarClock, Check, FileText, Plus, Search, Send, Star, X, type LucideIcon } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import ContentCard from "../components/content/ContentCard";
import PostsTable from "../components/content/PostsTable";
import EmptyState from "../components/EmptyState";
import { buttonStyles } from "../components/ui/button";
import { cn } from "../lib/cn";
import { LIBRARY_SORTS, LIBRARY_STAGES, useContentList, useContentStages, type LibrarySort, type LibraryStage } from "../lib/content";
import { PLATFORMS, useProjects } from "../lib/projects";
import type { Platform } from "../lib/types";
import { useMediaQuery } from "../lib/useMediaQuery";

const PAGE_SIZE = 24;

const fieldClass =
  "h-10 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden";

/** A grey stand-in shaped like a post card, shown while posts load. */
function PostSkeleton() {
  return (
    <div className="flex h-64 flex-col rounded-xl border border-border bg-card p-5">
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

/** What each tab says while it has no posts (without filters). */
const EMPTY: Record<LibraryStage, { icon: LucideIcon; title: string; description: string; action: { to: string; label: string } }> = {
  drafts: {
    icon: FileText,
    title: "No drafts",
    description:
      "Posts Mindra writes for you wait here until you schedule or post them. Open a recording, photos or a flyer in Projects and choose Write posts.",
    action: { to: "/projects", label: "Go to Projects" },
  },
  scheduled: {
    icon: CalendarClock,
    title: "Nothing scheduled",
    description: "Schedule a draft, or approve a content plan, and it waits here until it goes out.",
    action: { to: "/planner", label: "Open the Planner" },
  },
  published: {
    icon: Send,
    title: "Nothing published by Mindra yet",
    description: "Posts Mindra puts on your connected accounts appear here, with how each one did.",
    action: { to: "/settings#accounts", label: "Connect an account" },
  },
  posted: {
    icon: Check,
    title: "Nothing marked as posted",
    description: "Posts you put up yourself appear here once you mark them as posted.",
    action: { to: "/planner", label: "Open the Planner" },
  },
};

const isStage = (value: string | null): value is LibraryStage => LIBRARY_STAGES.some((stage) => stage.id === value);
const isSort = (value: string | null): value is LibrarySort => LIBRARY_SORTS.some((sort) => sort.id === value);

/** Every post Mindra has written, in tabs by where it is (drafts, scheduled, published by Mindra, posted by hand), with
 * filters kept in the address bar. */
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
  const tabParam = searchParams.get("tab");
  const tab: LibraryStage = isStage(tabParam) ? tabParam : "drafts";
  // Posts that went out: sorted by a number, and on a computer a table of their numbers.
  const wentOut = tab === "published" || tab === "posted";
  const sortParam = searchParams.get("sort");
  const sort: LibrarySort | "" = wentOut && isSort(sortParam) ? sortParam : "";
  const wide = useMediaQuery("(min-width: 1024px)");
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

  const content = useContentList({ platform, project, favorite, search, page, stage: tab, sort });
  const stages = useContentStages({ platform, project, favorite, search });
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
            Every post Mindra has written for you, by where it is.
          </p>
        </div>
        {/* Posts are written from their recording, photos or flyer: its project's page. */}
        <Link to={project ? `/projects/${project}?tab=posts` : "/projects"} className={buttonStyles()}>
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

      <Tabs.Root value={tab} onValueChange={(value) => update({ tab: value === "drafts" ? "" : String(value), sort: "" })}>
        {/* All four in view on a phone, each count under its name; side by side from small screens up. */}
        <Tabs.List aria-label="Posts by where they are" className="grid grid-cols-4 gap-1 rounded-xl bg-muted p-1 sm:inline-flex sm:max-w-full">
          {LIBRARY_STAGES.map(({ id, label }) => (
            <Tabs.Tab
              key={id}
              value={id}
              className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[13px] font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary data-[active]:bg-card data-[active]:text-foreground data-[active]:shadow-sm sm:min-h-10 sm:flex-row sm:gap-2 sm:px-3.5 sm:text-sm"
            >
              {label}
              {stages.data && (
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs text-muted-foreground tabular-nums">{stages.data[id]}</span>
              )}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.Root>

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
        {wentOut && (
          <>
            <label htmlFor="library-sort" className="sr-only">
              Sort by
            </label>
            <select
              id="library-sort"
              value={sort}
              onChange={(e) => update({ sort: e.target.value })}
              className={cn(fieldClass, "min-w-0 flex-1 basis-36 sm:flex-none sm:basis-auto")}
            >
              <option value="">Newest first</option>
              {LIBRARY_SORTS.map((option) => (
                <option key={option.id} value={option.id}>
                  Most {option.label.toLowerCase()}
                </option>
              ))}
            </select>
          </>
        )}
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
                  setSearchParams(tab === "drafts" ? {} : { tab }, { replace: true });
                }}
                className={buttonStyles()}
              >
                Clear filters
              </button>
            }
          />
        ) : (
          <EmptyState
            icon={EMPTY[tab].icon}
            title={EMPTY[tab].title}
            description={EMPTY[tab].description}
            action={
              <Link to={EMPTY[tab].action.to} className={buttonStyles()}>
                {EMPTY[tab].action.label}
              </Link>
            }
          />
        )
      ) : (
        <>
          {wentOut && wide ? (
            <PostsTable posts={content.data.results} sort={sort} onSort={(next) => update({ sort: next })} />
          ) : (
            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {content.data.results.map((piece) => (
                <ContentCard key={piece.id} piece={piece} showProject />
              ))}
            </div>
          )}
          {wentOut && (
            <p className="text-sm text-pretty text-muted-foreground">
              A dash means the platform doesn't share that number with Mindra. LinkedIn and TikTok share none yet, so their
              posts show only the clicks on links Mindra shortened (Count clicks in the post).
            </p>
          )}
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
