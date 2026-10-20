import { Check, ExternalLink, LoaderCircle, RotateCcw, Send } from "lucide-react";
import { Link } from "react-router";
import { buttonStyles } from "../ui/button";
import { useStorePiece } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { platformInfo } from "../../lib/projects";
import { usePublishPiece, viewOnLabel } from "../../lib/social";
import type { ContentPiece } from "../../lib/types";

const linkClass =
  "inline-flex items-center gap-1 rounded font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * What automatic posting is doing with a post: set to go out to an account at its time, posting now, out (with a link
 * to it), or failed (why, and Try again). Nothing for a post that only gets a reminder.
 */
export default function PublishStatus({ piece, className }: { piece: ContentPiece; className?: string }) {
  const publish = usePublishPiece();
  const store = useStorePiece();
  const platform = platformInfo(piece.platform).label;
  const target = piece.publish_to_name || platform;

  switch (piece.schedule_status) {
    case "publishing":
      return (
        <p role="status" className={cn("flex items-center gap-2 text-sm text-pretty text-primary", className)}>
          <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin" />
          Posting to {target}…
        </p>
      );

    case "published":
      return (
        <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-pretty text-emerald-800", className)}>
          <span className="inline-flex items-center gap-1.5">
            <Check aria-hidden="true" className="size-4 shrink-0" />
            {piece.publish_to_name ? `Posted to ${piece.publish_to_name}.` : `Posted on ${platform}.`}
          </span>
          {piece.published_url && (
            <a href={piece.published_url} target="_blank" rel="noopener noreferrer" className={cn(linkClass, "text-emerald-800")}>
              {viewOnLabel(piece.platform)}
              <ExternalLink aria-hidden="true" className="size-3.5" />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </p>
      );

    case "failed":
      return (
        <div className={cn("rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-pretty text-red-800", className)}>
          <p className="font-medium">Couldn't post it automatically</p>
          {piece.publish_error && <p className="mt-0.5">{piece.publish_error}</p>}
          {piece.publish_to ? (
            <button
              type="button"
              onClick={() => publish.mutate({ piece }, { onSuccess: store })}
              disabled={publish.isPending}
              className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-2.5 h-9" })}
            >
              {publish.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <RotateCcw aria-hidden="true" className="size-4" />}
              Try again
            </button>
          ) : (
            <p className="mt-0.5">
              Share it yourself, or connect the account again in{" "}
              <Link to="/settings#accounts" className={cn(linkClass, "text-red-800")}>
                Settings
              </Link>
              .
            </p>
          )}
          {publish.isError && (
            <p role="alert" className="mt-2 text-red-700">
              {publish.error.message}
            </p>
          )}
        </div>
      );

    case "planned":
      if (!piece.publish_to || !piece.scheduled_at) return null;
      return (
        <p className={cn("flex items-center gap-2 text-sm text-pretty text-muted-foreground", className)}>
          <Send aria-hidden="true" className="size-4 shrink-0" />
          Mindra posts it to {target} at its time.
        </p>
      );

    default:
      return null;
  }
}
