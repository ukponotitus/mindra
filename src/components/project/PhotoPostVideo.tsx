import { Clapperboard, LoaderCircle } from "lucide-react";
import { Link } from "react-router";
import { ApiError } from "../../lib/api";
import { useMakeVideo, videoInProgress } from "../../lib/projects";
import type { Project } from "../../lib/types";
import { buttonStyles } from "../ui/button";

// A photo post's video with its audio (its connected recording): the photos in order across the audio, vertical, with
// captions from what's said. The server makes it once the audio is transcribed; it's edited, played and made into
// posts in Motion Studio.

export default function PhotoPostVideo({ project }: { project: Project }) {
  const make = useMakeVideo(project.id);
  const video = project.video;
  if (!project.linked_recording && !video) return null;
  const working = videoInProgress(video);
  const studio = video?.studio_project;

  let state: React.ReactNode;
  if (!video) {
    state = <p className="text-sm text-pretty text-muted-foreground">Make a vertical video of these photos, in their order, with the audio as its sound and captions from what's said.</p>;
  } else if (video.error) {
    state = <p className="text-sm text-pretty text-red-600">Couldn't make the video: {video.error}</p>;
  } else if (!studio) {
    state = (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
        Waiting for the audio to be transcribed, then the video is put together. You can leave this page.
      </p>
    );
  } else if (working) {
    state = (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground tabular-nums">
        <LoaderCircle aria-hidden="true" className="size-4 shrink-0 animate-spin motion-reduce:animate-none" />
        Making the video{video.progress ? `: ${video.progress}%` : "…"} You can leave this page.
      </p>
    );
  } else if (video.render_status === "ready") {
    state = <p className="text-sm text-pretty text-foreground">Your video is ready. Play or download it in Motion Studio, change anything, and write posts for it there.</p>;
  } else {
    state = <p className="text-sm text-pretty text-red-600">The video couldn't be made. Try again, or open it in Motion Studio and make it from there.</p>;
  }

  const canMake = !working;
  return (
    <section aria-labelledby="photo-post-video" className="rounded-xl border border-border bg-card p-5">
      <h3 id="photo-post-video" className="flex items-center gap-2 font-semibold text-foreground">
        <Clapperboard aria-hidden="true" className="size-4 text-muted-foreground" />
        Video with your audio
      </h3>
      <div className="mt-2 space-y-3">
        {state}
        <div className="flex flex-wrap gap-2">
          {studio && (
            <Link to={`/studio/${studio}`} className={buttonStyles({ variant: video?.render_status === "ready" ? "primary" : "secondary", size: "sm" })}>
              Open in Motion Studio
            </Link>
          )}
          {canMake && (!video || video.error || video.render_status === "failed") && (
            <button type="button" onClick={() => make.mutate()} disabled={make.isPending} className={buttonStyles({ variant: video ? "secondary" : "primary", size: "sm" })}>
              {make.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />}
              {video ? "Try again" : "Make the video"}
            </button>
          )}
        </div>
        {make.isError && (
          <p role="alert" className="text-sm text-pretty text-red-600">
            {make.error instanceof ApiError ? make.error.message : "Something went wrong. Try again."}
          </p>
        )}
      </div>
    </section>
  );
}
