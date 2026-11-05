import { useId } from "react";
import { Switch } from "@base-ui/react/switch";
import { LoaderCircle } from "lucide-react";
import {
  TIKTOK_BRANDED_NOT_PRIVATE,
  TIKTOK_BRANDED_URL,
  TIKTOK_CAPTION_MAX,
  TIKTOK_DESCRIPTION_MAX,
  TIKTOK_MUSIC_URL,
  TIKTOK_PRIVACY_LABELS,
  TIKTOK_TITLE_MAX,
  YOUTUBE_PRIVACY,
  firstLine,
} from "../../lib/publishOptions";
import { useTikTokCreator } from "../../lib/social";
import type { ConnectedAccount, ContentPiece, PublishOptions, TikTokPrivacy, YouTubePrivacy } from "../../lib/types";
import { switchClass, thumbClass } from "./dialogStyles";

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-50 aria-invalid:border-red-400";
const linkClass =
  "rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

interface Props {
  piece: ContentPiece;
  account: ConnectedAccount;
  value: PublishOptions;
  onChange: (value: PublishOptions) => void;
  /** TikTok's commercial content disclosure switch (kept by the caller, since "on with nothing chosen" isn't an option
   * the API keeps). */
  disclose: boolean;
  onDisclose: (on: boolean) => void;
  /** The post's text as it will go out, editable here for TikTok (its guidelines ask for it on the posting screen);
   * the caller saves a change to the post before posting. */
  caption?: string;
  onCaption?: (text: string) => void;
  disabled?: boolean;
}

function YouTubeFields({ value, onChange, disabled }: Pick<Props, "value" | "onChange" | "disabled">) {
  const ids = { privacy: useId(), audience: useId() };
  const audience = typeof value.made_for_kids === "boolean" ? (value.made_for_kids ? "kids" : "not-kids") : "channel";
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="min-w-0">
        <label htmlFor={ids.privacy} className="mb-1.5 block text-sm font-medium text-foreground">
          Who can watch
        </label>
        <select
          id={ids.privacy}
          value={value.privacy ?? "public"}
          disabled={disabled}
          onChange={(event) => onChange({ ...value, privacy: event.target.value as YouTubePrivacy })}
          className={fieldClass}
        >
          {YOUTUBE_PRIVACY.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-0">
        <label htmlFor={ids.audience} className="mb-1.5 block text-sm font-medium text-foreground">
          Audience
        </label>
        <select
          id={ids.audience}
          value={audience}
          disabled={disabled}
          onChange={(event) => {
            const { made_for_kids: _old, ...rest } = value;
            const next = event.target.value;
            onChange(next === "channel" ? rest : { ...rest, made_for_kids: next === "kids" });
          }}
          className={fieldClass}
        >
          <option value="channel">The channel's setting</option>
          <option value="not-kids">Not made for kids</option>
          <option value="kids">Made for kids</option>
        </select>
      </div>
    </div>
  );
}

function Check({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary disabled:opacity-50"
      />
      <label htmlFor={id} className={disabled ? "text-sm text-muted-foreground" : "text-sm text-foreground"}>
        {label}
        {hint && <span className="block text-xs text-pretty text-muted-foreground">{hint}</span>}
      </label>
    </div>
  );
}

/** What goes to TikTok, on the same screen as its choices (TikTok's guidelines): the video or photos, the caption to
 * edit, and for photos the title. */
