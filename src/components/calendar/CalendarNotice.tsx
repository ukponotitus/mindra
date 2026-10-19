import { useEffect, useState } from "react";
import { Undo2, X } from "lucide-react";
import { buttonStyles } from "../ui/button";
import { cn } from "../../lib/cn";

export type Notice = { text: string; error?: boolean; undo?: () => void };

/** How long a note stays up, unless the pointer or keyboard focus is on it. */
const SHOWN_MS = 8000;

/**
 * What the last calendar change did ("Moved to Sun 26 Oct, 7:00 am"), with Undo, at the bottom of the screen. The
 * message region stays in the page while empty, so screen readers announce each new note.
 */
export default function CalendarNotice({ notice, onDismiss }: { notice: Notice | null; onDismiss: () => void }) {
  const [held, setHeld] = useState(false);
  // A new note starts its own countdown.
  const [shown, setShown] = useState(notice);
  if (notice !== shown) {
    setShown(notice);
    setHeld(false);
  }

  useEffect(() => {
    if (!notice || held) return;
    const timer = window.setTimeout(onDismiss, notice.error ? SHOWN_MS * 1.5 : SHOWN_MS);
    return () => window.clearTimeout(timer);
  }, [notice, held, onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      <div
        onPointerEnter={() => setHeld(true)}
        onPointerLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeld(false);
        }}
        className={cn(
          notice
            ? "pointer-events-auto flex w-full max-w-lg items-center gap-2 rounded-xl border bg-white py-2 pr-2 pl-4 text-sm shadow-lg"
            : "sr-only",
          notice?.error ? "border-red-200 text-red-700" : "border-border text-foreground",
        )}
      >
        <p role="status" className={cn("min-w-0 text-pretty tabular-nums", notice && !notice.error && "flex-1")}>
          {notice && !notice.error ? notice.text : ""}
        </p>
        <p role="alert" className="min-w-0 flex-1 text-pretty empty:hidden">
          {notice?.error ? notice.text : ""}
        </p>
        {notice?.undo && (
          <button
            type="button"
            onClick={() => {
              const undo = notice.undo;
              onDismiss();
              undo?.();
            }}
            className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}
          >
            <Undo2 aria-hidden="true" className="size-4" />
            Undo
          </button>
        )}
        {notice && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className={buttonStyles({ variant: "ghost", size: "icon" })}>
            <X aria-hidden="true" className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}
