const pad = (value: number) => String(value).padStart(2, "0");

/** 47:32 or 1:12:04. */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = total % 60;
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(rest)}` : `${minutes}:${pad(rest)}`;
}

/** Aug 22, with the year only when it isn't this year. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
}

export function formatFileSize(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** 2048 MB → "2 GB". */
export function formatMegabytes(megabytes: number): string {
  return megabytes >= 1024 ? `${Math.round((megabytes / 1024) * 10) / 10} GB` : `${megabytes} MB`;
}

/** "en" → "English". */
export function languageName(code: string): string {
  if (!code) return "—";
  try {
    return new Intl.DisplayNames(undefined, { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** [".mp4", ".mov"] → "MP4, MOV". */
export function formatExtensions(extensions: string[]): string {
  return extensions.map((extension) => extension.replace(/^\./, "").toUpperCase()).join(", ");
}
