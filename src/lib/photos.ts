import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiRequest, uploadWithProgress } from "./api";
import { formatExtensions, formatFileSize, formatMegabytes } from "./format";
import type { Photo, PhotoFile, Platform, UploadOptions } from "./types";

// Photo posts: a photos project's pictures (see mindra-backend README, "Photo posts").

/** Where photo posts can go: the platforms that take pictures with a caption. */
export const PHOTO_PLATFORMS: Platform[] = ["instagram", "facebook", "whatsapp", "x", "linkedin", "tiktok"];

/** Photos are made smaller on the device before they're sent: the long side at most this many pixels, as JPEG. */
const MAX_SIDE = 2048;
const JPEG_QUALITY = 0.85;

/** Types the photo picker offers. Listing HEIC lets iPhones hand over their photos as they are. */
const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export type PhotoRules = { types: string[]; maxMb: number; max: number };

/** The server's photo limits (from the upload options), with its defaults until it answers. */
export function photoRules(options: UploadOptions | undefined): PhotoRules {
  return {
    types: options?.photo_types?.length ? options.photo_types : [".heic", ".heif", ".jpeg", ".jpg", ".png", ".webp"],
    maxMb: options?.max_photo_mb ?? 20,
    max: options?.max_photos ?? 20,
  };
}

/** The photo file input's `accept`. */
export function photoAccept(rules: PhotoRules): string {
  return [...PHOTO_MIME_TYPES, ...rules.types].join(",");
}

function isPhotoType(file: File, rules: PhotoRules): boolean {
  const dot = file.name.lastIndexOf(".");
  const extension = dot >= 0 ? file.name.slice(dot).toLowerCase() : "";
  return rules.types.includes(extension) || PHOTO_MIME_TYPES.includes(file.type.toLowerCase());
}

/** "a.png", "a.png and b.gif", "a.png, b.gif and 3 more". */
function listNames(files: File[]): string {
  const names = files.slice(0, 2).map((file) => file.name);
  if (files.length > 2) return `${names.join(", ")} and ${files.length - 2} more`;
  return names.join(" and ");
}

// Making photos smaller on the device -------------------------------------------------------------------------------

type Decoded = { image: CanvasImageSource; width: number; height: number; release: () => void };

