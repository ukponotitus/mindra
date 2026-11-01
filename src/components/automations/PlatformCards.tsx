import { useId } from "react";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { Link } from "react-router";
import PlatformBadge from "../content/PlatformBadge";
import { cn } from "../../lib/cn";
import { TIKTOK_BRANDED_URL, TIKTOK_MUSIC_URL, TIKTOK_PRIVACY_LABELS, YOUTUBE_PRIVACY } from "../../lib/publishOptions";
import { useConnectedAccounts, useTikTokCreator } from "../../lib/social";
import type { ConnectedAccount, TikTokPrivacy } from "../../lib/types";
import type { AutomationConfig, PlatformId, TikTokConfig } from "../../lib/automations";

const selectClass =
  "h-10 w-full min-w-0 rounded-lg border border-border bg-card px-3 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-50";
const linkClass = "font-medium text-primary underline-offset-2 hover:underline";

function Tick({ label, hint, checked, disabled, onChange }: { label: string; hint?: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-start gap-2.5">
      <input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 size-4 shrink-0 rounded border-border accent-primary disabled:opacity-50" />
      <label htmlFor={id} className={cn("text-sm", disabled ? "text-muted-foreground" : "text-foreground")}>
        {label}
        {hint && <span className="block text-xs text-pretty text-muted-foreground">{hint}</span>}
      </label>
    </div>
  );
}

/** Where an account stands: connected and able to post, needing reconnecting, or not connected. */
function Connection({ account, kindLabel, drafts }: { account: ConnectedAccount | undefined; kindLabel: string; drafts: boolean }) {
  if (!account) {
    return (
      <p className="flex items-start gap-2 text-sm text-pretty text-muted-foreground">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-700" />
        <span>
          No {kindLabel} chosen.{" "}
          {drafts ? "Drafts don't need one, but posting does. " : ""}
          <Link to="/settings#accounts" className={linkClass}>
            Connect one in Settings
          </Link>
          , then come back.
        </span>
      </p>
    );
  }
  if (account.status === "needs_reconnect") {
    return (
      <p className="flex items-start gap-2 text-sm text-pretty text-red-700">
        <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
        <span>
          {account.name} needs reconnecting{account.last_error ? `: ${account.last_error}` : "."}{" "}
          <Link to="/settings#accounts" className={linkClass}>
            Reconnect it in Settings
          </Link>
        </span>
      </p>
    );
  }
  return (
    <p className="flex items-center gap-2 text-sm text-emerald-800">
      <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
      Connected as {account.name}
      {account.username ? ` (@${account.username})` : ""}.
    </p>
  );
}

