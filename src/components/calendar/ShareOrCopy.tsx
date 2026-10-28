import { useState } from "react";
import { Check, Copy } from "lucide-react";
import ShareButton from "../content/ShareButton";
import { buttonStyles } from "../ui/button";
import { postPhotoFiles } from "../../lib/photos";
import { postMedia } from "../../lib/social";
import type { ContentPiece } from "../../lib/types";

// Whether a post goes out with a made clip's video, or with its photos (automatic posting needs it too).
export { postMedia };

/**
 * The main way to post: Share for a clip's video or a photo post's pictures (with the caption), Copy text for a text
 * post. Put it in a wrapping flex row; Share adds its progress message as the row's last line.
 */
export default function ShareOrCopy({ piece, text, variant = "primary" }: { piece: ContentPiece; text: string; variant?: "primary" | "secondary" }) {
  const [copied, setCopied] = useState(false);
  const media = postMedia(piece);
  const clip = piece.clip;

  if (media === "video" && clip) {
    return <ShareButton clipId={clip.id} downloadUrl={clip.download_url} text={text} title={piece.title || clip.title} variant={variant} size="md" />;
  }
  if (media === "photos") {
    return (
      <ShareButton
        // New photos or a new order: fetch the files again.
        key={piece.photos.map((photo) => photo.id).join()}
        loadFiles={() => postPhotoFiles(piece.id)}
        text={text}
        title={piece.title || piece.project_name}
        variant={variant}
        size="md"
      />
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };
  return (
    <button type="button" onClick={copy} className={buttonStyles({ variant })}>
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
      {copied ? "Copied" : "Copy text"}
    </button>
  );
}