/** Open a photo for drawing, upright (EXIF orientation applied); null if this browser can't read the type. */
async function decode(file: File): Promise<Decoded | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return { image: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() };
    } catch {
      // Some browsers show types in an <img> that createImageBitmap can't read, such as HEIC in Safari.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { image, width: image.naturalWidth, height: image.naturalHeight, release: () => URL.revokeObjectURL(url) };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}

/** "IMG_0042.HEIC" → "IMG_0042.jpg". */
function jpegName(name: string): string {
  return `${name.replace(/\.[^.]+$/, "") || "photo"}.jpg`;
}

/**
 * A photo ready to send: scaled so its long side is at most 2048 px and saved as a JPEG (which also leaves out its
 * location and camera details), or the original when this browser can't read it, for the server to convert (such as an
 * iPhone HEIC photo outside Safari).
 */
export async function preparePhoto(file: File): Promise<{ file: File; resized: boolean }> {
  const decoded = await decode(file);
  if (!decoded) return { file, resized: false };
  try {
    if (!decoded.width || !decoded.height) return { file, resized: false };
    const scale = Math.min(1, MAX_SIDE / Math.max(decoded.width, decoded.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(decoded.width * scale));
    canvas.height = Math.max(1, Math.round(decoded.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return { file, resized: false };
    // JPEG has no transparency: see-through parts of a PNG become white rather than black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded.image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob) return { file, resized: false };
    return { file: new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified }), resized: true };
  } catch {
    return { file, resized: false };
  } finally {
    decoded.release();
  }
}

// Uploading ---------------------------------------------------------------------------------------------------------

/** Failed tries in a row, while the browser says it's online, before a photo is marked as failed. */
const MAX_TRIES = 4;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function backOnline() {
  return new Promise<void>((resolve) => window.addEventListener("online", () => resolve(), { once: true }));
}

/**
 * Upload one photo (POST /api/projects/<id>/photos/), reporting progress from 0 to 1. A dropped connection or a busy
 * server is tried again: while the browser is offline it waits for the connection to come back, otherwise a little
 * longer each time, saying why through `onWaiting` (null once it's sending again). Other problems, such as a type the
 * server can't read or the photo limit, are thrown at once with the server's message.
 */
export async function uploadPhoto(
  projectId: string,
  file: File,
  onProgress: (fraction: number) => void,
  onWaiting: (reason: string | null) => void,
): Promise<Photo> {
  let failures = 0;
  for (;;) {
    const form = new FormData();
    form.append("file", file, file.name);
    try {
      return await uploadWithProgress<Photo>(`/api/projects/${projectId}/photos/`, form, onProgress);
    } catch (error) {
      const dropped = error instanceof ApiError && error.status === 0;
      const busy = error instanceof ApiError && (error.status === 429 || error.status >= 500);
      if (!dropped && !busy) throw error;
      const offline = !navigator.onLine;
      if (!offline) failures += 1;
      if (failures >= MAX_TRIES) throw error;
      onProgress(0);
      onWaiting(offline ? "Connection lost. Waiting to continue…" : "Trying again…");
      if (offline) await backOnline();
      await wait(1000 * 2 ** Math.min(failures, 4));
      onWaiting(null);
    }
  }
}

export type QueuedPhoto = {
  key: string;
  /** The name it was chosen with. */
  name: string;
  /** What will be uploaded; null while it's being made smaller. */
  file: File | null;
  /** A picture to show for it; null when this browser can't show the type (it's uploaded as it is). */
  preview: string | null;
  status: "preparing" | "ready" | "uploading" | "done" | "failed";
  progress: number;
  /** Why the upload is waiting (a lost connection), or why it failed. */
  note: string;
  /** Once uploaded: the photo the server made. */
  photo: Photo | null;
};

let lastKey = 0;

/**
 * Photos chosen on this device: each is made smaller as soon as it's added (one at a time, to spare a phone's memory),
 * can be moved or removed, and is uploaded in order, one at a time, by `upload`.
 */
export function usePhotoQueue(options: { onUploaded?: (photo: Photo) => void; removeWhenDone?: boolean } = {}) {
  const list = useRef<QueuedPhoto[]>([]);
  const [items, setItems] = useState<QueuedPhoto[]>([]);
  const [problem, setProblem] = useState("");
  const preparing = useRef<Promise<unknown>>(Promise.resolve());
  const uploading = useRef<Promise<number>>(Promise.resolve(0));
  const handlers = useRef(options);
  useEffect(() => {
    handlers.current = options;
  });

  const commit = (change: (current: QueuedPhoto[]) => QueuedPhoto[]) => {
    list.current = change(list.current);
    setItems(list.current);
  };
  const patch = (key: string, changes: Partial<QueuedPhoto>) =>
    commit((current) => current.map((item) => (item.key === key ? { ...item, ...changes } : item)));
  const has = (key: string) => list.current.some((item) => item.key === key);
  const drop = (key: string) => {
    const preview = list.current.find((item) => item.key === key)?.preview;
    if (preview) URL.revokeObjectURL(preview);
    commit((current) => current.filter((item) => item.key !== key));
  };

  // Let go of the previews when the page closes.
  useEffect(
    () => () => {
      for (const item of list.current) if (item.preview) URL.revokeObjectURL(item.preview);
    },
    [],
  );

  /** Add chosen files, keeping at most `room` photos waiting here; `problem` explains any that were left out. */
  const add = (files: File[], room: number, rules: PhotoRules) => {
    const notes: string[] = [];
    const wrong = files.filter((file) => !isPhotoType(file, rules));
    if (wrong.length > 0) {
      notes.push(`${listNames(wrong)} ${wrong.length === 1 ? "isn't" : "aren't"} supported here. Use ${formatExtensions(rules.types)} photos.`);
    }
    const usable = files.filter((file) => isPhotoType(file, rules));
    const taken = usable.slice(0, Math.max(0, room - list.current.length));
    const left = usable.length - taken.length;
    if (left > 0) notes.push(`A project can have up to ${rules.max} photos, so ${left} ${left === 1 ? "wasn't" : "weren't"} added.`);
    setProblem(notes.join(" "));

    const added: QueuedPhoto[] = taken.map((file) => ({
      key: `photo-${++lastKey}`,
      name: file.name,
      file: null,
      preview: null,
      status: "preparing",
      progress: 0,
      note: "",
      photo: null,
    }));
    commit((current) => [...current, ...added]);
    taken.forEach((file, index) => {
      const { key } = added[index];
      preparing.current = preparing.current.then(async () => {
        if (!has(key)) return;
        const prepared = await preparePhoto(file);
        if (!has(key)) return;
        if (prepared.file.size > rules.maxMb * 1024 * 1024) {
          drop(key);
          const tooBig = `${file.name} is ${formatFileSize(file.size)}, and this browser can't make it smaller. Photos can be up to ${formatMegabytes(rules.maxMb)}.`;
          setProblem((current) => (current ? `${current} ${tooBig}` : tooBig));
          return;
        }
        patch(key, { file: prepared.file, preview: prepared.resized ? URL.createObjectURL(prepared.file) : null, status: "ready" });
      });
    });
  };

  /** Move a photo `by` places (-1 earlier, 1 later). */
  const move = (key: string, by: number) =>
    commit((current) => {
      const from = current.findIndex((item) => item.key === key);
      const to = from + by;
      if (from < 0 || to < 0 || to >= current.length) return current;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });

  /**
   * Upload every photo that's ready, one at a time, in order (after any still being made smaller). Calls made while an
   * upload is running wait their turn. Resolves with how many photos have failed.
   */
  const upload = (projectId: string) => {
    uploading.current = uploading.current.then(async () => {
      await preparing.current;
      const keys = list.current.filter((item) => item.status === "ready").map((item) => item.key);
      for (const key of keys) {
        const item = list.current.find((candidate) => candidate.key === key);
        if (!item?.file || item.status !== "ready") continue;
        patch(key, { status: "uploading", progress: 0, note: "" });
        try {
          const photo = await uploadPhoto(
            projectId,
            item.file,
            (progress) => patch(key, { progress }),
            (reason) => patch(key, { note: reason ?? "" }),
          );
          handlers.current.onUploaded?.(photo);
          if (handlers.current.removeWhenDone) drop(key);
          else patch(key, { status: "done", progress: 1, note: "", photo });
        } catch (error) {
          patch(key, { status: "failed", progress: 0, note: error instanceof Error ? error.message : "The upload failed." });
        }
      }
      return list.current.filter((item) => item.status === "failed").length;
    });
    return uploading.current;
  };

  /** Try the failed photos again (or just one). */
  const retry = (projectId: string, key?: string) => {
    commit((current) =>
      current.map((item) => (item.status === "failed" && (!key || item.key === key) ? { ...item, status: "ready", note: "" } : item)),
    );
    return upload(projectId);
  };

  return { items, problem, add, remove: drop, move, upload, retry, current: () => list.current };
}

/** Put focus back on a photo's move button after it moves (or the other one, at either end). */
export function useMoveFocus(order: string) {
  const target = useRef<{ key: string; by: number } | null>(null);
  useEffect(() => {
    const next = target.current;
    if (!next) return;
    target.current = null;
    const find = (by: number) => document.querySelector<HTMLButtonElement>(`[data-move="${next.key}:${by}"]`);
    const button = find(next.by);
    (button && !button.disabled ? button : find(-next.by))?.focus();
  }, [order]);
  return (key: string, by: number) => {
    target.current = { key, by };
  };
}

// The photos API ----------------------------------------------------------------------------------------------------

const photosKey = (projectId: string) => ["photos", projectId];

export function usePhotos(projectId: string) {
  return useQuery({
    queryKey: photosKey(projectId),
    queryFn: () => apiRequest<Photo[]>(`/api/projects/${projectId}/photos/`),
  });
}

/** After the photos change: the project's photo count and cover, and the posts that show its photos. */
export function useRefreshAfterPhotos() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["projects"] });
    queryClient.invalidateQueries({ queryKey: ["content"] });
  };
}

