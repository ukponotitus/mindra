import type { DragEvent } from "react";
import type { ContentPiece } from "../../lib/types";

/** What's being dragged: a post already on the calendar, or one from the "Ready to schedule" list. */
export type DragSource = { piece: ContentPiece; from: "calendar" | "tray" };

/**
 * Drag and drop on the calendar, shared by its views and the list of posts to schedule. Only on devices with a mouse
 * or trackpad; everything it does can also be done with buttons in the dialogs.
 */
export type DragAndDrop = {
  enabled: boolean;
  dragging: DragSource | null;
  /** The day a post is being held over. */
  overDay: string | null;
  start: (source: DragSource, event: DragEvent) => void;
  end: () => void;
  /** Handlers that make a day (a "2026-10-26" key) accept drops. */
  dayTarget: (day: string) => {
    onDragOver: (event: DragEvent) => void;
    onDragLeave: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
  };
};
