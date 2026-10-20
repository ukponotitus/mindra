// The look of the calendar's dialogs, matching the app's other Base UI dialogs.

export const backdropClass =
  "fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0";

export const popupClass =
  "fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto overscroll-contain rounded-xl bg-white p-5 shadow-xl transition-[opacity,scale] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0 sm:p-6";

/** A Base UI switch, as in Settings → Reminders. */
export const switchClass =
  "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full bg-gray-300 p-0.5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary data-[checked]:bg-primary data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50";
export const thumbClass = "size-5 rounded-full bg-white shadow-sm transition-transform duration-150 ease-out data-[checked]:translate-x-4";
