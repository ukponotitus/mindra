import { useEffect, useRef, useState } from "react"
import { Check, CornerDownLeft, LoaderCircle, TriangleAlert, Undo2 } from "lucide-react"
import { ApiError } from "../../lib/api"
import { cn } from "../../lib/cn"
import { askAssistant, type AssistantSelection, type Composition } from "../../lib/studio"
import { buttonStyles } from "../ui/button"
import { areaClass } from "./styles"
import type { useEditor } from "./useEditor"

/** One request to the assistant and what came of it. */
export interface AssistantTurn {
  id: number
  request: string
  /** What Mindra changed, in words (from the server, not the AI). */
  changes: string[]
  /** What couldn't be done, in words. */
  skipped: string[]
  /** The assistant's own words, shown when nothing changed. */
  reply: string
  /** Why nothing was asked or applied (unsaved changes, the AI unavailable, a change the video couldn't take). */
  problem: string
  /** The composition the change made, so its Undo shows only while it's the latest. */
  after: Composition | null
  undone: boolean
}

const MAX_REQUEST = 500

/**
 * The AI assistant's state, kept by the editor so it lasts while the panel shows other tabs. Asking saves what's on
 * screen first, then sends the request with that version; the change comes back as the newest version, applied as
 * one step that Undo takes back. The editor is locked while the assistant works, so nothing changes under it.
 */
export function useAssistant(projectId: string, editor: ReturnType<typeof useEditor>) {
  const [turns, setTurns] = useState<AssistantTurn[]>([])
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState("")

  const record = (turn: Omit<AssistantTurn, "id" | "undone">) =>
    setTurns((items) => [{ ...turn, id: Date.now(), undone: false }, ...items].slice(0, 20))

  const ask = async (request: string, selected: AssistantSelection, time: number) => {
    const words = request.trim().slice(0, MAX_REQUEST)
    if (!words || busy) return
    setBusy(true)
    editor.lock(true)
    const empty = { changes: [], skipped: [], reply: "", after: null }
    try {
      const version = await editor.flush()
      if (version === null) {
        record({ ...empty, request: words, problem: "Your latest changes aren't saved yet, so Mindra didn't change anything. Once they're saved, ask again." })
        return
      }
      const answer = await askAssistant(projectId, { request: words, version, selected, time })
      const changed = answer.changes.length > 0
      if (changed) editor.reset(answer.project)
      record({
        request: words,
        changes: answer.changes,
        skipped: answer.skipped,
        reply: answer.reply,
        problem: "",
        after: changed ? answer.project.composition : null,
      })
      setDraft("")
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        // Changed elsewhere since it was saved here: what's on screen was saved, so the newest version replaces it.
        await editor.loadNewest().catch(() => undefined)
        record({ ...empty, request: words, problem: "This video was changed somewhere else, so Mindra didn't change it. The newest version is loaded now; ask again." })
      } else {
        record({ ...empty, request: words, problem: error instanceof Error ? error.message : "Mindra couldn't change the video. Try again." })
      }
    } finally {
      editor.lock(false)
      setBusy(false)
    }
  }

  const undo = (turn: AssistantTurn) => {
    editor.undo()
    setTurns((items) => items.map((item) => (item.id === turn.id ? { ...item, undone: true } : item)))
  }

  return {
    turns,
    busy,
    draft,
    setDraft,
    ask,
    undo,
    /** The latest change, while nothing has changed since. */
    canUndo: (turn: AssistantTurn) => turn.after !== null && !turn.undone && turn.after === editor.composition,
  }
}

export type AssistantState = ReturnType<typeof useAssistant>

interface Props {
  assistant: AssistantState
  /** Why the assistant can't be used here, or "". */
  unavailable: string
  /** What's selected, in words ("Clip 2 (choir)"), or "". */
  selection: string
  suggestions: string[]
  onAsk: (request: string) => void
}

