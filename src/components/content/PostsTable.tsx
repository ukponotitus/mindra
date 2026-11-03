import { ArrowDown, FileText } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../lib/cn";
import { writingLanguageName, type LibrarySort } from "../../lib/content";
import { formatDate } from "../../lib/format";
import { formatCount } from "../../lib/results";
import type { ContentPiece, PostNumbers } from "../../lib/types";
import PlatformBadge from "./PlatformBadge";

// The Content Library's Published and Posted tabs on a computer: a row per post with its numbers, sorted by a column
// (largest first) or newest first, as in Facebook's Content Library. Phones show the posts as cards instead.

type Column = { id: LibrarySort; label: string; value: (numbers: PostNumbers) => number | null; width: string };

/** Likes, comments and shares together; null when the platform shares none of them. */
export function engagementOf(numbers: PostNumbers): number | null {
  const parts = [numbers.likes, numbers.comments, numbers.shares].filter((value): value is number => value !== null);
  return parts.length ? parts.reduce((sum, value) => sum + value, 0) : null;
}

const COLUMNS: Column[] = [
  { id: "views", label: "Views", value: (numbers) => numbers.views, width: "w-24" },
  { id: "engagement", label: "Engagement", value: engagementOf, width: "w-32" },
  { id: "likes", label: "Likes", value: (numbers) => numbers.likes, width: "w-24" },
  { id: "comments", label: "Comments", value: (numbers) => numbers.comments, width: "w-28" },
  { id: "shares", label: "Shares", value: (numbers) => numbers.shares, width: "w-24" },
  { id: "clicks", label: "Link clicks", value: (numbers) => numbers.clicks, width: "w-28" },
];

function firstLine(piece: ContentPiece): string {
  const text = (piece.title || piece.body).trim();
  return text.split("\n").find((line) => line.trim())?.trim() || "Untitled post";
}

/** The post's picture: its first photo, its video's frame, or a plain tile for a text post. */
function Thumbnail({ piece }: { piece: ContentPiece }) {
  const src = piece.photos[0]?.thumbnail_url ?? piece.clip?.thumbnail_url ?? null;
  return (
    <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-secondary text-muted-foreground">
      {src ? <img src={src} alt="" loading="lazy" decoding="async" className="size-full object-cover" /> : <FileText aria-hidden="true" className="size-5" />}
    </span>
  );
}

export default function PostsTable({
  posts,
  sort,
  onSort,
}: {
  posts: ContentPiece[];
  sort: LibrarySort | "";
  onSort: (sort: LibrarySort | "") => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      {/* The numbers keep their widths; the post takes the rest. */}
      <table className="w-full min-w-[56rem] table-fixed text-sm">
        <colgroup>
          <col />
          {COLUMNS.map((column) => (
            <col key={column.id} className={column.width} />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th scope="col" aria-sort={sort ? undefined : "descending"} className="px-4 py-3 font-medium">
              <button
                type="button"
                onClick={() => onSort("")}
                className="inline-flex items-center gap-1 rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
              >
                Post
                {!sort && <ArrowDown aria-hidden="true" className="size-3.5" />}
                <span className="sr-only">{sort ? ", sort newest first" : ", newest first"}</span>
              </button>
            </th>
            {COLUMNS.map((column) => (
              <th key={column.id} scope="col" aria-sort={sort === column.id ? "descending" : undefined} className="px-3 py-3 text-right font-medium">
                <button
                  type="button"
                  onClick={() => onSort(sort === column.id ? "" : column.id)}
                  className={cn(
                    "inline-flex items-center gap-1 rounded whitespace-nowrap hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary",
                    sort === column.id && "text-foreground",
                  )}
                >
                  {sort === column.id && <ArrowDown aria-hidden="true" className="size-3.5" />}
                  {column.label}
                  <span className="sr-only">{sort === column.id ? ", largest first" : ", sort largest first"}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {posts.map((piece) => {
            const when = piece.published_at ?? piece.posted_at;
            return (
              <tr key={piece.id} className="transition-colors hover:bg-secondary/50">
                <td className="px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Thumbnail piece={piece} />
                    <div className="min-w-0">
                      <Link
                        to={`/library/${piece.id}`}
                        className="block truncate font-medium text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        {firstLine(piece)}
                      </Link>
                      <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                        <PlatformBadge platform={piece.platform} />
                        {when && <span className="shrink-0">· {formatDate(when)}</span>}
                        {piece.language !== "en" && <span className="shrink-0">· {writingLanguageName(piece.language, undefined)}</span>}
                        {piece.publish_to_name && <span className="truncate">· {piece.publish_to_name}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                {COLUMNS.map((column) => {
                  // No engagement worked out for YouTube posts: YouTube's rules don't allow metrics derived from its numbers.
                  const derived = column.id === "engagement" && (piece.platform === "youtube" || piece.platform === "youtube_shorts");
                  const value = piece.results && !derived ? column.value(piece.results) : null;
                  return (
                    <td key={column.id} className="px-3 py-3 text-right whitespace-nowrap text-foreground tabular-nums">
                      {value === null ? (
                        <span className="text-muted-foreground">
                          <span aria-hidden="true">—</span>
                          <span className="sr-only">Not shared</span>
                        </span>
                      ) : (
                        formatCount(value)
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
