import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Clapperboard, Copy, Download, LoaderCircle, PenLine } from "lucide-react";
import ClipPosts from "../project/ClipPosts";
import { useProjectClips } from "../../lib/clips";
import { cn } from "../../lib/cn";
import { useProject } from "../../lib/projects";
import { formatSeconds, isRendering, postRender, useProjectRenders, useStartRender, type Composition, type StudioAsset, type StudioRender } from "../../lib/studio";
import { buttonStyles } from "../ui/button";
import { placeholderCount } from "./edits";
import { panelClass } from "./styles";

interface Props {
  projectId: string;
  composition: Composition;
  assets: Record<string, StudioAsset>;
  version: number;
  /** Save what's on screen first: the version saved, or null when it couldn't be. */
  flush: () => Promise<number | null>;
}

/** The posts for a finished video, written and scheduled as for any clip. */
function VideoPosts({ render, startWriting }: { render: StudioRender; startWriting: boolean }) {
  const project = useProject(render.post_project ?? undefined);
  const clips = useProjectClips(render.post_project ?? "", Boolean(render.post_project));
  const clip = clips.data?.clips.find((item) => item.id === render.post_clip);
  if (project.isError || clips.isError) {
    return (
      <p role="alert" className="text-sm text-pretty text-red-700">
        {(project.error ?? clips.error)?.message}
      </p>
    );
  }
  if (!project.data || !clip) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Loading the posts…
      </p>
    );
  }
  return <ClipPosts clip={clip} project={project.data} noun="video" startWriting={startWriting} />;
}

/** The credit each song from the music search needs in the post's caption, with a Copy button. */
function MusicCredits({ composition, assets }: { composition: Composition; assets: Record<string, StudioAsset> }) {
  const [copied, setCopied] = useState(false);
  const credits = [
    ...new Set(
      composition.audio
        .filter((track) => !track.muted && track.asset)
        .map((track) => assets[track.asset!]?.credit)
        .filter((credit): credit is string => Boolean(credit)),
    ),
  ];
  if (!credits.length) return null;
  const text = credits.map((credit) => `Music: ${credit}`).join("\n");
  return (
    <div className="rounded-lg bg-secondary p-3 text-xs text-pretty">
      <p className="font-medium text-foreground">Add this credit to your caption</p>
      <p className="mt-1 whitespace-pre-line text-muted-foreground">{text}</p>
      <button
        type="button"
        onClick={async () => {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-2 h-7" })}
      >
        {copied ? <Check aria-hidden="true" className="size-3.5" /> : <Copy aria-hidden="true" className="size-3.5" />}
        {copied ? "Copied" : "Copy credit"}
      </button>
    </div>
  );
}

/** Making the MP4 from the saved version, the video made, and the posts to share it with. */
export default function RenderPanel({ projectId, composition, assets, version, flush }: Props) {
  const queryClient = useQueryClient();
  const renders = useProjectRenders(projectId);
  const start = useStartRender();
  const [problem, setProblem] = useState("");
  const [posting, setPosting] = useState(false);
  const [justPosted, setJustPosted] = useState(false);
  const placeholders = placeholderCount(composition);
  const working = renders.data?.some(isRendering) ?? false;
  const latest = renders.data?.[0];
  const ready = latest?.status === "ready" && latest.video_url ? latest : null;
  const blocked = composition.scenes.length === 0 ? "Add a photo or clip first." : placeholders ? `Replace the ${placeholders} placeholder${placeholders > 1 ? "s" : ""} with your own media first.` : "";

  const make = async () => {
    setProblem("");
    const saved = await flush();
    if (saved === null) {
      setProblem("Your latest changes aren't saved yet. Fix what's shown above, then try again.");
      return;
    }
    start.mutate({ id: projectId, version: saved }, { onError: (error) => setProblem(error.message) });
  };

  const writePosts = async (render: StudioRender) => {
    setPosting(true);
    setProblem("");
    try {
      await postRender(render.id);
      await queryClient.invalidateQueries({ queryKey: ["studio", "renders", projectId] });
      setJustPosted(true);
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't get this video ready for posts.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <section aria-labelledby="make-video" className={cn(panelClass, "p-4")}>
      <div className="grid gap-6 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          <h3 id="make-video" className="text-sm font-semibold text-foreground">
            Make the video
          </h3>
          <button type="button" onClick={() => void make()} disabled={Boolean(blocked) || working || start.isPending} className={buttonStyles({ className: "w-full" })}>
            {working || start.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Clapperboard aria-hidden="true" className="size-4" />}
            {working ? "Making the video…" : ready ? "Make it again" : "Make video"}
          </button>
          {blocked && <p className="text-xs text-pretty text-muted-foreground">{blocked}</p>}
          {problem && (
            <p role="alert" className="text-xs text-pretty text-red-700">
              {problem}
            </p>
          )}
          {latest && isRendering(latest) && (
            <div>
              <p className="text-xs text-muted-foreground tabular-nums" role="status">
                {latest.status === "queued" ? "Waiting to start…" : `Making it… ${latest.progress}%`}
              </p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full origin-left bg-primary transition-transform duration-500" style={{ transform: `scaleX(${Math.max(latest.progress, 3) / 100})` }} />
              </div>
              <p className="mt-1 text-[11px] text-pretty text-muted-foreground">This takes a few minutes. You can keep editing; the video is made from version {latest.version}.</p>
            </div>
          )}
          {latest?.status === "failed" && (
            <p role="alert" className="text-xs text-pretty text-red-700">
              {latest.error || "This video couldn't be made."}
            </p>
          )}
          {ready && (
            <>
              <video src={ready.video_url!} poster={ready.thumbnail_url ?? undefined} controls playsInline className="max-h-96 w-full rounded-lg bg-black" />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground tabular-nums">
                  {formatSeconds(ready.duration ?? 0)} · {ready.width}×{ready.height}
                </p>
                <a href={ready.download_url ?? ready.video_url!} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                  <Download aria-hidden="true" className="size-3.5" />
                  Download
                </a>
              </div>
              {ready.version !== version && (
                <p className="text-[11px] text-pretty text-amber-800">You've edited since this was made. Make it again to include your changes.</p>
              )}
            </>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          {ready ? (
            <>
              <MusicCredits composition={composition} assets={assets} />
              {ready.post_clip ? (
                <VideoPosts key={ready.id} render={ready} startWriting={justPosted} />
              ) : (
                <div className="rounded-xl border border-dashed border-border p-5 text-center">
                  <h4 className="font-semibold text-balance text-foreground">Post it</h4>
                  <p className="mx-auto mt-1 max-w-md text-sm text-pretty text-muted-foreground">
                    Mindra writes the captions for Instagram, TikTok, YouTube, Facebook and more, with this video attached. Then
                    share, schedule or post them from the Content Library.
                  </p>
                  <button type="button" onClick={() => void writePosts(ready)} disabled={posting} className={buttonStyles({ className: "mt-3" })}>
                    {posting ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <PenLine aria-hidden="true" className="size-4" />}
                    Write posts for this video
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-sm text-pretty text-muted-foreground">
              When the video is made it plays here, ready to download, and Mindra can write the posts to share it with.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
