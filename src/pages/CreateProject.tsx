import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AudioLines, FileText, Images, Megaphone, Upload, Video, type LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";
import MediaPreview from "../components/project/MediaPreview";
import { QueuedPhotoTile, RecordingSelect } from "../components/project/ProjectPhotos";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import SeePlans from "../components/SeePlans";
import { buttonStyles } from "../components/ui/button";
import { ApiError, apiRequest, uploadWithProgress, type FieldErrors } from "../lib/api";
import { cn } from "../lib/cn";
import { useMediaQuery } from "../lib/useMediaQuery";
import { formatExtensions, formatFileSize, formatMegabytes } from "../lib/format";
import { PHOTO_PLATFORMS, photoAccept, photoRules, useMoveFocus, usePhotoQueue } from "../lib/photos";
import { isPicturePost, PLATFORMS, uploadOptionsQuery, useUploadOptions } from "../lib/projects";
import { recordingAccept, recordingExtensions, recordingKind, uploadRecording, withExtension } from "../lib/recordings";
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
  { id: "photos", label: "Photos", icon: Images },
  { id: "flyer", label: "Flyer", icon: Megaphone },
];

const DEFAULT_PLATFORMS: Platform[] = ["instagram", "facebook", "whatsapp"];

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const invalidClass = "border-red-300 focus:border-red-600 focus:ring-red-600/20";
// min-w-0: a fieldset is otherwise as wide as its widest content, which pushes the page sideways on phones.
const cardClass = "min-w-0 rounded-xl border border-border bg-card p-5";

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
  // A phone or tablet: say "choose from your phone" rather than "drop".
  const touch = useMediaQuery("(pointer: coarse)");

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
  // Photos (and flyers, uploaded the same way): what they show, the recording they go with, the pictures, and the
  // project once it's made (the pictures are uploaded into it one at a time; trying failed ones again uses the same
  // project).
  const [note, setNote] = useState("");
  const [linked, setLinked] = useState("");
  // A photo post's audio (optional): uploaded as a recording of its own and connected to the post, so its captions use
  // what's said, and the server makes a video of the photos with it.
  const [audio, setAudio] = useState<File | null>(null);
  const [audioProject, setAudioProject] = useState<Project | null>(null);
  const [audioProgress, setAudioProgress] = useState<number | null>(null);
  const [created, setCreated] = useState<Project | null>(null);
  const uploadedOrder = useRef<string[]>([]);
  const photoQueue = usePhotoQueue({ onUploaded: (photo) => uploadedOrder.current.push(photo.id) });
  const focusAfterMove = useMoveFocus(photoQueue.items.map((item) => item.key).join());

  // Photo and flyer posts are both made of pictures; a flyer's are read for their text once they're uploaded.
  const isPhotos = isPicturePost(sourceType);
  const isFlyer = sourceType === "flyer";
  const pictures = isFlyer ? "flyers" : "photos";
  const isMedia = sourceType === "video" || sourceType === "audio";
  const extensions = isMedia && options ? options.extensions[sourceType] : [];
  const spokenLanguage = language ?? options?.default_language ?? "en";
  const rules = photoRules(options);
  const platformChoices = isPhotos ? PLATFORMS.filter((platform) => PHOTO_PLATFORMS.includes(platform.id)) : PLATFORMS;
  const locked = submitting || Boolean(created);

  // Leaving mid-upload stops it (a direct upload continues when the same file is chosen again), so ask first.
  useEffect(() => {
    if (!submitting || sourceType === "transcript") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [submitting, sourceType]);

  // Going to another page pauses a direct upload rather than throwing it away.
  useEffect(() => () => directUpload.current?.pause(), []);

  // Part of this file was sent before (a dropped connection or a closed tab), so the upload will continue.
  const canResume = useMemo(
    () => Boolean(file && isMedia && options?.direct_upload && hasSavedUpload(file, sourceType)),
    // submitting: check again after an attempt, which may have left part of the file stored.
    [file, isMedia, sourceType, options?.direct_upload, submitting],
  );

  const selectType = (type: SourceType) => {
    setSourceType(type);
    setFile(null);
    setFieldErrors({});
  };

  // Chosen again from the phone's Create menu while this page is open (?type= changes): switch to it.
  useEffect(() => {
    const type = sourceTypes.find((item) => item.id === requestedType)?.id;
    if (type && !submitting) selectType(type);
  }, [requestedType]);

  const chooseFile = (chosen: File | undefined) => {
    if (!chosen) return;
    const candidate = withExtension(chosen);
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
    if (isPhotos) addPhotos(Array.from(event.dataTransfer.files));
    else chooseFile(event.dataTransfer.files[0]);
  };

  const addPhotos = (files: File[]) => {
    if (files.length === 0 || locked) return;
    setFieldErrors(({ photos: _photos, ...rest }) => rest);
    photoQueue.add(files, rules.max, rules);
  };

  const movePhoto = (key: string, by: number) => {
    focusAfterMove(key, by);
    photoQueue.move(key, by);
  };

  /** Make the photo or flyer post (JSON); its pictures are uploaded into it next. */
  const createPhotosProject = (recording: string) =>
    apiRequest<Project>("/api/projects/", {
      method: "POST",
      body: {
        name: name.trim(),
        source_type: sourceType,
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(recording ? { linked_recording: recording } : {}),
        target_platforms: platforms.filter((platform) => PHOTO_PLATFORMS.includes(platform)),
      },
    });

  /** Upload a photo post's audio (or a video, for its sound) as a recording of its own, transcribed like any other. */
  const uploadAudio = async (media: File) => {
    setAudioProgress(0);
    try {
      const live = await queryClient.ensureQueryData(uploadOptionsQuery).catch(() => options);
      return await uploadRecording({
        file: media,
        kind: recordingKind(media, ["audio", "video"], live) ?? "audio",
        name: `${name.trim()} (audio)`.slice(0, 200),
        language: spokenLanguage,
        options: live,
        onProgress: setAudioProgress,
        onUpload: (upload) => {
          directUpload.current = upload;
        },
      });
    } finally {
      setAudioProgress(null);
    }
  };

  const chooseAudio = (chosen: File | undefined) => {
    if (!chosen) return;
    const candidate = withExtension(chosen);
    if (!recordingKind(candidate, ["audio", "video"], options)) {
      const types = [...recordingExtensions("audio", options), ...recordingExtensions("video", options)];
      setFieldErrors((current) => ({ ...current, audio: [`This file type isn't supported here. Use ${formatExtensions(types)}.`] }));
      return;
    }
    setFieldErrors(({ audio: _audio, ...rest }) => rest);
    setAudio(candidate);
  };

  /** Ask for the photo post's video with its audio; the post's page follows it (and offers it again if this fails). */
  const askForVideo = async (projectId: string) => {
    try {
      await apiRequest(`/api/projects/${projectId}/video/`, { method: "POST" });
    } catch {
      // The post's page has "Make the video".
    }
  };

  /** A failed photo that was tried again lands at the end on the server: put them back in the order chosen here. */
  const keepChosenOrder = async (projectId: string) => {
    const chosen = photoQueue.current().flatMap((item) => (item.photo ? [item.photo.id] : []));
    if (chosen.join() === uploadedOrder.current.join()) return;
    try {
      await apiRequest(`/api/projects/${projectId}/photos/order/`, { method: "POST", body: { ids: chosen } });
    } catch {
      // The pictures are all there; the order can still be changed on the project's Photos or Flyer tab.
    }
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
  const uploadDirectly = async (media: File, type: Exclude<SourceType, "transcript" | "photos" | "flyer">) => {
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
    if (sourceType === "transcript" && !transcript.trim()) problems.source_text = ["Paste a transcript to process."];
    if (isPhotos && photoQueue.items.length === 0) problems.photos = [isFlyer ? "Choose the flyer." : "Choose at least one photo."];
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) return;

    setSubmitting(true);
    try {
      let project: Project;
      if (isPhotos) {
        let recording = linked;
        if (audio && !isFlyer && !created) {
          const uploaded = audioProject ?? (await uploadAudio(audio));
          setAudioProject(uploaded);
          recording = uploaded.id;
        }
        project = created ?? (await createPhotosProject(recording));
        const retrying = Boolean(created);
        setCreated(project);
        // One at a time, in order; a dropped connection waits for the connection to come back.
        const failed = await (retrying ? photoQueue.retry(project.id) : photoQueue.upload(project.id));
        queryClient.invalidateQueries({ queryKey: ["projects"] });
        if (failed > 0) {
          setSubmitting(false);
          return;
        }
        await keepChosenOrder(project.id);
        if (audioProject || (audio && !isFlyer)) await askForVideo(project.id);
      } else if (isMedia && file) {
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
      // A pasted transcript is ready in a moment, so go straight to it instead of the progress screen; photos need no
      // processing at all, and a flyer shows that it's being read on its own page.
      navigate(
        isPhotos
          ? `/projects/${project.id}`
          : isMedia
            ? `/projects/${project.id}/processing`
            : `/projects/${project.id}?tab=transcript`,
      );
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
      if (!["name", "source_file", "source_text", "language", "note", "linked_recording"].some((field) => errors[field])) {
        setError(apiError.message);
      }
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

  const photoCount = photoQueue.items.length;
  const failedPhotos = photoQueue.items.filter((item) => item.status === "failed").length;
  const uploadingPhoto = photoQueue.items.findIndex((item) => item.status === "uploading");
  let photoProgress = "";
  if (isPhotos && submitting) {
    const picture = isFlyer ? "flyer" : "photo";
    photoProgress = created
      ? uploadingPhoto >= 0
        ? photoCount === 1
          ? `Uploading the ${picture}…`
          : `Uploading ${picture} ${uploadingPhoto + 1} of ${photoCount}…`
        : `Getting the ${photoCount === 1 ? picture : pictures} ready…`
      : "Creating the project…";
  }
  let submitLabel = "Start Processing";
  if (isPhotos) {
    const picture = isFlyer ? "flyer" : "photo";
    if (photoProgress) submitLabel = photoProgress;
    else if (created && failedPhotos > 0) submitLabel = `Try ${failedPhotos === 1 ? `the ${picture}` : `${failedPhotos} ${pictures}`} again`;
    else if (created) submitLabel = "Open the project";
    else if (isFlyer) submitLabel = photoCount > 1 ? `Upload ${photoCount} flyers` : "Upload the flyer";
    else submitLabel = photoCount > 0 ? `Upload ${photoCount} photo${photoCount === 1 ? "" : "s"}` : "Upload photos";
  } else if (uploading) {
    submitLabel = percent < 100 ? `Uploading… ${percent}%` : "Starting…";
  } else if (submitting) {
    submitLabel = "Starting…";
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-balance text-foreground">Create New Project</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          {isFlyer
            ? "Add your flyer. Mindra reads everything on it, then writes an announcement for each platform."
            : isPhotos
              ? "Add the photos you want to post. Mindra writes a caption for each platform from the pictures."
              : "Upload a recording or paste a transcript. Mindra transcribes it and finds the parts worth sharing."}
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
              disabled={locked}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={fieldErrors.name ? true : undefined}
              aria-describedby={fieldErrors.name ? "project-name-error" : undefined}
              className={cn(inputClass, fieldErrors.name && invalidClass)}
            />
            <FieldError id="project-name-error" message={fieldErrors.name?.[0]} />
          </div>

          <fieldset className={cardClass}>
            <legend className="float-left mb-3 w-full text-sm font-medium text-foreground">Source</legend>
            <div className="clear-left mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {sourceTypes.map((type) => {
                const selected = sourceType === type.id;
                return (
                  <button
                    key={type.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={locked}
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
                    accept={sourceType === "video" || sourceType === "audio" ? recordingAccept([sourceType], options) : undefined}
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
                      {touch ? `Choose ${sourceType === "video" ? "a video" : "a recording"} from your phone` : `Drop your ${sourceType} file here`}
                    </span>
                    <span className="mb-4 block text-sm text-muted-foreground">
                      {extensions.length > 0 ? formatExtensions(extensions) : " "}
                    </span>
                    <span className={buttonStyles({ variant: touch ? "primary" : "secondary", className: "min-h-11" })}>
                      {touch ? (sourceType === "video" ? "Choose video" : "Choose audio") : "Browse Files"}
                    </span>
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
                  Picking the language gives a more accurate transcript than detecting it. Yoruba, Hausa, Igbo, Swahili and
                  Nigerian Pidgin can't be transcribed yet: paste a transcript instead. Posts can still be written in them.
                </p>
                <FieldError id="spoken-language-error" message={fieldErrors.language?.[0]} />
              </div>
            )}

            {isPhotos && (
              <div className="space-y-5">
                <div>
                  {/* As for a recording: the real file input stays focusable, and the label is the drop zone. */}
                  <input
                    id="photo-files"
                    type="file"
                    multiple
                    accept={photoAccept(rules)}
                    disabled={locked || photoCount >= rules.max}
                    aria-invalid={fieldErrors.photos ? true : undefined}
                    aria-describedby={fieldErrors.photos ? "photo-files-hint photo-files-error" : "photo-files-hint"}
                    className="peer sr-only"
                    onChange={(e) => {
                      addPhotos(Array.from(e.target.files ?? []));
                      e.target.value = "";
                    }}
                  />
                  <label
                    htmlFor="photo-files"
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (!locked) setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={cn(
                      "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 text-center transition-colors",
                      "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-60",
                      photoCount > 0 ? "py-6" : "py-10 sm:py-12",
                      dragging
                        ? "border-primary bg-primary/5"
                        : fieldErrors.photos
                          ? "border-red-300"
                          : "border-border hover:bg-background",
                    )}
                  >
                    {photoCount === 0 && (
                      <span className="mb-4 grid size-12 place-items-center rounded-lg bg-secondary text-muted-foreground">
                        {isFlyer ? <Megaphone aria-hidden="true" className="size-5" /> : <Images aria-hidden="true" className="size-5" />}
                      </span>
                    )}
                    <span className="mb-1 block font-medium text-balance text-foreground">
                      {isFlyer
                        ? photoCount > 0
                          ? "Add another flyer"
                          : touch
                            ? "Choose your flyer from your phone"
                            : "Drop your flyer here"
                        : photoCount > 0
                          ? "Add more photos"
                          : touch
                            ? "Choose photos from your gallery"
                            : "Drop your photos here"}
                    </span>
                    <span className="mb-4 block text-sm text-muted-foreground">{formatExtensions(rules.types)}</span>
                    <span className={buttonStyles({ variant: touch && photoCount === 0 ? "primary" : "secondary", className: "min-h-11" })}>
                      {isFlyer ? "Choose Flyer" : "Choose Photos"}
                    </span>
                    <span id="photo-files-hint" className="mt-3 block text-xs text-pretty text-muted-foreground tabular-nums">
                      {isFlyer
                        ? "The flyer as a picture (JPEG, PNG or a phone photo of it), or a few for a series of programs. "
                        : `Up to ${rules.max} photos, from your phone or computer. `}
                      Each is made smaller on this device before it&apos;s sent.
                    </span>
                  </label>
                  <FieldError id="photo-files-error" message={fieldErrors.photos?.[0]} />
                  {photoQueue.problem && (
                    <p role="alert" className="mt-2 text-xs text-pretty text-red-600">
                      {photoQueue.problem}
                    </p>
                  )}
                </div>

                {photoCount > 0 && (
                  <div>
                    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-medium text-foreground tabular-nums">
                        {photoCount} of {rules.max} {pictures}
                      </p>
                      <p className="text-xs text-muted-foreground">In the order they&apos;ll be posted</p>
                    </div>
                    <ol aria-label={`Chosen ${pictures}`} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {photoQueue.items.map((item, index) => (
                        <li key={item.key} className="min-w-0">
                          <QueuedPhotoTile
                            item={item}
                            index={index}
                            count={photoCount}
                            noun={isFlyer ? "flyer" : "photo"}
                            waitingToUpload={submitting}
                            onMove={locked ? undefined : (by) => movePhoto(item.key, by)}
                            onRemove={
                              !submitting && (!created || item.status === "failed")
                                ? () => photoQueue.remove(item.key)
                                : undefined
                            }
                          />
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                <div>
                  <label htmlFor="photo-note" className="mb-2 block text-sm font-medium text-foreground">
                    {isFlyer ? "Anything to add?" : "What's this post about?"}
                  </label>
                  <input
                    id="photo-note"
                    type="text"
                    placeholder={isFlyer ? "Free buses from the city centre" : "New month greeting: book a styling session"}
                    value={note}
                    maxLength={500}
                    disabled={locked}
                    onChange={(e) => setNote(e.target.value)}
                    aria-invalid={fieldErrors.note ? true : undefined}
                    aria-describedby={fieldErrors.note ? "photo-note-hint photo-note-error" : "photo-note-hint"}
                    className={cn(inputClass, fieldErrors.note && invalidClass)}
                  />
                  <p id="photo-note-hint" className="mt-2 text-xs text-pretty text-muted-foreground">
                    {isFlyer
                      ? "Optional, one line. Nothing to type from the flyer itself: Mindra reads that. Add only what the flyer doesn't say."
                      : "Optional, one line: the occasion, and what you'd like people to do. The captions are written around it, not as a description of the photos."}
                  </p>
                  <FieldError id="photo-note-error" message={fieldErrors.note?.[0]} />
                </div>

                {!isFlyer && (
                  <div>
                    <label htmlFor="photo-audio" className="mb-2 block text-sm font-medium text-foreground">
                      Add audio <span className="font-normal text-muted-foreground">(optional)</span>
                    </label>
                    {audio ? (
                      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm sm:max-w-md">
                        <AudioLines aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate text-foreground">{audio.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {audioProgress != null ? `Uploading ${Math.round(audioProgress * 100)}%` : formatFileSize(audio.size)}
                        </span>
                        {!locked && (
                          <button type="button" onClick={() => setAudio(null)} className="text-xs font-medium text-primary hover:underline">
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      <input
                        id="photo-audio"
                        type="file"
                        accept={recordingAccept(["audio", "video"], options)}
                        disabled={locked}
                        onChange={(event) => {
                          chooseAudio(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                        aria-invalid={fieldErrors.audio ? true : undefined}
                        aria-describedby={fieldErrors.audio ? "photo-audio-hint photo-audio-error" : "photo-audio-hint"}
                        className="block w-full text-sm text-muted-foreground file:mr-3 file:min-h-11 file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary sm:max-w-md"
                      />
                    )}
                    <p id="photo-audio-hint" className="mt-2 text-xs text-pretty text-muted-foreground">
                      A song, a voice note, part of a talk, or a video from your phone for its sound. Mindra makes a vertical video of the photos
                      with it, and the captions use what&apos;s said. Leave it out to post the photos on their own.
                    </p>
                    <FieldError id="photo-audio-error" message={fieldErrors.audio?.[0]} />
                  </div>
                )}

                {!audio && (
                <div>
                  <label htmlFor="linked-recording" className="mb-2 block text-sm font-medium text-foreground">
                    Connect to a recording
                  </label>
                  <div className="sm:max-w-md">
                    <RecordingSelect
                      id="linked-recording"
                      value={linked}
                      onChange={setLinked}
                      disabled={locked}
                      describedBy={fieldErrors.linked_recording ? "linked-recording-hint linked-recording-error" : "linked-recording-hint"}
                    />
                  </div>
                  <p id="linked-recording-hint" className="mt-2 text-xs text-pretty text-muted-foreground">
                    {isFlyer
                      ? "Optional. Connect a recording the program follows on from, and the posts can use its message."
                      : "Optional. Connect the recording these photos are from, and the captions can use its message."}
                  </p>
                  <FieldError id="linked-recording-error" message={fieldErrors.linked_recording?.[0]} />
                </div>
                )}
              </div>
            )}

            {sourceType === "transcript" && (
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
              {isFlyer
                ? "These are picked for you when you write posts for this flyer."
                : isPhotos
                  ? "These are picked for you when you write captions for these photos."
                  : "These are picked for you when you write posts from this recording."}
            </p>
            <div className="flex flex-wrap gap-2">
              {platformChoices.map((platform) => {
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
                      disabled={locked}
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
              {error} <SeePlans text={error} />
            </p>
          )}

          {isPhotos && created && failedPhotos > 0 && !submitting && (
            <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-pretty text-red-700">
              <p>
                {failedPhotos} of {photoCount} {pictures} couldn&apos;t be uploaded. The project is made: try them again, or open it
                and add {pictures} there later.
              </p>
              {/* Which ones, and why, here rather than only on each card higher up. */}
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {photoQueue.items
                  .filter((item) => item.status === "failed")
                  .map((item) => (
                    <li key={item.key}>
                      <span className="font-medium break-all">{item.name}</span>: {item.note || "The upload failed."}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <p role="status" className="sr-only">
            {photoProgress}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="submit" disabled={submitting} className={buttonStyles({ size: "lg", className: "w-full sm:flex-1" })}>
              {submitLabel}
            </button>
            {isPhotos && created && failedPhotos > 0 && !submitting && (
              <button
                type="button"
                onClick={() => navigate(`/projects/${created.id}`)}
                className={buttonStyles({ variant: "secondary", size: "lg" })}
              >
                Open the project
              </button>
            )}
          </div>
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
                ["Photos and flyers", formatExtensions(rules.types)],
                ...(isPhotos
                  ? [
                      [isFlyer ? "Max flyer size" : "Max photo size", formatMegabytes(rules.maxMb)],
                      [isFlyer ? "Flyers per project" : "Photos per project", String(rules.max)],
                    ]
                  : [
                      ["Max file size", options ? formatMegabytes(options.max_upload_mb) : "…"],
                      ["Files per project", "1"],
                    ]),
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
              {isFlyer
                ? "The flyer is made smaller on this device (2,048 pixels on the long side, which keeps its writing sharp) and uploaded. Then Mindra reads everything on it, usually within a minute. The project opens with that text, ready for you to check and write posts from."
                : isPhotos
                  ? "Each photo is made smaller on this device (2,048 pixels on the long side, without its location or camera details), then uploaded one at a time. If the connection drops, the upload waits and continues. Then the project opens, ready for you to write captions from the pictures."
                  : isMedia
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
