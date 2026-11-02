import { apiRequest, uploadWithProgress } from "./api";
import type { Project, UploadOptions } from "./types";
import { DirectUpload } from "./upload";

// Recordings chosen on a phone: what the picker offers, files from a gallery without an extension, and uploading one as
// a project of its own (a photo post's audio, say).

export type RecordingKind = "video" | "audio";

/** The server's list until it answers (mindra-backend projects/uploads.py). */
const DEFAULT_EXTENSIONS: Record<RecordingKind, string[]> = {
  video: [".mp4", ".mov", ".avi", ".mkv", ".webm"],
  audio: [".mp3", ".wav", ".aac", ".m4a", ".flac", ".ogg", ".opus"],
};

/** The extension a file of each type is given when a gallery hands it over without one. */
const EXTENSION_FOR_TYPE: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-matroska": ".mkv",
  "video/x-msvideo": ".avi",
  "audio/mpeg": ".mp3",
  "audio/mp3": ".mp3",
  "audio/mp4": ".m4a",
  "audio/x-m4a": ".m4a",
  "audio/m4a": ".m4a",
  "audio/aac": ".aac",
  "audio/wav": ".wav",
  "audio/x-wav": ".wav",
  "audio/wave": ".wav",
  "audio/flac": ".flac",
  "audio/x-flac": ".flac",
  "audio/ogg": ".ogg",
  "audio/opus": ".opus",
};

export function recordingExtensions(kind: RecordingKind, options: UploadOptions | undefined): string[] {
  return options?.extensions[kind]?.length ? options.extensions[kind] : DEFAULT_EXTENSIONS[kind];
}

/**
 * A recording picker's `accept`: the types first, so a phone offers its gallery, voice recorder or camera rather than
 * only its file manager (which is all Android offers for a list of extensions), then the extensions.
 */
export function recordingAccept(kinds: RecordingKind[], options: UploadOptions | undefined): string {
  return [...kinds.map((kind) => `${kind}/*`), ...kinds.flatMap((kind) => recordingExtensions(kind, options))].join(",");
}

function extensionOf(name: string): string {
  const match = /\.[a-z0-9]+$/i.exec(name);
  return match ? match[0].toLowerCase() : "";
}

/** A file from a phone's gallery sometimes comes without an extension: named with one from its type, so it can be
 * checked here and on the server. Any other file is returned as it is. */
export function withExtension(file: File): File {
  if (extensionOf(file.name)) return file;
  const extension = EXTENSION_FOR_TYPE[file.type.toLowerCase()];
  if (!extension) return file;
  return new File([file], `${file.name || "recording"}${extension}`, { type: file.type, lastModified: file.lastModified });
}

/** Which of `kinds` the server takes `file` as (the first that fits, by its extension), or null. */
export function recordingKind(file: File, kinds: RecordingKind[], options: UploadOptions | undefined): RecordingKind | null {
  const extension = extensionOf(file.name);
  return kinds.find((kind) => recordingExtensions(kind, options).includes(extension)) ?? null;
}

/**
 * Upload `file` (a video or audio recording) as a project of its own, which is transcribed like any other: straight to
 * storage in parts when the server offers that, otherwise with the request. `onProgress` hears 0 to 1; `onUpload` gets
 * the upload in parts while it runs (to cancel it), then null.
 */
export async function uploadRecording({
  file,
  kind,
  name,
  language,
  options,
  onProgress,
  onUpload,
}: {
  file: File;
  kind: RecordingKind;
  name: string;
  language: string;
  options: UploadOptions | undefined;
  onProgress: (fraction: number) => void;
  onUpload?: (upload: DirectUpload | null) => void;
}): Promise<Project> {
  if (options?.direct_upload) {
    const upload = new DirectUpload(file, { sourceType: kind, onProgress: (progress) => onProgress(progress.loaded / progress.total) });
    onUpload?.(upload);
    let key: string;
    try {
      ({ key } = await upload.start());
    } finally {
      onUpload?.(null);
    }
    return apiRequest<Project>("/api/projects/", {
      method: "POST",
      body: { name, source_type: kind, source_key: key, language },
    });
  }
  const form = new FormData();
  form.append("name", name);
  form.append("source_type", kind);
  form.append("source_file", file);
  form.append("language", language);
  return uploadWithProgress<Project>("/api/projects/", form, onProgress);
}
