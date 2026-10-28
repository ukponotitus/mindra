import { useId, useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Film, Plus, Sparkles, Trash2, X } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { backdropClass, popupClass } from "../components/calendar/dialogStyles";
import { fieldClass, labelClass } from "../components/studio/styles";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { cn } from "../lib/cn";
import {
  ASPECTS,
  formatSeconds,
  isRendering,
  useCreateProject,
  useDeleteProject,
  useStudioProjects,
  type Aspect,
  type StudioProjectSummary,
} from "../lib/studio";

const ASPECT_BOX: Record<Aspect, string> = { "9:16": "aspect-[9/16]", "16:9": "aspect-video", "1:1": "aspect-square" };

/** What a project is doing, for its card. */
function projectState(project: StudioProjectSummary): { text: string; tone: "working" | "failed" | "ready" | "draft" } {
  if (project.status === "generating") return { text: "Mindra is putting it together…", tone: "working" };
  if (project.status === "failed") return { text: project.error || "The AI couldn't make this video.", tone: "failed" };
  const render = project.latest_render;
  if (render && isRendering(render)) return { text: `Making the video… ${render.progress}%`, tone: "working" };
  if (render?.status === "ready") return { text: render.version === project.version ? "Video ready" : "Edited since the last video", tone: "ready" };
  if (render?.status === "failed") return { text: "The last video couldn't be made", tone: "failed" };
  return { text: "Draft", tone: "draft" };
}

function NewManualDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const create = useCreateProject();
  const [name, setName] = useState("");
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const nameId = useId();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      { name: name.trim() || "Untitled video", aspect },
      { onSuccess: (project) => navigate(`/studio/${project.id}`) },
    );
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={cn(popupClass, "w-[min(30rem,calc(100vw-2rem))]")}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Create a video by hand</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pretty text-muted-foreground">
                Start with an empty timeline and add your photos, clips, text, logo and music.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-1 -mr-2" })}>
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor={nameId} className={labelClass}>
                Name
              </label>
              <input id={nameId} value={name} maxLength={200} placeholder="Sunday service recap" onChange={(event) => setName(event.target.value)} className={fieldClass} />
            </div>
            <fieldset>
              <legend className={labelClass}>Shape</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {ASPECTS.map((item) => (
                  <label
                    key={item.id}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary",
                      aspect === item.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
                    )}
                  >
                    <input type="radio" name="aspect" value={item.id} checked={aspect === item.id} onChange={() => setAspect(item.id)} className="sr-only" />
                    <span className="block font-medium text-foreground">{item.label}</span>
                    <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">{item.detail}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {create.isError && (
              <p role="alert" className="text-sm text-red-700">
                {create.error.message}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <Dialog.Close className={buttonStyles({ variant: "secondary" })}>Cancel</Dialog.Close>
              <button type="submit" disabled={create.isPending} className={buttonStyles()}>
                {create.isPending ? "Creating…" : "Open the editor"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ProjectCard({ project }: { project: StudioProjectSummary }) {
  const remove = useDeleteProject();
  const state = projectState(project);
  const thumbnail = project.latest_render?.thumbnail_url;
  return (
    <li className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-white">
      <Link
        to={`/studio/${project.id}`}
        className="flex flex-1 flex-col focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <div className="flex h-44 items-center justify-center bg-secondary">
          <div className={cn("relative h-full max-w-full overflow-hidden bg-gray-900", ASPECT_BOX[project.aspect])}>
            {thumbnail ? (
              <img src={thumbnail} alt="" className="size-full object-cover" />
            ) : (
              <span className="grid size-full place-items-center text-white/40">
                <Film aria-hidden="true" className="size-6" />
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1 p-4">
          <p className="truncate font-medium text-foreground">{project.name}</p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {project.aspect} · {project.scene_count} scene{project.scene_count === 1 ? "" : "s"} · {formatSeconds(project.duration)}
            {project.origin === "ai" ? " · Made with AI" : ""}
          </p>
          <p
            className={cn(
              "mt-1 text-xs text-pretty",
              state.tone === "failed" ? "text-red-700" : state.tone === "ready" ? "text-emerald-700" : state.tone === "working" ? "text-primary" : "text-muted-foreground",
            )}
          >
            {state.text}
          </p>
        </div>
      </Link>
      <ConfirmDialog
        trigger={
          <button
            type="button"
            aria-label={`Delete ${project.name}`}
            className={buttonStyles({ variant: "secondary", size: "icon", className: "absolute top-2 right-2 size-8 opacity-90" })}
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        }
        title={`Delete “${project.name}”?`}
        description="The project and the videos made from it are deleted. Your photos, clips and music stay in your media."
        confirmLabel="Delete video"
        onConfirm={() => remove.mutate(project.id)}
      />
    </li>
  );
}

/** Motion Studio: the workspace's video projects, and the two ways to start one. */
export default function Studio() {
  const projects = useStudioProjects();
  const [manualOpen, setManualOpen] = useState(false);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Motion Studio</h2>
        <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
          Make short videos from your photos, clips, logo and music: a service recap, an event promo or an ad. Let Mindra put
          a first version together, or build it yourself. Either way you can change everything in the editor.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          to="/studio/new"
          className="flex gap-4 rounded-xl border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <span>
            <span className="block font-semibold text-foreground">Create with AI</span>
            <span className="mt-1 block text-sm text-pretty text-muted-foreground">
              Upload your media, describe the video, and Mindra arranges it, with text, transitions, your logo and music.
            </span>
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="flex gap-4 rounded-xl border border-border bg-white p-5 text-left transition-colors hover:bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-foreground">
            <Plus aria-hidden="true" className="size-5" />
          </span>
          <span>
            <span className="block font-semibold text-foreground">Create manually</span>
            <span className="mt-1 block text-sm text-pretty text-muted-foreground">
              Start with an empty timeline and arrange the scenes, text, transitions and music yourself.
            </span>
          </span>
        </button>
      </div>
      <NewManualDialog open={manualOpen} onOpenChange={setManualOpen} />

      <section aria-labelledby="your-videos" className="space-y-3">
        <h3 id="your-videos" className="text-lg font-semibold text-foreground">
          Your videos
        </h3>
        {projects.isPending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Loading your videos…
          </p>
        ) : projects.isError ? (
          <p role="alert" className="text-sm text-red-700">
            {projects.error.message}
          </p>
        ) : projects.data.results.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border bg-white px-4 py-8 text-center text-sm text-muted-foreground">
            No videos yet. Start one above.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {projects.data.results.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
