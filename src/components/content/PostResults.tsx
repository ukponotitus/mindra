import { useId, useState } from "react";
import { Check, Copy, ExternalLink, Link2, RefreshCw } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../../lib/cn";
import { platformInfo } from "../../lib/projects";
import {
  findAddresses,
  formatCount,
  formatRelative,
  NUMBER_LABELS,
  NUMBER_NAMES,
  shortAddress,
  swapAddress,
  useMakeLink,
  usePasteLink,
  usePostResults,
  useRefreshResults,
  useStopFollowing,
  type PostResult,
  type TrackedLink,
} from "../../lib/results";
import type { ContentPiece } from "../../lib/types";
import { buttonStyles } from "../ui/button";

const SERVICES: Record<PostResult["kind"], string> = {
  youtube: "YouTube",
  x: "X",
  facebook_page: "Facebook",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  wordpress: "WordPress",
};
// Captions there don't make links tappable.
const NO_TAPPABLE_LINKS: Partial<Record<ContentPiece["platform"], string>> = {
  instagram: "Links in Instagram captions can't be tapped. Put the link in your bio or a story too.",
  tiktok: "Links in TikTok captions can't be tapped. Put the link in your bio too.",
};
const smallButton = buttonStyles({ variant: "secondary", size: "sm", className: "h-8" });
const textLink =
  "rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** ["views", "likes", "comments"] → "views, likes and comments". */
function listed(words: string[]) {
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : (words[0] ?? "");
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2000);
      }}
      aria-label={copied ? "Copied" : `Copy ${url}`}
      className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
    >
      {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
    </button>
  );
}

/** The numbers Mindra read, when, and Update now. */
function Numbers({ pieceId, result, clicks, hasLinks }: { pieceId: string; result: PostResult; clicks: number; hasLinks: boolean }) {
  const refresh = useRefreshResults(pieceId);
  const stop = useStopFollowing(pieceId);
  const shown = NUMBER_NAMES.filter((name) => result[name] !== null);
  const label = (name: (typeof NUMBER_NAMES)[number]) =>
    name === "likes" && result.kind === "facebook_page" ? "Reactions" : NUMBER_LABELS[name];
  const service = SERVICES[result.kind];

  let when = result.source === "found" ? `Mindra found it on your ${service} account. ` : "";
  if (!result.fetched_at) when += "The first numbers come about an hour after it went out.";
  else if (result.next_fetch_at) when += `Updated ${formatRelative(result.fetched_at)}. Next update ${formatRelative(result.next_fetch_at)}.`;
  else when += `Updated ${formatRelative(result.fetched_at)}. Mindra followed it for its first month.`;

  return (
    <div>
      {(result.fetched_at || hasLinks) && (
        <dl className="grid grid-cols-2 gap-2">
          {result.fetched_at && shown.map((name) => <Tile key={name} label={label(name)} value={formatCount(result[name])} />)}
          {hasLinks && <Tile label="Link clicks" value={formatCount(clicks)} />}
        </dl>
      )}
      <p className="mt-2 text-xs text-pretty text-muted-foreground">
        {when} {result.account_name && `On ${result.account_name}.`}
      </p>
      {result.fetched_at && shown.length < 4 && (
        <p className="mt-1 text-xs text-pretty text-muted-foreground">
          {service} shares {listed(shown.map((name) => label(name).toLowerCase())) || "no numbers"} with Mindra.
        </p>
      )}
      {result.error && (
        <p role="alert" className="mt-2 text-sm text-pretty text-amber-800">
          {result.error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {/* A post Mindra published has its link in the Schedule section already. */}
        {result.url && result.source !== "published" && (
          <a href={result.url} target="_blank" rel="noreferrer" className={smallButton}>
            <ExternalLink aria-hidden="true" className="size-4" />
            See it on {service}
          </a>
        )}
        {result.can_refresh && (
          <button type="button" onClick={() => refresh.mutate()} disabled={refresh.isPending} className={smallButton}>
            <RefreshCw aria-hidden="true" className={cn("size-4", refresh.isPending && "animate-spin")} />
            {refresh.isPending ? "Updating…" : "Update now"}
          </button>
        )}
        {result.source !== "published" && (
          <button
            type="button"
            onClick={() => stop.mutate()}
            disabled={stop.isPending}
            className={buttonStyles({ variant: "ghost", size: "sm", className: "h-8" })}
          >
            Stop following
          </button>
        )}
      </div>
      {!result.can_refresh && result.refresh_after && (
        <p className="mt-2 text-xs text-muted-foreground">You can update it again {formatRelative(result.refresh_after)}.</p>
      )}
      {(refresh.error ?? stop.error) && (
        <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
          {(refresh.error ?? stop.error)?.message}
        </p>
      )}
    </div>
  );
}

/** For a post shared by hand: paste its link on YouTube, X or Instagram, and Mindra follows it. */
function PasteLink({ pieceId, service }: { pieceId: string; service: string }) {
  const [url, setUrl] = useState("");
  const paste = usePasteLink(pieceId);
  const field = useId();
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (url.trim()) paste.mutate(url.trim());
      }}
      className="space-y-2"
    >
      <label htmlFor={field} className="block text-sm text-pretty text-muted-foreground">
        Shared it yourself? Paste its link on {service} and Mindra follows its numbers for a month.
      </label>
      <div className="flex gap-2">
        <input
          id={field}
          type="url"
          inputMode="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={`Link to the post on ${service}`}
          aria-invalid={paste.isError || undefined}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
        />
        <button type="submit" disabled={!url.trim() || paste.isPending} className={buttonStyles({ size: "sm", className: "h-9" })}>
          {paste.isPending ? "Finding…" : "Follow"}
        </button>
      </div>
      {paste.isError && (
        <p role="alert" className="text-sm text-pretty text-red-600">
          {paste.error.message}
        </p>
      )}
    </form>
  );
}

