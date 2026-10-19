import { useEffect, useId, useState, type DragEvent, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Check, ImageOff, Images, Plus, RotateCw, Trash2, X } from "lucide-react";
import { Link } from "react-router";
import EmptyState from "../EmptyState";
import ConfirmDialog from "../ui/ConfirmDialog";
import { buttonStyles } from "../ui/button";
import { cn } from "../../lib/cn";
import { formatDate } from "../../lib/format";
import {
  photoAccept,
  photoRules,
  useDeletePhoto,
  usePhotoQueue,
  usePhotos,
  useMoveFocus,
  useRefreshAfterPhotos,
  useReorderPhotos,
  useStoreUploadedPhoto,
  type QueuedPhoto,
} from "../../lib/photos";
import { SOURCE_LABELS, useProjects, useUpdateProject, useUploadOptions } from "../../lib/projects";
import type { Project } from "../../lib/types";

const fieldClass =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
const iconButton = buttonStyles({ variant: "ghost", size: "icon", className: "size-10 sm:size-9" });

/** The workspace's finished recordings and transcripts, to connect photos to. "" means none. */
export function RecordingSelect({
  id,
  value,
  onChange,
  disabled,
  linkedName,
  describedBy,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** The connected recording's name, in case it's older than the recent projects listed. */
  linkedName?: string;
  describedBy?: string;
}) {
  const projects = useProjects(1);
  const recordings = (projects.data?.results ?? []).filter((project) => project.status === "completed" && project.source_type !== "photos");
  const missing = value && !recordings.some((recording) => recording.id === value);
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      aria-describedby={describedBy}
      className={cn(fieldClass, "h-11 py-0")}
    >
      <option value="">No recording</option>
      {missing && <option value={value}>{linkedName || "The connected recording"}</option>}
      {recordings.map((recording) => (
        <option key={recording.id} value={recording.id}>
          {recording.name} · {SOURCE_LABELS[recording.source_type]} · {formatDate(recording.created_at)}
        </option>
      ))}
    </select>
  );
}

export function MoveButtons({ moveKey, label, index, count, disabled, onMove }: {
  moveKey: string;
  label: string;
  index: number;
  count: number;
  disabled?: boolean;
  onMove: (by: number) => void;
}) {
  return (
    <>
      <button
        type="button"
        data-move={`${moveKey}:-1`}
        aria-label={`Move ${label} earlier`}
        title="Move earlier"
        disabled={disabled || index === 0}
        onClick={() => onMove(-1)}
        className={iconButton}
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
      </button>
      <button
        type="button"
        data-move={`${moveKey}:1`}
        aria-label={`Move ${label} later`}
        title="Move later"
        disabled={disabled || index === count - 1}
        onClick={() => onMove(1)}
        className={iconButton}
      >
        <ArrowRight aria-hidden="true" className="size-4" />
      </button>
    </>
  );
}

/** What a photo chosen on this device is doing: being made smaller, waiting, uploading, uploaded or failed. */
function queuedStatus(item: QueuedPhoto, waitingToUpload: boolean): string {
  if (item.status === "preparing") return "Getting it ready…";
  if (item.status === "ready") return waitingToUpload ? "Waiting to upload" : "Ready to upload";
  if (item.status === "uploading") return item.note || `Uploading… ${Math.round(item.progress * 100)}%`;
  if (item.status === "done") return "Uploaded";
  return item.note || "The upload failed.";
}

/**
 * A photo chosen on this device, before and while it uploads: its preview, progress and what it's doing, with buttons
 * to move it (when `onMove` is given), try it again after a failure, or remove it.
 */
