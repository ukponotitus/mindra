import { useRef, useState } from "react";
import { Download, LoaderCircle, Share2 } from "lucide-react";
import { buttonStyles } from "../ui/button";
import { canShareFiles, clipFile } from "../../lib/clips";
import { cn } from "../../lib/cn";

interface Props {
  clipId: string;
  /** The clip's download link, for browsers that can't share files (most computers). */
  downloadUrl: string | null;
  /** The caption that goes with the video; empty shares the video alone. */
  text: string;
  title: string;
  variant?: "primary" | "secondary";
  size?: "sm" | "md";
  /** Take the whole row (on cards, where it's the main action). */
  wide?: boolean;
}

/**
 * Posts a video with its caption. On phones it opens the share menu with both (WhatsApp, Instagram, TikTok, Facebook);
 * the caption is also copied, because some apps drop shared text. Elsewhere it downloads the video and copies the
 * caption.
 */
export default function ShareButton({ clipId, downloadUrl, text, title, variant = "secondary", size = "sm", wide = false }: Props) {
  const [sharing] = useState(canShareFiles);
  const [state, setState] = useState<"idle" | "preparing" | "ready">("idle");
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const file = useRef<File | null>(null);
  const styles = buttonStyles({ variant, size, className: cn(size === "sm" && "h-9", wide && "w-full") });

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
      if (!file.current) {
        setState("preparing");
        setMessage("Getting the video ready…");
        file.current = await clipFile(clipId);
      }
      await navigator.share({ files: [file.current], title, ...(text ? { text } : {}) });
      setState("idle");
      setMessage(copied ? "Shared. The caption is copied too, so paste it if the app left it out." : "Shared.");
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      if (name === "AbortError") {
        // Closed the share menu without choosing an app.
        setState("idle");
        setMessage("");
      } else if (name === "NotAllowedError" && file.current) {
        // The download took long enough that the browser wants a fresh tap before opening the share menu.
        setState("ready");
        setMessage("The video is ready. Tap Share again to choose an app.");
      } else {
        setState("idle");
        setFailed(true);
        setMessage(error instanceof Error ? error.message : "Couldn't share this clip. Try again.");
      }
    }
  };

  return (
    <>
      {sharing ? (
        <button type="button" onClick={share} disabled={state === "preparing"} className={styles}>
          {state === "preparing" ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Share2 aria-hidden="true" className="size-4" />}
          {state === "ready" ? "Share now" : wide ? "Share video" : "Share"}
        </button>
      ) : (
        downloadUrl && (
          <a
            href={downloadUrl}
            download
            onClick={async () => setMessage((await copyCaption()) ? "Downloading the video. The caption is copied, ready to paste." : "Downloading the video.")}
            className={styles}
          >
            <Download aria-hidden="true" className="size-4" />
            {wide ? "Download video" : "Download"}
          </a>
        )
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