// Colours in what changed ("#FFD700") get a swatch.
const COLOUR = /(#[0-9A-Fa-f]{6})/

function Words({ text }: { text: string }) {
  return (
    <>
      {text.split(COLOUR).map((part, index) =>
        COLOUR.test(part) ? (
          <span key={index} className="inline-flex items-center gap-1 whitespace-nowrap">
            <span aria-hidden="true" className="inline-block size-3 rounded-sm border border-black/15 align-[-2px]" style={{ background: part }} />
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

function Waiting() {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    const timer = window.setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [])
  return (
    <div role="status" className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-foreground">
      <LoaderCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 animate-spin text-primary" />
      <p className="text-pretty">
        Mindra is changing your video{seconds >= 3 ? ` (${seconds} s)` : ""}.
        {seconds >= 15 && " The AI is busy right now; this can take up to a minute."}
      </p>
    </div>
  )
}

/** The left panel's "Ask AI" tab: say what to change in plain words; Mindra changes it, and Undo takes it back. */
export default function AssistantTab({ assistant, unavailable, selection, suggestions, onAsk }: Props) {
  const field = useRef<HTMLTextAreaElement>(null)
  const { turns, busy, draft, setDraft } = assistant
  const send = () => {
    if (draft.trim() && !busy && !unavailable) onAsk(draft)
  }
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-foreground">Ask Mindra to change it</h3>
        <p className="mt-0.5 text-[11px] text-pretty text-muted-foreground">
          Say what you want in your own words. Mindra makes the change here, and Undo takes it back.
        </p>
      </div>

      {unavailable ? (
        <p className="rounded-lg bg-secondary px-3 py-2 text-xs text-pretty text-muted-foreground">{unavailable}</p>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            send()
          }}
          className="space-y-2"
        >
          <label htmlFor="assistant-request" className="sr-only">
            What to change
          </label>
          <textarea
            id="assistant-request"
            ref={field}
            rows={3}
            maxLength={MAX_REQUEST}
            value={draft}
            disabled={busy}
            placeholder={selection ? "Make this one shorter" : "Make the intro shorter and the music quieter"}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault()
                send()
              }
            }}
            className={cn(areaClass, "resize-none text-[13px]")}
          />
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground" title={selection || undefined}>
              {selection ? `“This” is ${selection}` : "Nothing selected: “it” is the whole video"}
            </p>
            <button type="submit" disabled={busy || !draft.trim()} className={buttonStyles({ size: "sm", className: "h-8 px-3" })}>
              {busy ? <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" /> : <CornerDownLeft aria-hidden="true" className="size-3.5" />}
              {busy ? "Changing…" : "Change it"}
            </button>
          </div>
        </form>
      )}

      {busy && <Waiting />}

      {!unavailable && !turns.length && !busy && (
        <div>
          <p className="text-[11px] font-medium text-muted-foreground">Try</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => {
                    setDraft(suggestion)
                    field.current?.focus()
                  }}
                  className="rounded-full border border-border bg-white px-2.5 py-1 text-left text-[11px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {turns.length > 0 && (
        <ol aria-label="What you asked" className="space-y-2">
          {turns.map((turn) => (
            <li key={turn.id} className="rounded-lg border border-border p-2.5 text-xs">
              <p className="font-medium text-pretty text-foreground">{turn.request}</p>
              {turn.problem ? (
                <p className="mt-1.5 flex gap-1.5 text-pretty text-red-700">
                  <TriangleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                  {turn.problem}
                </p>
              ) : turn.changes.length ? (
                <ul className="mt-1.5 space-y-1">
                  {turn.changes.map((change, index) => (
                    <li key={index} className={cn("flex gap-1.5 text-pretty", turn.undone ? "text-muted-foreground line-through" : "text-foreground")}>
                      <Check aria-hidden="true" className="mt-px size-3.5 shrink-0 text-emerald-600" />
                      <span>
                        <Words text={change} />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-pretty text-muted-foreground">{turn.reply || "Nothing was changed."}</p>
              )}
              {turn.skipped.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {turn.skipped.map((reason, index) => (
                    <li key={index} className="flex gap-1.5 text-pretty text-amber-800">
                      <TriangleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" />
                      {reason}
                    </li>
                  ))}
                </ul>
              )}
              {turn.undone ? (
                <p className="mt-1.5 text-muted-foreground">Undone.</p>
              ) : (
                assistant.canUndo(turn) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => assistant.undo(turn)}
                    className={buttonStyles({ variant: "secondary", size: "sm", className: "mt-2 h-7 px-2 text-xs" })}
                  >
                    <Undo2 aria-hidden="true" className="size-3.5" />
                    Undo this
                  </button>
                )
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
