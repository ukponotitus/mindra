import { useEffect, useRef, useState } from "react"
import { LoaderCircle, Pause, Play, Search } from "lucide-react"
import { cn } from "../../lib/cn"
import { formatDuration } from "../../lib/format"
import { useImportMusic, useMusicSearch, type MusicTrack, type StudioAsset } from "../../lib/studio"
import { buttonStyles } from "../ui/button"
import { fieldClass } from "./styles"

/** One song playing at a time, for listening before choosing. A song is `loading` from the tap until its sound
 * starts (and again while it buffers), and `failed` when it can't be played. */
export function usePreviewPlayer() {
  const [listening, setListening] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  const player = useRef<HTMLAudioElement | null>(null)
  // Stop when the panel closes.
  useEffect(() => () => player.current?.pause(), [])
  const stop = () => {
    player.current?.pause()
    player.current = null
    setListening(null)
    setLoading(null)
  }
  const listen = (id: string, url: string | null) => {
    const again = listening === id
    stop()
    setFailed(null)
    if (again || !url) return
    const audio = new Audio(url)
    // Only the song playing now changes the state: one stopped for another is ignored.
    const current = () => player.current === audio
    const fail = () => {
      if (!current()) return
      player.current = null
      setListening(null)
      setLoading(null)
      setFailed(id)
    }
    audio.onwaiting = () => current() && setLoading(id)
    audio.onplaying = () => current() && setLoading(null)
    audio.onended = () => current() && stop()
    audio.onerror = fail
    player.current = audio
    setListening(id)
    setLoading(id)
    void audio.play().catch((error: unknown) => {
      // Stopping a song before it starts interrupts its play(); that isn't a failure.
      if (!(error instanceof DOMException && error.name === "AbortError")) fail()
    })
  }
  return { listening, loading, failed, listen, stop }
}

/** The play button's icon: loading, playing or not. */
export function PlayIcon({ player, id, className }: { player: PreviewPlayer; id: string; className: string }) {
  if (player.loading === id) return <LoaderCircle aria-hidden="true" className={cn(className, "animate-spin")} />
  if (player.listening === id) return <Pause aria-hidden="true" className={className} />
  return <Play aria-hidden="true" className={className} />
}

/** What a screen reader hears on the play button. */
export function playLabel(player: PreviewPlayer, id: string, name: string) {
  if (player.loading === id) return `Loading ${name}. Stop`
  return player.listening === id ? `Stop ${name}` : `Listen to ${name}`
}

export type PreviewPlayer = ReturnType<typeof usePreviewPlayer>

// Quick searches until the server sends its own.
const MOODS: [string, string][] = [
  ["Popular", ""],
  ["Uplifting", "uplifting"],
  ["Gospel", "gospel"],
  ["Afrobeat", "afrobeat"],
  ["Hip hop", "hiphop"],
  ["Pop", "pop"],
  ["Piano", "piano"],
  ["Acoustic", "acoustic"],
  ["Cinematic", "soundtrack"],
  ["Calm", "relaxation"],
]

/** Search real songs (Jamendo, licensed for use in videos), listen to them, and use one: it's added to the workspace
 * (and to `project`'s media when given) and handed to `onPick`, getting ready on the server. */
