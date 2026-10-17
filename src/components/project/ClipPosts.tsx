import { useId, useState } from "react";
import { PenLine } from "lucide-react";
import ContentCard from "../content/ContentCard";
import ContentGenerator from "../content/ContentGenerator";
import { buttonStyles } from "../ui/button";
import type { Clip } from "../../lib/clips";
import { useContentList } from "../../lib/content";
import type { Project } from "../../lib/types";

/** The captions written to post with one clip, and a form to write more. */
export default function ClipPosts({ clip, project }: { clip: Clip; project: Project }) {
  const posts = useContentList({ clip: clip.id, pageSize: 50 });
  const list = posts.data?.results ?? [];
  const [writing, setWriting] = useState(false);
  const formId = useId();

  return (
    <section aria-labelledby={`${formId}-title`} className="space-y-4 rounded-xl border border-border bg-white p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id={`${formId}-title`} className="font-semibold text-balance text-foreground">
            Posts for this clip
          </h3>
          <p className="mt-1 text-sm text-pretty text-muted-foreground tabular-nums">
            {list.length
              ? `${list.length} caption${list.length === 1 ? "" : "s"} to post with “${clip.title}”.`
              : "Captions to post with this clip on Instagram, TikTok, YouTube Shorts, WhatsApp and more."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWriting((open) => !open)}
          aria-expanded={writing}
          aria-controls={formId}
          className={buttonStyles({ variant: list.length ? "secondary" : "primary" })}
        >
          <PenLine aria-hidden="true" className="size-4" />
          {writing ? "Close" : list.length ? "Write more" : "Write posts for this clip"}
        </button>
      </div>

      <div id={formId} hidden={!writing}>
        {writing && <ContentGenerator project={project} clipId={clip.id} />}
      </div>

      {posts.isError && (
        <p role="alert" className="text-sm text-pretty text-red-600">
          {posts.error.message}
        </p>
      )}
      {list.length > 0 && (
        <div className="grid items-start gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {list.map((piece) => (
            <ContentCard key={piece.id} piece={piece} showClip={false} />
          ))}
        </div>
      )}
    </section>
  );
}
