import { Info } from "lucide-react";
import { cn } from "../../lib/cn";
import type { ContentPiece } from "../../lib/types";

/**
 * What the post's platform does with it, from the API's `posting_check`: its notes (X shows only 4 photos, Instagram
 * fits a carousel to the first photo's shape, a long video needs a verified YouTube channel) and, for YouTube with
 * `withPreview`, exactly what YouTube gets, since Mindra sends the title, description and tags as written. Shown in the
 * Schedule dialog, Post now and the editor's Schedule section before it goes out. Why it can't go out at all
 * (`posting_check.problem`) is said where automatic posting is offered (src/lib/social.ts, mediaNeeded).
 */
export default function PostingNotes({
  piece,
  withPreview = false,
  className,
}: {
  piece: ContentPiece;
  /** Show what YouTube gets: when Mindra is posting it there. */
  withPreview?: boolean;
  className?: string;
}) {
  const check = piece.posting_check;
  const preview = withPreview && !check?.problem ? check?.preview : null;
  if (!check || (check.notes.length === 0 && !preview)) return null;

  return (
    <div className={cn("space-y-3 rounded-lg border border-border bg-secondary/40 p-3 text-sm text-pretty", className)}>
      {check.notes.length > 0 && (
        <ul className="space-y-1.5">
          {check.notes.map((note) => (
            <li key={note} className="flex gap-2 text-muted-foreground">
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}
      {preview && (
        <div>
          <p className="font-medium text-foreground">What YouTube gets</p>
          <dl className="mt-2 space-y-2">
            <div>
              <dt className="text-xs text-muted-foreground">Title</dt>
              <dd className="font-medium break-words text-foreground">{preview.title}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Description</dt>
              <dd className="max-h-28 overflow-y-auto break-words whitespace-pre-line text-foreground">
                {preview.description || <span className="text-muted-foreground">None</span>}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Tags (from its hashtags)</dt>
              <dd className="break-words text-foreground">
                {preview.tags.length > 0 ? preview.tags.join(", ") : <span className="text-muted-foreground">None</span>}
              </dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-muted-foreground">
            It goes up exactly as written. To change any of it, edit the post: the title is its first line, or a line that
            starts "Title:".
          </p>
        </div>
      )}
    </div>
  );
}
