import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Copy, Maximize2, Minimize2, RefreshCw, Star, Trash2, Undo2 } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import PostSchedule from "../components/calendar/PostSchedule";
import ReminderBanner from "../components/calendar/ReminderBanner";
import AiWriterNotice from "../components/content/AiWriterNotice";
import PlatformBadge from "../components/content/PlatformBadge";
import SuggestionsPanel from "../components/content/SuggestionsPanel";
import { ClipStrip, PostPhotos } from "../components/content/ContentCard";
import ShareButton from "../components/content/ShareButton";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { clipFrame } from "../lib/clips";
import { cn } from "../lib/cn";
import { TONES, useContentPiece, useDeletePiece, useRewritePiece, useUpdatePiece, type RewriteAction } from "../lib/content";
import { formatDate } from "../lib/format";
import { photoFiles } from "../lib/photos";
import { postOrigin } from "../lib/plans";
import { platformInfo } from "../lib/projects";
import type { ClipSummary } from "../lib/types";

const toolButton = buttonStyles({ variant: "secondary", size: "sm", className: "h-9" });

const crumbLink =
  "rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** A grey stand-in shaped like the editor, shown while the post loads. */
function EditorSkeleton() {
  return (
    <div aria-busy="true" className="space-y-6">
      <p role="status" className="sr-only">
        Loading post
      </p>
      <div className="space-y-3">
        <div className="h-3.5 w-48 animate-pulse rounded bg-secondary" />
        <div className="h-6 w-40 animate-pulse rounded bg-secondary" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 rounded-xl border border-border bg-white p-5 lg:col-span-2">
          <div className="h-10 w-full animate-pulse rounded-lg bg-secondary" />
          <div className="h-80 w-full animate-pulse rounded-lg bg-secondary" />
        </div>
        <div className="space-y-4 rounded-xl border border-border bg-white p-5">
          <div className="h-4 w-20 animate-pulse rounded bg-secondary" />
          <div className="h-40 w-full animate-pulse rounded-lg bg-secondary" />
        </div>
      </div>
    </div>
  );
}

/** Edit one post, with AI help to shorten, lengthen, rephrase or change its tone. */
/** The clip this post is the caption for: watch and download it next to the text. */
function PostClip({ clip, project, text, title }: { clip: ClipSummary; project: string; text: string; title: string }) {
  const made = clip.status === "ready" && clip.video_url && !clip.is_stale;
  return (
    <section aria-labelledby="post-clip" className="rounded-xl border border-border bg-white p-5">
      <h3 id="post-clip" className="mb-3 text-sm font-semibold text-foreground">
        Clip
      </h3>
      {made && (
        <video
          src={clip.video_url ?? undefined}
          poster={clip.thumbnail_url ?? undefined}
          controls
          playsInline
          preload="metadata"
          aria-label={`Clip: ${clip.title}`}
          className={cn("mx-auto mb-1 rounded-lg bg-black", clipFrame(clip.shape, "aspect-[9/16] max-h-80"))}
        />
      )}
      <ClipStrip clip={clip} project={project} />
      {made && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ShareButton clipId={clip.id} downloadUrl={clip.download_url} text={text} title={title || clip.title} variant="primary" size="md" />
        </div>
      )}
      {!made && (
        <p className="mt-2 text-sm text-pretty text-muted-foreground">
          Make the clip in its project's Clips tab to download it with this post.
        </p>
      )}
    </section>
  );
}

