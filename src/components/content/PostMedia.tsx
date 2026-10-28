import { useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Check, Film, ImagePlus, LoaderCircle, Trash2, Upload, X } from "lucide-react";
import { backdropClass, popupClass } from "../calendar/dialogStyles";
import ConfirmDialog from "../ui/ConfirmDialog";
import { buttonStyles } from "../ui/button";
import { clipFrame } from "../../lib/clips";
import { cn } from "../../lib/cn";
import { useSetPostMedia } from "../../lib/content";
import { formatDuration } from "../../lib/format";
import { postPhotoFiles } from "../../lib/photos";
import { useStudioAssets, useUploadAsset, type StudioAsset } from "../../lib/studio";
import type { ContentPiece } from "../../lib/types";
import { PostPhotos } from "./ContentCard";
import ShareButton from "./ShareButton";

const MAX_PHOTOS = 10;
const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,.heic,.heif,video/mp4,video/quicktime,video/webm,.m4v,.mov";

type Sending = { id: string; name: string; fraction: number; error: string };

/**
 * Choose the post's photos (up to 10) or one video from the workspace's uploads, or upload new ones here. A video is
 * made ready on the server first (a minute or so); it can be chosen once it is.
 */
function MediaPicker({ open, onOpenChange, piece }: { open: boolean; onOpenChange: (open: boolean) => void; piece: ContentPiece }) {
  const assets = useStudioAssets();
  const upload = useUploadAsset();
  const setMedia = useSetPostMedia();
  const file = useRef<HTMLInputElement>(null);
  // Each choice keeps its kind, so one made as an upload arrives (before the list has it) still counts as a photo.
  const [chosen, setChosen] = useState<{ id: string; kind: StudioAsset["kind"] }[]>([]);
  const [sending, setSending] = useState<Sending[]>([]);
  const all = (assets.data?.results ?? []).filter((asset) => (asset.kind === "image" || asset.kind === "video") && asset.status !== "failed" && !asset.library);
  const chosenIds = chosen.map((item) => item.id);
  const picked = chosenIds.map((id) => all.find((asset) => asset.id === id)).filter((asset): asset is StudioAsset => Boolean(asset));
  const kind = chosen[0]?.kind ?? null;

  const toggle = (asset: StudioAsset) => {
    setMedia.reset();
    setChosen((items) => {
      if (items.some((item) => item.id === asset.id)) return items.filter((item) => item.id !== asset.id);
      // A video replaces whatever was chosen; photos add up, to 10, and replace a chosen video.
      if (asset.kind === "video") return [{ id: asset.id, kind: asset.kind }];
      const photos = items.filter((item) => item.kind === "image");
      return photos.length >= MAX_PHOTOS ? photos : [...photos, { id: asset.id, kind: asset.kind }];
    });
  };

  const send = async (files: FileList | null) => {
    for (const picked of Array.from(files ?? [])) {
      const id = `${picked.name}-${picked.size}-${Date.now()}`;
      setSending((items) => [...items, { id, name: picked.name, fraction: 0, error: "" }]);
      try {
        const asset = await upload.mutateAsync({
          file: picked,
          onProgress: (fraction) => setSending((items) => items.map((item) => (item.id === id ? { ...item, fraction } : item))),
        });
        setSending((items) => items.filter((item) => item.id !== id));
        // Chosen as it arrives (a video once it's ready, by choosing it then).
        if (asset.status === "ready") toggle(asset);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Couldn't upload this file.";
        setSending((items) => items.map((item) => (item.id === id ? { ...item, error: message } : item)));
      }
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setChosen([]);
          setMedia.reset();
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={cn(popupClass, "w-[min(44rem,calc(100vw-2rem))]")}>
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Photos or a video for this post</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pretty text-muted-foreground">
                Choose up to {MAX_PHOTOS} photos or one video, from your uploads or new ones. They go out with the post, and
                replace any it has.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-1 -mr-2" })}>
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>

          <input
            ref={file}
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              void send(event.target.files);
              event.target.value = "";
            }}
          />
          <button type="button" onClick={() => file.current?.click()} className={buttonStyles({ variant: "secondary" })}>
            <Upload aria-hidden="true" className="size-4" />
            Upload photos or a video
          </button>
          {sending.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {sending.map((item) => (
                <li key={item.id} className="text-xs">
                  <p className="truncate text-foreground">{item.name}</p>
                  {item.error ? (
                    <p role="alert" className="text-pretty text-red-700">
                      {item.error}
                    </p>
                  ) : (
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label={`Uploading ${item.name}`} aria-valuenow={Math.round(item.fraction * 100)}>
                      <div className="h-full w-full origin-left bg-primary transition-transform" style={{ transform: `scaleX(${item.fraction})` }} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4">
            {assets.isPending ? (
              <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                Loading your uploads…
              </p>
            ) : all.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                No uploads yet. Upload photos or a video above.
              </p>
            ) : (
              <ul aria-label="Your uploads" className="grid max-h-[45vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
                {all.map((asset) => {
                  const on = chosenIds.includes(asset.id);
                  const ready = asset.status === "ready";
                  return (
                    <li key={asset.id}>
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={!ready}
                        onClick={() => toggle(asset)}
                        className={cn(
                          "relative block w-full overflow-hidden rounded-lg border-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-wait",
                          on ? "border-primary" : "border-transparent hover:border-border",
                        )}
                      >
                        <span className="relative block aspect-video bg-secondary">
                          {asset.thumbnail_url ? (
                            <img src={asset.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />
                          ) : (
                            <span className="absolute inset-0 grid place-items-center text-muted-foreground">
                              <Film aria-hidden="true" className="size-5" />
                            </span>
                          )}
                          {asset.kind === "video" && asset.duration ? (
                            <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] text-white tabular-nums">{formatDuration(asset.duration)}</span>
                          ) : null}
                          {!ready && (
                            <span className="absolute inset-0 grid place-items-center bg-white/75 text-[11px] font-medium text-foreground">
                              <span className="flex items-center gap-1">
                                <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                                Getting ready
                              </span>
                            </span>
                          )}
                        </span>
                        <span className="block truncate px-1 py-0.5 text-[11px] text-foreground">{asset.name}</span>
                        {on && (
                          <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-primary text-white">
                            <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {setMedia.isError && (
            <p role="alert" className="mt-3 text-sm text-pretty text-red-700">
              {setMedia.error.message}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
            <p className="mr-auto text-xs text-muted-foreground tabular-nums">
              {kind === "video" ? "1 video chosen" : chosen.length ? `${chosen.length} of up to ${MAX_PHOTOS} photos chosen` : "Nothing chosen yet"}
            </p>
            <Dialog.Close className={buttonStyles({ variant: "secondary" })}>Cancel</Dialog.Close>
            <button
              type="button"
              disabled={!picked.length || setMedia.isPending}
              onClick={() =>
                setMedia.mutate(
                  { id: piece.id, assets: picked.map((asset) => asset.id) },
                  {
                    onSuccess: () => {
                      setChosen([]);
                      onOpenChange(false);
                    },
                  },
                )
              }
              className={buttonStyles()}
            >
              {setMedia.isPending ? "Adding…" : kind === "video" ? "Add the video" : picked.length > 1 ? `Add ${picked.length} photos` : "Add to the post"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * The editor's "Photos or video" section, for a post that doesn't come with media of its own (a content plan's note, a
 * recording's text post): what goes out with it, Share, and adding, changing or removing it.
 */
export default function PostMedia({ piece, text }: { piece: ContentPiece; text: string }) {
  const [picking, setPicking] = useState(false);
  const setMedia = useSetPostMedia();
  const clip = piece.clip?.uploaded ? piece.clip : null;
  const photos = piece.photos;
  const has = Boolean(clip) || photos.length > 0;
  const locked = piece.media_problem;

  return (
    <section aria-labelledby="post-media" className="rounded-xl border border-border bg-white p-5">
      <h3 id="post-media" className="mb-3 text-sm font-semibold text-foreground">
        Photos or video
      </h3>
      {clip && clip.video_url && (
        <video
          src={clip.video_url}
          poster={clip.thumbnail_url ?? undefined}
          controls
          playsInline
          preload="metadata"
          aria-label={`Video: ${clip.title}`}
          className={cn("mx-auto mb-2 rounded-lg bg-black", clipFrame(clip.shape, "aspect-[9/16] max-h-80"))}
        />
      )}
      {photos.length > 0 && <PostPhotos photos={photos} project={null} />}
      {!has && (
        <p className="text-sm text-pretty text-muted-foreground">
          Add photos or a video to go out with the text. Instagram and TikTok posts need one, and posts with a picture
          usually get more attention.
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {clip && (
          <ShareButton clipId={clip.id} downloadUrl={clip.download_url} text={text} title={piece.title || clip.title} variant="primary" size="md" />
        )}
        {photos.length > 0 && (
          <ShareButton
            key={photos.map((photo) => photo.id).join()}
            loadFiles={() => postPhotoFiles(piece.id)}
            text={text}
            title={piece.title || piece.project_name}
            variant="primary"
            size="md"
          />
        )}
        <button type="button" disabled={Boolean(locked)} onClick={() => setPicking(true)} className={buttonStyles({ variant: "secondary" })}>
          <ImagePlus aria-hidden="true" className="size-4" />
          {has ? "Change" : "Add photos or a video"}
        </button>
        {has && !locked && (
          <ConfirmDialog
            trigger={
              <button type="button" disabled={setMedia.isPending} aria-label="Remove the photos or video" className={buttonStyles({ variant: "ghost", size: "icon" })}>
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            }
            title="Remove them from this post?"
            description="The post goes out with its text only. Your uploads stay, so you can add them again."
            confirmLabel="Remove"
            onConfirm={() => setMedia.mutate({ id: piece.id, assets: null })}
          />
        )}
      </div>
      {locked && <p className="mt-2 text-xs text-pretty text-muted-foreground">{locked}</p>}
      {setMedia.isError && !picking && (
        <p role="alert" className="mt-2 text-sm text-pretty text-red-700">
          {setMedia.error.message}
        </p>
      )}
      <MediaPicker open={picking} onOpenChange={setPicking} piece={piece} />
    </section>
  );
}