function TikTokPreview({ piece, value, onChange, caption, onCaption, disabled }: Props) {
  const ids = { caption: useId(), captionCount: useId(), title: useId() };
  const photos = piece.clip ? [] : (piece.photos ?? []);
  const text = caption ?? piece.body;
  const captionMax = photos.length ? TIKTOK_DESCRIPTION_MAX : TIKTOK_CAPTION_MAX;
  const title = value.title ?? firstLine(text).slice(0, TIKTOK_TITLE_MAX);
  return (
    <div className="space-y-3">
      {piece.clip?.video_url ? (
        <video
          src={piece.clip.video_url}
          poster={piece.clip.thumbnail_url ?? undefined}
          controls
          preload="none"
          aria-label="The video that goes to TikTok"
          className="max-h-56 rounded-lg bg-black"
        />
      ) : photos.length > 0 ? (
        <ul aria-label="The photos that go to TikTok" className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, index) => (
            <li key={photo.id} className="shrink-0">
              <img
                src={photo.thumbnail_url ?? photo.url}
                alt={`Photo ${index + 1} of ${photos.length}`}
                loading="lazy"
                className="size-20 rounded-lg object-cover"
              />
            </li>
          ))}
        </ul>
      ) : null}
      {piece.clip?.watermarked && (
        <p className="text-xs text-pretty text-muted-foreground">
          TikTok doesn't allow Mindra's mark, so TikTok gets a copy of this clip without it. Posting takes a minute or two longer.
        </p>
      )}
      {photos.length > 0 && (
        <div>
          <label htmlFor={ids.title} className="mb-1.5 block text-sm font-medium text-foreground">
            Title
          </label>
          <input
            id={ids.title}
            value={title}
            maxLength={TIKTOK_TITLE_MAX}
            disabled={disabled}
            onChange={(event) => onChange({ ...value, title: event.target.value })}
            className={fieldClass}
          />
        </div>
      )}
      <div>
        <label htmlFor={ids.caption} className="mb-1.5 block text-sm font-medium text-foreground">
          {photos.length ? "Description" : "Caption"}
        </label>
        <textarea
          id={ids.caption}
          value={text}
          rows={4}
          maxLength={captionMax}
          disabled={disabled || !onCaption}
          aria-describedby={ids.captionCount}
          onChange={(event) => onCaption?.(event.target.value)}
          className="w-full min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-50"
        />
        <p id={ids.captionCount} className="mt-1 text-xs text-muted-foreground tabular-nums">
          {text.length.toLocaleString()} of {captionMax.toLocaleString()} characters. A change here is saved to the post.
        </p>
      </div>
    </div>
  );
}

/** TikTok's posting rules: a preview with the caption to edit, the account's nickname, a visibility the person picks
 * (never chosen for them), interactions off until turned on, the commercial content disclosure in TikTok's words, the
 * AI-generated label, and the Music Usage Confirmation. */
