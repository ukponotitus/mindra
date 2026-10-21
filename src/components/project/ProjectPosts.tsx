import { useId, useState } from "react";
import { Plus } from "lucide-react";
import { useContentList } from "../../lib/content";
import { PLATFORMS } from "../../lib/projects";
import type { Project } from "../../lib/types";
import AiWriterNotice from "../content/AiWriterNotice";
import ContentCard from "../content/ContentCard";
import ContentGenerator from "../content/ContentGenerator";
import PlatformBadge from "../content/PlatformBadge";
import { buttonStyles } from "../ui/button";

/** A project's written posts, grouped by platform, with the form to write more. */
export default function ProjectPosts({ project }: { project: Project }) {
  const posts = useContentList({ project: project.id, pageSize: 200 });
  const [formOpen, setFormOpen] = useState(false);

  const pieces = posts.data?.results ?? [];
  const groups = PLATFORMS.map((platform) => ({ platform, items: pieces.filter((p) => p.platform === platform.id) })).filter(
    (group) => group.items.length > 0,
  );
  const firstTime = !posts.isPending && pieces.length === 0;
  const formId = useId();

  return (
    <div className="space-y-6">
      <AiWriterNotice />

      {firstTime && !formOpen && (
        <div>
          <h3 className="text-lg font-semibold text-balance text-foreground">
            {project.source_type === "flyer"
              ? "Write posts for this flyer"
              : project.source_type === "photos"
                ? "Write posts for these photos"
                : "Write posts from this recording"}
          </h3>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            {project.source_type === "flyer"
              ? "Pick where you post. Mindra writes an announcement for each one in that platform's format, from what the flyer says."
              : project.source_type === "photos"
                ? "Pick where you post. Mindra writes a caption for each one in that platform's format, from what the pictures show."
                : "Pick where you post. Mindra writes each one in that platform's format, from what was actually said."}
          </p>
        </div>
      )}

      {pieces.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-lg font-semibold text-foreground tabular-nums">
            {pieces.length} post{pieces.length === 1 ? "" : "s"}
          </h3>
          <button
            type="button"
            onClick={() => setFormOpen((open) => !open)}
            aria-expanded={formOpen}
            aria-controls={formId}
            className={buttonStyles({ variant: "secondary" })}
          >
            {formOpen ? (
              "Hide"
            ) : (
              <>
                <Plus aria-hidden="true" className="size-4" />
                Write more posts
              </>
            )}
          </button>
        </div>
      )}

      {(firstTime || formOpen) && (
        <div id={formId}>
          <ContentGenerator project={project} onStart={() => setFormOpen(true)} />
        </div>
      )}

      {posts.isPending ? (
        <div aria-busy="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <p role="status" className="sr-only">
            Loading posts…
          </p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3 rounded-xl border border-border bg-white p-5">
              <div className="flex items-center gap-2">
                <div className="size-6 animate-pulse rounded-md bg-secondary" />
                <div className="h-3 w-24 animate-pulse rounded bg-secondary" />
              </div>
              <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full animate-pulse rounded bg-secondary" />
                <div className="h-3 w-5/6 animate-pulse rounded bg-secondary" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-secondary" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        groups.map(({ platform, items }) => (
          <section key={platform.id} aria-labelledby={`${formId}-${platform.id}`}>
            <h4 id={`${formId}-${platform.id}`} className="mb-3 flex items-center gap-2">
              <PlatformBadge platform={platform.id} />
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground tabular-nums">
                <span className="sr-only">, </span>
                {items.length}
                <span className="sr-only"> {items.length === 1 ? "post" : "posts"}</span>
              </span>
            </h4>
            <div className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {items.map((piece) => (
                <ContentCard key={piece.id} piece={piece} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
