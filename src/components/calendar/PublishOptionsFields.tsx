import { useId } from "react";
import { Switch } from "@base-ui/react/switch";
import { LoaderCircle } from "lucide-react";
import {
  TIKTOK_BRANDED_URL,
  TIKTOK_MUSIC_URL,
  TIKTOK_PRIVACY_LABELS,
  YOUTUBE_PRIVACY,
} from "../../lib/publishOptions";
import { useTikTokCreator } from "../../lib/social";
import type { ConnectedAccount, ContentPiece, PublishOptions, TikTokPrivacy, YouTubePrivacy } from "../../lib/types";
import { switchClass, thumbClass } from "./dialogStyles";

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-white px-3 text-sm text-foreground transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-50 aria-invalid:border-red-400";
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

/** TikTok's posting rules: the account's nickname, a visibility the person picks (never chosen for them),
 * interactions off until turned on, the commercial content disclosure, and the Music Usage Confirmation. */
function TikTokFields({ piece, account, value, onChange, disclose, onDisclose, disabled }: Props) {
  const creator = useTikTokCreator(account.id);
  const ids = { privacy: useId(), disclose: useId(), discloseNote: useId() };
  const photos = !piece.clip && (piece.photos ?? []).length > 0;
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
            <option key={option} value={option} disabled={branded && option === "SELF_ONLY"}>
              {TIKTOK_PRIVACY_LABELS[option] ?? option}
              {branded && option === "SELF_ONLY" ? " (not for branded content)" : ""}
            </option>
          ))}
        </select>
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
              hint="It promotes yourself or your own business. TikTok labels it “Promotional content”."
              checked={value.your_brand === true}
              disabled={disabled}
              onChange={(checked) => set({ your_brand: checked })}
            />
            <Check
              label="Branded content"
              hint={
                value.privacy_level === "SELF_ONLY"
                  ? "Branded content can't be private: choose who else can see it first."
                  : "It promotes another brand or a third party. TikTok labels it “Paid partnership”."
              }
              checked={branded}
              disabled={disabled || value.privacy_level === "SELF_ONLY"}
              onChange={(checked) => set({ branded_content: checked })}
            />
          </div>
        )}
      </div>
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
