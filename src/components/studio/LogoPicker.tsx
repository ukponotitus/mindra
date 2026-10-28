import { useRef, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Check, Image as ImageIcon, LoaderCircle, Upload, X } from "lucide-react"
import { cn } from "../../lib/cn"
import { useStudioAssets, useUploadAsset, type StudioAsset } from "../../lib/studio"
import { backdropClass, popupClass } from "../calendar/dialogStyles"
import { buttonStyles } from "../ui/button"

/** Where the chosen picture comes from: this video's media, a new upload (already in the media), or an earlier upload
 * from another video (to bring in first). */
export type LogoSource = "media" | "uploaded" | "earlier"

function Pictures({ pictures, current, onChoose }: { pictures: StudioAsset[]; current: string | null; onChoose: (asset: StudioAsset) => void }) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {pictures.map((asset) => {
        const on = asset.id === current
        return (
          <li key={asset.id}>
            <button
              type="button"
              aria-pressed={on}
              onClick={() => onChoose(asset)}
              className={cn(
                "relative block w-full overflow-hidden rounded-lg border-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                on ? "border-primary" : "border-transparent hover:border-border",
              )}
            >
              <span className="relative block aspect-square bg-secondary">
                {asset.thumbnail_url ? (
                  <img src={asset.thumbnail_url} alt="" className="absolute inset-0 size-full object-contain p-1.5" />
                ) : (
                  <span className="absolute inset-0 grid place-items-center text-muted-foreground">
                    <ImageIcon aria-hidden="true" className="size-5" />
                  </span>
                )}
              </span>
              <span className="block truncate px-1 py-0.5 text-[11px] text-foreground">{asset.name}</span>
              {on && (
                <span className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-primary text-white">
                  <Check aria-hidden="true" className="size-3" strokeWidth={3} />
                </span>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Choose the video's logo: one of its pictures, a picture from another video, or a new upload. It goes on the whole
 * video, in the top right to start with. */
export default function LogoPicker({
  open,
  onOpenChange,
  projectId,
  media,
  current,
  onChoose,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  /** This video's media. */
  media: StudioAsset[]
  /** The picture the logo is now (its asset id), or null without a logo. */
  current: string | null
  onChoose: (asset: StudioAsset, source: LogoSource) => Promise<void>
}) {
  const assets = useStudioAssets()
  const upload = useUploadAsset()
  const file = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [problem, setProblem] = useState("")
  const [busy, setBusy] = useState(false)
  const here = new Set(media.map((asset) => asset.id))
  const ready = (asset: StudioAsset) => asset.kind === "image" && asset.status === "ready"
  const mine = media.filter(ready)
  const earlier = (assets.data?.results ?? []).filter((asset) => ready(asset) && !here.has(asset.id))

  const choose = async (asset: StudioAsset, source: LogoSource) => {
    setBusy(true)
    setProblem("")
    try {
      await onChoose(asset, source)
      onOpenChange(false)
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't use this picture.")
    } finally {
      setBusy(false)
    }
  }

  const send = async (picked: File | undefined) => {
    if (!picked) return
    setProblem("")
    setProgress(0)
    try {
      if (!picked.type.startsWith("image/") && !/\.(heic|heif)$/i.test(picked.name)) throw new Error("Choose a picture for the logo: PNG, JPEG, WebP or HEIC.")
      const asset = await upload.mutateAsync({ file: picked, project: projectId, onProgress: setProgress })
      await choose(asset, "uploaded")
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't upload this picture.")
    } finally {
      setProgress(null)
    }
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setProblem("")
        onOpenChange(next)
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={cn(popupClass, "w-[min(40rem,calc(100vw-2rem))]")}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">{current ? "Change the logo" : "Add a logo"}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pretty text-muted-foreground">
                It shows on the whole video, in the top right to start with. A PNG with a see-through background looks best.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-1 -mr-2" })}>
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>

          <div className="max-h-[55vh] space-y-4 overflow-y-auto pr-1" aria-busy={busy}>
            <div>
              <input
                ref={file}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,.heic,.heif"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={(event) => {
                  void send(event.target.files?.[0])
                  event.target.value = ""
                }}
              />
              <button type="button" disabled={progress !== null || busy} onClick={() => file.current?.click()} className={buttonStyles({ variant: "secondary" })}>
                {progress !== null ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Upload aria-hidden="true" className="size-4" />}
                {progress !== null ? `Uploading ${Math.round(progress * 100)}%` : "Upload a logo"}
              </button>
            </div>

            {problem && (
              <p role="alert" className="text-sm text-pretty text-red-700">
                {problem}
              </p>
            )}

            <section aria-labelledby="logo-here">
              <h3 id="logo-here" className="mb-2 text-sm font-medium text-foreground">
                This video's pictures
              </h3>
              {mine.length ? (
                <Pictures pictures={mine} current={current} onChoose={(asset) => void choose(asset, "media")} />
              ) : (
                <p className="text-sm text-muted-foreground">No pictures in this video yet.</p>
              )}
            </section>

            {(assets.isPending || earlier.length > 0) && (
              <section aria-labelledby="logo-earlier">
                <h3 id="logo-earlier" className="mb-2 text-sm font-medium text-foreground">
                  From your other videos
                </h3>
                {assets.isPending ? (
                  <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
                    Loading…
                  </p>
                ) : (
                  <Pictures pictures={earlier} current={current} onChoose={(asset) => void choose(asset, "earlier")} />
                )}
              </section>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
