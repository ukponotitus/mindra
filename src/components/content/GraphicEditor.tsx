import { useEffect, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { ArrowDown, ArrowUp, Check, ImagePlus, LoaderCircle, Plus, Sparkles, Trash2, X } from "lucide-react";
import { backdropClass, popupClass } from "../calendar/dialogStyles";
import SeePlans from "../SeePlans";
import { buttonStyles } from "../ui/button";
import { useBrandProfile } from "../../lib/brand";
import { cn } from "../../lib/cn";
import {
  DARK,
  LIGHT,
  LIMITS,
  MOST_SLIDES,
  SIZES,
  TEMPLATES,
  templateInfo,
  useChangeGraphic,
  useMakeGraphic,
  usePostGraphics,
  useWriteGraphic,
  type Graphic,
  type GraphicDesign,
  type GraphicSize,
  type GraphicTemplate,
  type Slide,
} from "../../lib/graphics";
import { FONTS, useStudioAssets, type FontId } from "../../lib/studio";

// Making or changing a post's graphic: a template, a size, the colours, headline font, logo and footer line, and the
// words of each slide (in order, up to 10), drawn on the server into the post's photos. The AI can write the words
// (from the post's brief or text); changing anything and making it again draws new pictures.

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden disabled:opacity-60";
const labelClass = "mb-1 block text-xs font-medium text-muted-foreground";

type Draft = { template: GraphicTemplate; size: GraphicSize; design: GraphicDesign; slides: Slide[] };

const EMPTY_SLIDE: Slide = { label: "", title: "", text: "", photo: "", photo2: "" };

function draftOf(graphic: Graphic | null, fallback: Draft): Draft {
  if (!graphic || !graphic.template || graphic.slides.length === 0) return fallback;
  return { template: graphic.template, size: graphic.size, design: graphic.design, slides: graphic.slides };
}

const ASPECT_CLASS: Record<GraphicSize, string> = { "4:5": "aspect-[4/5]", "9:16": "aspect-[9/16]", "1:1": "aspect-square" };

/** A row of colour choices, with a custom colour last. */
function Swatches({ label, value, choices, onChange }: { label: string; value: string; choices: { colour: string; name: string }[]; onChange: (colour: string) => void }) {
  const id = label.toLowerCase().replace(/\W+/g, "-");
  return (
    <fieldset>
      <legend className={labelClass}>{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        {choices.map((choice) => {
          const on = choice.colour.toUpperCase() === value.toUpperCase();
          return (
            <button
              key={choice.colour + choice.name}
              type="button"
              aria-pressed={on}
              aria-label={choice.name}
              title={choice.name}
              onClick={() => onChange(choice.colour.toUpperCase())}
              className={cn(
                "grid size-8 place-items-center rounded-full border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                on && "ring-2 ring-primary ring-offset-2 ring-offset-card",
              )}
              style={{ backgroundColor: choice.colour }}
            >
              {on && <Check aria-hidden="true" className="size-4 text-white mix-blend-difference" strokeWidth={3} />}
            </button>
          );
        })}
        <label htmlFor={`${id}-custom`} className="sr-only">
          {label}: another colour
        </label>
        <input
          id={`${id}-custom`}
          type="color"
          value={value.toLowerCase()}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="h-8 w-10 cursor-pointer rounded-md border border-border bg-card p-0.5"
        />
      </div>
    </fieldset>
  );
}

/** Choose a slide's picture from the workspace's photos. `name` says which picture when a slide takes two. */
function PhotoChoice({ value, onChange, number, name = "picture" }: { value: string; onChange: (id: string) => void; number: number; name?: string }) {
  const [open, setOpen] = useState(false);
  const assets = useStudioAssets();
  const photos = (assets.data?.results ?? []).filter((asset) => asset.kind === "image" && asset.status === "ready" && !asset.library && asset.source !== "graphic");
  const chosen = photos.find((asset) => asset.id === value);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {chosen?.thumbnail_url && <img src={chosen.thumbnail_url} alt="" className="size-10 rounded-md object-cover" />}
        <button type="button" aria-expanded={open} onClick={() => setOpen((shown) => !shown)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          <ImagePlus aria-hidden="true" className="size-4" />
          {chosen ? `Change the ${name}` : name === "picture" ? "Add a picture" : `Add the ${name}`}
          <span className="sr-only"> for slide {number}</span>
        </button>
        {chosen && (
          <button type="button" onClick={() => onChange("")} className={buttonStyles({ variant: "ghost", size: "sm" })}>
            Remove the {name}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 rounded-lg border border-border p-2">
          {assets.isPending ? (
            <p className="text-sm text-muted-foreground">Loading your photos…</p>
          ) : photos.length === 0 ? (
            <p className="text-sm text-pretty text-muted-foreground">No photos yet. Upload some with “Add photos or a video”, or in the brand profile.</p>
          ) : (
            <ul aria-label={`Photos for slide ${number}${name === "picture" ? "" : `, the ${name}`}`} className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto sm:grid-cols-6">
              {photos.map((asset) => (
                <li key={asset.id}>
                  <button
                    type="button"
                    aria-pressed={asset.id === value}
                    onClick={() => {
                      onChange(asset.id);
                      setOpen(false);
                    }}
                    className={cn("block w-full overflow-hidden rounded-md border-2 focus-visible:outline-2 focus-visible:outline-primary", asset.id === value ? "border-primary" : "border-transparent")}
                  >
                    {asset.thumbnail_url && <img src={asset.thumbnail_url} alt={asset.name} className="aspect-square w-full object-cover" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function GraphicEditor({
  open,
  onOpenChange,
  piece,
  startTemplate,
  startSize,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  piece: { id: string };
  /** For a new graphic: the template to start with (a carousel for a carousel item). */
  startTemplate?: GraphicTemplate;
  startSize?: GraphicSize;
}) {
  const brand = useBrandProfile();
  const list = usePostGraphics(open ? piece.id : null);
  const graphic = list.data?.[0] ?? null;
  const make = useMakeGraphic();
  const change = useChangeGraphic();
  const write = useWriteGraphic();
  const colours = brand.data?.colours ?? [];
  const fallback: Draft = {
    template: startTemplate ?? "quote",
    size: startSize ?? "4:5",
    design: { background: colours[0] ?? "#0F4C5C", accent: colours[1] ?? colours[0] ?? "#E9A23B", font: "poppins", logo: Boolean(brand.data?.logo), footer: "" },
    slides: [{ ...EMPTY_SLIDE }],
  };
  const [draft, setDraft] = useState<Draft>(fallback);
  const [dirty, setDirty] = useState(false);

  // The words and look as the server has them, each time a version is written or drawn, unless there are changes here.
  const writing = graphic?.status === "writing" && graphic.working;
  useEffect(() => {
    if (!dirty && graphic && !writing) setDraft(draftOf(graphic, fallback));
  }, [graphic?.id, graphic?.revision, writing]);

  const update = (changes: Partial<Draft>) => {
    setDirty(true);
    setDraft((current) => ({ ...current, ...changes }));
  };
  const setDesign = (changes: Partial<GraphicDesign>) => update({ design: { ...draft.design, ...changes } });
  const setSlide = (index: number, changes: Partial<Slide>) => update({ slides: draft.slides.map((slide, at) => (at === index ? { ...slide, ...changes } : slide)) });
  const move = (index: number, by: number) => {
    const slides = [...draft.slides];
    const [slide] = slides.splice(index, 1);
    slides.splice(index + by, 0, slide);
    update({ slides });
  };

  const busy = make.isPending || change.isPending || write.isPending || Boolean(graphic?.working);
  const error = make.error ?? change.error ?? write.error;
  const info = templateInfo(draft.template);
  const hasWords = draft.slides.some((slide) => slide.title.trim() || slide.text.trim());
  const backgrounds = [...colours.map((colour, index) => ({ colour, name: `Brand colour ${index + 1}` })), { colour: LIGHT, name: "Light" }, { colour: DARK, name: "Dark" }];
  const accents = colours.length ? colours.map((colour, index) => ({ colour, name: `Brand colour ${index + 1}` })) : [{ colour: "#E9A23B", name: "Amber" }];

  const reset = () => {
    make.reset();
    change.reset();
    write.reset();
  };
  const drawn = async () => {
    reset();
    const slides = draft.slides.filter((slide) => slide.title.trim() || slide.text.trim() || slide.label.trim());
    if (graphic) await change.mutateAsync({ id: graphic.id, ...draft, slides, revision: graphic.revision });
    else await make.mutateAsync({ piece: piece.id, ...draft, slides });
    setDirty(false);
  };
  const writeForMe = async () => {
    reset();
    if (graphic) await write.mutateAsync({ id: graphic.id, template: draft.template });
    else await make.mutateAsync({ piece: piece.id, template: draft.template, size: draft.size, design: draft.design });
    setDirty(false);
  };
  const run = (work: () => Promise<void>) => {
    work().catch(() => undefined);
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          // Changes not made into pictures are let go.
          reset();
          setDirty(false);
          setDraft(draftOf(graphic, fallback));
        }
        onOpenChange(next);
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={cn(popupClass, "w-[min(48rem,calc(100vw-2rem))]")}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">{graphic ? "Change the graphic" : "Make a graphic"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pretty text-muted-foreground">
                Drawn by Mindra from its own templates in your brand colours. Its pictures go on the post as its photos, and stay in your uploads.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-1 -mr-2" })}>
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>

          {/* What it looks like now. */}
          {graphic?.working ? (
            <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 text-sm text-foreground">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
              {graphic.status === "writing" ? "Writing the words…" : "Drawing the pictures…"} You can close this: it carries on.
            </p>
          ) : graphic && graphic.images.length > 0 ? (
            <ul aria-label="The graphic's pictures" className="mb-4 flex gap-2 overflow-x-auto pb-1">
              {graphic.images.map((image, index) => (
                <li key={image.id} className={cn("w-28 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary sm:w-36", ASPECT_CLASS[graphic.size])}>
                  <a href={image.url} target="_blank" rel="noreferrer" className="block size-full focus-visible:outline-2 focus-visible:outline-primary">
                    <img src={image.thumbnail_url} alt={`Slide ${index + 1} of ${graphic.images.length}`} className="size-full object-cover" />
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {graphic?.error && !graphic.working && (
            <p role="alert" className="mb-4 text-sm text-pretty text-red-600">
              {graphic.status === "failed" ? "Couldn't make it: " : ""}
              {graphic.error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="graphic-template" className={labelClass}>
                Template
              </label>
              <select id="graphic-template" value={draft.template} onChange={(event) => update({ template: event.target.value as GraphicTemplate })} className={inputClass}>
                {TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">{info.hint}</p>
            </div>
            <div>
              <label htmlFor="graphic-size" className={labelClass}>
                Size
              </label>
              <select id="graphic-size" value={draft.size} onChange={(event) => update({ size: event.target.value as GraphicSize })} className={inputClass}>
                {SIZES.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
            <Swatches label="Background" value={draft.design.background} choices={backgrounds} onChange={(background) => setDesign({ background })} />
            <Swatches label="Accent" value={draft.design.accent} choices={accents} onChange={(accent) => setDesign({ accent })} />
            <div>
              <label htmlFor="graphic-font" className={labelClass}>
                Headline font
              </label>
              <select id="graphic-font" value={draft.design.font} onChange={(event) => setDesign({ font: event.target.value as FontId })} className={inputClass}>
                {FONTS.map((font) => (
                  <option key={font.id} value={font.id}>
                    {font.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="graphic-footer" className={labelClass}>
                Footer line, such as your handle
              </label>
              <input
                id="graphic-footer"
                value={draft.design.footer}
                maxLength={LIMITS.footer}
                onChange={(event) => setDesign({ footer: event.target.value })}
                className={inputClass}
              />
            </div>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={draft.design.logo && Boolean(brand.data?.logo)}
              disabled={!brand.data?.logo}
              onChange={(event) => setDesign({ logo: event.target.checked })}
              className="size-4 accent-primary"
            />
            Show the logo
            {!brand.data?.logo && <span className="text-xs text-muted-foreground">(add one in the brand profile)</span>}
          </label>

          <fieldset className="mt-5" disabled={writing}>
            <legend className="text-sm font-semibold text-foreground">
              {draft.slides.length === 1 ? "The words" : `The ${draft.slides.length} slides`}
            </legend>
            <ol className="mt-2 space-y-3">
              {draft.slides.map((slide, index) => (
                <li key={index} className="rounded-lg border border-border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Slide {index + 1}
                      {draft.template === "carousel" && draft.slides.length > 1 && index === 0 ? " · the cover" : ""}
                      {draft.template === "carousel" && draft.slides.length > 1 && index === draft.slides.length - 1 ? " · the call to action" : ""}
                    </p>
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Move slide ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)} className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}>
                        <ArrowUp aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move slide ${index + 1} down`}
                        disabled={index === draft.slides.length - 1}
                        onClick={() => move(index, 1)}
                        className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
                      >
                        <ArrowDown aria-hidden="true" className="size-4" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove slide ${index + 1}`}
                        disabled={draft.slides.length === 1}
                        onClick={() => update({ slides: draft.slides.filter((_, at) => at !== index) })}
                        className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
                      >
                        <Trash2 aria-hidden="true" className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <div>
                      <label htmlFor={`slide-${index}-label`} className={labelClass}>
                        {info.fields.label}
                      </label>
                      <input id={`slide-${index}-label`} value={slide.label} maxLength={LIMITS.label} onChange={(event) => setSlide(index, { label: event.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor={`slide-${index}-title`} className={labelClass}>
                        {info.fields.title}
                      </label>
                      <input id={`slide-${index}-title`} value={slide.title} maxLength={LIMITS.title} onChange={(event) => setSlide(index, { title: event.target.value })} className={inputClass} />
                    </div>
                    <div>
                      <label htmlFor={`slide-${index}-text`} className={labelClass}>
                        {info.fields.text}
                      </label>
                      <textarea id={`slide-${index}-text`} rows={3} value={slide.text} maxLength={LIMITS.text} onChange={(event) => setSlide(index, { text: event.target.value })} className={inputClass} />
                    </div>
                    {info.pictures === "pair" ? (
                      <>
                        <PhotoChoice number={index + 1} name="before picture" value={slide.photo} onChange={(photo) => setSlide(index, { photo })} />
                        <PhotoChoice number={index + 1} name="after picture" value={slide.photo2 ?? ""} onChange={(photo2) => setSlide(index, { photo2 })} />
                      </>
                    ) : info.pictures === "photo" && (draft.template !== "carousel" || index === 0) ? (
                      <PhotoChoice number={index + 1} value={slide.photo} onChange={(photo) => setSlide(index, { photo })} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
            {draft.slides.length < MOST_SLIDES && (
              <button type="button" onClick={() => update({ slides: [...draft.slides, { ...EMPTY_SLIDE }] })} className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-3" })}>
                <Plus aria-hidden="true" className="size-4" />
                Add a slide
              </button>
            )}
          </fieldset>

          {Boolean(error) && (
            <p role="alert" className="mt-4 text-sm text-pretty text-red-600">
              {error instanceof Error ? error.message : "Something went wrong. Try again."} <SeePlans error={error} />
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
            <button type="button" disabled={busy} onClick={() => run(writeForMe)} className={buttonStyles({ variant: "secondary", className: "mr-auto" })}>
              <Sparkles aria-hidden="true" className="size-4" />
              {graphic ? "Write the words again" : "Write the words for me"}
            </button>
            <Dialog.Close className={buttonStyles({ variant: "secondary" })}>Close</Dialog.Close>
            <button type="button" disabled={busy || !hasWords} onClick={() => run(drawn)} className={buttonStyles()}>
              {busy && !graphic?.working ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" /> : null}
              {graphic ? "Make it again" : "Make the graphic"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