/** Put a newly uploaded photo at the end of the project's cached list. */
export function useStoreUploadedPhoto(projectId: string) {
  const queryClient = useQueryClient();
  return (photo: Photo) =>
    queryClient.setQueryData<Photo[]>(photosKey(projectId), (list) => (list ? [...list.filter((item) => item.id !== photo.id), photo] : list));
}

export function useDeletePhoto(projectId: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshAfterPhotos();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/photos/${id}/`, { method: "DELETE" }),
    onSuccess: (_result, id) => {
      queryClient.setQueryData<Photo[]>(photosKey(projectId), (list) => list?.filter((photo) => photo.id !== id));
      refresh();
    },
  });
}

/** Save a new order (every photo id of the project). The list changes at once and goes back if the server says no. */
export function useReorderPhotos(projectId: string) {
  const queryClient = useQueryClient();
  const refresh = useRefreshAfterPhotos();
  const mutationKey = ["photos", projectId, "order"];
  // Only the last of several quick moves applies the server's answer, so an earlier answer can't undo a later move.
  const isLast = () => queryClient.isMutating({ mutationKey }) <= 1;
  return useMutation({
    mutationKey,
    mutationFn: (ids: string[]) =>
      apiRequest<Photo[]>(`/api/projects/${projectId}/photos/order/`, { method: "POST", body: { ids } }),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: photosKey(projectId) });
      queryClient.setQueryData<Photo[]>(photosKey(projectId), (list) =>
        list
          ? ids.flatMap((id, position) => {
              const photo = list.find((item) => item.id === id);
              return photo ? [{ ...photo, position }] : [];
            })
          : list,
      );
    },
    onError: () => queryClient.invalidateQueries({ queryKey: photosKey(projectId) }),
    onSuccess: (photos) => {
      if (isLast()) queryClient.setQueryData(photosKey(projectId), photos);
    },
    onSettled: () => {
      if (isLast()) refresh();
    },
  });
}

/**
 * A photo post's pictures as files, in order, for the share menu or to save. The API gives their direct addresses;
 * the playback links would follow a redirect that the storage bucket refuses for pages.
 */
export async function photoFiles(projectId: string): Promise<File[]> {
  const list = await apiRequest<PhotoFile[]>(`/api/projects/${projectId}/photos/files/`);
  if (list.length === 0) throw new Error("This post has no photos yet. Add them on the project's Photos tab.");
  return Promise.all(
    list.map(async (info) => {
      let response: Response;
      try {
        response = await fetch(info.url);
      } catch {
        throw new Error("Couldn't download the photos. Check your connection and try again.");
      }
      if (!response.ok) throw new Error("Couldn't download the photos. Try again in a moment.");
      return new File([await response.blob()], info.filename, { type: info.content_type || "image/jpeg" });
    }),
  );
}
