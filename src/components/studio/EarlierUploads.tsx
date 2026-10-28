import { useEffect, useMemo, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Check, Music, X } from "lucide-react"
import { cn } from "../../lib/cn"
import { formatDate, formatDuration } from "../../lib/format"
import { useStudioAssets, type StudioAsset } from "../../lib/studio"
import { backdropClass, popupClass } from "../calendar/dialogStyles"
import { buttonStyles } from "../ui/button"

/** The workspace's earlier uploads (photos, clips, logos and music from other videos), to choose some from. */
export default function EarlierUploads({
  open,
  onOpenChange,
  inProject,
  onBringIn,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  inProject: StudioAsset[]
  onBringIn: (assets: StudioAsset[]) => Promise<void>
}) {
  const assets = useStudioAssets()
  const [chosen, setChosen] = useState<string[]>([])
  const [kind, setKind] = useState<"all" | "image" | "video" | "audio">("all")
  const [busy, setBusy] = useState(false)
  const here = useMemo(() => new Set(inProject.map((asset) => asset.id)), [inProject])
  const others = (assets.data?.results ?? []).filter((asset) => !here.has(asset.id) && asset.status !== "failed" && (kind === "all" || asset.kind === kind))
  useEffect(() => {
    if (!open) setChosen([])
  }, [open])
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className={backdropClass} />
        <Dialog.Popup className={cn(popupClass, "w-[min(44rem,calc(100vw-2rem))]")}>
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground">Earlier uploads</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-pretty text-muted-foreground">
                Photos, clips, logos and music from your other videos. Choose the ones to bring into this one.
              </Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-1 -mr-2" })}>
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <div className="mb-3 flex flex-wrap gap-1.5" role="group" aria-label="Show">
            {(["all", "image", "video", "audio"] as const).map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={kind === item}
                onClick={() => setKind(item)}
                className={buttonStyles({ variant: kind === item ? "primary" : "secondary", size: "sm" })}
              >
                {item === "all" ? "All" : item === "image" ? "Photos and logos" : item === "video" ? "Clips" : "Music"}
              </button>
            ))}
          </div>
          {assets.isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : others.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">Nothing else to bring in.</p>
          ) : (
            <ul className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {others.map((asset) => {
                const on = chosen.includes(asset.id)
                return (
                  <li key={asset.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setChosen((items) => (on ? items.filter((id) => id !== asset.id) : [...items, asset.id]))}
                      className={cn(
                        "relative block w-full overflow-hidden rounded-lg border-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                        on ? "border-primary" : "border-transparent",
                      )}
                    >
                      <span className="relative block aspect-video bg-secondary">
                        {asset.thumbnail_url ? (
                          <img src={asset.thumbnail_url} alt="" className="absolute inset-0 size-full object-cover" />
                        ) : (
                          <span className="absolute inset-0 grid place-items-center text-muted-foreground">
                            <Music aria-hidden="true" className="size-5" />
                          </span>
                        )}
                      </span>
                      <span className="block truncate px-1 pt-0.5 text-[11px] text-foreground">{asset.name}</span>
                      <span className="block truncate px-1 pb-0.5 text-[10px] text-muted-foreground tabular-nums">
                        {asset.kind === "audio" && asset.duration ? `${formatDuration(asset.duration)} · ` : ""}
                        {formatDate(asset.created_at)}
                      </span>
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
          )}
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close className={buttonStyles({ variant: "secondary" })}>Cancel</Dialog.Close>
            <button
              type="button"
              disabled={!chosen.length || busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await onBringIn((assets.data?.results ?? []).filter((asset) => chosen.includes(asset.id)))
                  onOpenChange(false)
                } finally {
                  setBusy(false)
                }
              }}
              className={buttonStyles()}
            >
              {busy ? "Adding…" : chosen.length ? `Add ${chosen.length} to this video` : "Add to this video"}
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