export function QueuedPhotoTile({
  item,
  index,
  count,
  waitingToUpload = false,
  onMove,
  movesDisabled,
  onRetry,
  onRemove,
}: {
  item: QueuedPhoto;
  index: number;
  count: number;
  /** An upload has started, so "ready" photos are in line rather than waiting for the form to be sent. */
  waitingToUpload?: boolean;
  onMove?: (by: number) => void;
  movesDisabled?: boolean;
  onRetry?: () => void;
  /** Leave out to hide Remove (while it uploads, or once it's uploaded). */
  onRemove?: () => void;
}) {
  const label = `photo ${index + 1}`;
  const name = `Photo ${index + 1} of ${count}`;
  const failed = item.status === "failed";
  const waiting = item.status === "uploading" && Boolean(item.note);
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-white">
      <div className="relative aspect-square bg-secondary">
        {item.preview ? (
          <img src={item.preview} alt={name} className="size-full object-cover" />
        ) : (
          <div className="grid size-full place-content-center justify-items-center gap-1.5 p-3 text-center text-xs text-pretty text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-5" />
            <span>{item.status === "preparing" ? name : `${name}: no preview here. It's converted once uploaded.`}</span>
          </div>
        )}
        {item.status === "uploading" && (
          <div
            role="progressbar"
            aria-label={`Uploading ${label}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(item.progress * 100)}
            className="absolute inset-x-0 bottom-0 h-1.5 bg-black/25"
          >
            <div
              className="h-full w-full origin-left bg-primary transition-transform duration-200 ease-out"
              style={{ transform: `scaleX(${item.progress})` }}
            />
          </div>
        )}
        {item.status === "done" && (
          <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-emerald-600 text-white">
            <Check aria-hidden="true" className="size-3.5" />
          </span>
        )}
      </div>
      <div className="p-2">
        <p className="truncate text-xs font-medium text-foreground" title={item.name}>
          <span className="tabular-nums">{index + 1}.</span> {item.name}
        </p>
        <p
          className={cn(
            "mt-0.5 text-xs text-pretty tabular-nums",
            failed ? "text-red-600" : waiting ? "font-medium text-amber-700" : "text-muted-foreground",
          )}
        >
          {queuedStatus(item, waitingToUpload)}
        </p>
        {(onMove || onRetry || onRemove) && (
          <div className="mt-1 -mb-1 flex items-center justify-end gap-0.5">
            {onMove && <MoveButtons moveKey={item.key} label={label} index={index} count={count} disabled={movesDisabled} onMove={onMove} />}
            {onRetry && failed && (
              <button type="button" aria-label={`Try ${label} again`} title="Try again" onClick={onRetry} className={iconButton}>
                <RotateCw aria-hidden="true" className="size-4" />
              </button>
            )}
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove ${label}`}
                title="Remove"
                onClick={onRemove}
                className={cn(iconButton, "hover:bg-red-50 hover:text-red-600")}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** The note and connected recording of a photos project. */
function PhotoDetails({ project }: { project: Project }) {
  const update = useUpdateProject();
  const [note, setNote] = useState(project.note);
  const [linked, setLinked] = useState(project.linked_recording ?? "");
  const [saved, setSaved] = useState(false);
  const ids = useId();
  const changed = note.trim() !== project.note || (linked || null) !== project.linked_recording;

  const save = (event: FormEvent) => {
    event.preventDefault();
    setSaved(false);
    update.mutate(
      { id: project.id, note: note.trim(), linked_recording: linked || null },
      { onSuccess: () => setSaved(true) },
    );
  };

  return (
    <form onSubmit={save} aria-labelledby={`${ids}-title`} className="space-y-4 rounded-xl border border-border bg-white p-5">
      <h3 id={`${ids}-title`} className="font-semibold text-balance text-foreground">
        About these photos
      </h3>
      <div>
        <label htmlFor={`${ids}-note`} className="mb-2 block text-sm font-medium text-foreground">
          What do these photos show?
        </label>
        <textarea
          id={`${ids}-note`}
          value={note}
          maxLength={500}
          rows={3}
          placeholder="Youth Sunday, 12 October"
          onChange={(event) => setNote(event.target.value)}
          aria-describedby={`${ids}-note-hint`}
          className={cn(fieldClass, "resize-y")}
        />
        <p id={`${ids}-note-hint`} className="mt-1.5 flex justify-between gap-3 text-xs text-pretty text-muted-foreground">
          <span>The captions use this for what the pictures can't say, such as the event and date.</span>
          <span className="shrink-0 tabular-nums">{note.length}/500</span>
        </p>
      </div>
      <div>
        <label htmlFor={`${ids}-recording`} className="mb-2 block text-sm font-medium text-foreground">
          Connect to a recording
        </label>
        <RecordingSelect
          id={`${ids}-recording`}
          value={linked}
          onChange={setLinked}
          linkedName={project.linked_recording_name}
          describedBy={`${ids}-recording-hint`}
        />
        <p id={`${ids}-recording-hint`} className="mt-1.5 text-xs text-pretty text-muted-foreground">
          Optional. The captions can then use that sermon&apos;s message.
          {project.linked_recording && (
            <>
              {" "}
              <Link
                to={`/projects/${project.linked_recording}`}
                className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Open {project.linked_recording_name || "the recording"}
              </Link>
            </>
          )}
        </p>
      </div>
      {update.isError && (
        <p role="alert" className="text-sm text-pretty text-red-600">
          {update.error.message}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={update.isPending} className={buttonStyles({ variant: "secondary" })}>
          {update.isPending ? "Saving…" : "Save"}
        </button>
        <span role="status" className="text-sm text-muted-foreground">
          {changed ? "Unsaved changes" : saved ? "Saved" : ""}
        </span>
      </div>
    </form>
  );
}

/** A photos project's Photos tab: the pictures in posting order, to add to, move or remove, and what they show. */
export default function ProjectPhotos({ project }: { project: Project }) {
  const photos = usePhotos(project.id);
  const rules = photoRules(useUploadOptions().data);
  const refresh = useRefreshAfterPhotos();
  const queue = usePhotoQueue({ onUploaded: useStoreUploadedPhoto(project.id), removeWhenDone: true });
  const remove = useDeletePhoto(project.id);
  const reorder = useReorderPhotos(project.id);
  const [announcement, setAnnouncement] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputId = useId();

  const list = photos.data ?? [];
  const pending = queue.items;
  // Uploading: the order can only be saved with every photo in it, so moving waits until the uploads finish.
  const uploading = pending.some((item) => item.status !== "failed");
  const total = list.length + pending.length;
  const full = total >= rules.max;
  const focusAfterMove = useMoveFocus(list.map((photo) => photo.id).join());

  useEffect(() => {
    if (!uploading) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [uploading]);

  const addFiles = (files: File[]) => {
    if (files.length === 0) return;
    queue.add(files, rules.max - list.length, rules);
    void queue.upload(project.id).then(refresh);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    addFiles(Array.from(event.dataTransfer.files));
  };

  const move = (index: number, by: number) => {
    const ids = list.map((photo) => photo.id);
    const to = index + by;
    [ids[index], ids[to]] = [ids[to], ids[index]];
    focusAfterMove(list[index].id, by);
    reorder.mutate(ids);
    setAnnouncement(`Photo ${index + 1} moved to position ${to + 1} of ${list.length}.`);
  };

  const addButton = (variant: "primary" | "secondary") =>
    full ? (
      <button type="button" disabled className={buttonStyles({ variant })}>
        <Plus aria-hidden="true" className="size-4" />
        Add photos
      </button>
    ) : (
      <>
        <input
          id={inputId}
          type="file"
          multiple
          accept={photoAccept(rules)}
          className="peer sr-only"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <label
          htmlFor={inputId}
          className={buttonStyles({
            variant,
            className: "cursor-pointer peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
          })}
        >
          <Plus aria-hidden="true" className="size-4" />
          Add photos
        </label>
      </>
    );

  if (photos.isPending) {
    return (
      <div aria-busy="true" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <p role="status" className="sr-only">
          Loading photos…
        </p>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-square animate-pulse rounded-lg bg-secondary" />
        ))}
      </div>
    );
  }
  if (photos.isError) {
    return (
      <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {photos.error.message}
      </p>
    );
  }

  const actionError = remove.error ?? reorder.error;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <section
        aria-labelledby={`${inputId}-title`}
        onDragOver={(event) => {
          event.preventDefault();
          if (!full) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => (full ? event.preventDefault() : onDrop(event))}
        className={cn("min-w-0 space-y-4 rounded-xl outline-2 outline-offset-4 outline-transparent", dragging && "outline-dashed outline-primary")}
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 id={`${inputId}-title`} className="font-semibold text-balance text-foreground tabular-nums">
              {list.length} photo{list.length === 1 ? "" : "s"}
            </h3>
            <p className="mt-1 text-sm text-pretty text-muted-foreground">
              In the order they&apos;re posted.{" "}
              <span className="tabular-nums">
                {total} of {rules.max} photos
              </span>
              {full ? ", the most a project can have." : "."}
            </p>
          </div>
          {(list.length > 0 || pending.length > 0) && <div className="flex">{addButton("secondary")}</div>}
        </div>

        <p role="status" className="sr-only">
          {announcement}
        </p>
        {queue.problem && (
          <p role="alert" className="text-sm text-pretty text-red-600">
            {queue.problem}
          </p>
        )}
        {actionError && (
          <p role="alert" className="text-sm text-pretty text-red-600">
            {actionError.message}
          </p>
        )}

        {list.length === 0 && pending.length === 0 ? (
          <EmptyState
            icon={Images}
            title="No photos yet"
            description="Add the pictures you want to post together. Mindra writes a caption for each platform from them."
            action={<div className="flex justify-center">{addButton("primary")}</div>}
          />
        ) : (
          <ol aria-label="Photos" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {list.map((photo, index) => {
              const label = `photo ${index + 1}`;
              return (
                <li key={photo.id} className="min-w-0 overflow-hidden rounded-lg border border-border bg-white">
                  <a
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    title="Open full size"
                    className="block aspect-square bg-secondary focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                  >
                    <img
                      src={photo.thumbnail_url}
                      alt={`Photo ${index + 1} of ${list.length}`}
                      loading="lazy"
                      decoding="async"
                      className="size-full object-cover"
                    />
                  </a>
                  <div className="flex items-center gap-0.5 p-1.5">
                    <span className="min-w-0 flex-1 truncate px-1 text-xs font-medium text-muted-foreground tabular-nums" title={photo.original_filename}>
                      {index + 1}
                    </span>
                    <MoveButtons
                      moveKey={photo.id}
                      label={label}
                      index={index}
                      count={list.length}
                      disabled={uploading}
                      onMove={(by) => move(index, by)}
                    />
                    <ConfirmDialog
                      trigger={
                        <button
                          type="button"
                          aria-label={`Remove ${label}`}
                          title="Remove"
                          disabled={remove.isPending && remove.variables === photo.id}
                          className={cn(iconButton, "hover:bg-red-50 hover:text-red-600")}
                        >
                          <Trash2 aria-hidden="true" className="size-4" />
                        </button>
                      }
                      title={`Remove photo ${index + 1}?`}
                      description="It's deleted from this project, and its posts won't show it any more. This can't be undone."
                      confirmLabel="Remove photo"
                      onConfirm={() => remove.mutate(photo.id)}
                    />
                  </div>
                </li>
              );
            })}
            {pending.map((item, index) => (
              <li key={item.key}>
                <QueuedPhotoTile
                  item={item}
                  index={list.length + index}
                  count={total}
                  waitingToUpload
                  onRetry={() => void queue.retry(project.id, item.key).then(refresh)}
                  onRemove={item.status === "uploading" ? undefined : () => queue.remove(item.key)}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      <PhotoDetails project={project} />
    </div>
  );
}
