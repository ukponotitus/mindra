import { useEffect, useState } from "react";
import { Info } from "lucide-react";

interface Props {
  file: File;
  kind: "video" | "audio";
}

/** Plays the chosen file before it's uploaded, so you can check it's the right recording. */
export default function MediaPreview({ file, kind }: Props) {
  const [source, setSource] = useState<{ file: File; url: string } | null>(null);
  const [failedFor, setFailedFor] = useState<File | null>(null);

  // The player reads the file straight from this computer through an object URL; nothing is uploaded until
  // processing starts. The URL is released when the file changes or the preview goes away.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSource({ file, url });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  if (failedFor === file) {
    return (
      <p className="flex items-start gap-2 text-xs text-pretty text-muted-foreground">
        <Info aria-hidden="true" className="mt-px size-3.5 shrink-0" />
        This browser can't play this file type, so there's no preview. Mindra can still transcribe it.
      </p>
    );
  }
  if (source?.file !== file) return null;

  const label = `Preview of ${file.name}`;
  return kind === "video" ? (
    <video
      src={source.url}
      controls
      playsInline
      preload="metadata"
      aria-label={label}
      onError={() => setFailedFor(file)}
      className="aspect-video max-h-80 w-full rounded-lg bg-black"
    />
  ) : (
    <audio
      src={source.url}
      controls
      preload="metadata"
      aria-label={label}
      onError={() => setFailedFor(file)}
      className="w-full"
    />
  );
}