interface LinksProps {
  pieceId: string;
  platform: ContentPiece["platform"];
  links: TrackedLink[];
  /** The post's text as it is in the editor, and how to change it; without them the links are only listed. */
  body?: string;
  onChange?: (body: string) => void;
  /** The post is out: its text can't change any more. */
  out: boolean;
  /** The text in the editor isn't saved. */
  unsaved: boolean;
}

/** The post's web addresses: each counted with a Mindra link, or "Count clicks" to swap one in. */
function Links({ pieceId, platform, links, body, onChange, out, unsaved }: LinksProps) {
  const make = useMakeLink(pieceId);
  const byShortUrl = new Map(links.map((link) => [link.short_url, link]));
  const editable = body !== undefined && onChange !== undefined && !out;
  const addresses = editable ? findAddresses(body) : [];
  const plain = addresses.filter((address) => !byShortUrl.has(address));
  // Links in the text, then links made for the post that aren't in it (any more, or yet saved).
  const counted = editable ? addresses.flatMap((address) => byShortUrl.get(address) ?? []) : links;
  const elsewhere = editable ? links.filter((link) => !addresses.includes(link.short_url)) : [];
  const [swapped, setSwapped] = useState(false);

  if (!editable && !links.length) return null;
  return (
    <div className="mt-4 border-t border-border pt-4">
      <h4 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
        Links in this post
      </h4>
      {editable && !addresses.length && !links.length && (
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          Add a web address to the post (https://…) to count how many people click it.
        </p>
      )}
      <ul className="mt-2 space-y-2">
        {[...counted, ...elsewhere].map((link) => (
          <li key={link.code} className="flex items-center gap-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{shortAddress(link.short_url)}</p>
              <p className="truncate text-xs text-muted-foreground">
                To {shortAddress(link.destination)}
                {elsewhere.includes(link) && editable ? " · not in the text" : ""}
              </p>
            </div>
            <span className="text-sm text-foreground tabular-nums">
              {link.clicks.toLocaleString()} {link.clicks === 1 ? "click" : "clicks"}
            </span>
            <CopyLink url={link.short_url} />
          </li>
        ))}
        {plain.map((address) => (
          <li key={address} className="flex items-center gap-2 text-sm">
            <p className="min-w-0 flex-1 truncate text-foreground">{shortAddress(address)}</p>
            <button
              type="button"
              disabled={make.isPending}
              onClick={() =>
                make.mutate(address, {
                  onSuccess: (link) => {
                    onChange?.(swapAddress(body ?? "", address, link.short_url));
                    setSwapped(true);
                  },
                })
              }
              className={smallButton}
            >
              Count clicks
            </button>
          </li>
        ))}
      </ul>
      {plain.length > 0 && (
        <p className="mt-2 text-xs text-pretty text-muted-foreground">
          “Count clicks” puts a Mindra link in its place, which counts each click and sends people on.
        </p>
      )}
      {swapped && unsaved && <p className="mt-2 text-xs font-medium text-amber-700">Save the post to keep the new link.</p>}
      {editable && addresses.length > 0 && NO_TAPPABLE_LINKS[platform] && (
        <p className="mt-2 text-xs text-pretty text-muted-foreground">{NO_TAPPABLE_LINKS[platform]}</p>
      )}
      {make.isError && (
        <p role="alert" className="mt-2 text-sm text-pretty text-red-600">
          {make.error.message}
        </p>
      )}
    </div>
  );
}

interface Props {
  piece: ContentPiece;
  /** In the editor: the text being edited and how to change it, so web addresses can be swapped for Mindra links. */
  body?: string;
  onBodyChange?: (body: string) => void;
}

/** A post's analytics: its views, likes, comments and shares on its platform, and the clicks on its Mindra links. */
export default function PostResults({ piece, body, onBodyChange }: Props) {
  const results = usePostResults(piece.id);
  const platform = platformInfo(piece.platform).label;
  const out = Boolean(piece.posted_at || piece.published_at);

  let content = null;
  if (results.isPending) {
    content = <div aria-hidden="true" className="h-16 animate-pulse rounded-lg bg-secondary" />;
  } else if (results.isError) {
    content = <p className="text-sm text-pretty text-red-600">{results.error.message}</p>;
  } else {
    const { result, links, clicks, readable, paste_service, paste_ready, search } = results.data;
    // Shared by hand: Mindra looks for it on the connected account (YouTube, Instagram, a Facebook Page).
    const looking = search && !search.found && (
      <p className="mb-3 text-sm text-pretty text-muted-foreground">
        Mindra is looking for it on your {platform === "YouTube Shorts" ? "YouTube" : platform} account, to follow its numbers
        {search.last_tried_at ? ` (last looked ${formatRelative(search.last_tried_at)})` : ""}. It looks again over the next day.
      </p>
    );
    let status = null;
    if (result) {
      status = <Numbers pieceId={piece.id} result={result} clicks={clicks} hasLinks={links.length > 0} />;
    } else if (!readable) {
      status = (
        <p className="text-sm text-pretty text-muted-foreground">
          {platform} doesn't share views or likes with Mindra. Count clicks on its links instead.
        </p>
      );
    } else if (!out) {
      status = (
        <p className="text-sm text-pretty text-muted-foreground">
          Once it's posted, its views, likes and comments show here.
        </p>
      );
    } else if (paste_service && paste_ready) {
      status = (
        <>
          {looking}
          <PasteLink pieceId={piece.id} service={paste_service} />
        </>
      );
    } else if (paste_service) {
      status = (
        <p className="text-sm text-pretty text-muted-foreground">
          To follow its views and likes,{" "}
          <Link to="/settings#accounts" className={textLink}>
            connect your {paste_service} account
          </Link>
          , then paste its link here.
        </p>
      );
    } else {
      status = looking || (
        <p className="text-sm text-pretty text-muted-foreground">
          Mindra looks for {platform} posts you share yourself on your connected Page a few minutes after you mark them as posted, and follows the one
          it finds. If your Page isn't connected,{" "}
          <Link to="/settings#accounts" className={textLink}>
            connect it in Settings
          </Link>
          .
        </p>
      );
    }
    content = (
      <>
        {status}
        <Links
          pieceId={piece.id}
          platform={piece.platform}
          links={links}
          body={body}
          onChange={onBodyChange}
          out={out}
          unsaved={body !== undefined && body !== piece.body}
        />
      </>
    );
  }

  return (
    <section aria-labelledby={`post-results-${piece.id}`} className="rounded-xl border border-border bg-white p-5">
      <h3 id={`post-results-${piece.id}`} className="mb-3 text-sm font-semibold text-foreground">
        Analytics
      </h3>
      {content}
    </section>
  );
}
