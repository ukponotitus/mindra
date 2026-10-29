import { useId, useRef, useState, type ChangeEvent } from "react";
import { Check, Film, LoaderCircle, Music, Upload } from "lucide-react";
import { buttonStyles } from "../ui/button";
import { cn } from "../../lib/cn";
import { formatDuration } from "../../lib/format";
import { useStudioAssets, useUploadAsset, type AssetKind, type StudioAsset } from "../../lib/studio";

const ACCEPT: Record<AssetKind, string> = { image: "image/*", video: "video/*", audio: "audio/*" };

/**
 * Choose from the workspace's Motion Studio media (photos and clips, music, or a logo), or upload more, which is
 * chosen as it arrives. `single` keeps at most one chosen.
 */
export default function MediaPicker({
  kinds,
  selected,
  onChange,
  single = false,
  label,
}: {
  kinds: AssetKind[];
  selected: string[];
  onChange: (ids: string[]) => void;
  single?: boolean;
  /** What's being chosen, for the upload button and the empty state: "photos and clips". */
  label: string;
}) {
  const assets = useStudioAssets();
  const upload = useUploadAsset();
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [progress, setProgress] = useState<number | null>(null);
  const [problem, setProblem] = useState("");
  const usable = (assets.data?.results ?? []).filter((asset) => kinds.includes(asset.kind) && asset.status !== "failed");
  const chosen = new Set(selected);

  const toggle = (asset: StudioAsset) => {
    if (single) onChange(chosen.has(asset.id) ? [] : [asset.id]);
    else onChange(chosen.has(asset.id) ? selected.filter((id) => id !== asset.id) : [...selected, asset.id]);
  };

  const add = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    setProblem("");
    const added: string[] = [];
    for (const file of single ? files.slice(0, 1) : files) {
      setProgress(0);
      try {
        const asset = await upload.mutateAsync({ file, onProgress: setProgress });
        added.push(asset.id);
      } catch (error) {
        setProblem(error instanceof Error ? error.message : "That upload didn't go through. Try again.");
      }
    }
    setProgress(null);
    if (added.length) onChange(single ? added.slice(-1) : [...selected, ...added]);
  };

  const audio = kinds.length === 1 && kinds[0] === "audio";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => input.current?.click()} disabled={progress !== null} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          {progress !== null ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Upload aria-hidden="true" className="size-4" />}
          {progress !== null ? `Uploading ${Math.round(progress * 100)}%` : `Upload ${label}`}
        </button>
        <input
          ref={input}
          type="file"
          multiple={!single}
          accept={kinds.map((kind) => ACCEPT[kind]).join(",")}
          onChange={add}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
        {!single && (
          <span id={hintId} className="text-xs text-muted-foreground tabular-nums">
            {selected.length} chosen
          </span>
        )}
      </div>
      {problem && (
        <p role="alert" className="text-sm text-red-700">
          {problem}
        </p>
      )}
      {assets.isPending ? (
        <div aria-busy="true" className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {[0, 1, 2, 3, 4].map((item) => (
            <div key={item} className="aspect-square animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : assets.isError ? (
        <p role="alert" className="text-sm text-red-700">
          {assets.error.message}
        </p>
      ) : usable.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No {label} yet. Upload some, or add them in Motion Studio.
        </p>
      ) : audio ? (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {usable.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                aria-pressed={chosen.has(asset.id)}
                onClick={() => toggle(asset)}
                className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span className={cn("grid size-5 shrink-0 place-items-center rounded border", chosen.has(asset.id) ? "border-primary bg-primary text-white" : "border-border")}>
                  {chosen.has(asset.id) && <Check aria-hidden="true" className="size-3.5" />}
                </span>
                <Music aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate text-foreground">{asset.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{asset.duration ? formatDuration(asset.duration) : ""}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {usable.map((asset) => {
            const on = chosen.has(asset.id);
            return (
              <li key={asset.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  aria-label={asset.name}
                  onClick={() => toggle(asset)}
                  className={cn(
                    "relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    on ? "border-primary" : "border-transparent",
                  )}
                >
                  {asset.thumbnail_url ? (
                    <img src={asset.thumbnail_url} alt="" className="size-full object-cover" />
                  ) : asset.status === "processing" ? (
                    <LoaderCircle aria-hidden="true" className="m-auto size-5 animate-spin text-muted-foreground" />
                  ) : (
                    <Film aria-hidden="true" className="m-auto size-5 text-muted-foreground" />
                  )}
                  {on && (
                    <span className="absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-primary text-white">
                      <Check aria-hidden="true" className="size-3.5" />
                    </span>
                  )}
                  {asset.kind === "video" && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white tabular-nums">
                      {asset.duration ? formatDuration(asset.duration) : "Clip"}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
