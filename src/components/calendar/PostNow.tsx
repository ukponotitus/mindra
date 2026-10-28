import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, Copy, ExternalLink, LoaderCircle, Send, Share2 } from "lucide-react";
import { Dialog } from "@base-ui/react/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import ShareButton from "../content/ShareButton";
import { buttonStyles } from "../ui/button";
import { useMarkPosted, useStorePiece } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import { postPhotoFiles } from "../../lib/photos";
import { platformInfo } from "../../lib/projects";
import { hasOptions, optionsProblem, startingOptions } from "../../lib/publishOptions";
import {
  accountName,
  defaultAccount,
  kindPhrase,
  postMedia,
  publishProgressKey,
  sameAccount,
  useAutoPost,
  usePublishPiece,
  usePublishProgress,
  viewOnLabel,
  type AutoPost,
} from "../../lib/social";
import type { ConnectedAccount, ContentPiece, Platform, PublishOptions } from "../../lib/types";
import PublishOptionsFields from "./PublishOptionsFields";

/** Where to post a text post on a computer. `prefill` sites take the text in the link; the rest get it pasted. */
const PLATFORM_LINKS: Partial<Record<Platform, { url: (text: string) => string; prefill?: boolean }>> = {
  whatsapp: { url: (text) => `https://wa.me/?text=${encodeURIComponent(text)}`, prefill: true },
  x: { url: (text) => `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, prefill: true },
  facebook: { url: () => "https://www.facebook.com/" },
  instagram: { url: () => "https://www.instagram.com/" },
  linkedin: { url: () => "https://www.linkedin.com/feed/" },
  tiktok: { url: () => "https://www.tiktok.com/upload" },
  youtube_shorts: { url: () => "https://studio.youtube.com/" },
  youtube: { url: () => "https://studio.youtube.com/" },
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
function TextPost({ piece, onShared, variant }: { piece: ContentPiece; onShared: () => void; variant: "primary" | "secondary" }) {
  const [sharing] = useState(canShareText);
  const [message, setMessage] = useState("");
  const info = platformInfo(piece.platform);
  const link = PLATFORM_LINKS[piece.platform];
  const wide = buttonStyles({ variant, className: "w-full" });

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

  // Newsletters, blogs and quote cards go wherever they're sent from: copy the text.
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

const settingsLinkClass =
  "rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** The first line of Post now when Mindra can't post it here itself: why, and that it gets it ready to share instead. */
function sharingIntro(auto: AutoPost, platformLabel: string): ReactNode {
  const ready = "Mindra gets the post ready so you can post it yourself in a tap, then puts it on today's calendar as posted.";
  const accounts = (
    <Link to="/settings#accounts" className={settingsLinkClass}>
      Settings → Connected accounts
    </Link>
  );
  switch (auto.state) {
    case "unsupported":
      return `Mindra can't post on ${platformLabel} for you yet. It gets the post ready so you can post it yourself in a tap, then puts it on today's calendar as posted.`;
    case "not-set-up":
      return `Automatic posting to ${platformLabel} isn't switched on for Mindra yet. ${ready}`;
    case "needs-media":
      return `${auto.message} ${ready}`;
    case "no-account":
      return (
        <>
          {ready} To post from Mindra instead, connect {kindPhrase(auto.kind)} in {accounts}.
        </>
      );
    case "needs-reconnect":
      return (
        <>
          {auto.accounts.map(accountName).join(", ")} {auto.accounts.length === 1 ? "needs" : "need"} reconnecting before Mindra can post
          there ({accounts}). {ready}
        </>
      );
    default:
      return ready;
  }
}

type Phase = "idle" | "publishing" | "published" | "failed";

const outcomeLinkClass =
  "inline-flex items-center gap-1 rounded font-medium text-emerald-800 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** It's out: "Posted. View on Facebook". */
function Posted({ live }: { live: ContentPiece }) {
  return (
    <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-pretty text-emerald-800">
      <p className="flex items-center gap-2 font-medium">
        <Check aria-hidden="true" className="size-4 shrink-0" />
        Posted.
      </p>
      {live.published_url ? (
        <a href={live.published_url} target="_blank" rel="noopener noreferrer" className={cn(outcomeLinkClass, "mt-1")}>
          {viewOnLabel(live.platform)}
          <ExternalLink aria-hidden="true" className="size-3.5" />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <p className="mt-1">It's on {live.publish_to_name || platformInfo(live.platform).label} now.</p>
      )}
    </div>
  );
}

