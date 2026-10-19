import { useState } from "react";
import { Check, Copy, ExternalLink, LoaderCircle, Share2 } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import ShareButton from "../content/ShareButton";
import { buttonStyles } from "../ui/button";
import { useMarkPosted } from "../../lib/calendar";
import { photoFiles } from "../../lib/photos";
import { platformInfo } from "../../lib/projects";
import type { ContentPiece, Platform } from "../../lib/types";
import { postMedia } from "./ShareOrCopy";

/** Where to post a text post on a computer. `prefill` sites take the text in the link; the rest get it pasted. */
const PLATFORM_LINKS: Partial<Record<Platform, { url: (text: string) => string; prefill?: boolean }>> = {
  whatsapp: { url: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`, prefill: true },
  x: { url: (text) => `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, prefill: true },
  facebook: { url: () => "https://www.facebook.com/" },
  instagram: { url: () => "https://www.instagram.com/" },
  linkedin: { url: () => "https://www.linkedin.com/feed/" },
  tiktok: { url: () => "https://www.tiktok.com/upload" },
  youtube_shorts: { url: () => "https://studio.youtube.com/" },
};

function canShareText(): boolean {
  try {
    return typeof navigator.share === "function" && (typeof navigator.canShare !== "function" || navigator.canShare({ text: "Mindra" }));
  } catch {
    return false;
  }
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** A text post: the phone's share menu, or on a computer the platform with the text filled in or copied. */
function TextPost({ piece, onShared }: { piece: ContentPiece; onShared: () => void }) {
  const [sharing] = useState(canShareText);
  const [message, setMessage] = useState("");
  const info = platformInfo(piece.platform);
  const link = PLATFORM_LINKS[piece.platform];
  const wide = buttonStyles({ className: "w-full" });

  if (sharing) {
    const share = async () => {
      try {
        await navigator.share({ title: piece.title || info.label, text: piece.body });
        setMessage("");
        onShared();
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMessage((await copy(piece.body)) ? "This phone couldn't open the share menu, so the text is copied: paste it in the app." : "Couldn't share this post. Try again.");
      }
    };
    return (
      <>
        <button type="button" onClick={share} className={wide}>
          <Share2 aria-hidden="true" className="size-4" />
          Share post
        </button>
        {message && <p className="w-full text-sm text-pretty text-muted-foreground">{message}</p>}
      </>
    );
  }

  if (link) {
    return (
      <>
        <a
          href={link.url(piece.body)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={async () => {
            const copied = await copy(piece.body);
            setMessage(
              link.prefill
                ? `${info.label} opened in a new tab with the text filled in.`
                : copied
                  ? `${info.label} opened in a new tab. The text is copied: paste it into a new post.`
                  : `${info.label} opened in a new tab. Copy the text from the post first.`,
            );
            onShared();
          }}
          className={wide}
        >
          <ExternalLink aria-hidden="true" className="size-4" />
          {link.prefill ? `Open ${info.label} with the text` : `Copy and open ${info.label}`}
        </a>
        {message && (
          <p role="status" className="w-full text-sm text-pretty text-muted-foreground">
            {message}
          </p>
        )}
      </>
    );
  }

  // Newsletters, blogs and quote cards go wherever the church sends them from: copy the text.
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          setMessage((await copy(piece.body)) ? "Copied. Paste it where you send it from." : "Couldn't copy. Select the text in the post instead.");
          onShared();
        }}
        className={wide}
      >
        <Copy aria-hidden="true" className="size-4" />
        Copy text
      </button>
      {message && (
        <p role="status" className="w-full text-sm text-pretty text-muted-foreground">
          {message}
        </p>
      )}
    </>
  );
}

/**
 * "Post now": Mindra can't post on the platforms by itself yet, so it gets the post out in a tap (the share menu with
 * the video, photos or text; on computers the platform with the text) and then asks whether it went out, to mark it
 * as posted on today's calendar.
 */
export default function PostNow({ piece, onPosted }: { piece: ContentPiece; onPosted: (piece: ContentPiece) => void }) {
  const [shared, setShared] = useState(false);
  const markPosted = useMarkPosted();
  const info = platformInfo(piece.platform);
  const media = postMedia(piece);
  const clip = piece.clip;
  const markAsPosted = () => markPosted.mutate({ id: piece.id, posted: true }, { onSuccess: onPosted });

  return (
    <div className="space-y-5">
      <p className="text-sm text-pretty text-muted-foreground">
        Mindra can't post on {info.label} for you yet. It gets the post ready so you can post it yourself in a tap, then puts it on
        today's calendar as posted.
      </p>

      <div className="flex flex-wrap gap-2">
        {media === "video" && clip ? (
          <ShareButton
            clipId={clip.id}
            downloadUrl={clip.download_url}
            text={piece.body}
            title={piece.title || clip.title}
            variant="primary"
            size="md"
            wide
            onShared={() => setShared(true)}
          />
        ) : media === "photos" ? (
          <ShareButton
            key={piece.photos.map((photo) => photo.id).join()}
            loadFiles={() => photoFiles(piece.project)}
            text={piece.body}
            title={piece.title || piece.project_name}
            variant="primary"
            size="md"
            wide
            onShared={() => setShared(true)}
          />
        ) : (
          <TextPost piece={piece} onShared={() => setShared(true)} />
        )}
      </div>

      <div className="border-t border-border pt-4">
        {shared ? (
          <p className="mb-3 text-sm font-medium text-foreground">Posted it on {info.label}?</p>
        ) : (
          <p className="mb-3 text-sm text-pretty text-muted-foreground">Already posted it? Mark it so the calendar shows it.</p>
        )}
        {markPosted.isError && (
          <p role="alert" className="mb-3 text-sm text-pretty text-red-600">
            {markPosted.error.message}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <Dialog.Close className={buttonStyles({ variant: "secondary" })}>{shared ? "Not yet" : "Cancel"}</Dialog.Close>
          <button type="button" onClick={markAsPosted} disabled={markPosted.isPending} className={buttonStyles({ variant: shared ? "primary" : "secondary" })}>
            {markPosted.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}
            {shared ? "Yes, mark as posted" : "Mark as posted"}
          </button>
        </div>
      </div>
    </div>
  );
}
