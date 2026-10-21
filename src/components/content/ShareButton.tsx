import { useRef, useState } from "react";
import { Download, LoaderCircle, Share2 } from "lucide-react";
import { buttonStyles } from "../ui/button";
import { canShareFiles, clipFile } from "../../lib/clips";
import { cn } from "../../lib/cn";

type Shared = {
  /** The caption that goes with the files; empty shares the files alone. */
  text: string;
  title: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  /** Take the whole row (on cards, where it's the main action). */
  wide?: boolean;
  /** Called once the files went to an app or were saved, e.g. to ask whether the post went out. */
  onShared?: () => void;
};

type Props = Shared &
  (
    | {
        /** A made clip: shares its video. */
        clipId: string;
        /** The clip's download link, for browsers that can't share files (most computers). */
        downloadUrl: string | null;
        loadFiles?: never;
        loadVideo?: never;
      }
    | {
        /** Another made video, such as a vertical video: fetches its file to share. */
        loadVideo: () => Promise<File>;
        /** Its download link, for browsers that can't share files (most computers). */
        downloadUrl: string | null;
        clipId?: never;
        loadFiles?: never;
      }
    | {
        /** Fetches the files to share: a photo post's pictures. Browsers that can't share files save each one. */
        loadFiles: () => Promise<File[]>;
        clipId?: never;
        loadVideo?: never;
        downloadUrl?: never;
      }
  );

const WORDS = {
  video: {
    share: "Share video",
    download: "Download video",
    preparing: "Getting the video ready…",
    ready: "The video is ready. Tap Share again to choose an app.",
    failed: "Couldn't share this clip. Try again.",
  },
  photos: {
    share: "Share photos",
    download: "Download photos",
    preparing: "Getting the photos ready…",
    ready: "The photos are ready. Tap Share again to choose an app.",
    failed: "Couldn't share these photos. Try again.",
  },
};

/** Save files to the computer's downloads, a moment apart so the browser takes each one. */
function saveFiles(files: File[]) {
  files.forEach((file, index) => {
    window.setTimeout(() => {
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }, index * 250);
  });
}

/**
 * Posts files with their caption: a clip's video, or a photo post's pictures. On phones it opens the share menu with
 * both (WhatsApp, Instagram, TikTok, Facebook); the caption is also copied, because some apps drop shared text.
 * Elsewhere it downloads the files and copies the caption.
 */
export default function ShareButton(props: Props) {
  const { text, title, variant = "secondary", size = "sm", wide = false, onShared } = props;
  const isClip = props.clipId !== undefined || props.loadVideo !== undefined;
  const words = isClip ? WORDS.video : WORDS.photos;
  const [sharing] = useState(() => canShareFiles(isClip ? undefined : { name: "photo.jpg", type: "image/jpeg" }));
  const [state, setState] = useState<"idle" | "preparing" | "ready">("idle");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const files = useRef<File[] | null>(null);
  const styles = buttonStyles({ variant, size, className: cn(size === "sm" && "h-9", wide && "w-full") });

  const load = async () => {
    if (props.clipId !== undefined) return [await clipFile(props.clipId)];
    if (props.loadVideo !== undefined) return [await props.loadVideo()];
    return props.loadFiles();
  };

  const copyCaption = async () => {
    if (!text) return false;
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  };

  const share = async () => {
    setFailed(false);
    const copied = await copyCaption();
    try {
      if (!files.current) {
        setState("preparing");
        setMessage(words.preparing);
        files.current = await load();
      }
      if (!isClip && !navigator.canShare({ files: files.current })) {
        throw new Error("This phone can't share these photos together. Try sharing them from your gallery.");
      }
      await navigator.share({ files: files.current, title, ...(text ? { text } : {}) });
      setState("idle");
      setMessage(copied ? "Shared. The caption is copied too, so paste it if the app left it out." : "Shared.");
      onShared?.();
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "AbortError") {
        // Closed the share menu without choosing an app.
        setState("idle");
        setMessage("");
      } else if (name === "NotAllowedError" && files.current) {
        // The download took long enough that the browser wants a fresh tap before opening the share menu.
        setState("ready");
        setMessage(words.ready);
      } else {
        setState("idle");
        setFailed(true);
        setMessage(error instanceof Error ? error.message : words.failed);
      }
    }
  };

  /** Computers: fetch the photos and save each one, with the caption copied. */
  const save = async () => {
    setFailed(false);
    const copied = await copyCaption();
    try {
      if (!files.current) {
        setState("preparing");
        setMessage(words.preparing);
        files.current = await load();
      }
      saveFiles(files.current);
      onShared?.();
      const count = files.current.length;
      setState("idle");
      setMessage(
        `Saving ${count} photo${count === 1 ? "" : "s"}.${count > 1 ? " If your browser asks, let it download several files." : ""}${copied ? " The caption is copied, ready to paste." : ""}`,
      );
    } catch (error) {
      setState("idle");
      setFailed(true);
      setMessage(error instanceof Error ? error.message : words.failed);
    }
  };

  const busyIcon = <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />;

  return (
    <>
      {sharing ? (
        <button type="button" onClick={share} disabled={state === "preparing"} className={styles}>
          {state === "preparing" ? busyIcon : <Share2 aria-hidden="true" className="size-4" />}
          {state === "ready" ? "Share now" : wide ? words.share : "Share"}
        </button>
      ) : isClip ? (
        props.downloadUrl && (
          <a
            href={props.downloadUrl}
            download
            onClick={async () => {
              setMessage((await copyCaption()) ? "Downloading the video. The caption is copied, ready to paste." : "Downloading the video.");
              onShared?.();
            }}
            className={styles}
          >
            <Download aria-hidden="true" className="size-4" />
            {wide ? words.download : "Download"}
          </a>
        )
      ) : (
        <button type="button" onClick={save} disabled={state === "preparing"} className={styles}>
          {state === "preparing" ? busyIcon : <Download aria-hidden="true" className="size-4" />}
          {wide ? words.download : "Download"}
        </button>
      )}
      <span
        role={failed ? "alert" : "status"}
        className={cn(message ? "order-last w-full text-xs text-pretty" : "sr-only", failed ? "text-red-600" : "text-muted-foreground")}
      >
        {message}
      </span>
    </>
  );
}
