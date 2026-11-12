import { useEffect, useState } from "react";

/** Whether a CSS media query matches right now, kept up to date as the window changes. Without a window (the landing
 * page rendered at build time, scripts/prerender.mjs) it's false until the app starts. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => (typeof window === "undefined" ? false : window.matchMedia(query).matches));
  useEffect(() => {
    const list = window.matchMedia(query);
    const onChange = () => setMatches(list.matches);
    onChange();
    list.addEventListener("change", onChange);
    return () => list.removeEventListener("change", onChange);
  }, [query]);
  return matches;
}
