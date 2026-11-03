import { useId, useState } from "react";
import { ArrowLeft, Check, CircleAlert, ExternalLink, Image as ImageIcon, LoaderCircle, RotateCcw } from "lucide-react";
import { Link, Navigate, useParams } from "react-router";
import { TikTokFields } from "../components/automations/PlatformCards";
import Timeline from "../components/automations/Timeline";
import { ErrorNote, StatusPill } from "../components/automations/parts";
import PlatformBadge from "../components/content/PlatformBadge";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import {
  PLATFORM_LABELS,
  PRIVACY,
  REVISABLE,
  runIsWorking,
  runStatus,
  TRIGGER_LABELS,
  useAutomationsEnabled,
  useEditRun,
  useRun,
  useRunAction,
  WORDS_A_MINUTE,
  type PlatformId,
  type PostState,
  type RunCheck,
  type RunDetail,
  type ScripturePassage,
  type TikTokConfig,
} from "../lib/automations";
import { combine, dayKey, formatScheduled, timeValue, toOffsetIso } from "../lib/calendar";
import { cn } from "../lib/cn";
import type { Platform } from "../lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20";

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : error ? "That didn't go through. Check your connection and try again." : "";
}

/** The video the run made, or the clip or video it posts. */
function videoOf(run: RunDetail): { url: string | null; poster: string | null; tall: boolean } {
  if (run.render?.video_url) return { url: run.render.video_url, poster: run.render.thumbnail_url, tall: run.shape === "9:16" };
  if (run.source?.kind === "clip") return { url: run.source.video_url, poster: run.source.thumbnail_url, tall: run.source.shape === "vertical" };
  if (run.source?.kind === "video") return { url: run.source.url, poster: run.source.thumbnail_url, tall: Boolean(run.source.height && run.source.width && run.source.height > run.source.width) };
  return { url: null, poster: null, tall: run.shape === "9:16" };
}

function Player({ run, className }: { run: RunDetail; className?: string }) {
  const video = videoOf(run);
  return (
    <div className={cn("overflow-hidden rounded-lg bg-black", video.tall ? "mx-auto aspect-[9/16] max-h-[28rem]" : "aspect-video", className)}>
      {video.url ? (
        <video src={video.url} poster={video.poster ?? undefined} controls preload="metadata" className="size-full" />
      ) : (
        <p className="grid size-full place-items-center p-4 text-center text-sm text-white/70">The video isn&apos;t ready to watch yet.</p>
      )}
    </div>
  );
}

/** The script waits: approve it (as it is, or edited), have it written again, or reject the video. */
const PASSAGE_WORDS: Record<ScripturePassage["status"], string> = {
  matches: "Quoted word for word",
  paraphrase: "Paraphrased",
  mismatch: "The quote doesn't match",
  not_quoted_now: "Not quoted any more",
  not_listed: "Couldn't be checked",
  not_checked: "Not checked",
  unknown: "Not found in the Bible",
};