export default function ContentEditor() {
  const { pieceId } = useParams();
  const navigate = useNavigate();
  // Opened from a reminder (/library/<id>?reminder=1): a banner offers Share and "Mark as posted".
  const [searchParams, setSearchParams] = useSearchParams();
  const fromReminder = searchParams.get("reminder") === "1";
  const { data: piece, isPending, error } = useContentPiece(pieceId);
  const update = useUpdatePiece();
  const remove = useDeletePiece();
  const rewrite = useRewritePiece();

  const [loadedId, setLoadedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState("Warm");
  const [beforeAi, setBeforeAi] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const postTextRef = useRef<HTMLTextAreaElement>(null);

  // Fill the form once per post, so background refreshes don't overwrite what's being typed.
  useEffect(() => {
    if (piece && piece.id !== loadedId) {
      setTitle(piece.title);
      setBody(piece.body);
      setTone(TONES.includes(piece.tone) ? piece.tone : "Warm");
      setBeforeAi(null);
      setLoadedId(piece.id);
    }
  }, [piece, loadedId]);

  if (isPending) return <EditorSkeleton />;

  if (error || !piece) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <h2 className="mb-2 text-xl font-semibold text-balance text-foreground">We couldn't find that post</h2>
        <p className="mb-6 text-sm text-pretty text-muted-foreground">{error?.message ?? "It may have been deleted."}</p>
        <Link to="/library" className={buttonStyles({ variant: "secondary" })}>
          Back to the library
        </Link>
      </div>
    );
  }

  const info = platformInfo(piece.platform);
  const dirty = title !== piece.title || body !== piece.body;
  const overLimit = info.limit !== undefined && body.length > info.limit;
  const approved = piece.status === "approved";
  const origin = postOrigin(piece);
  // Approve and favourite share the save mutation with the text; show its error by whichever button was used.
  const lastChange = update.variables ?? {};
  const sideError = update.isError && ("status" in lastChange || "is_favorite" in lastChange) ? update.error.message : "";
  const saveError = update.isError && !sideError ? update.error.message : "";

  const runAi = (action: RewriteAction) =>
    rewrite.mutate(
      { id: piece.id, action, tone, body },
      {
        onSuccess: (result) => {
          setBeforeAi(body);
          setBody(result.body);
        },
      },
    );

  // A suggestion from the side panel, kept undoable like an AI rewrite.
  const applySuggestion = (next: string) => {
    setBeforeAi(body);
    setBody(next);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(body);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const deletePiece = () =>
    remove.mutate(piece.id, { onSuccess: () => navigate(`/projects/${piece.project}?tab=posts`, { replace: true }) });

  let saveNote = <span className="text-muted-foreground">All changes saved</span>;
  if (dirty && !body.trim()) saveNote = <span className="text-red-600">Add some text before saving</span>;
  else if (dirty) saveNote = <span className="text-amber-700">Unsaved changes</span>;

  return (
    <div className="space-y-6">
      <div>
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <li className="shrink-0">
              <Link to="/library" className={crumbLink}>
                Content Library
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-4 shrink-0" />
            </li>
            <li className="min-w-0 truncate">
              {origin.to ? (
                <Link to={origin.to} className={crumbLink}>
                  {origin.label}
                </Link>
              ) : (
                origin.label
              )}
            </li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="flex items-center gap-2.5 text-xl font-semibold text-balance text-foreground">
            <PlatformBadge platform={piece.platform} withLabel={false} />
            {info.label} post
          </h2>
          {approved && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Approved</span>
          )}
        </div>
      </div>

      {fromReminder && (
        <ReminderBanner
          piece={piece}
          text={body}
          onClose={() =>
            setSearchParams(
              (current) => {
                const next = new URLSearchParams(current);
                next.delete("reminder");
                return next;
              },
              { replace: true },
            )
          }
        />
      )}

      <AiWriterNotice />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 rounded-xl border border-border bg-white p-5 lg:col-span-2">
          <div>
            <label htmlFor="post-label" className="mb-1.5 block text-sm font-medium text-foreground">
              Label
            </label>
            <input
              id="post-label"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Short label for this post"
              className="h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
            />
          </div>

          <div>
            <label htmlFor="post-text" className="mb-1.5 block text-sm font-medium text-foreground">
              Post text
            </label>
            <div className="overflow-hidden rounded-lg border border-border">
              <div
                role="group"
                aria-label="Rewrite with AI"
                className="flex flex-wrap items-center gap-2 border-b border-border bg-background p-2"
              >
                <span aria-hidden="true" className="px-1 text-xs font-medium text-muted-foreground">
                  Rewrite
                </span>
                <button type="button" onClick={() => runAi("shorter")} disabled={rewrite.isPending} className={toolButton}>
                  <Minimize2 aria-hidden="true" className="size-4" />
                  Shorter
                </button>
                <button type="button" onClick={() => runAi("longer")} disabled={rewrite.isPending} className={toolButton}>
                  <Maximize2 aria-hidden="true" className="size-4" />
                  Longer
                </button>
                <button type="button" onClick={() => runAi("rephrase")} disabled={rewrite.isPending} className={toolButton}>
                  <RefreshCw aria-hidden="true" className="size-4" />
                  Rephrase
                </button>
                <span className="inline-flex h-9 items-center overflow-hidden rounded-lg border border-border bg-white">
                  <label htmlFor="rewrite-tone" className="sr-only">
                    Tone
                  </label>
                  <select
                    id="rewrite-tone"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="h-full bg-white pr-1 pl-2.5 text-sm text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                  >
                    {TONES.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => runAi("tone")}
                    disabled={rewrite.isPending}
                    className="h-full border-l border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                  >
                    Change tone
                  </button>
                </span>
                {beforeAi !== null && !rewrite.isPending && (
                  <button
                    type="button"
                    onClick={() => {
                      setBody(beforeAi);
                      setBeforeAi(null);
                    }}
                    className={buttonStyles({ variant: "ghost", size: "sm", className: "h-9" })}
                  >
                    <Undo2 aria-hidden="true" className="size-4" />
                    Undo
                  </button>
                )}
                {rewrite.isPending && (
                  <span role="status" className="inline-flex items-center gap-2 px-1 text-sm text-muted-foreground">
                    <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                    Rewriting…
                  </span>
                )}
              </div>
              <textarea
                id="post-text"
                ref={postTextRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={16}
                aria-describedby="post-text-count"
                aria-invalid={overLimit || undefined}
                className="block w-full resize-y bg-white px-3.5 py-3 text-sm leading-relaxed text-gray-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
              />
            </div>
            {rewrite.isError && (
              <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
                {rewrite.error.message}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <p id="post-text-count" className={cn("text-sm tabular-nums", overLimit ? "font-medium text-red-600" : "text-muted-foreground")}>
              {body.length.toLocaleString()}
              {info.limit ? ` / ${info.limit.toLocaleString()}` : ""} characters
              {overLimit && `, over ${info.label}'s limit`}
            </p>
            <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
              <p role="status" className="text-sm">
                {saveNote}
              </p>
              <button type="button" onClick={copy} className={buttonStyles({ variant: "secondary" })}>
                {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
              <button
                type="button"
                onClick={() =>
                  update.mutate(
                    { id: piece.id, title, body },
                    // Back to the library once it's saved; it shows a note naming the post.
                    { onSuccess: () => navigate("/library", { state: { saved: { id: piece.id, label: title.trim() || `${info.label} post` } } }) },
                  )
                }
                disabled={!dirty || update.isPending || !body.trim()}
                className={buttonStyles()}
              >
                {update.isPending && "body" in lastChange ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
          {saveError && (
            <p role="alert" className="text-sm text-pretty text-red-600">
              {saveError}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {piece.clip && <PostClip clip={piece.clip} project={piece.project} text={body} title={piece.title} />}
          {piece.photos.length > 0 && (
            <section aria-labelledby="post-photos" className="rounded-xl border border-border bg-white p-5">
              <h3 id="post-photos" className="mb-3 text-sm font-semibold text-foreground">
                Photos
              </h3>
              <PostPhotos photos={piece.photos} project={piece.project} />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ShareButton
                  // New photos or a new order: fetch the files again.
                  key={piece.photos.map((photo) => photo.id).join()}
                  loadFiles={() => photoFiles(piece.project)}
                  text={body}
                  title={piece.title || piece.project_name}
                  variant="primary"
                  size="md"
                />
              </div>
            </section>
          )}
          <PostSchedule piece={piece} />
          <SuggestionsPanel
            key={piece.id}
            pieceId={piece.id}
            platform={piece.platform}
            body={body}
            tone={tone}
            textareaRef={postTextRef}
            onChange={applySuggestion}
            disabled={rewrite.isPending}
          />

          <section aria-labelledby="post-preview" className="rounded-xl border border-border bg-white p-5">
            <h3 id="post-preview" className="mb-3 text-sm font-semibold text-foreground">
              Preview
            </h3>
            <div className="rounded-lg border border-border p-4">
              <div className="mb-3 flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                  style={{ background: info.color }}
                >
                  {info.badge}
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-medium text-foreground">Your {info.label} page</p>
                  <p className="text-xs text-muted-foreground">Just now</p>
                </div>
              </div>
              <p className="max-h-96 overflow-y-auto text-sm leading-relaxed whitespace-pre-wrap text-gray-700">{body}</p>
            </div>
          </section>

          <div className="space-y-3 rounded-xl border border-border bg-white p-5">
            <button
              type="button"
              onClick={() => update.mutate({ id: piece.id, status: approved ? "draft" : "approved" })}
              className={buttonStyles({
                variant: "secondary",
                className: cn(
                  "w-full",
                  approved && "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
                ),
              })}
            >
              <Check aria-hidden="true" className={cn("size-4", !approved && "text-emerald-600")} />
              {approved ? "Approved · mark as draft" : "Approve"}
            </button>
            <button
              type="button"
              onClick={() => update.mutate({ id: piece.id, is_favorite: !piece.is_favorite })}
              className={buttonStyles({ variant: "secondary", className: "w-full" })}
            >
              <Star
                aria-hidden="true"
                className={cn("size-4", piece.is_favorite && "fill-amber-400 text-amber-500")}
              />
              {piece.is_favorite ? "Favourite" : "Add to favourites"}
            </button>
            {sideError && (
              <p role="alert" className="text-sm text-pretty text-red-600">
                {sideError}
              </p>
            )}
            <dl className="space-y-1.5 pt-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Written</dt>
                <dd className="text-foreground tabular-nums">{formatDate(piece.created_at)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Tone</dt>
                <dd className="text-foreground">{piece.tone || "—"}</dd>
              </div>
            </dl>
            <div className="border-t border-border pt-3">
              <ConfirmDialog
                trigger={
                  <button
                    type="button"
                    disabled={remove.isPending}
                    className={buttonStyles({
                      variant: "ghost",
                      className: "w-full text-red-600 hover:bg-red-50 hover:text-red-700",
                    })}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                    {remove.isPending ? "Deleting…" : "Delete post"}
                  </button>
                }
                title="Delete this post?"
                description="This removes the post from your library and from its project. It can't be undone."
                confirmLabel="Delete post"
                onConfirm={deletePiece}
              />
              {remove.isError && (
                <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
                  {remove.error.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
