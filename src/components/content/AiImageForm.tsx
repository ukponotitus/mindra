import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Check, LoaderCircle, Sparkles } from "lucide-react";
import SeePlans from "../SeePlans";
import { buttonStyles } from "../ui/button";
import { cn } from "../../lib/cn";
import { useAiStatus } from "../../lib/content";
import { IMAGE_ASPECTS, useImagine, useStudioAssets, type ImageAspect, type StudioAsset } from "../../lib/studio";

const MAX_REFERENCES = 3;
const PROMPT_MAX = 1000;

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 aria-invalid:border-red-400";

interface Props {
  /** The shape it starts on. */
  aspect?: ImageAspect;
  /** Called once the picture is made. */
  onMade?: (asset: StudioAsset) => void;
}

/**
 * Describe a picture and Mindra's image AI makes it, optionally from up to 3 of the workspace's photos (its product,
 * put in a new scene). It's kept with the workspace's uploads, so it can go on a post or into a video.
 */
export default function AiImageForm({ aspect: initialAspect = "4:5", onMade }: Props) {
  const ids = useId();
  const status = useAiStatus();
  const assets = useStudioAssets();
  const imagine = useImagine();
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<ImageAspect>(initialAspect);
  const [references, setReferences] = useState<string[]>([]);
  const [requested, setRequested] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const told = useRef<string | null>(null);
  const all = assets.data?.results ?? [];
  const photos = all.filter((asset) => asset.kind === "image" && asset.status === "ready" && !asset.library);
  const made = requested ? all.find((asset) => asset.id === requested) : undefined;
  const making = Boolean(requested) && (!made || made.status === "processing");
  const off = status.data ? !status.data.images : false;
  const busy = imagine.isPending || making;

  useEffect(() => {
    if (made?.status === "ready" && told.current !== made.id) {
      told.current = made.id;
      onMade?.(made);
    }
  }, [made, onMade]);

  const toggle = (id: string) =>
    setReferences((items) => (items.includes(id) ? items.filter((item) => item !== id) : items.length >= MAX_REFERENCES ? items : [...items, id]));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (prompt.trim().length < 3) {
      setProblem("Describe the picture you want.");
      return;
    }
    setProblem("");
    imagine.mutate({ prompt, aspect, references }, { onSuccess: (asset) => setRequested(asset.id) });
  };

  return (
    <form onSubmit={submit} noValidate aria-busy={busy} className="space-y-4">
      <div>
        <label htmlFor={`${ids}-prompt`} className="mb-2 block text-sm font-medium text-foreground">
          What should the picture show?
        </label>
        <textarea
          id={`${ids}-prompt`}
          value={prompt}
          rows={3}
          maxLength={PROMPT_MAX}
          disabled={busy || off}
          placeholder="e.g. A bottle of our zobo drink on a wooden market table in morning light, with fresh hibiscus flowers around it"
          aria-invalid={problem ? true : undefined}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (problem) setProblem("");
          }}
          className={cn(inputClass, "resize-y")}
        />
        {problem && (
          <p role="alert" className="mt-1.5 text-xs text-red-600">
            {problem}
          </p>
        )}
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-foreground">Shape</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {IMAGE_ASPECTS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={aspect === option.id}
              disabled={busy || off}
              onClick={() => setAspect(option.id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60",
                aspect === option.id ? "border-primary bg-primary/5" : "border-border hover:bg-background",
              )}
            >
              <span className="block text-sm font-medium text-foreground">
                {option.label} <span className="font-normal text-muted-foreground tabular-nums">{option.id}</span>
              </span>
              <span className="block text-xs text-pretty text-muted-foreground">{option.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {photos.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium text-foreground">
            From your photos <span className="font-normal text-muted-foreground">(optional, up to {MAX_REFERENCES})</span>
          </legend>
          <p className="mb-2 text-xs text-pretty text-muted-foreground">
            Choose a photo of your product, place or person, and the picture keeps it as it is in a new scene.
          </p>
          <ul className="flex gap-2 overflow-x-auto pb-1">
            {photos.slice(0, 40).map((asset) => {
              const on = references.includes(asset.id);
              return (
                <li key={asset.id} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={on}
                    aria-label={asset.name}
                    title={asset.name}
                    disabled={busy || off || (!on && references.length >= MAX_REFERENCES)}
                    onClick={() => toggle(asset.id)}
                    className={cn(
                      "relative block size-16 overflow-hidden rounded-lg border-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
                      on ? "border-primary" : "border-transparent hover:border-border",
                    )}
                  >
                    {asset.thumbnail_url && <img src={asset.thumbnail_url} alt="" className="size-full object-cover" />}
                    {on && (
                      <span className="absolute top-0.5 right-0.5 grid size-4 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check aria-hidden="true" className="size-2.5" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {off && (
        <p className="rounded-lg bg-secondary px-4 py-3 text-sm text-pretty text-muted-foreground">
          AI images aren&apos;t switched on yet. Upload your own photos for now.
        </p>
      )}
      {imagine.isError && (
        <p role="alert" className="text-sm text-pretty text-red-700">
          {imagine.error.message} <SeePlans error={imagine.error} />
        </p>
      )}
      {made?.status === "failed" && (
        <p role="alert" className="text-sm text-pretty text-red-700">
          {made.error || "The picture couldn't be made. Try again."}
        </p>
      )}
      {making && (
        <p role="status" className="flex items-center gap-2 text-sm text-primary">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Making your picture. This usually takes under a minute.
        </p>
      )}
      {made?.status === "ready" && made.url && (
        <div className="flex items-center gap-3">
          <img src={made.thumbnail_url ?? made.url} alt={made.description || made.name} className="size-20 rounded-lg object-cover" />
          <p className="text-sm text-pretty text-foreground">Your picture is ready{onMade ? " and chosen." : "."}</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy || off} className={buttonStyles()}>
          {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}
          {made?.status === "ready" || made?.status === "failed" ? "Make another" : "Make the picture"}
        </button>
        <p className="text-xs text-pretty text-muted-foreground">Counts as one of your plan&apos;s AI images. AI pictures carry an invisible SynthID mark.</p>
      </div>
    </form>
  );
}
