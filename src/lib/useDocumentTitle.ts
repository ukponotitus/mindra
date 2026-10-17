import { useEffect } from "react";

/** Sets the browser tab title. Pages pass their own name; the app name is added here so the format stays the same. */
export function useDocumentTitle(page: string | null) {
  useEffect(() => {
    document.title = page ? `${page} · Mindra` : "Mindra · Record once. Post all month.";
  }, [page]);
}
