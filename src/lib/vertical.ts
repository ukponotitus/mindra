import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, uploadWithProgress } from "./api";
import { uploadOptionsQuery } from "./projects";
import type { Paginated, VerticalMode, VerticalStatus, VerticalVideo } from "./types";
import { DirectUpload, forgetSavedUpload, type UploadPhase, type UploadProgress } from "./upload";

// Vertical videos: a landscape video made 9:16 (see mindra-backend README, "Vertical videos").

// The page makes every new one "fit": "follow" crops the sides, and short-form clips already follow the speaker.
// Videos made the other way before keep showing how they were made.
export const VERTICAL_MODES: { id: VerticalMode; label: string; detail: string }[] = [
  {
    id: "follow",
    label: "Follow the speaker",
    detail: "Fills the screen. The frame finds the speaker's face and moves with them, and cuts when the camera changes.",
  },
  {
    id: "fit",
    label: "Show the whole picture",
    detail: "Nothing is cut off. The full picture sits across the middle, on a blurred copy of itself.",
  },
];

const WORKING: VerticalStatus[] = ["queued", "framing", "rendering"];

export function isMaking(video: Pick<VerticalVideo, "status">) {
  return WORKING.includes(video.status);
}

/** What a vertical video is doing, for its card. */
export function verticalStatusText(video: VerticalVideo): string {
  if (video.status === "queued") return "Waiting to start…";
  if (video.status === "framing") return `Finding the speaker… ${video.progress}%`;
  if (video.status === "rendering") return `Making the video… ${video.progress}%`;
  if (video.status === "failed") return video.error || "This video couldn't be made.";
  return "Ready";
}

const listKey = ["vertical-videos"];

export function useVerticalVideos() {
  return useQuery({
    queryKey: listKey,
    queryFn: () => apiRequest<Paginated<VerticalVideo>>("/api/vertical-videos/?page_size=100"),
    // Keep the progress fresh while any is being made.
    refetchInterval: (query) => (query.state.data?.results.some(isMaking) ? 3000 : false),
  });
}

export type VerticalUploadState = { fraction: number; transfer: UploadProgress | null; phase: UploadPhase | null };

/**
 * Send a video and start making it vertical: straight to storage in parts when the server offers that (a dropped
 * connection waits and continues), otherwise with the request. `onUpload` hears how the upload is going.
 */
export function useMakeVertical(onUpload: (state: VerticalUploadState) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, name, mode }: { file: File; name: string; mode: VerticalMode }) => {
      const options = await queryClient.ensureQueryData(uploadOptionsQuery).catch(() => undefined);
      onUpload({ fraction: 0, transfer: null, phase: null });
      if (options?.direct_upload) {
        let phase: UploadPhase | null = null;
        const upload = new DirectUpload(file, {
          sourceType: "video",
          purpose: "vertical",
          onProgress: (transfer) => onUpload({ fraction: transfer.loaded / transfer.total, transfer, phase }),
          onPhase: (next) => {
            phase = next;
          },
        });
        const { key } = await upload.start();
        const created = await apiRequest<VerticalVideo>("/api/vertical-videos/", {
          method: "POST",
          body: { source_key: key, mode, ...(name ? { name } : {}) },
        });
        forgetSavedUpload(file, "vertical");
        return created;
      }
      const form = new FormData();
      form.append("source_file", file);
      form.append("mode", mode);
      if (name) form.append("name", name);
      return uploadWithProgress<VerticalVideo>("/api/vertical-videos/", form, (fraction) =>
        onUpload({ fraction, transfer: null, phase: null }),
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });
}

/** Make it again, the same way or with another mode. */
export function useMakeAgain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, mode }: { id: string; mode?: VerticalMode }) =>
      apiRequest<VerticalVideo>(`/api/vertical-videos/${id}/make/`, { method: "POST", body: mode ? { mode } : {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });
}

export function useDeleteVertical() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiRequest<null>(`/api/vertical-videos/${id}/`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });
}

/** The made video as a file, for a phone's share menu (fetched from its direct address, as for a clip). */
export async function verticalFile(id: string): Promise<File> {
  const info = await apiRequest<{ url: string; filename: string; content_type: string }>(`/api/vertical-videos/${id}/file/`);
  let response: Response;
  try {
    response = await fetch(info.url);
  } catch {
    throw new Error("Couldn't download the video. Check your connection and try again.");
  }
  if (!response.ok) throw new Error("Couldn't download the video. Try again in a moment.");
  return new File([await response.blob()], info.filename, { type: info.content_type });
}

/** How long a video file is, in seconds, read by the browser; null when it can't tell. */
export function videoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? video.duration : null);
    video.onerror = () => done(null);
    video.src = url;
  });
}