/** The Scripture check: each passage the script draws on, and for one that doesn't match, the translation's words. */
function ScriptureCheck({ check, bare = false }: { check: RunCheck; bare?: boolean }) {
  const passages = check.passages ?? [];
  return (
    <div
      className={cn(
        "space-y-2",
        !bare && "rounded-lg border p-3",
        !bare && (check.passed ? "border-border bg-secondary/40" : "border-amber-200 bg-amber-50"),
      )}
    >
      <p className={cn("text-sm text-pretty", check.passed ? "text-muted-foreground" : "font-medium text-amber-900")}>{check.message}</p>
      {passages.length > 0 && (
        <ul className="space-y-2">
          {passages.map((passage, index) => (
            <li key={`${passage.reference}-${index}`} className="text-sm">
              <span className="flex items-start gap-2">
                {passage.ok ? (
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                ) : (
                  <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-amber-800" />
                )}
                <span className="min-w-0">
                  <span className="font-medium text-foreground">{passage.reference || "A passage"}</span>{" "}
                  <span className="text-muted-foreground">· {PASSAGE_WORDS[passage.status]}</span>
                  {passage.problem && <span className="block text-pretty text-amber-900">{passage.problem}</span>}
                  {passage.status === "mismatch" && (
                    <>
                      <span className="mt-1 block text-pretty text-muted-foreground">The script says: “{passage.quote}”</span>
                      <span className="mt-0.5 block text-pretty text-foreground">The translation reads: “{passage.text}”</span>
                    </>
                  )}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The custom YouTube thumbnail at the video's approval: see it, take another frame, or leave YouTube to pick. */
function ThumbnailChoice({ run }: { run: RunDetail }) {
  const act = useRunAction(run.id);
  const thumbnail = run.custom_thumbnail;
  if (!thumbnail.status || !run.platforms.includes("youtube")) return null;
  const busy = act.isPending;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">YouTube thumbnail</p>
      {thumbnail.url ? (
        <img src={thumbnail.url} alt={`Thumbnail for ${run.title}`} className="aspect-video w-full rounded-lg border border-border object-cover" />
      ) : (
        <div className="grid aspect-video w-full place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
          <ImageIcon aria-hidden="true" className="size-6" />
        </div>
      )}
      {thumbnail.note && <p className="text-xs text-pretty text-muted-foreground">{thumbnail.note}</p>}
      {thumbnail.status === "ready" ? (
        <p className="text-xs text-pretty text-muted-foreground">Sent to YouTube once the video is up. A new title is put on it when you approve.</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {thumbnail.status === "ready" && (
          <>
            <button type="button" onClick={() => act.mutate({ action: "thumbnail", body: { choice: "another" } })} disabled={busy} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              {busy && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              Another frame
            </button>
            <button type="button" onClick={() => act.mutate({ action: "thumbnail", body: { choice: "none" } })} disabled={busy} className={buttonStyles({ variant: "ghost", size: "sm" })}>
              Use YouTube&apos;s frame
            </button>
          </>
        )}
        {thumbnail.status === "none" && thumbnail.note.startsWith("You chose") && (
          <button type="button" onClick={() => act.mutate({ action: "thumbnail", body: { choice: "custom" } })} disabled={busy} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Use a custom thumbnail
          </button>
        )}
      </div>
      {act.error && <ErrorNote>{errorText(act.error)}</ErrorNote>}
    </div>
  );
}

function ScriptApproval({ run }: { run: RunDetail }) {
  const act = useRunAction(run.id);
  const [script, setScript] = useState(run.script);
  const [note, setNote] = useState("");
  const noteId = useId();
  const scriptId = useId();
  const words = script.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / (WORDS_A_MINUTE.warm ?? 135)));
  const scripture = run.steps.find((step) => step.name === "script")?.detail.scripture_check as RunCheck | null | undefined;
  return (
    <section className="space-y-4 rounded-xl border border-amber-200 bg-card p-5">
      <div>
        <h3 className="font-semibold text-foreground">Approve the script</h3>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Nothing is narrated or made until you approve it. Change any words here first if you like.</p>
      </div>
      {scripture && <ScriptureCheck check={scripture} />}
      <div className="space-y-1.5">
        <label htmlFor={scriptId} className="block text-sm font-medium text-foreground">
          Script <span className="font-normal text-muted-foreground tabular-nums">({words} words, about {minutes} min read aloud)</span>
        </label>
        <textarea id={scriptId} value={script} onChange={(event) => setScript(event.target.value)} rows={14} className={cn(inputClass, "leading-relaxed")} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor={noteId} className="block text-sm font-medium text-foreground">
          Or say what to change, and Mindra writes it again
        </label>
        <input id={noteId} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="A shorter opening, and pray for students too." className={inputClass} />
      </div>
      {act.error && <ErrorNote>{errorText(act.error)}</ErrorNote>}
      <div className="flex flex-wrap justify-end gap-2">
        <ConfirmDialog
          trigger={
            <button type="button" disabled={act.isPending} className={buttonStyles({ variant: "ghost" })}>
              Reject
            </button>
          }
          title="Reject this video?"
          description="Nothing more is made for it, and its topic goes back on the list."
          confirmLabel="Reject"
          onConfirm={() => act.mutate({ action: "reject" })}
        />
        <button type="button" onClick={() => act.mutate({ action: "revise", body: { part: "script", note } })} disabled={act.isPending} className={buttonStyles({ variant: "secondary" })}>
          Write it again
        </button>
        <button
          type="button"
          onClick={() => act.mutate({ action: "approve", body: script.trim() !== run.script.trim() ? { script } : {} })}
          disabled={act.isPending || !script.trim()}
          className={buttonStyles({ variant: "primary" })}
        >
          {act.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Approve script
        </button>
      </div>
    </section>
  );
}

function CaptionField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        TikTok caption <span className="font-normal text-muted-foreground tabular-nums">({value.length}/2200)</span>
      </label>
      <textarea id={id} value={value} onChange={(event) => onChange(event.target.value)} rows={3} maxLength={2200} className={inputClass} />
    </div>
  );
}

/** The video waits: watch it, edit its texts, choose when it goes out and TikTok's settings, then approve, ask for a
 * part again, or reject. */
function VideoApproval({ run }: { run: RunDetail }) {
  const act = useRunAction(run.id);
  const [title, setTitle] = useState(run.title);
  const [description, setDescription] = useState(run.description);
  const [caption, setCaption] = useState(run.caption);
  const [tiktok, setTiktok] = useState<TikTokConfig>(run.tiktok);
  const slot = run.publish_at && new Date(run.publish_at).getTime() > Date.now() ? new Date(run.publish_at) : null;
  const [when, setWhen] = useState<"slot" | "now" | "later">(slot ? "slot" : "now");
  const [day, setDay] = useState(dayKey(slot ?? new Date(Date.now() + 3600_000)));
  const [time, setTime] = useState(timeValue(slot ?? new Date(Date.now() + 3600_000)));
  const [privacy, setPrivacy] = useState<string>(run.youtube_privacy);
  const [part, setPart] = useState("visuals");
  const [note, setNote] = useState("");
  const ids = useId();
  const failed = run.checks.filter((check) => !check.passed);
  const youtube = run.platforms.includes("youtube");
  const onTikTok = run.platforms.includes("tiktok");

  const approve = () => {
    const publish_at =
      when === "slot"
        ? run.publish_at
        : when === "now"
          ? null
          : (() => {
              const chosen = combine(day, time);
              return chosen ? toOffsetIso(chosen) : null;
            })();
    act.mutate({
      action: "approve",
      body: { publish_at, privacy, title, description, ...(onTikTok ? { caption, tiktok } : {}) },
    });
  };

  return (
    <section className="space-y-5 rounded-xl border border-amber-200 bg-card p-5">
      <div>
        <h3 className="font-semibold text-foreground">Approve the video</h3>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Watch it and check its words. Once approved, it&apos;s saved in the Content Library and scheduled.</p>
      </div>
      {failed.length > 0 && (
        <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-900">Checks that didn&apos;t pass</p>
          <ul className="space-y-1">
            {failed.map((check) =>
              check.name === "scripture" ? (
                <li key={check.name}>
                  <ScriptureCheck check={check} bare />
                </li>
              ) : (
                <li key={check.name} className="flex gap-2 text-sm text-amber-900">
                  <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  {check.message || check.name}
                </li>
              ),
            )}
          </ul>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Player run={run} />
          {run.project && (
            <Link to={`/studio/${run.project}`} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Open in Motion Studio
            </Link>
          )}
          <ThumbnailChoice run={run} />
        </div>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor={`${ids}-title`} className="block text-sm font-medium text-foreground">
              Title <span className="font-normal text-muted-foreground tabular-nums">({title.length}/100)</span>
            </label>
            <input id={`${ids}-title`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={100} className={inputClass} />
          </div>
          {youtube && (
            <div className="space-y-1.5">
              <label htmlFor={`${ids}-description`} className="block text-sm font-medium text-foreground">
                YouTube description
              </label>
              <textarea id={`${ids}-description`} value={description} onChange={(event) => setDescription(event.target.value)} rows={5} maxLength={5000} className={inputClass} />
            </div>
          )}
          {onTikTok && <CaptionField value={caption} onChange={setCaption} />}
          {run.checks.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {run.checks
                .filter((check) => check.passed)
                .map((check) => (
                  <li key={check.name}>{check.message}</li>
                ))}
            </ul>
          )}
        </div>
      </div>
      <fieldset className="space-y-3 border-t border-border pt-4">
        <legend className="text-sm font-medium text-foreground">When it goes out</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {slot && (
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name={`${ids}-when`} checked={when === "slot"} onChange={() => setWhen("slot")} className="accent-[var(--color-primary)]" />
              At its time, {formatScheduled(slot)}
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name={`${ids}-when`} checked={when === "now"} onChange={() => setWhen("now")} className="accent-[var(--color-primary)]" />
            Now
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" name={`${ids}-when`} checked={when === "later"} onChange={() => setWhen("later")} className="accent-[var(--color-primary)]" />
            Another time
          </label>
        </div>
        {when === "later" && (
          <div className="flex flex-wrap gap-2">
            <input type="date" aria-label="Day" value={day} onChange={(event) => setDay(event.target.value)} className={cn(inputClass, "w-auto")} />
            <input type="time" aria-label="Time" value={time} onChange={(event) => setTime(event.target.value)} className={cn(inputClass, "w-auto")} />
          </div>
        )}
        {youtube && (
          <label className="flex max-w-xs flex-col gap-1.5 text-sm font-medium text-foreground">
            Who can watch on YouTube
            <select value={privacy} onChange={(event) => setPrivacy(event.target.value)} className={inputClass}>
              {Object.entries(PRIVACY).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>
      {onTikTok && (
        <fieldset className="space-y-3 border-t border-border pt-4">
          <legend className="flex items-center gap-2 text-sm font-medium text-foreground">
            <PlatformBadge platform="tiktok" withLabel={false} />
            On TikTok
          </legend>
          <TikTokFields
            account={run.tiktok_account}
            value={tiktok}
            onChange={(changes) => setTiktok((current) => ({ ...current, ...changes }))}
            tiktokPublic={run.tiktok_public}
            videoSeconds={run.narration_seconds ?? run.source?.duration ?? null}
          />
        </fieldset>
      )}
      {run.kind === "create" && (
        <fieldset className="space-y-2 border-t border-border pt-4">
          <legend className="text-sm font-medium text-foreground">Or ask for a part again</legend>
          <div className="flex flex-wrap gap-2">
            <select aria-label="What to make again" value={part} onChange={(event) => setPart(event.target.value)} className={cn(inputClass, "w-auto")}>
              {REVISABLE.map((item) => (
                <option key={item.part} value={item.part}>
                  {item.label}
                </option>
              ))}
            </select>
            <input aria-label="What to change" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} placeholder="Use the sunrise photos" className={cn(inputClass, "min-w-48 flex-1")} />
            <button type="button" onClick={() => act.mutate({ action: "revise", body: { part, note } })} disabled={act.isPending} className={buttonStyles({ variant: "secondary" })}>
              Make it again
            </button>
          </div>
          <p className="text-xs text-muted-foreground">That part and everything after it is made again; what comes before is kept.</p>
        </fieldset>
      )}
      {act.error && <ErrorNote>{errorText(act.error)}</ErrorNote>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <ConfirmDialog
          trigger={
            <button type="button" disabled={act.isPending} className={buttonStyles({ variant: "ghost" })}>
              Reject
            </button>
          }
          title="Reject this video?"
          description="It isn't saved to the Content Library or posted, and its topic, clip or video goes back on the list."
          confirmLabel="Reject"
          onConfirm={() => act.mutate({ action: "reject" })}
        />
        <button type="button" onClick={approve} disabled={act.isPending || !title.trim()} className={buttonStyles({ variant: "primary" })}>
          {act.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Approve and schedule
        </button>
      </div>
    </section>
  );
}

/** In automatic mode, the TikTok post waits on its own: TikTok asks that people see and approve each post. */
function TikTokApproval({ run }: { run: RunDetail }) {
  const act = useRunAction(run.id);
  const edit = useEditRun(run.id);
  const [caption, setCaption] = useState(run.caption);
  const [tiktok, setTiktok] = useState<TikTokConfig>(run.tiktok);
  const approve = () => act.mutate({ action: "approve", body: { caption, tiktok } });
  return (
    <section className="space-y-5 rounded-xl border border-amber-200 bg-card p-5">
      <div>
        <h3 className="flex items-center gap-2 font-semibold text-foreground">
          <PlatformBadge platform="tiktok" withLabel={false} />
          Approve the TikTok post
        </h3>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">
          {run.posts.youtube ? "The YouTube post is scheduled. " : ""}TikTok asks that you see and approve each post before Mindra sends it.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Player run={run} />
        <div className="space-y-4">
          <CaptionField value={caption} onChange={setCaption} />
          <TikTokFields
            account={run.tiktok_account}
            value={tiktok}
            onChange={(changes) => setTiktok((current) => ({ ...current, ...changes }))}
            tiktokPublic={run.tiktok_public}
            videoSeconds={run.narration_seconds ?? run.source?.duration ?? null}
          />
        </div>
      </div>
      {(act.error || edit.error) && <ErrorNote>{errorText(act.error || edit.error)}</ErrorNote>}
      <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <button type="button" onClick={() => act.mutate({ action: "reject" })} disabled={act.isPending} className={buttonStyles({ variant: "ghost" })}>
          Don&apos;t post to TikTok
        </button>
        <button type="button" onClick={approve} disabled={act.isPending || !tiktok.privacy_level || !tiktok.music_consent} className={buttonStyles({ variant: "primary" })}>
          {act.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Approve TikTok post
        </button>
      </div>
    </section>
  );
}

const POST_WORDS: Record<PostState["status"], string> = {
  draft: "Saved as a draft",
  saved: "Saved, not scheduled",
  planned: "Scheduled",
  reminded: "Reminder sent",
  publishing: "Posting now",
  published: "Posted",
  posted: "Posted",
  missed: "Missed its time",
  failed: "Couldn't be posted",
};

function Posts({ run }: { run: RunDetail }) {
  const entries = Object.entries(run.posts).filter(([, post]) => post) as [PlatformId, PostState][];
  if (!entries.length) return null;
  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">In the Content Library</h3>
      <ul className="divide-y divide-border">
        {entries.map(([platform, post]) => (
          <li key={platform} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <PlatformBadge platform={post.platform as Platform} />
            <span className="min-w-0 flex-1 text-sm text-muted-foreground">
              {POST_WORDS[post.status]}
              {post.status === "planned" && post.scheduled_at ? ` for ${formatScheduled(post.scheduled_at)}` : ""}
              {(post.status === "published" || post.status === "posted") && post.published_at ? ` ${formatScheduled(post.published_at)}` : ""}
              {post.publish_error ? `: ${post.publish_error}` : ""}
            </span>
            <Link to={`/library/${post.id}`} className={buttonStyles({ variant: "ghost", size: "sm" })}>
              Open post
            </Link>
            {post.published_url && (
              <a href={post.published_url} target="_blank" rel="noopener noreferrer" className={buttonStyles({ variant: "secondary", size: "sm" })}>
                <ExternalLink aria-hidden="true" className="size-4" />
                View on {PLATFORM_LABELS[platform]}
              </a>
            )}
          </li>
        ))}
      </ul>
      {(run.custom_thumbnail.status === "set" || run.custom_thumbnail.status === "refused") && (
        <p className="text-sm text-pretty text-muted-foreground">
          {run.custom_thumbnail.status === "set" ? "The custom thumbnail is on the YouTube video." : run.custom_thumbnail.note}
        </p>
      )}
    </section>
  );
}

/** One video an automation is making or made: where each stage is up to, what it made, and what's waiting for the
 * person. */
export default function AutomationRun() {
  const enabled = useAutomationsEnabled();
  const { runId } = useParams();
  const run = useRun(runId);
  const act = useRunAction(runId ?? "");

  if (!enabled) return <Navigate to="/dashboard" replace />;
  if (run.isPending) {
    return (
      <div aria-busy="true" className="space-y-4">
        <p role="status" className="sr-only">
          Loading the video
        </p>
        <div className="h-20 animate-pulse rounded-xl border border-border bg-card" />
        <div className="h-96 animate-pulse rounded-xl border border-border bg-card" />
      </div>
    );
  }
  if (run.isError) return <ErrorNote>{run.error.message}</ErrorNote>;

  const data = run.data;
  const state = runStatus(data);
  const canCancel = ["queued", "working", "waiting", "failed", "scheduled"].includes(data.status);
  const waiting = data.status === "waiting";
  const showPlayer = !waiting && Boolean(videoOf(data).url);

  return (
    <div className="space-y-6">
      <Link to={`/automations/${data.automation}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {data.automation_name}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold text-balance text-foreground">{data.title || data.topic || "A new video"}</h2>
            <StatusPill {...state} />
            {data.trigger === "test" && <StatusPill label="Sample: not saved or posted" tone="bg-secondary text-muted-foreground" />}
            {data.trigger !== "test" && data.mode === "draft" && <StatusPill label="Draft: not posted" tone="bg-secondary text-muted-foreground" />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground tabular-nums">
            {TRIGGER_LABELS[data.trigger]} · started {formatScheduled(data.created_at)}
            {data.slot ? ` · for ${formatScheduled(data.slot)}` : ""}
            {data.trigger === "test" && data.minutes ? ` · ${data.minutes} min` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.status === "failed" && (
            <button type="button" onClick={() => act.mutate({ action: "retry" })} disabled={act.isPending} className={buttonStyles({ variant: "primary", size: "sm" })}>
              {act.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <RotateCcw aria-hidden="true" className="size-4" />}
              Try again from {data.step_label}
            </button>
          )}
          {canCancel && (
            <ConfirmDialog
              trigger={
                <button type="button" disabled={act.isPending} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  Cancel
                </button>
              }
              title="Cancel this video?"
              description="Nothing more is made for it. Posts that haven't gone out are taken out of the Planner and stay in the Content Library as drafts."
              confirmLabel="Cancel video"
              cancelLabel="Keep it"
              onConfirm={() => act.mutate({ action: "cancel" })}
            />
          )}
        </div>
      </div>

      {act.error && <ErrorNote>{errorText(act.error)}</ErrorNote>}
      {data.status === "failed" && data.error && (
        <p role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span>
            Stopped at {data.step_label}: {data.error} Trying again carries on from there, keeping everything made before it.
          </span>
        </p>
      )}
      {data.review_note && (
        <p className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-pretty text-muted-foreground">
          <span className="font-medium text-foreground">Your note:</span> {data.review_note}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-6">
          {waiting && data.waiting_for === "script" && <ScriptApproval key={data.updated_at} run={data} />}
          {waiting && data.waiting_for === "video" && <VideoApproval key={data.updated_at} run={data} />}
          {waiting && data.waiting_for === "tiktok" && <TikTokApproval key={data.updated_at} run={data} />}
          {runIsWorking(data) && (
            <p role="status" className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin text-primary" />
              {data.status === "queued" ? "Waiting to start." : `Working on: ${data.step_label}.`} This page updates by itself.
            </p>
          )}
          {showPlayer && (
            <section className="space-y-3 rounded-xl border border-border bg-card p-4">
              <Player run={data} className="max-w-2xl" />
              <div className="flex flex-wrap gap-2">
                {data.render?.video_url && (
                  <a href={data.render.video_url} download className={buttonStyles({ variant: "secondary", size: "sm" })}>
                    Download
                  </a>
                )}
                {data.project && (
                  <Link to={`/studio/${data.project}`} className={buttonStyles({ variant: "ghost", size: "sm" })}>
                    Open in Motion Studio
                  </Link>
                )}
              </div>
            </section>
          )}
          <Posts run={data} />
          {data.script && !(waiting && data.waiting_for === "script") && (
            <details className="rounded-xl border border-border bg-card p-4">
              <summary className="cursor-pointer text-sm font-semibold text-foreground">Script</summary>
              <p className="mt-3 text-sm leading-relaxed whitespace-pre-line text-foreground">{data.script}</p>
            </details>
          )}
        </div>
        <section aria-labelledby="run-steps" className="space-y-3">
          <h3 id="run-steps" className="text-lg font-semibold text-foreground">
            Progress
          </h3>
          <div className="rounded-xl border border-border bg-card p-4">
            <Timeline run={data} />
          </div>
        </section>
      </div>
    </div>
  );
}