function TikTokFields(props: Props) {
  const { piece, account, value, onChange, disclose, onDisclose, disabled } = props;
  const creator = useTikTokCreator(account.id);
  const ids = { privacy: useId(), disclose: useId(), discloseNote: useId(), label: useId(), ai: useId(), aiNote: useId() };
  const photos = !piece.clip && (piece.photos ?? []).length > 0;
  const noun = photos ? "photo" : "video";
  const set = (changes: PublishOptions) => onChange({ ...value, ...changes });

  if (creator.isPending) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Checking the TikTok account…
      </p>
    );
  }
  if (creator.isError) {
    return (
      <p role="alert" className="text-sm text-pretty text-red-600">
        {creator.error.message}
      </p>
    );
  }
  const info = creator.data;
  const tooLong = Boolean(piece.clip && info.max_video_post_duration_sec && piece.clip.duration > info.max_video_post_duration_sec);
  const branded = value.branded_content === true;

  return (
    <div className="space-y-3">
      <p className="text-sm text-pretty text-muted-foreground">
        Posting to TikTok as <span className="font-medium text-foreground">{info.nickname || accountNameFallback(account)}</span>.
      </p>
      <TikTokPreview {...props} />
      {tooLong && (
        <p role="alert" className="text-sm text-pretty text-red-600">
          This TikTok account can post videos of up to {info.max_video_post_duration_sec} seconds, and this clip is longer.
        </p>
      )}
      <div>
        <label htmlFor={ids.privacy} className="mb-1.5 block text-sm font-medium text-foreground">
          Who can see it
        </label>
        <select
          id={ids.privacy}
          value={value.privacy_level ?? ""}
          disabled={disabled}
          required
          onChange={(event) => set({ privacy_level: (event.target.value || undefined) as TikTokPrivacy | undefined })}
          className={fieldClass}
        >
          <option value="" disabled>
            Choose…
          </option>
          {info.privacy_level_options.map((option) => (
            <option
              key={option}
              value={option}
              disabled={branded && option === "SELF_ONLY"}
              title={branded && option === "SELF_ONLY" ? TIKTOK_BRANDED_NOT_PRIVATE : undefined}
            >
              {TIKTOK_PRIVACY_LABELS[option] ?? option}
              {branded && option === "SELF_ONLY" ? " (branded content can't be private)" : ""}
            </option>
          ))}
        </select>
        {info.audited === false && (
          <p className="mt-1.5 text-xs text-pretty text-muted-foreground">
            Until TikTok approves Mindra, posts go up as “Only you”, and the TikTok account must be set to private. You can
            change who sees a post in TikTok afterwards.
          </p>
        )}
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-foreground">Let others</legend>
        <Check
          label="Comment"
          checked={value.allow_comment === true && !info.comment_disabled}
          disabled={disabled || info.comment_disabled}
          hint={info.comment_disabled ? "Comments are off for this account in TikTok." : undefined}
          onChange={(checked) => set({ allow_comment: checked })}
        />
        {!photos && (
          <>
            <Check
              label="Duet"
              checked={value.allow_duet === true && !info.duet_disabled}
              disabled={disabled || info.duet_disabled}
              hint={info.duet_disabled ? "Duets are off for this account in TikTok." : undefined}
              onChange={(checked) => set({ allow_duet: checked })}
            />
            <Check
              label="Stitch"
              checked={value.allow_stitch === true && !info.stitch_disabled}
              disabled={disabled || info.stitch_disabled}
              hint={info.stitch_disabled ? "Stitches are off for this account in TikTok." : undefined}
              onChange={(checked) => set({ allow_stitch: checked })}
            />
          </>
        )}
      </fieldset>
      <div className="rounded-lg bg-background p-3">
        <div className="flex items-start justify-between gap-4">
          <label htmlFor={ids.disclose} className="text-sm font-medium text-foreground">
            Disclose that it promotes a brand, product or service
          </label>
          <Switch.Root
            id={ids.disclose}
            nativeButton
            render={<button type="button" />}
            checked={disclose}
            disabled={disabled}
            onCheckedChange={(on) => {
              onDisclose(on);
              if (!on) set({ your_brand: false, branded_content: false });
            }}
            aria-describedby={ids.discloseNote}
            className={switchClass}
          >
            <Switch.Thumb className={thumbClass} />
          </Switch.Root>
        </div>
        <p id={ids.discloseNote} className="mt-1 text-xs text-pretty text-muted-foreground">
          Turn this on if the post promotes yourself, your business, or another brand.
        </p>
        {disclose && (
          <div className="mt-3 space-y-2">
            <Check
              label="Your brand"
              hint="You are promoting yourself or your own business."
              checked={value.your_brand === true}
              disabled={disabled}
              onChange={(checked) => set({ your_brand: checked })}
            />
            <Check
              label="Branded content"
              hint={
                value.privacy_level === "SELF_ONLY"
                  ? TIKTOK_BRANDED_NOT_PRIVATE
                  : "You are promoting another brand or a third party."
              }
              checked={branded}
              disabled={disabled || value.privacy_level === "SELF_ONLY"}
              onChange={(checked) => set({ branded_content: checked })}
            />
            {(branded || value.your_brand) && (
              <p id={ids.label} role="status" className="text-xs text-pretty text-foreground">
                Your {noun} will be labeled as “{branded ? "Paid partnership" : "Promotional content"}”.
              </p>
            )}
          </div>
        )}
      </div>
      {!photos && (
        <div className="flex items-start justify-between gap-4">
          <div>
            <label htmlFor={ids.ai} className="text-sm font-medium text-foreground">
              Label it as AI-generated
            </label>
            <p id={ids.aiNote} className="text-xs text-pretty text-muted-foreground">
              {piece.clip?.made_with_ai
                ? "Mindra made this video with AI, so TikTok's AI-generated label is on. You can turn it off."
                : "TikTok shows its AI-generated label on the video."}
            </p>
          </div>
          <Switch.Root
            id={ids.ai}
            nativeButton
            render={<button type="button" />}
            checked={value.ai_generated === true}
            disabled={disabled}
            onCheckedChange={(on) => set({ ai_generated: on })}
            aria-describedby={ids.aiNote}
            className={switchClass}
          >
            <Switch.Thumb className={thumbClass} />
          </Switch.Root>
        </div>
      )}
      <p className="text-xs text-pretty text-muted-foreground">
        By posting, you agree to TikTok's{" "}
        {branded && (
          <>
            <a href={TIKTOK_BRANDED_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Branded Content Policy
            </a>{" "}
            and{" "}
          </>
        )}
        <a href={TIKTOK_MUSIC_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Music Usage Confirmation
        </a>
        . It can take a few minutes to show on the profile after it's posted.
      </p>
    </div>
  );
}

function accountNameFallback(account: ConnectedAccount) {
  return account.username ? `@${account.username}` : account.name;
}

/** The choices a post needs on its service, under "Post automatically": YouTube's visibility and audience, or TikTok's
 * settings. Nothing for other services. */
export default function PublishOptionsFields(props: Props) {
  if (props.account.kind === "youtube") return <YouTubeFields value={props.value} onChange={props.onChange} disabled={props.disabled} />;
  if (props.account.kind === "tiktok") return <TikTokFields {...props} />;
  return null;
}
