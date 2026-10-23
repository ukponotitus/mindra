import { useId, useState, type DragEvent, type FormEvent } from "react";
import { LoaderCircle, RectangleVertical, RotateCw, Trash2, Upload, Video } from "lucide-react";
import EmptyState from "../components/EmptyState";
import ShareButton from "../components/content/ShareButton";
import MediaPreview from "../components/project/MediaPreview";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { cn } from "../lib/cn";
import { formatDate, formatDuration, formatExtensions, formatFileSize, formatMegabytes } from "../lib/format";
import { useUploadOptions } from "../lib/projects";
import type { VerticalVideo } from "../lib/types";
import { formatTimeLeft } from "../lib/upload";
import {
  isMaking,
  useDeleteVertical,
  useMakeAgain,
  useMakeVertical,
  useVerticalVideos,
  VERTICAL_MODES,
  verticalFile,
  verticalStatusText,
  videoDuration,
  type VerticalUploadState,
} from "../lib/vertical";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

/** "sunday_service-march.mp4" → "sunday service march". */
function nameFromFile(filename: string) {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

/** A small drawing of the whole picture across the middle of the vertical frame. */
function WholePicture() {
  return (
    <span aria-hidden="true" className="relative grid h-14 w-8 shrink-0 place-items-center rounded-sm border-2 border-primary bg-primary/10">
      <span className="block h-3.5 w-full bg-primary/40" />
    </span>
  );
}

/** Choose a video and send it. It's made vertical with the whole picture kept: following the speaker cuts the sides
 * off, which is what short-form clips (a project's Clips tab) are for. */
function NewVerticalVideo() {
  const options = useUploadOptions().data;
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [problem, setProblem] = useState("");
  const [dragging, setDragging] = useState(false);
  const [upload, setUpload] = useState<VerticalUploadState | null>(null);
  const make = useMakeVertical(setUpload);
  const ids = useId();

  const extensions = options?.extensions.video ?? [];
  const maxMinutes = options?.vertical_max_minutes ?? 5;
  const busy = make.isPending;

  const choose = async (candidate: File | undefined) => {
    if (!candidate || busy) return;
    make.reset();
    const extension = `.${candidate.name.split(".").pop()?.toLowerCase() ?? ""}`;
    if (extensions.length > 0 && !extensions.includes(extension)) {
      setProblem(`This file type isn't supported here. Use ${formatExtensions(extensions)}.`);
      return;
    }
    if (options && candidate.size > options.max_upload_mb * 1024 * 1024) {
      setProblem(`This file is ${formatFileSize(candidate.size)}. Files can be up to ${formatMegabytes(options.max_upload_mb)}.`);
      return;
    }
    const seconds = await videoDuration(candidate);
    if (seconds !== null && seconds > maxMinutes * 60 + 1) {
      setProblem(
        `This video is ${formatDuration(seconds)} long. During the beta, videos can be up to ${maxMinutes} minutes. Trim it, then choose it again.`,
      );
      return;
    }
    setProblem("");
    setFile(candidate);
    setDuration(seconds);
    setName((current) => current || nameFromFile(candidate.name));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void choose(event.dataTransfer.files[0]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!file) {
      setProblem("Choose a video to make vertical.");
      return;
    }
    make.mutate(
      { file, name: name.trim(), mode: "fit" },
      {
        onSuccess: () => {
          setFile(null);
          setDuration(null);
          setName("");
          setUpload(null);
        },
        onError: () => setUpload(null),
      },
    );
  };

  const percent = Math.round((upload?.fraction ?? 0) * 100);
  let uploadText = percent < 100 ? `Uploading… ${percent}%` : "Upload complete, starting…";
  if (upload?.transfer && percent < 100) {
    uploadText += ` · ${formatFileSize(upload.transfer.loaded)} of ${formatFileSize(upload.transfer.total)}`;
    if (upload.transfer.secondsLeft != null) uploadText += ` · ${formatTimeLeft(upload.transfer.secondsLeft)}`;
  }
  const error =
    make.error instanceof ApiError
      ? (make.error.fieldErrors.source_file?.[0] ?? make.error.fieldErrors.source_key?.[0] ?? make.error.message)
      : make.error
        ? "The upload stopped. Check your connection and try again."
        : "";

  return (
    <form onSubmit={submit} noValidate aria-busy={busy} className="min-w-0 space-y-5 rounded-xl border border-border bg-white p-5">
      <div>
        {file ? (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <Video aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatFileSize(file.size)}
                  {duration !== null && ` · ${formatDuration(duration)}`}
                </p>
                {upload && (
                  <div className="mt-2">
                    <div
                      role="progressbar"
                      aria-label="Upload progress"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                      className="h-2 overflow-hidden rounded-full bg-secondary"
                    >
                      <div
                        className="h-full w-full origin-left bg-primary transition-transform duration-200 ease-out"
                        style={{ transform: `scaleX(${percent / 100})` }}
                      />
                    </div>
                    <p role="status" className="mt-1 text-xs font-medium text-pretty text-muted-foreground tabular-nums">
                      {upload.phase === "waiting" ? "Connection lost — waiting to continue…" : uploadText}
                    </p>
                  </div>
                )}
              </div>
              {!busy && (
                <button type="button" onClick={() => setFile(null)} className={buttonStyles({ variant: "ghost", size: "sm" })}>
                  Remove
                </button>
              )}
            </div>
            <MediaPreview file={file} kind="video" unplayable="Mindra can still make it vertical." />
          </div>
        ) : (
          <>
            <input
              id={`${ids}-file`}
              type="file"
              accept={extensions.join(",") || "video/*"}
              aria-describedby={`${ids}-hint`}
              aria-invalid={problem ? true : undefined}
              className="peer sr-only"
              onChange={(event) => {
                void choose(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <label
              htmlFor={`${ids}-file`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
                dragging ? "border-primary bg-primary/5" : problem ? "border-red-300" : "border-border hover:bg-background",
              )}
            >
              <span className="mb-4 grid size-12 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <Upload aria-hidden="true" className="size-5" />
              </span>
              <span className="mb-1 block font-medium text-balance text-foreground">Drop a landscape video here</span>
              <span className="mb-4 block text-sm text-muted-foreground">{extensions.length > 0 ? formatExtensions(extensions) : " "}</span>
              <span className={buttonStyles({ variant: "secondary" })}>Choose Video</span>
              <span id={`${ids}-hint`} className="mt-3 block text-xs text-pretty text-muted-foreground tabular-nums">
                Up to {maxMinutes} minutes during the beta
                {options ? `, and ${formatMegabytes(options.max_upload_mb)}` : ""}.
              </span>
            </label>
          </>
        )}
        {problem && (
          <p role="alert" className="mt-2 text-xs text-pretty text-red-600">
            {problem}
          </p>
        )}
      </div>

      <div>
        <label htmlFor={`${ids}-name`} className="mb-2 block text-sm font-medium text-foreground">
          Name
        </label>
        <input
          id={`${ids}-name`}
          type="text"
          value={name}
          maxLength={200}
          disabled={busy}
          placeholder="e.g. Conference talk highlight"
          onChange={(event) => setName(event.target.value)}
          className={inputClass}
        />
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-background p-3.5">
        <WholePicture />
        <p className="min-w-0 text-xs text-pretty text-muted-foreground">
          <span className="block text-sm font-medium text-foreground">The whole picture, nothing cut off</span>
          Your video sits across the middle of the vertical frame, on a blurred copy of itself. To fill the screen
          with the speaker instead, make a short-form clip from the video&apos;s Clips tab.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-pretty text-red-700">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={busy} className={buttonStyles({ size: "lg", className: "sm:w-auto" })}>
          {busy ? (upload && percent < 100 ? `Uploading… ${percent}%` : "Starting…") : "Make vertical"}
        </button>
        <p className="text-xs text-pretty text-muted-foreground">
          It&apos;s made in the background and takes a few times the video&apos;s length. You can leave this page.
        </p>
      </div>
    </form>
  );
}

function VerticalVideoCard({ video }: { video: VerticalVideo }) {
  const makeAgain = useMakeAgain();
  const remove = useDeleteVertical();
  const working = isMaking(video);
  const ready = video.status === "ready" && video.video_url;
  const failed = video.status === "failed";
  const modeLabel = VERTICAL_MODES.find((option) => option.id === (video.made_as || video.mode))?.label;
  const actionError = makeAgain.error ?? remove.error;

  return (
    <article className="flex min-w-0 gap-4 rounded-xl border border-border bg-white p-4">
      <div className="aspect-[9/16] w-28 shrink-0 overflow-hidden rounded-lg bg-secondary sm:w-32">
        {ready ? (
          <video
            src={video.video_url!}
            poster={video.thumbnail_url ?? undefined}
            controls
            playsInline
            preload="none"
            aria-label={`${video.name}, vertical`}
            className="size-full bg-black object-contain"
          />
        ) : (
          <div className="grid size-full place-items-center text-muted-foreground">
            {working ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin text-primary" /> : <RectangleVertical aria-hidden="true" className="size-5" />}
          </div>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="line-clamp-2 text-sm font-semibold text-balance break-words text-foreground">{video.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {formatDate(video.created_at)}
          {video.duration_seconds ? ` · ${formatDuration(video.duration_seconds)}` : ""}
          {ready && video.width && video.height ? ` · ${video.width}×${video.height}` : ""}
        </p>
        {modeLabel && <p className="mt-0.5 text-xs text-muted-foreground">{modeLabel}</p>}

        {working && (
          <div className="mt-3">
            <div
              role="progressbar"
              aria-label={`Making ${video.name} vertical`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={video.progress}
              className="h-1.5 overflow-hidden rounded-full bg-secondary"
            >
              <div
                className="h-full w-full origin-left bg-primary transition-transform duration-500 ease-out"
                style={{ transform: `scaleX(${Math.max(video.progress, 3) / 100})` }}
              />
            </div>
            <p role="status" className="mt-1.5 text-xs text-pretty text-muted-foreground tabular-nums">
              {verticalStatusText(video)}
            </p>
          </div>
        )}
        {failed && (
          <p role="alert" className="mt-3 text-xs text-pretty text-red-600">
            {verticalStatusText(video)}
          </p>
        )}
        {actionError && (
          <p role="alert" className="mt-2 text-xs text-pretty text-red-600">
            {actionError.message}
          </p>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
          {ready && (
            <ShareButton
              loadVideo={() => verticalFile(video.id)}
              downloadUrl={video.download_url}
              text=""
              title={video.name}
              variant="primary"
            />
          )}
          {failed && (
            <button
              type="button"
              disabled={makeAgain.isPending}
              onClick={() => makeAgain.mutate({ id: video.id })}
              className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}
            >
              <RotateCw aria-hidden="true" className="size-4" />
              Try again
            </button>
          )}
          {/* One made before the whole picture was the only way: it can be made again that way. */}
          {!working && video.mode === "follow" && (
            <button
              type="button"
              disabled={makeAgain.isPending}
              onClick={() => makeAgain.mutate({ id: video.id, mode: "fit" })}
              title="Make it again with the whole picture, nothing cut off"
              className={buttonStyles({ variant: "ghost", size: "sm", className: "h-auto min-h-9 whitespace-normal text-left" })}
            >
              Whole picture instead
            </button>
          )}
          {!working && (
            <ConfirmDialog
              trigger={
                <button
                  type="button"
                  aria-label={`Delete ${video.name}`}
                  title="Delete"
                  disabled={remove.isPending}
                  className={buttonStyles({ variant: "ghost", size: "icon", className: "size-9 hover:bg-red-50 hover:text-red-600" })}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              }
              title={`Delete "${video.name}"?`}
              description="The vertical video and the video it was made from are removed for good. This can't be undone."
              confirmLabel="Delete"
              onConfirm={() => remove.mutate(video.id)}
            />
          )}
        </div>
      </div>
    </article>
  );
}

/** Turn a landscape video into a vertical (9:16) one for Reels, TikTok, Shorts and WhatsApp Status. */
export default function VerticalVideos() {
  const videos = useVerticalVideos();
  const list = videos.data?.results ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Vertical Videos</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Turn a landscape video into a vertical one for Reels, TikTok, YouTube Shorts and WhatsApp Status.
        </p>
      </div>

      <div className="max-w-3xl">
        <NewVerticalVideo />
      </div>

      <section aria-labelledby="vertical-list" className="space-y-4">
        <h3 id="vertical-list" className="text-lg font-semibold text-foreground">
          Your vertical videos
        </h3>
        {videos.isPending ? (
          <div aria-busy="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <p role="status" className="sr-only">
              Loading vertical videos
            </p>
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex gap-4 rounded-xl border border-border bg-white p-4">
                <div className="aspect-[9/16] w-28 shrink-0 animate-pulse rounded-lg bg-secondary sm:w-32" />
                <div className="flex-1 space-y-2.5 pt-1">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-secondary" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : videos.isError ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
            {videos.error.message}
          </p>
        ) : list.length === 0 ? (
          <EmptyState
            icon={RectangleVertical}
            title="No vertical videos yet"
            description="Choose a landscape video above. The vertical version appears here, ready to share or download."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {list.map((video) => (
              <VerticalVideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
