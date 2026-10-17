import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AudioLines, FileText, Upload, Video, type LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import MediaPreview from "../components/project/MediaPreview";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError, apiRequest, uploadWithProgress, type FieldErrors } from "../lib/api";
import { cn } from "../lib/cn";
import { formatExtensions, formatFileSize, formatMegabytes } from "../lib/format";
import { PLATFORMS, uploadOptionsQuery, useUploadOptions } from "../lib/projects";
import type { Platform, Project, SourceType } from "../lib/types";
import {
  DirectUpload,
  forgetSavedUpload,
  formatTimeLeft,
  hasSavedUpload,
  isUploadStopped,
  type UploadPhase,
  type UploadProgress,
} from "../lib/upload";

const sourceTypes: { id: SourceType; label: string; icon: LucideIcon }[] = [
  { id: "video", label: "Video File", icon: Video },
  { id: "audio", label: "Audio File", icon: AudioLines },
  { id: "transcript", label: "Paste Transcript", icon: FileText },
];

const DEFAULT_PLATFORMS: Platform[] = ["instagram", "facebook", "whatsapp"];

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const invalidClass = "border-red-300 focus:border-red-600 focus:ring-red-600/20";
// min-w-0: a fieldset is otherwise as wide as its widest content, which pushes the page sideways on phones.
const cardClass = "min-w-0 rounded-xl border border-border bg-white p-5";

/** "sunday_service-march.mp4" → "sunday service march". */
function nameFromFile(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? (
    <p id={id} className="mt-2 text-xs text-red-600">
      {message}
    </p>
  ) : null;
}

