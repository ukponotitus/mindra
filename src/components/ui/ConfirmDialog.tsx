import type { ReactElement } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { buttonStyles } from "./button";

interface Props {
  /** The button that opens the dialog. */
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  /** "danger" (the default) for something that can't be undone; "primary" for a step that only asks to be sure. */
  tone?: "danger" | "primary";
  /** The button that closes the dialog without doing it. */
  cancelLabel?: string;
}

/**
 * Asks before something that can't be undone, such as a delete, or before a step worth being sure of. Built on Base
 * UI's AlertDialog, which traps focus, closes on Escape and returns focus to the trigger.
 */
export default function ConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = "danger",
  cancelLabel = "Cancel",
}: Props) {
  return (
    <AlertDialog.Root>
      <AlertDialog.Trigger render={trigger} />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Popup className="fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 shadow-xl transition-[opacity,scale] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
          <AlertDialog.Title className="text-lg font-semibold text-balance text-foreground">{title}</AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-pretty text-muted-foreground">{description}</AlertDialog.Description>
          <div className="mt-6 flex justify-end gap-2">
            <AlertDialog.Close className={buttonStyles({ variant: "secondary" })}>{cancelLabel}</AlertDialog.Close>
            <AlertDialog.Close className={buttonStyles({ variant: tone })} onClick={onConfirm}>
              {confirmLabel}
            </AlertDialog.Close>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
