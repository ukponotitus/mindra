import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ApiError, apiRequest } from "../../lib/api";
import { saveComposition, type Composition, type StudioAsset, type StudioProject } from "../../lib/studio";

export type SaveState =
  | { kind: "saved" }
  | { kind: "unsaved" }
  | { kind: "saving" }
  /** The project changed somewhere else (another tab, a teammate): nothing is saved until the person chooses. */
  | { kind: "conflict"; version: number }
  /** The server refused the composition: the message says why; the next change tries again. */
  | { kind: "refused"; message: string }
  | { kind: "offline"; message: string };

const HISTORY = 100;
// Changes to the same thing within this time are one step of undo (a slider being dragged, a word being typed).
const MERGE_MS = 900;
const SAVE_AFTER_MS = 1200;
// A save that didn't reach the server (no connection, the server busy) is tried again on its own, less often each time.
const RETRY_MS = [3000, 6000, 12000, 30000];

/**
 * The editor's copy of a project's composition: every change goes on an undo history (in this tab) and is saved a
 * moment later with the version it was edited from. A save refused because the project changed elsewhere waits for
 * the person to choose; a save the server refuses keeps the change on screen with the reason.
 */
export function useEditor(project: StudioProject) {
  const queryClient = useQueryClient();
  const [composition, setComposition] = useState<Composition>(project.composition);
  const [version, setVersion] = useState(project.version);
  const [assets, setAssets] = useState<Record<string, StudioAsset>>(project.assets);
  const [save, setSave] = useState<SaveState>({ kind: "saved" });
  const [past, setPast] = useState<Composition[]>([]);
  const [future, setFuture] = useState<Composition[]>([]);
  const last = useRef<{ key: string; at: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef({ composition, version, save });
  latest.current = { composition, version, save };
  const saving = useRef(false);
  const retries = useRef(0);
  // While the AI assistant changes the video, nothing else does.
  const locked = useRef(false);

  /** Save now. The version saved, or null when what's on screen isn't saved (a conflict, a refusal, no connection). */
  const flush = useCallback(async (): Promise<number | null> => {
    window.clearTimeout(timer.current);
    const { composition: current, version: base, save: state } = latest.current;
    if (state.kind === "saved") return base;
    if (state.kind === "conflict" || saving.current) return null;
    saving.current = true;
    setSave({ kind: "saving" });
    try {
      const saved = await saveComposition(project.id, current, base);
      setVersion(saved.version);
      latest.current = { ...latest.current, version: saved.version };
      setAssets((known) => ({ ...known, ...saved.assets }));
      queryClient.setQueryData(["studio", "project", project.id], saved);
      queryClient.invalidateQueries({ queryKey: ["studio", "projects"] });
      // Changed again while it was saving: save that too.
      const changedSince = latest.current.composition !== current;
      setSave(changedSince ? { kind: "unsaved" } : { kind: "saved" });
      latest.current = { ...latest.current, save: changedSince ? { kind: "unsaved" } : { kind: "saved" } };
      saving.current = false;
      retries.current = 0;
      if (changedSince) timer.current = window.setTimeout(() => void flush(), SAVE_AFTER_MS);
      return changedSince ? null : saved.version;
    } catch (error) {
      saving.current = false;
      if (error instanceof ApiError && error.status === 409) {
        const fresh = await apiRequest<StudioProject>(`/api/studio/projects/${project.id}/`).catch(() => null);
        setSave({ kind: "conflict", version: fresh?.version ?? base + 1 });
      } else if (error instanceof ApiError && error.status === 400) {
        setSave({ kind: "refused", message: error.message });
      } else {
        const offline = { kind: "offline" as const, message: error instanceof Error ? error.message : "Couldn't save. Check your connection." };
        setSave(offline);
        latest.current = { ...latest.current, save: offline };
        const wait = RETRY_MS[Math.min(retries.current, RETRY_MS.length - 1)];
        retries.current += 1;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => void flush(), wait);
      }
      return null;
    }
  }, [project.id, queryClient]);

  /** Apply a change. `key` names what changed, so repeated changes to it are one step of undo. */
  const change = useCallback(
    (next: Composition | ((current: Composition) => Composition), key = "") => {
      if (locked.current) return;
      const current = latest.current.composition;
      const value = typeof next === "function" ? next(current) : next;
      if (value === current) return;
      const now = Date.now();
      const merge = key !== "" && last.current?.key === key && now - last.current.at < MERGE_MS;
      last.current = { key, at: now };
      if (!merge) setPast((items) => [...items.slice(-HISTORY + 1), current]);
      setFuture([]);
      // Kept at once, so changes made one after another in the same moment build on each other.
      const nextSave = latest.current.save.kind === "conflict" ? latest.current.save : { kind: "unsaved" as const };
      latest.current = { ...latest.current, composition: value, save: nextSave };
      setComposition(value);
      setSave(nextSave);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_AFTER_MS);
    },
    [flush],
  );

  const restore = useCallback(
    (direction: "undo" | "redo") => {
      if (locked.current) return;
      const from = direction === "undo" ? past : future;
      if (!from.length) return;
      const target = from[from.length - 1];
      if (direction === "undo") {
        setPast(from.slice(0, -1));
        setFuture((items) => [...items, latest.current.composition]);
      } else {
        setFuture(from.slice(0, -1));
        setPast((items) => [...items, latest.current.composition]);
      }
      last.current = null;
      const nextSave = latest.current.save.kind === "conflict" ? latest.current.save : { kind: "unsaved" as const };
      latest.current = { ...latest.current, composition: target, save: nextSave };
      setComposition(target);
      setSave(nextSave);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_AFTER_MS);
    },
    [past, future, flush],
  );

  /** After a conflict: take the newest saved version (this tab's unsaved changes are dropped, and can be undone). */
  const loadNewest = useCallback(async () => {
    const fresh = await apiRequest<StudioProject>(`/api/studio/projects/${project.id}/`);
    queryClient.setQueryData(["studio", "project", project.id], fresh);
    queryClient.invalidateQueries({ queryKey: ["studio", "projects"] });
    setPast((items) => [...items.slice(-HISTORY + 1), latest.current.composition]);
    setFuture([]);
    setComposition(fresh.composition);
    setVersion(fresh.version);
    setAssets((known) => ({ ...known, ...fresh.assets }));
    setSave({ kind: "saved" });
    latest.current = { composition: fresh.composition, version: fresh.version, save: { kind: "saved" } };
  }, [project.id, queryClient]);

  /** After a conflict: save this tab's version over the newest one, as the person chose. */
  const keepMine = useCallback(async () => {
    const state = latest.current.save;
    if (state.kind !== "conflict") return;
    setVersion(state.version);
    latest.current = { ...latest.current, version: state.version, save: { kind: "unsaved" } };
    setSave({ kind: "unsaved" });
    await flush();
  }, [flush]);

  /** Replace everything with a version from the server (an earlier one restored, or the AI assistant's change), as
   * one step that Undo takes back. */
  const reset = useCallback((fresh: StudioProject) => {
    queryClient.setQueryData(["studio", "project", project.id], fresh);
    queryClient.invalidateQueries({ queryKey: ["studio", "projects"] });
    setPast((items) => [...items.slice(-HISTORY + 1), latest.current.composition]);
    setFuture([]);
    setComposition(fresh.composition);
    setVersion(fresh.version);
    setAssets((known) => ({ ...known, ...fresh.assets }));
    setSave({ kind: "saved" });
    latest.current = { composition: fresh.composition, version: fresh.version, save: { kind: "saved" } };
  }, [project.id, queryClient]);

  // Back online: save at once rather than waiting for the next try.
  useEffect(() => {
    const online = () => {
      if (latest.current.save.kind === "offline") void flush();
    };
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [flush]);

  // Save before leaving, and warn when that can't happen.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (latest.current.save.kind !== "saved") {
        void flush();
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [flush]);
  useEffect(
    () => () => {
      window.clearTimeout(timer.current);
      // React Router navigation doesn't fire beforeunload. Send a pending save as the editor leaves too; an in-flight
      // request is already on its way and is allowed to finish.
      if (latest.current.save.kind !== "saved") void flush();
    },
    [flush],
  );

  return {
    composition,
    version,
    assets,
    save,
    change,
    flush,
    undo: () => restore("undo"),
    redo: () => restore("redo"),
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    loadNewest,
    keepMine,
    reset,
    learnAssets: (more: Record<string, StudioAsset>) => setAssets((known) => ({ ...known, ...more })),
    lock: (value: boolean) => {
      locked.current = value;
    },
  };
}
