import { createContext, useContext, useEffect } from "react";

/** Whether the section a demo sits in is on screen. Sections provide it; demos only tick while it is true. */
export const PlaybackContext = createContext(true);

/** Calls `tick` every `ms` milliseconds while the surrounding section is on screen. `tick` should be stable. */
export function useLoop(tick: () => void, ms: number) {
  const playing = useContext(PlaybackContext);
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(tick, ms);
    return () => window.clearInterval(id);
  }, [playing, tick, ms]);
}