export default function MusicSearch({
  project,
  chosenUrl,
  onPick,
  player,
  compact = false,
}: {
  project?: string
  /** The page of the song in use, to mark it. */
  chosenUrl?: string | null
  onPick: (asset: StudioAsset) => void
  player: PreviewPlayer
  compact?: boolean
}) {
  const [typed, setTyped] = useState("")
  const [query, setQuery] = useState("")
  const [tag, setTag] = useState("")
  const [page, setPage] = useState(1)
  const search = useMusicSearch(query, query ? "" : tag, page)
  const importing = useImportMusic()
  const [using, setUsing] = useState<string | null>(null)
  const [problem, setProblem] = useState("")

  // Search as people stop typing.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(typed.trim())
      setPage(1)
    }, 400)
    return () => window.clearTimeout(timer)
  }, [typed])

  const use = async (track: MusicTrack) => {
    setUsing(track.id)
    setProblem("")
    try {
      onPick(await importing.mutateAsync({ track: track.id, project }))
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Couldn't use this song.")
    } finally {
      setUsing(null)
    }
  }

  const data = search.data
  const moods: [string, string][] = data?.moods?.length ? [["Popular", ""], ...data.moods] : MOODS
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          aria-label="Search music"
          placeholder="Search songs, artists, moods"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          className={cn(fieldClass, "pl-8")}
        />
      </div>
      {!query && (
        <div className="flex flex-wrap gap-1" role="group" aria-label="Moods and genres">
          {moods.map(([label, value]) => (
            <button
              key={label}
              type="button"
              aria-pressed={tag === value}
              onClick={() => {
                setTag(value)
                setPage(1)
              }}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary",
                tag === value ? "border-primary bg-primary text-white" : "border-border bg-white text-foreground hover:bg-secondary",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {problem && (
        <p role="alert" className="text-xs text-pretty text-red-700">
          {problem}
        </p>
      )}
      {search.isPending ? (
        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
          Finding music…
        </p>
      ) : search.isError ? (
        <p role="alert" className="text-xs text-pretty text-red-700">
          {search.error.message}{" "}
          <button type="button" onClick={() => void search.refetch()} className="font-medium underline">
            Try again
          </button>
        </p>
      ) : data && !data.available ? (
        <p className="rounded-lg border border-dashed border-border p-3 text-xs text-pretty text-muted-foreground">
          Music search isn't switched on yet. You can upload music you have the rights to.
        </p>
      ) : data?.results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No songs found. Try other words.</p>
      ) : (
        <>
          {/* Another mood or page: the songs shown are the last ones until the new ones come. */}
          {search.isFetching && (
            <p role="status" className="flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
              Finding music…
            </p>
          )}
          <ul
            className={cn("divide-y divide-border transition-opacity", compact && "max-h-72 overflow-y-auto pr-1", search.isFetching && "pointer-events-none opacity-50")}
            aria-busy={search.isFetching}
          >
            {data?.results.map((track) => {
              const id = `search-${track.id}`
              return (
                <li key={track.id} className="flex items-center gap-2 py-2">
                  <button
                    type="button"
                    onClick={() => player.listen(id, track.preview_url)}
                    aria-label={playLabel(player, id, track.title)}
                    className="relative size-10 shrink-0 overflow-hidden rounded-md bg-secondary focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {track.image && <img src={track.image} alt="" className="size-full object-cover" />}
                    <span className="absolute inset-0 grid place-items-center bg-black/35 text-white">
                      <PlayIcon player={player} id={id} className="size-4" />
                    </span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground" title={track.title}>
                      {track.title}
                    </p>
                    <p className={cn("truncate text-[11px]", player.failed === id ? "text-red-700" : "text-muted-foreground")}>
                      {player.failed === id
                        ? "Couldn't play it. Try again."
                        : player.loading === id
                          ? "Loading…"
                          : `${track.artist} · ${formatDuration(track.duration)}`}
                    </p>
                  </div>
                  {chosenUrl && chosenUrl === track.page_url ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">In use</span>
                  ) : (
                    <button
                      type="button"
                      disabled={using !== null}
                      onClick={() => void use(track)}
                      aria-label={using === track.id ? `Adding ${track.title}` : `Use ${track.title}`}
                      className={buttonStyles({ variant: "secondary", size: "sm", className: "h-7 px-2" })}
                    >
                      {using === track.id ? (
                        <>
                          <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
                          Adding
                        </>
                      ) : (
                        "Use"
                      )}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          <div className="flex items-center justify-between">
            <button type="button" disabled={page === 1 || search.isFetching} onClick={() => setPage((value) => value - 1)} className={buttonStyles({ variant: "ghost", size: "sm" })}>
              Previous
            </button>
            <span className="text-[11px] text-muted-foreground tabular-nums">Page {page}</span>
            <button type="button" disabled={!data?.more || search.isFetching} onClick={() => setPage((value) => value + 1)} className={buttonStyles({ variant: "ghost", size: "sm" })}>
              More
            </button>
          </div>
        </>
      )}
      <p className="text-[11px] text-pretty text-muted-foreground">
        Real songs by independent artists on Jamendo, licensed for use in videos as long as you credit the artist (Mindra
        gives you the credit to paste in your caption). Chart hits from Spotify or Boomplay aren't licensed for this;
        Instagram and TikTok let you add those in their own apps when you post.
      </p>
    </div>
  )
}