export default function CreateProject() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const requestedType = searchParams.get("type");
  const options = useUploadOptions().data;

  const [sourceType, setSourceType] = useState<SourceType>(
    sourceTypes.find((type) => type.id === requestedType)?.id ?? "video",
  );
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [transcript, setTranscript] = useState("");
  const [platforms, setPlatforms] = useState<Platform[]>(DEFAULT_PLATFORMS);
  // null until someone picks one: the server's default (English) is used.
  const [language, setLanguage] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  // Direct uploads to storage (when the server offers them): bytes and time left, the connection, a resume.
  const [transfer, setTransfer] = useState<UploadProgress | null>(null);
  const [uploadPhase, setUploadPhase] = useState<UploadPhase | null>(null);
  const [resumedBytes, setResumedBytes] = useState(0);
  const directUpload = useRef<DirectUpload | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const isMedia = sourceType !== "transcript";
  const extensions = sourceType !== "transcript" && options ? options.extensions[sourceType] : [];
  const spokenLanguage = language ?? options?.default_language ?? "en";

  // Leaving mid-upload stops it (a direct upload continues when the same file is chosen again), so ask first.
  useEffect(() => {
    if (!submitting || !isMedia) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [submitting, isMedia]);

  // Going to another page pauses a direct upload rather than throwing it away.
  useEffect(() => () => directUpload.current?.pause(), []);

  // Part of this file was sent before (a dropped connection or a closed tab), so the upload will continue.
  const canResume = useMemo(
    () => Boolean(file && sourceType !== "transcript" && options?.direct_upload && hasSavedUpload(file, sourceType)),
    // submitting: check again after an attempt, which may have left part of the file stored.
    [file, sourceType, options?.direct_upload, submitting],
  );

  const selectType = (type: SourceType) => {
    setSourceType(type);
    setFile(null);
    setFieldErrors({});
  };

  const chooseFile = (candidate: File | undefined) => {
    if (!candidate) return;
    const extension = `.${candidate.name.split(".").pop()?.toLowerCase() ?? ""}`;
    let problem = "";
    if (extensions.length > 0 && !extensions.includes(extension)) {
      problem = `This file type isn't supported here. Use ${formatExtensions(extensions)}.`;
    } else if (options && candidate.size > options.max_upload_mb * 1024 * 1024) {
      problem = `This file is ${formatFileSize(candidate.size)}. Files can be up to ${formatMegabytes(options.max_upload_mb)}.`;
    }
    setFieldErrors(problem ? { source_file: [problem] } : {});
    if (problem) return;
    setFile(candidate);
    if (!name.trim()) setName(nameFromFile(candidate.name));
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files[0]);
  };

  const togglePlatform = (platform: Platform) =>
    setPlatforms((current) =>
      current.includes(platform) ? current.filter((p) => p !== platform) : [...current, platform],
    );

  const resetUpload = () => {
    setUploadProgress(null);
    setTransfer(null);
    setUploadPhase(null);
    setResumedBytes(0);
  };

  /** Send the file straight to storage in parts, then create the project from it. */
  const uploadDirectly = async (media: File, type: Exclude<SourceType, "transcript">) => {
    const upload = new DirectUpload(media, {
      sourceType: type,
      onProgress: (progress) => {
        setTransfer(progress);
        setUploadProgress(progress.loaded / progress.total);
      },
      onPhase: setUploadPhase,
      onResume: setResumedBytes,
    });
    directUpload.current = upload;
    let key: string;
    try {
      ({ key } = await upload.start());
    } finally {
      directUpload.current = null;
    }
    try {
      const created = await apiRequest<Project>("/api/projects/", {
        method: "POST",
        body: {
          name: name.trim(),
          source_type: type,
          source_key: key,
          language: spokenLanguage,
          target_platforms: platforms,
        },
      });
      forgetSavedUpload(media, type);
      return created;
    } catch (caught) {
      // The stored file can't be used (gone, or another account's), so the next try uploads it again.
      if (caught instanceof ApiError && caught.fieldErrors.source_key) forgetSavedUpload(media, type);
      throw caught;
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const problems: FieldErrors = {};
    if (!name.trim()) problems.name = ["Give this project a name."];
    if (isMedia && !file) problems.source_file = ["Choose a file to upload."];
    if (!isMedia && !transcript.trim()) problems.source_text = ["Paste a transcript to process."];
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSubmitting(true);
    try {
      let project: Project;
      if (isMedia && file) {
        setUploadProgress(0);
        // The options shown first are placeholders; ask the server whether it takes direct uploads.
        const live = await queryClient.ensureQueryData(uploadOptionsQuery).catch(() => options);
        if (live?.direct_upload) {
          project = await uploadDirectly(file, sourceType);
        } else {
          const form = new FormData();
          form.append("name", name.trim());
          form.append("source_type", sourceType);
          form.append("source_file", file);
          form.append("language", spokenLanguage);
          platforms.forEach((platform) => form.append("target_platforms", platform));
          project = await uploadWithProgress<Project>("/api/projects/", form, setUploadProgress);
        }
      } else {
        project = await apiRequest<Project>("/api/projects/", {
          method: "POST",
          body: {
            name: name.trim(),
            source_type: "transcript",
            source_text: transcript,
            target_platforms: platforms,
          },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      // A pasted transcript is ready in a moment, so go straight to it instead of the progress screen.
      navigate(isMedia ? `/projects/${project.id}/processing` : `/projects/${project.id}?tab=transcript`);
    } catch (caught) {
      if (isUploadStopped(caught)) {
        // Stopped on purpose, or the page is going away: nothing to report.
        resetUpload();
        setSubmitting(false);
        return;
      }
      const apiError = caught instanceof ApiError ? caught : new ApiError(0, "Something went wrong.");
      const errors = { ...apiError.fieldErrors };
      // Direct uploads report file problems under these names; show them by the file.
      const fileProblem = errors.source_key ?? errors.filename ?? errors.size;
      if (fileProblem) errors.source_file = fileProblem;
      setFieldErrors(errors);
      if (!["name", "source_file", "source_text", "language"].some((field) => errors[field])) setError(apiError.message);
      resetUpload();
      setSubmitting(false);
    }
  };

  const uploading = uploadProgress !== null;
  const percent = Math.round((uploadProgress ?? 0) * 100);
  const waiting = uploadPhase === "waiting";
  let progressText = "Upload complete, starting processing…";
  if (percent < 100) {
    progressText = `Uploading… ${percent}%`;
    if (transfer && transfer.loaded > 0) progressText += ` · ${formatFileSize(transfer.loaded)} of ${formatFileSize(transfer.total)}`;
    if (transfer?.secondsLeft != null && !waiting) progressText += ` · ${formatTimeLeft(transfer.secondsLeft)}`;
  }
  let connectionText = "";
  if (waiting) connectionText = "Connection lost — waiting to continue…";
  else if (resumedBytes > 0 && percent < 100)
    connectionText = `Upload continues where it stopped: ${formatFileSize(resumedBytes)} was already sent.`;
  const SourceIcon = sourceType === "video" ? Video : AudioLines;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-balance text-foreground">Create New Project</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Upload a recording or paste a transcript. Mindra transcribes it and finds the parts worth sharing.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <form onSubmit={submit} noValidate aria-busy={submitting} className="min-w-0 space-y-5 lg:col-span-2">
          <div className={cardClass}>
            <label htmlFor="project-name" className="mb-2 block text-sm font-medium text-foreground">
              Project name
            </label>
            <input
              id="project-name"
              type="text"
              placeholder="e.g. Sunday Service, 12 October"
              value={name}
              maxLength={200}
              disabled={submitting}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? "project-name-error" : undefined}
              className={cn(inputClass, fieldErrors.name && invalidClass)}
            />
            <FieldError id="project-name-error" message={fieldErrors.name?.[0]} />
          </div>

          <fieldset className={cardClass}>
            <legend className="float-left mb-3 w-full text-sm font-medium text-foreground">Source</legend>
            <div className="clear-left mb-5 grid grid-cols-3 gap-2">
              {sourceTypes.map((type) => {
                const selected = sourceType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={submitting}
                    onClick={() => selectType(type.id)}
                    className={cn(
                      "flex min-h-16 flex-col items-center justify-center gap-1.5 rounded-lg border px-2 py-3 text-center text-xs font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60",
                      selected
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-background",
                    )}
                  >
                    <type.icon aria-hidden="true" className="size-5" />
                    {type.label}
                  </button>
                );
              })}
            </div>

            {isMedia &&
              (file ? (
                <div className="space-y-3 rounded-lg border border-border p-4">
                  <div className="flex items-center gap-4">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                      <SourceIcon aria-hidden="true" className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">{formatFileSize(file.size)}</p>
                      {canResume && !uploading && (
                        <p className="mt-1 text-xs text-pretty text-primary">
                          Part of this file was uploaded before. The upload continues where it stopped.
                        </p>
                      )}
                      {uploading && (
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
                          <p className="mt-1 text-xs font-medium text-pretty text-muted-foreground tabular-nums">
                            {progressText}
                          </p>
                          <p
                            role="status"
                            className={cn(
                              "text-xs text-pretty tabular-nums",
                              connectionText && "mt-1",
                              waiting ? "font-medium text-amber-700" : "text-primary",
                            )}
                          >
                            {connectionText}
                          </p>
                        </div>
                      )}
                    </div>
                    {!submitting && (
                      <button
                        type="button"
                        onClick={() => setFile(null)}
                        className={buttonStyles({
                          variant: "ghost",
                          size: "sm",
                        })}
                      >
                        Remove
                      </button>
                    )}
                    {submitting && uploadPhase && uploadPhase !== "finishing" && percent < 100 && (
                      <ConfirmDialog
                        trigger={
                          <button type="button" className={buttonStyles({ variant: "ghost", size: "sm" })}>
                            Stop upload
                          </button>
                        }
                        title="Stop this upload?"
                        description="What has been sent so far is thrown away. To pause instead, close this page: choosing the same file again later continues where it stopped."
                        confirmLabel="Stop and discard"
                        onConfirm={() => void directUpload.current?.cancel()}
                      />
                    )}
                  </div>
                  {/* Watch or listen before uploading, to check it's the right recording. */}
                  <MediaPreview file={file} kind={sourceType === "video" ? "video" : "audio"} />
                </div>
              ) : (
                <>
                  {/* The real file input stays focusable (visually hidden); the label is the drop zone and opens it on click. */}
                  <input
                    id="source-file"
                    type="file"
                    accept={extensions.join(",")}
                    disabled={submitting}
                    aria-invalid={fieldErrors.source_file ? true : undefined}
                    aria-describedby={fieldErrors.source_file ? "source-file-error" : undefined}
                    className="peer sr-only"
                    onChange={(e) => {
                      chooseFile(e.target.files?.[0]);
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor="source-file"
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-12",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
                      dragging
                        ? "border-primary bg-primary/5"
                        : fieldErrors.source_file
                          ? "border-red-300"
                          : "border-border hover:bg-background",
                    )}
                  >
                    <span className="mb-4 grid size-12 place-items-center rounded-lg bg-secondary text-muted-foreground">
                      <Upload aria-hidden="true" className="size-5" />
                    </span>
                    <span className="mb-1 block font-medium text-balance text-foreground">
                      Drop your {sourceType} file here
                    </span>
                    <span className="mb-4 block text-sm text-muted-foreground">
                      {extensions.length > 0 ? formatExtensions(extensions) : " "}
                    </span>
                    <span className={buttonStyles({ variant: "secondary" })}>Browse Files</span>
                    {options && (
                      <span className="mt-3 block text-xs text-muted-foreground tabular-nums">
                        Maximum file size: {formatMegabytes(options.max_upload_mb)}
                      </span>
                    )}
                  </label>
                </>
              ))}
            {isMedia && <FieldError id="source-file-error" message={fieldErrors.source_file?.[0]} />}

            {isMedia && (
              <div className="mt-5">
                <label htmlFor="spoken-language" className="mb-2 block text-sm font-medium text-foreground">
                  Spoken language
                </label>
                <select
                  id="spoken-language"
                  value={spokenLanguage}
                  disabled={submitting}
                  onChange={(e) => setLanguage(e.target.value)}
                  aria-invalid={fieldErrors.language ? true : undefined}
                  aria-describedby={fieldErrors.language ? "spoken-language-hint spoken-language-error" : "spoken-language-hint"}
                  className={cn(inputClass, "h-11 py-0 sm:max-w-xs", fieldErrors.language && invalidClass)}
                >
                  {(options?.languages ?? []).map((option) => (
                    <option key={option.code} value={option.code}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <p id="spoken-language-hint" className="mt-2 text-xs text-pretty text-muted-foreground">
                  Picking the language gives a more accurate transcript than detecting it.
                </p>
                <FieldError id="spoken-language-error" message={fieldErrors.language?.[0]} />
              </div>
            )}

            {!isMedia && (
              <div>
                <label htmlFor="transcript" className="mb-2 block text-sm font-medium text-foreground">
                  Transcript
                </label>
                <textarea
                  id="transcript"
                  value={transcript}
                  disabled={submitting}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste plain text, SRT or WebVTT captions. Lines that start with timestamps like [00:01:32] keep their times."
                  rows={10}
                  aria-invalid={fieldErrors.source_text ? true : undefined}
                  aria-describedby={fieldErrors.source_text ? "transcript-error" : undefined}
                  className={cn(inputClass, "resize-y", fieldErrors.source_text && invalidClass)}
                />
                <div className="flex justify-between gap-4">
                  <FieldError id="transcript-error" message={fieldErrors.source_text?.[0]} />
                  <p className="mt-2 ml-auto text-xs text-muted-foreground tabular-nums">
                    {transcript.length.toLocaleString()} characters
                  </p>
                </div>
              </div>
            )}
          </fieldset>

          <fieldset className={cardClass} aria-describedby="platforms-hint">
            <legend className="float-left mb-1 w-full text-sm font-medium text-foreground">Platforms</legend>
            <p id="platforms-hint" className="clear-left mb-3 text-xs text-pretty text-muted-foreground">
              These are picked for you when you write posts from this recording.
            </p>
            <div className="flex flex-wrap gap-2">
              {PLATFORMS.map((platform) => {
                const checked = platforms.includes(platform.id);
                return (
                  <label
                    key={platform.id}
                    className={cn(
                      "flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm transition-colors",
                      checked
                        ? "border-primary bg-primary/10 text-foreground"
                        : "border-border text-foreground hover:bg-background",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      disabled={submitting}
                      onChange={() => togglePlatform(platform.id)}
                    />
                    {platform.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={submitting} className={buttonStyles({ size: "lg", className: "w-full" })}>
            {uploading
              ? percent < 100
                ? `Uploading… ${percent}%`
                : "Starting…"
              : submitting
                ? "Starting…"
                : "Start Processing"}
          </button>
        </form>

        <aside className="space-y-4">
          <section aria-labelledby="supported-files" className={cardClass}>
            <h3 id="supported-files" className="mb-3 text-sm font-semibold text-foreground">
              Supported files
            </h3>
            <dl className="space-y-2 text-xs">
              {[
                ["Video", options ? formatExtensions(options.extensions.video) : "…"],
                ["Audio", options ? formatExtensions(options.extensions.audio) : "…"],
                ["Transcript", "Plain text, SRT, WebVTT"],
                ["Max file size", options ? formatMegabytes(options.max_upload_mb) : "…"],
                ["Files per project", "1"],
              ].map(([term, detail]) => (
                <div key={term} className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">{term}</dt>
                  <dd className="text-right font-medium text-foreground tabular-nums">{detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="what-next" className={cardClass}>
            <h3 id="what-next" className="mb-1 text-sm font-semibold text-foreground">
              What happens next
            </h3>
            <p className="text-xs text-pretty text-muted-foreground">
              {isMedia
                ? "Once the upload finishes, Mindra pulls out the audio and transcribes it, usually within a few minutes. You can leave the page while that happens."
                : "Mindra splits your transcript into timestamped segments, then finds the summary, quotes and hooks. It usually takes a moment."}
            </p>
            {isMedia && options?.direct_upload && (
              <p className="mt-2 text-xs text-pretty text-muted-foreground">
                If the connection drops during the upload, it waits and continues by itself. If you close the page,
                choose the same file again to continue where it stopped.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