/**
 * "Post to Grace Chapel now" (a choice of account when there are several), "Posting to Grace Chapel…" while it goes out,
 * and why it failed, with Try again.
 */
function PostToAccount({
  piece,
  accounts,
  phase,
  live,
  onStart,
  starting,
  error,
}: {
  piece: ContentPiece;
  /** The active accounts for this post (none when they couldn't be loaded). */
  accounts: ConnectedAccount[];
  phase: Exclude<Phase, "published">;
  live: ContentPiece;
  onStart: (account: ConnectedAccount, options: PublishOptions | undefined) => void;
  starting: boolean;
  error: string;
}) {
  const selectId = useId();
  const [picked, setPicked] = useState<string | null>(null);
  const account = accounts.find((option) => sameAccount(option.id, picked)) ?? defaultAccount(accounts, piece.publish_to);
  const chosen = account ? accountName(account) : live.publish_to_name || platformInfo(piece.platform).label;
  const busy = starting || phase === "publishing";
  const target = phase === "publishing" ? live.publish_to_name || chosen : chosen;
  // The choices the account's service needs (YouTube's visibility, TikTok's settings), from the post's own.
  const [chosenOptions, setChosenOptions] = useState<PublishOptions | null>(null);
  const [disclose, setDisclose] = useState(Boolean(piece.publish_options?.your_brand || piece.publish_options?.branded_content));
  const withOptions = Boolean(account && hasOptions(account.kind));
  const options =
    chosenOptions ?? (account ? startingOptions(account.kind, sameAccount(account.id, piece.publish_to) ? piece.publish_options : undefined) : {});
  const [tried, setTried] = useState(false);
  const optionsError = account && withOptions ? optionsProblem(account.kind, options, disclose) : "";
  const start = () => {
    setTried(true);
    if (!account || optionsError) return;
    onStart(account, withOptions ? options : undefined);
  };

  return (
    <div className="space-y-3">
      {accounts.length > 1 && (
        <div>
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-foreground">
            Account
          </label>
          <select
            id={selectId}
            value={account ? String(account.id) : ""}
            onChange={(event) => {
              setPicked(event.target.value);
              setChosenOptions(null);
            }}
            disabled={busy}
            className="h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-50"
          >
            {accounts.map((option) => (
              <option key={option.id} value={String(option.id)}>
                {accountName(option)}
              </option>
            ))}
          </select>
        </div>
      )}
      {phase === "failed" && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-pretty text-red-800">
          <p className="font-medium">Couldn't post it automatically</p>
          <p className="mt-0.5">{live.publish_error || "Something went wrong."}</p>
          <p className="mt-0.5">Try again, or post it yourself below.</p>
        </div>
      )}
      {account && withOptions && !busy && (
        <div className="rounded-lg border border-border p-3">
          <PublishOptionsFields
            piece={piece}
            account={account}
            value={options}
            onChange={setChosenOptions}
            disclose={disclose}
            onDisclose={setDisclose}
          />
        </div>
      )}
      {tried && optionsError && !busy && (
        <p role="alert" className="text-sm text-pretty text-red-600">
          {optionsError}
        </p>
      )}
      {(account || busy) && (
        <button
          type="button"
          onClick={start}
          disabled={busy || !account}
          // After a failure, posting it yourself (below) leads; trying again is the other way.
          className={buttonStyles({ variant: phase === "failed" ? "secondary" : "primary", className: "w-full" })}
        >
          {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" className="size-4" />}
          <span className="truncate">{busy ? `Posting to ${target}…` : phase === "failed" ? `Try again: post to ${chosen}` : `Post to ${chosen} now`}</span>
        </button>
      )}
      <p role="status" className={cn("text-sm text-pretty text-muted-foreground", phase !== "publishing" && "sr-only")}>
        {phase === "publishing" &&
          `${postMedia(piece) === "video" ? "A video can take a few minutes. " : ""}You can close this: the calendar shows it once it's out.`}
      </p>
      {phase === "idle" && piece.schedule_status === "failed" && piece.publish_error && (
        <p className="text-sm text-pretty text-muted-foreground">At its time, Mindra couldn't post it: {piece.publish_error}</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-pretty text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * "Post now". With a connected account for the post (a Facebook Page, an Instagram account, a YouTube channel, a
 * LinkedIn profile, an X or TikTok account, a WordPress site), Mindra posts it there itself. Otherwise
 * (and as the way out when that fails) it gets the post out in a tap (the share menu with the video, photos or text; on
 * computers the platform with the text) and then asks whether it went out, to mark it as posted on today's calendar.
 */
export default function PostNow({ piece, onPosted }: { piece: ContentPiece; onPosted: (piece: ContentPiece) => void }) {
  const [shared, setShared] = useState(false);
  const markPosted = useMarkPosted();
  const info = platformInfo(piece.platform);
  const media = postMedia(piece);
  const clip = piece.clip;
  // Marked by hand: that's the latest, so the copy followed below isn't stored over it.
  const markedByHand = useRef(false);
  const markAsPosted = () =>
    markPosted.mutate(
      { id: piece.id, posted: true },
      {
        onSuccess: (saved) => {
          markedByHand.current = true;
          onPosted(saved);
        },
      },
    );

  // Posting through a connected account. While the dialog is open the post is followed in its own copy (see
  // usePublishProgress); that copy is stored everywhere when the dialog closes.
  const auto = useAutoPost(piece);
  const queryClient = useQueryClient();
  const store = useStorePiece();
  const publish = usePublishPiece();
  const [watching, setWatching] = useState(piece.schedule_status === "publishing");
  const progress = usePublishProgress(piece.id, watching);
  const live = (watching && progress.data) || piece;
  const status = live.schedule_status;
  const phase: Phase =
    status === "publishing" ? "publishing" : watching && status === "published" ? "published" : watching && status === "failed" ? "failed" : "idle";
  const canPublish = auto.state === "ready" || phase !== "idle";
  const startPublish = (account: ConnectedAccount, options: PublishOptions | undefined) =>
    publish.mutate(
      { piece: live, account: account.id, options },
      {
        onSuccess: (saved) => {
          queryClient.setQueryData(publishProgressKey(piece.id), saved);
          setWatching(true);
        },
      },
    );

  const latest = useRef<ContentPiece | null>(null);
  latest.current = watching && live !== piece ? live : null;
  // When the dialog closes (`store` works the same from any render).
  useEffect(
    () => () => {
      if (latest.current && !markedByHand.current) store(latest.current);
    },
    [],
  );

  if (phase === "published") {
    return (
      <div className="space-y-5">
        <Posted live={live} />
        <div className="flex justify-end border-t border-border pt-4">
          <Dialog.Close className={buttonStyles({ variant: "secondary" })}>Done</Dialog.Close>
        </div>
      </div>
    );
  }

  // Sharing it yourself: the main way when Mindra can't post it, the other way when it can.
  const shareVariant = canPublish && phase !== "failed" ? "secondary" : "primary";
  const shareButtons = (
    <div className="flex flex-wrap gap-2">
      {media === "video" && clip ? (
        <ShareButton
          clipId={clip.id}
          downloadUrl={clip.download_url}
          text={piece.body}
          title={piece.title || clip.title}
          variant={shareVariant}
          size="md"
          wide
          onShared={() => setShared(true)}
        />
      ) : media === "photos" ? (
        <ShareButton
          key={piece.photos.map((photo) => photo.id).join()}
          loadFiles={() => postPhotoFiles(piece.id)}
          text={piece.body}
          title={piece.title || piece.project_name}
          variant={shareVariant}
          size="md"
          wide
          onShared={() => setShared(true)}
        />
      ) : (
        <TextPost piece={piece} onShared={() => setShared(true)} variant={shareVariant} />
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      {canPublish ? (
        <PostToAccount
          piece={piece}
          accounts={auto.state === "ready" ? auto.accounts : []}
          phase={phase}
          live={live}
          onStart={startPublish}
          starting={publish.isPending}
          error={publish.isError ? publish.error.message : ""}
        />
      ) : auto.state === "loading" ? (
        <div aria-hidden="true" className="h-10 animate-pulse rounded-lg bg-secondary" />
      ) : (
        <p className="text-sm text-pretty text-muted-foreground">{sharingIntro(auto, info.label)}</p>
      )}

      {phase === "publishing" ? (
        <div className="flex justify-end border-t border-border pt-4">
          <Dialog.Close className={buttonStyles({ variant: "secondary" })}>Close</Dialog.Close>
        </div>
      ) : (
        <>
          {canPublish ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Or post it yourself</p>
              {shareButtons}
            </div>
          ) : (
            shareButtons
          )}

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
              <button
                type="button"
                onClick={markAsPosted}
                disabled={markPosted.isPending}
                className={buttonStyles({ variant: shared ? "primary" : "secondary" })}
              >
                {markPosted.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Check aria-hidden="true" className="size-4" />}
                {shared ? "Yes, mark as posted" : "Mark as posted"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
