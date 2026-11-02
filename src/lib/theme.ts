import { useEffect, useLayoutEffect, useSyncExternalStore } from "react";

// Light or dark: the person's choice, or their device's setting ("system"), remembered on this device. Light until they
// choose, so a new account starts light even on a phone set to dark. The app (inside DashboardShell) follows it; the
// landing and legal pages stay light.

export type ThemeChoice = "light" | "dark" | "system";

export const THEME_CHOICES: { id: ThemeChoice; label: string; description: string }[] = [
  { id: "light", label: "Light", description: "Light backgrounds, dark text" },
  { id: "dark", label: "Dark", description: "Dark backgrounds, easier at night" },
  { id: "system", label: "Device setting", description: "Follows your phone or computer" },
];

const KEY = "mindra.theme";
const listeners = new Set<() => void>();
const DARK_QUERY = "(prefers-color-scheme: dark)";

function read(): ThemeChoice {
  try {
    const value = localStorage.getItem(KEY);
    return value === "dark" || value === "system" ? value : "light";
  } catch {
    return "light";
  }
}

let current: ThemeChoice = read();

function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = typeof window !== "undefined" ? window.matchMedia?.(DARK_QUERY) : undefined;
  media?.addEventListener?.("change", listener);
  return () => {
    listeners.delete(listener);
    media?.removeEventListener?.("change", listener);
  };
}

export function setTheme(choice: ThemeChoice) {
  current = choice;
  try {
    localStorage.setItem(KEY, choice);
  } catch {
    // Not remembered (private mode); it still applies for this visit.
  }
  for (const listener of listeners) listener();
}

function systemDark() {
  return typeof window !== "undefined" && Boolean(window.matchMedia?.(DARK_QUERY).matches);
}

/** The choice, and what it comes to now ("light" or "dark"). */
export function useTheme() {
  const choice = useSyncExternalStore(subscribe, () => current, () => "light" as ThemeChoice);
  const dark = useSyncExternalStore(subscribe, systemDark, () => false);
  const resolved: "light" | "dark" = choice === "system" ? (dark ? "dark" : "light") : choice;
  return { choice, resolved, setTheme };
}

/** Puts the page in the chosen theme while the component is shown (the app's shell), and back to light after. */
export function useApplyTheme() {
  const { resolved } = useTheme();
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
  }, [resolved]);
  useEffect(() => () => document.documentElement.classList.remove("dark"), []);
}
