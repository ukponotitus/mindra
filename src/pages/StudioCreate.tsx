import { useId, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, Check, ExternalLink, Film, FolderOpen, LoaderCircle, Music, Plus, Sparkles, Upload, X } from "lucide-react";
import { Link, useNavigate } from "react-router";
import EarlierUploads from "../components/studio/EarlierUploads";
import MusicSearch, { PlayIcon, playLabel, usePreviewPlayer } from "../components/studio/MusicSearch";
import { areaClass, fieldClass, labelClass, panelClass } from "../components/studio/styles";
import { buttonStyles } from "../components/ui/button";
import { cn } from "../lib/cn";
import {
  ASPECTS,
  VIDEO_LENGTHS,
  VIDEO_STYLES,
  VIDEO_TYPES,
  formatSeconds,
  newId,
  useCreateWithAi,
  useStudioAssets,
  useUploadAsset,
  type Aspect,
  type StudioAsset,
  type VideoStyle,
  type VideoType,
} from "../lib/studio";

const EXAMPLE =
  "Create a 45-second Sunday service recap using these photos and clips. Start with 'Sunday Service Highlights', use smooth transitions, add uplifting music, show our logo, and end with 'Join us next Sunday at 8 AM'.";

/** Create with AI: the media, the description and the choices; Mindra writes a draft that opens in the editor. */
export default function StudioCreate() {
  const navigate = useNavigate();
  const assets = useStudioAssets();
  const upload = useUploadAsset();
  const create = useCreateWithAi();
  const ids = { name: useId(), prompt: useId(), type: useId(), style: useId(), music: useId() };
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [videoType, setVideoType] = useState<VideoType>("church_recap");
  const [duration, setDuration] = useState<(typeof VIDEO_LENGTHS)[number]>(45);
  const [aspect, setAspect] = useState<Aspect>("9:16");
  const [style, setStyle] = useState<VideoStyle>("inspirational");
  const [chosen, setChosen] = useState<string[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [music, setMusic] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  // Only what's uploaded or brought in for this video: a new video starts empty.
  const [picked, setPicked] = useState<StudioAsset[]>([]);
  const [earlier, setEarlier] = useState(false);
  const [uploading, setUploading] = useState<{ id: string; name: string; fraction: number; error: string }[]>([]);
  const [problem, setProblem] = useState("");
  const player = usePreviewPlayer();

  // The picked assets as the server last described them (clips and music get ready after they're added).
  const here = useMemo(() => {
    const fresh = new Map((assets.data?.results ?? []).map((asset) => [asset.id, asset]));
    return picked.map((asset) => fresh.get(asset.id) ?? asset);
  }, [assets.data, picked]);
  const media = here.filter((asset) => asset.kind !== "audio");
  const pictures = media.filter((asset) => asset.kind === "image" && asset.status === "ready");
  const songs = here.filter((asset) => asset.kind === "audio");
  const song = songs.find((asset) => asset.id === music) ?? null;
  const isUploading = uploading.some((item) => !item.error);

  const toggle = (asset: StudioAsset) =>
    setChosen((items) => (items.includes(asset.id) ? items.filter((id) => id !== asset.id) : [...items, asset.id].slice(0, 40)));

  /** Added for this video: photos and clips are chosen in order, music becomes the music. */
  const add = (fresh: StudioAsset[]) => {
    setPicked((items) => [...items, ...fresh.filter((asset) => !items.some((item) => item.id === asset.id))]);
    const visual = fresh.filter((asset) => asset.kind !== "audio").map((asset) => asset.id);
    setChosen((items) => [...items, ...visual.filter((id) => !items.includes(id))].slice(0, 40));
    const audio = fresh.find((asset) => asset.kind === "audio");
    if (audio) setMusic(audio.id);
  };

  const send = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const row = { id: newId("upload"), name: file.name, fraction: 0, error: "" };
      setUploading((items) => [...items, row]);
      try {
        const created = await upload.mutateAsync({
          file,
          onProgress: (fraction) => setUploading((items) => items.map((item) => (item.id === row.id ? { ...item, fraction } : item))),
        });
        setUploading((items) => items.filter((item) => item.id !== row.id));
        add([created]);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Couldn't upload this file.";
        setUploading((items) => items.map((item) => (item.id === row.id ? { ...item, error: message } : item)));
      }
    }
  };

  const notReady = chosen.filter((id) => media.find((asset) => asset.id === id)?.status !== "ready");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setProblem("");
    if (isUploading) return setProblem("Wait for your uploads to finish before creating the video.");
    if (!chosen.length) return setProblem("Choose at least one photo or clip for the video.");
    if (notReady.length) return setProblem("Wait for your clips to finish getting ready, then try again.");
    if (prompt.trim().length < 10) return setProblem("Describe the video in a sentence or two.");
    if (song && song.status === "processing") return setProblem("Wait for the music to finish getting ready, then try again.");
    if (song && song.status === "failed") return setProblem("The music couldn't be used. Choose another song or no music.");
    player.stop();
    create.mutate(
      {
        name: name.trim() || VIDEO_TYPES.find((item) => item.id === videoType)!.label,
        prompt: prompt.trim(),
        video_type: videoType,
        duration,
        aspect,
        style,
        music,
        logo,
        colors,
        assets: chosen,
      },
      { onSuccess: (project) => navigate(`/studio/${project.id}`) },
    );
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start gap-2">
        <Link to="/studio" aria-label="Back to Motion Studio" className={buttonStyles({ variant: "ghost", size: "icon" })}>
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <div>
          <h2 className="text-2xl font-semibold text-balance text-foreground">Create a video with AI</h2>
          <p className="mt-1 text-sm text-pretty text-muted-foreground">
            Choose your photos and clips and describe the video. Mindra puts a first version together, and you can change
            every part of it in the editor.
          </p>
        </div>
      </div>

      <section aria-labelledby="ai-media" className={cn(panelClass, "space-y-3 p-5")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 id="ai-media" className="font-semibold text-foreground">
              1. Photos and clips
            </h3>
            <p className="text-sm text-muted-foreground">They're used in the order you choose them. {chosen.length ? `${chosen.length} chosen.` : ""}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setEarlier(true)} className={buttonStyles({ variant: "secondary" })}>
              <FolderOpen aria-hidden="true" className="size-4" />
              Earlier uploads
            </button>
            <label htmlFor="ai-upload" className={buttonStyles({ className: "cursor-pointer" })}>
              <Upload aria-hidden="true" className="size-4" />
              Upload
            </label>
          </div>
          <input
            id="ai-upload"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,image/heic,.heic,.heif,video/mp4,video/quicktime,video/webm,.m4v,audio/mpeg,audio/mp4,audio/wav,.m4a"
            className="sr-only"
            onChange={(event) => {
              void send(event.target.files);
              event.target.value = "";
            }}
          />
          <EarlierUploads open={earlier} onOpenChange={setEarlier} inProject={here} onBringIn={async (fresh) => add(fresh)} />
        </div>
        {uploading.map((item) => (
          <div key={item.id} className="text-xs">
            <p className="truncate text-foreground">{item.name}</p>
            {item.error ? (
              <p className="text-red-700">{item.error}</p>
            ) : (
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full origin-left bg-primary" style={{ transform: `scaleX(${item.fraction})` }} />
              </div>
            )}
          </div>
        ))}
        {media.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-pretty text-muted-foreground">
            Upload the photos and clips for this video, or choose from your earlier uploads.
          </p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
            {media.map((asset) => {
              const order = chosen.indexOf(asset.id);
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    aria-pressed={order >= 0}
                    disabled={asset.status === "failed"}
                    onClick={() => toggle(asset)}
                    className={cn(
                      "relative block aspect-square w-full overflow-hidden rounded-lg border-2 bg-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-40",
                      order >= 0 ? "border-primary" : "border-transparent",
                    )}
                  >
                    {asset.thumbnail_url ? (
                      <img src={asset.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-muted-foreground">
                        <Film aria-hidden="true" className="size-5" />
                      </span>
                    )}
                    <span className="sr-only">{asset.name}</span>
                    {order >= 0 && <span className="absolute top-1 left-1 grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-white">{order + 1}</span>}
                    {asset.status === "processing" && (
                      <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-white/85 py-0.5 text-[10px] font-medium text-foreground">
                        <LoaderCircle aria-hidden="true" className="size-3 animate-spin" />
                        Getting ready
                      </span>
                    )}
                    {asset.kind === "video" && asset.duration ? (
                      <span className="absolute right-1 bottom-1 rounded bg-black/70 px-1 text-[10px] text-white tabular-nums">{formatSeconds(asset.duration)}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="ai-describe" className={cn(panelClass, "space-y-4 p-5")}>
        <h3 id="ai-describe" className="font-semibold text-foreground">
          2. Describe it
        </h3>
        <div>
          <label htmlFor={ids.prompt} className={labelClass}>
            What should the video be?
          </label>
          <textarea id={ids.prompt} rows={4} maxLength={2000} value={prompt} placeholder={EXAMPLE} onChange={(event) => setPrompt(event.target.value)} className={areaClass} />
          <button type="button" onClick={() => setPrompt(EXAMPLE)} className="mt-1 text-xs font-medium text-primary hover:underline">
            Use the example
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor={ids.name} className={labelClass}>
              Name
            </label>
            <input id={ids.name} value={name} maxLength={200} placeholder="Sunday recap, 26 October" onChange={(event) => setName(event.target.value)} className={fieldClass} />
          </div>
          <div>
            <label htmlFor={ids.type} className={labelClass}>
              Type
            </label>
            <select id={ids.type} value={videoType} onChange={(event) => setVideoType(event.target.value as VideoType)} className={fieldClass}>
              {VIDEO_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={ids.style} className={labelClass}>
              Style
            </label>
            <select id={ids.style} value={style} onChange={(event) => setStyle(event.target.value as VideoStyle)} className={fieldClass}>
              {VIDEO_STYLES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <fieldset>
            <legend className={labelClass}>Length</legend>
            <div className="flex gap-1.5">
              {VIDEO_LENGTHS.map((seconds) => (
                <button
                  key={seconds}
                  type="button"
                  aria-pressed={duration === seconds}
                  onClick={() => setDuration(seconds)}
                  className={buttonStyles({ variant: duration === seconds ? "primary" : "secondary", size: "sm", className: "flex-1" })}
                >
                  {seconds}s
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <fieldset>
          <legend className={labelClass}>Shape</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {ASPECTS.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={aspect === item.id}
                onClick={() => setAspect(item.id)}
                className={cn("rounded-lg border p-3 text-left text-sm transition-colors", aspect === item.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary")}
              >
                <span className="block font-medium text-foreground">{item.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>
              </button>
            ))}
          </div>
        </fieldset>
      </section>

      <section aria-labelledby="ai-brand" className={cn(panelClass, "space-y-4 p-5")}>
        <h3 id="ai-brand" className="font-semibold text-foreground">
          3. Music, logo and colours
        </h3>
        <div className="space-y-2">
          <p className={labelClass}>Music</p>
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-3 py-2">
            {song ? (
              <>
                <button
                  type="button"
                  disabled={song.status !== "ready"}
                  onClick={() => player.listen(song.id, song.url)}
                  aria-label={playLabel(player, song.id, song.name)}
                  className={buttonStyles({ variant: "secondary", size: "icon", className: "size-8" })}
                >
                  {song.status === "processing" ? (
                    <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                  ) : (
                    <PlayIcon player={player} id={song.id} className="size-3.5" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{song.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {song.status === "processing" ? "Getting ready…" : song.status === "failed" ? song.error : song.credit || "Your music"}
                  </p>
                </div>
                {song.source_url && (
                  <a href={song.source_url} target="_blank" rel="noreferrer" aria-label={`${song.name} on Jamendo`} className="text-muted-foreground hover:text-foreground">
                    <ExternalLink aria-hidden="true" className="size-4" />
                  </a>
                )}
                <button type="button" onClick={() => setMusic(null)} className={buttonStyles({ variant: "ghost", size: "sm" })}>
                  No music
                </button>
              </>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Music aria-hidden="true" className="size-4" />
                No music. Choose a song below, or upload your own.
              </p>
            )}
          </div>
          {songs.length > 1 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Music added for this video">
              {songs.map((item) => (
                <button key={item.id} type="button" aria-pressed={music === item.id} onClick={() => setMusic(item.id)} className={buttonStyles({ variant: music === item.id ? "primary" : "secondary", size: "sm" })}>
                  {item.name}
                </button>
              ))}
            </div>
          )}
          <div className="rounded-lg border border-border p-3">
            <MusicSearch chosenUrl={song?.source_url} onPick={(asset) => add([asset])} player={player} compact />
          </div>
          <p className="text-[11px] text-pretty text-muted-foreground">Upload your own music above only if you have the rights to use it.</p>
        </div>
        <div>
          <p className={labelClass}>Logo</p>
          {pictures.length === 0 ? (
            <p className="text-sm text-muted-foreground">Upload your logo (a PNG with a see-through background works best).</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={logo === null} onClick={() => setLogo(null)} className={buttonStyles({ variant: logo === null ? "primary" : "secondary", size: "sm" })}>
                No logo
              </button>
              {pictures.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  aria-pressed={logo === asset.id}
                  aria-label={`Use ${asset.name} as the logo`}
                  onClick={() => setLogo(asset.id)}
                  className={cn("relative size-14 overflow-hidden rounded-lg border-2 bg-[repeating-conic-gradient(#e5e7eb_0_25%,#fff_0_50%)] bg-[length:12px_12px]", logo === asset.id ? "border-primary" : "border-border")}
                >
                  {asset.thumbnail_url && <img src={asset.thumbnail_url} alt="" className="size-full object-contain" />}
                  {logo === asset.id && <Check aria-hidden="true" className="absolute top-0.5 right-0.5 size-4 rounded-full bg-primary p-0.5 text-white" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className={labelClass}>Brand colours (optional)</p>
          <div className="flex flex-wrap items-center gap-2">
            {colors.map((colour, index) => (
              <span key={index} className="flex items-center gap-1">
                <input
                  type="color"
                  aria-label={`Brand colour ${index + 1}`}
                  value={colour}
                  onChange={(event) => setColors((items) => items.map((item, at) => (at === index ? event.target.value.toUpperCase() : item)))}
                  className="h-9 w-12 cursor-pointer rounded border border-border"
                />
                <button type="button" aria-label={`Remove colour ${index + 1}`} onClick={() => setColors((items) => items.filter((_, at) => at !== index))} className={buttonStyles({ variant: "ghost", size: "icon", className: "size-7" })}>
                  <X aria-hidden="true" className="size-3.5" />
                </button>
              </span>
            ))}
            {colors.length < 3 && (
              <button type="button" onClick={() => setColors((items) => [...items, items.length ? "#FFFFFF" : "#6D5EF5"])} className={buttonStyles({ variant: "secondary", size: "sm" })}>
                <Plus aria-hidden="true" className="size-3.5" />
                Add a colour
              </button>
            )}
          </div>
        </div>
      </section>

      {(problem || create.isError) && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
          {problem || create.error?.message}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-3">
        <p className="text-xs text-muted-foreground">The AI only uses your media and the music you choose. Anything missing is marked for you to add.</p>
        <button type="submit" disabled={create.isPending || isUploading} className={buttonStyles({ size: "lg" })}>
          {create.isPending || isUploading ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Sparkles aria-hidden="true" className="size-4" />}
          {isUploading ? "Finishing uploads…" : "Create the video"}
        </button>
      </div>
    </form>
  );
}