function AccountSelect({ accounts, value, onChange, label }: { accounts: ConnectedAccount[]; value: number | null; onChange: (id: number | null) => void; label: string }) {
  const id = useId();
  if (accounts.length <= 1 && (value === null || accounts[0]?.id === value)) return null;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <select id={id} value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)} className={cn(selectClass, "max-w-md")}>
        <option value="">Choose…</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
            {account.status === "needs_reconnect" ? " (needs reconnecting)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

function PlatformCard({
  platform,
  on,
  onToggle,
  title,
  children,
}: {
  platform: PlatformId;
  on: boolean;
  onToggle: (on: boolean) => void;
  title: string;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <section className={cn("rounded-xl border bg-card", on ? "border-primary/40" : "border-border")} aria-labelledby={id}>
      <div className="flex items-center justify-between gap-3 p-4">
        <h3 id={id} className="flex items-center gap-2">
          <PlatformBadge platform={platform} withLabel={false} />
          <span className="font-semibold text-foreground">{title}</span>
        </h3>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={on} onChange={(event) => onToggle(event.target.checked)} className="size-4 rounded border-border accent-primary" />
          Post here
        </label>
      </div>
      {on && <div className="space-y-4 border-t border-border p-4">{children}</div>}
    </section>
  );
}

type Props = {
  platforms: PlatformId[];
  setPlatforms: (platforms: PlatformId[]) => void;
  youtube: number | null;
  setYoutube: (id: number | null) => void;
  tiktok: number | null;
  setTiktok: (id: number | null) => void;
  publishing: AutomationConfig["publishing"];
  setPublishing: (changes: Partial<AutomationConfig["publishing"]>) => void;
  tiktokConfig: TikTokConfig;
  setTiktokConfig: (changes: Partial<TikTokConfig>) => void;
  /** Saving drafts: accounts aren't needed yet. */
  drafts: boolean;
  /** TikTok has audited Mindra's app, so posts can be public. */
  tiktokPublic: boolean;
  /** How long each video is, to check against TikTok's limit for the account. */
  videoSeconds: number | null;
};

/** YouTube and TikTok, each with its connection, what it lets Mindra do, and its own settings. */
export default function PlatformCards(props: Props) {
  const accounts = useConnectedAccounts();
  const channels = (accounts.data ?? []).filter((account) => account.kind === "youtube");
  const tiktoks = (accounts.data ?? []).filter((account) => account.kind === "tiktok");
  const toggle = (platform: PlatformId, on: boolean) =>
    props.setPlatforms(on ? (["youtube", "tiktok"] as PlatformId[]).filter((item) => item === platform || props.platforms.includes(item)) : props.platforms.filter((item) => item !== platform));
  const youtube = channels.find((account) => account.id === props.youtube);
  const tiktok = tiktoks.find((account) => account.id === props.tiktok);
  const ids = { privacy: useId(), audience: useId(), delay: useId() };

  if (accounts.isPending) return <div aria-busy="true" className="h-40 animate-pulse rounded-xl border border-border bg-card" />;

  return (
    <div className="space-y-4">
      <PlatformCard platform="youtube" title="YouTube" on={props.platforms.includes("youtube")} onToggle={(on) => toggle("youtube", on)}>
        <AccountSelect accounts={channels} value={props.youtube} onChange={props.setYoutube} label="Channel" />
        {channels.length === 1 && props.youtube === null && (
          <button type="button" onClick={() => props.setYoutube(Number(channels[0].id))} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
            Use {channels[0].name}
          </button>
        )}
        <Connection account={youtube} kindLabel="YouTube channel" drafts={props.drafts} />
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.privacy} className="mb-1.5 block text-sm font-medium text-foreground">
              Who can watch
            </label>
            <select id={ids.privacy} value={props.publishing.privacy} onChange={(event) => props.setPublishing({ privacy: event.target.value as AutomationConfig["publishing"]["privacy"] })} className={selectClass}>
              {YOUTUBE_PRIVACY.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={ids.audience} className="mb-1.5 block text-sm font-medium text-foreground">
              Audience
            </label>
            <select id={ids.audience} value={props.publishing.made_for_kids ? "kids" : "not-kids"} onChange={(event) => props.setPublishing({ made_for_kids: event.target.value === "kids" })} className={selectClass}>
              <option value="not-kids">Not made for kids</option>
              <option value="kids">Made for kids</option>
            </select>
          </div>
        </div>
        <p className="text-xs text-pretty text-muted-foreground">
          Videos up to 3 minutes in the vertical shape go up as Shorts; longer ones as regular videos. YouTube picks the thumbnail from the video for now.
        </p>
      </PlatformCard>

      <PlatformCard platform="tiktok" title="TikTok" on={props.platforms.includes("tiktok")} onToggle={(on) => toggle("tiktok", on)}>
        <AccountSelect accounts={tiktoks} value={props.tiktok} onChange={props.setTiktok} label="Account" />
        {tiktoks.length === 1 && props.tiktok === null && (
          <button type="button" onClick={() => props.setTiktok(Number(tiktoks[0].id))} className="text-sm font-medium text-primary underline-offset-2 hover:underline">
            Use {tiktoks[0].name}
          </button>
        )}
        <Connection account={tiktok} kindLabel="TikTok account" drafts={props.drafts} />
        {!props.tiktokPublic && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-pretty text-amber-900">
            TikTok hasn&apos;t approved Mindra&apos;s app for public posts yet. Until it does, TikTok only takes private posts (Only you) from private accounts. Choose
            Only you, or save TikTok posts as drafts and post them yourself.
          </p>
        )}
        <TikTokFields
          account={tiktok?.status === "active" ? tiktok : null}
          value={props.tiktokConfig}
          onChange={props.setTiktokConfig}
          tiktokPublic={props.tiktokPublic}
          videoSeconds={props.videoSeconds}
        />
        <div className="max-w-xs">
          <label htmlFor={ids.delay} className="mb-1.5 block text-sm font-medium text-foreground">
            When on TikTok
          </label>
          <select id={ids.delay} value={props.tiktokConfig.delay_hours} onChange={(event) => props.setTiktokConfig({ delay_hours: Number(event.target.value) })} className={selectClass}>
            {[0, 1, 2, 3, 6, 12, 24].map((hours) => (
              <option key={hours} value={hours}>
                {hours === 0 ? "At the same time as YouTube" : `${hours} ${hours === 1 ? "hour" : "hours"} later`}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-pretty text-muted-foreground">
          TikTok asks that you see and approve each post, so TikTok posts always wait for your approval, even when YouTube posts go out on their own. Landscape videos
          show on TikTok with bars above and below; choose the vertical shape to fill the screen.
        </p>
      </PlatformCard>
    </div>
  );
}

/** TikTok's choices, as its content sharing guidelines lay them out: the account's nickname, who can see it (never
 * chosen for the person), interactions off until turned on, the commercial content disclosure, and the Music Usage
 * Confirmation. Set up once for an automation, and shown again, filled in, when each TikTok post is approved. */
export function TikTokFields({
  account,
  value: tiktokConfig,
  onChange: setTiktokConfig,
  tiktokPublic,
  videoSeconds,
}: {
  account: { id: number | string; name: string } | null;
  value: TikTokConfig;
  onChange: (changes: Partial<TikTokConfig>) => void;
  tiktokPublic: boolean;
  videoSeconds: number | null;
}) {
  const creator = useTikTokCreator(account?.id ?? null);
  const ids = { privacy: useId() };
  const info = creator.data;
  const options: TikTokPrivacy[] = info?.privacy_level_options?.length ? info.privacy_level_options : ["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"];
  const branded = tiktokConfig.branded_content;
  const tooLong = Boolean(videoSeconds && info?.max_video_post_duration_sec && videoSeconds > info.max_video_post_duration_sec);

  return (
    <div className="space-y-3">
      {account && creator.isPending && (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Checking the TikTok account…
        </p>
      )}
      {account && creator.isError && <p className="text-sm text-pretty text-red-700">{creator.error.message}</p>}
      {info && (
        <p className="text-sm text-pretty text-muted-foreground">
          Posting to TikTok as <span className="font-medium text-foreground">{info.nickname || account?.name}</span>
          {info.max_video_post_duration_sec ? `, which takes videos of up to ${Math.floor(info.max_video_post_duration_sec / 60)} minutes` : ""}.
        </p>
      )}
      {tooLong && (
        <p role="alert" className="text-sm text-pretty text-red-700">
          These videos are longer than this TikTok account can post. Choose a shorter length, or leave TikTok off.
        </p>
      )}
      <div className="max-w-md">
        <label htmlFor={ids.privacy} className="mb-1.5 block text-sm font-medium text-foreground">
          Who can see it
        </label>
        <select id={ids.privacy} value={tiktokConfig.privacy_level} required onChange={(event) => setTiktokConfig({ privacy_level: event.target.value as TikTokConfig["privacy_level"] })} className={selectClass}>
          <option value="" disabled>
            Choose…
          </option>
          {options.map((option) => (
            <option key={option} value={option} disabled={(branded && option === "SELF_ONLY") || (!tiktokPublic && option !== "SELF_ONLY")}>
              {TIKTOK_PRIVACY_LABELS[option] ?? option}
              {!tiktokPublic && option !== "SELF_ONLY" ? " (after TikTok approves Mindra)" : ""}
            </option>
          ))}
        </select>
      </div>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-foreground">Let others</legend>
        <Tick label="Comment" checked={tiktokConfig.allow_comment && !info?.comment_disabled} disabled={info?.comment_disabled} hint={info?.comment_disabled ? "Comments are off for this account in TikTok." : undefined} onChange={(allow_comment) => setTiktokConfig({ allow_comment })} />
        <Tick label="Duet" checked={tiktokConfig.allow_duet && !info?.duet_disabled} disabled={info?.duet_disabled} hint={info?.duet_disabled ? "Duets are off for this account in TikTok." : undefined} onChange={(allow_duet) => setTiktokConfig({ allow_duet })} />
        <Tick label="Stitch" checked={tiktokConfig.allow_stitch && !info?.stitch_disabled} disabled={info?.stitch_disabled} hint={info?.stitch_disabled ? "Stitches are off for this account in TikTok." : undefined} onChange={(allow_stitch) => setTiktokConfig({ allow_stitch })} />
      </fieldset>
      <div className="space-y-2 rounded-lg bg-secondary/50 p-3">
        <Tick
          label="Disclose that the videos promote a brand, product or service"
          checked={tiktokConfig.disclose}
          onChange={(disclose) => setTiktokConfig(disclose ? { disclose } : { disclose, your_brand: false, branded_content: false })}
        />
        {tiktokConfig.disclose && (
          <div className="space-y-2 pl-6">
            <Tick label="Your brand" hint="They promote yourself or your own business. TikTok labels them “Promotional content”." checked={tiktokConfig.your_brand} onChange={(your_brand) => setTiktokConfig({ your_brand })} />
            <Tick
              label="Branded content"
              hint={tiktokConfig.privacy_level === "SELF_ONLY" ? "Branded content can't be private: choose who else can see it first." : "They promote another brand or a third party. TikTok labels them “Paid partnership”."}
              checked={branded}
              disabled={tiktokConfig.privacy_level === "SELF_ONLY"}
              onChange={(branded_content) => setTiktokConfig({ branded_content })}
            />
          </div>
        )}
      </div>
      <Tick
        label="I agree to TikTok's Music Usage Confirmation for these posts"
        checked={tiktokConfig.music_consent}
        onChange={(music_consent) => setTiktokConfig({ music_consent })}
      />
      <p className="text-xs text-pretty text-muted-foreground">
        Read TikTok&apos;s{" "}
        <a href={TIKTOK_MUSIC_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Music Usage Confirmation
        </a>
        {branded && (
          <>
            {" "}
            and{" "}
            <a href={TIKTOK_BRANDED_URL} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Branded Content Policy
            </a>
          </>
        )}
        . These choices are shown again, filled in, each time you approve a TikTok post.
      </p>
    </div>
  );
}
