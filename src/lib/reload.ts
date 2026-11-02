// Pages load their code when they're opened (src/App.tsx). After a deploy, a tab open from before asks for files that
// are gone; loading the page again gets the new version.

const KEY = "mindra.reloadedAt";

/** Whether an error is a page's code that couldn't be loaded (usually a new version came out while it was open). */
export function isStaleBuild(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|module script failed|Unable to preload CSS/i.test(message);
}

/** Load the page again, at most once a minute so an outage can't reload it forever. Returns whether it reloads. */
export function reloadOnce(): boolean {
  try {
    if (Date.now() - Number(sessionStorage.getItem(KEY) || 0) < 60_000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    return false; // Without storage it can't tell whether it just reloaded, so it doesn't.
  }
  window.location.reload();
  return true;
}
