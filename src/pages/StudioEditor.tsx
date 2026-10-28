import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, History, LoaderCircle, Pause, Play, Redo2, Sparkles, Undo2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import AssistantTab, { useAssistant } from "../components/studio/Assistant";
import Inspector, { type InspectorTab } from "../components/studio/Inspector";
import LeftPanel, { type PanelTab } from "../components/studio/LeftPanel";
import LogoPicker, { type LogoSource } from "../components/studio/LogoPicker";
import Preview from "../components/studio/Preview";
import RenderPanel from "../components/studio/RenderPanel";
import Timeline, { type Selection } from "../components/studio/Timeline";
import * as edit from "../components/studio/edits";
import { fieldClass, panelClass } from "../components/studio/styles";
import { useEditor, type SaveState } from "../components/studio/useEditor";
import { buttonStyles } from "../components/ui/button";
import { cn } from "../lib/cn";
import { useAiStatus } from "../lib/content";
import { formatDate } from "../lib/format";
import {
  FONTS_STYLESHEET,
  changeProjectMedia,
  formatSeconds,
  restoreRevision,
  timeline,
  useCreateWithAi,
  useRenameProject,
  useRevisions,
  useStudioAssets,
  useStudioProject,
  type AiBrief,
  type AssistantSelection,
  type StudioAsset,
  type StudioProject,
} from "../lib/studio";

const SOURCE_LABELS: Record<string, string> = {
  create: "Started",
  edit: "Edited",
  ai_create: "Made with AI",
  ai_edit: "Changed by the AI assistant",
  restore: "Restored an earlier version",
};

function saveText(state: SaveState) {
  switch (state.kind) {
    case "saved":
      return "All changes saved";
    case "saving":
      return "Saving…";
    case "unsaved":
      return "Unsaved changes";
    case "conflict":
      return "Not saved: changed elsewhere";
    case "refused":
      return "Not saved";
    case "offline":
      return "Not saved: offline?";
  }
}

const NO_AI = "The AI assistant needs Mindra's AI switched on. Until then, change the video by hand.";

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
// A key pressed in a dialog (the logo picker, earlier uploads, a confirmation) is the dialog's, not the editor's.
const inDialog = (target: EventTarget | null) => target instanceof Element && target.closest('[role="dialog"], [role="alertdialog"]') !== null;

function HistoryPanel({
  project,
  version,
  canRestore,
  onRestored,
}: {
  project: StudioProject;
  version: number;
  canRestore: boolean;
  onRestored: (fresh: StudioProject) => void;
}) {
  const revisions = useRevisions(project.id, true);
  const [problem, setProblem] = useState("");
  const [restoring, setRestoring] = useState<number | null>(null);
  return (
    <section aria-label="History" className={cn(panelClass, "p-3")}>
      <h3 className="text-sm font-semibold text-foreground">History</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">Every save is kept. Restoring makes that version the newest; the ones after it stay here.</p>
      {!canRestore && <p className="mt-1 text-xs text-amber-800">Save your current changes before restoring an older version.</p>}
      {problem && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {problem}
        </p>
      )}
      <ul className="mt-2 max-h-56 divide-y divide-border overflow-y-auto">
        {(revisions.data ?? []).map((revision) => (
          <li key={revision.version} className="flex items-center gap-2 py-1.5 text-xs">
            <span className="w-10 font-medium text-foreground tabular-nums">v{revision.version}</span>
            <span className="min-w-0 flex-1 truncate text-muted-foreground" title={revision.note}>
              {SOURCE_LABELS[revision.source] ?? revision.source}
              {revision.note ? `: ${revision.note}` : ""} · {formatDate(revision.created_at)}
            </span>
            {revision.version === version ? (
              <span className="text-muted-foreground">Current</span>
            ) : (
              <button
                type="button"
                disabled={!canRestore || restoring !== null}
                onClick={async () => {
                  setRestoring(revision.version);
                  setProblem("");
                  try {
                    const fresh = await restoreRevision(project.id, revision.version, version);
                    onRestored(fresh);
                    void revisions.refetch();
                  } catch (error) {
                    setProblem(error instanceof Error ? error.message : "Couldn't restore this version.");
                  } finally {
                    setRestoring(null);
                  }
                }}
                className={buttonStyles({ variant: "secondary", size: "sm", className: "h-7 px-2 text-xs" })}
              >
                {restoring === revision.version ? "Restoring…" : "Restore"}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Editor({ project }: { project: StudioProject }) {
  const editor = useEditor(project);
  const { composition, change } = editor;
  const workspaceAssets = useStudioAssets();
  const rename = useRenameProject();
  const [name, setName] = useState(project.name);
  const [selected, setSelected] = useState<Selection>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [panel, setPanel] = useState<PanelTab>("media");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("basic");
  // This video's own media (newest first), and assets learned since the editor opened.
  const [mediaIds, setMediaIds] = useState<string[]>(project.media ?? []);
  const [learned, setLearned] = useState<Record<string, StudioAsset>>({});
  const [notice, setNotice] = useState("");
  const assistant = useAssistant(project.id, editor);
  const aiStatus = useAiStatus();
  const { starts, length } = timeline(composition);
  const busy = assistant.busy;

  // The text fonts, for the preview and the text styles.
  useEffect(() => {
    if (document.querySelector(`link[href="${FONTS_STYLESHEET}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = FONTS_STYLESHEET;
    document.head.appendChild(link);
  }, []);

  const assets = useMemo(() => {
    const known: Record<string, StudioAsset> = { ...editor.assets, ...learned };
    for (const asset of workspaceAssets.data?.results ?? []) known[asset.id] = asset;
    return known;
  }, [workspaceAssets.data, editor.assets, learned]);
  const media = mediaIds.map((id) => assets[id]).filter((asset): asset is StudioAsset => Boolean(asset));

  const learn = (fresh: StudioAsset[]) => setLearned((known) => ({ ...known, ...Object.fromEntries(fresh.map((asset) => [asset.id, asset])) }));
  const intoMedia = (asset: StudioAsset) => {
    learn([asset]);
    setMediaIds((ids) => [asset.id, ...ids.filter((id) => id !== asset.id)]);
  };

  // The video's logo, added or changed from the timeline or the Video panel (not from the media).
  const [logoPicker, setLogoPicker] = useState(false);
  const logo = composition.overlays[0];
  const chooseLogo = async (asset: StudioAsset, source: LogoSource) => {
    if (source === "earlier") {
      const fresh = await changeProjectMedia(project.id, [asset.id]);
      learn([asset, ...Object.values(fresh.assets)]);
      setMediaIds(fresh.media);
    } else if (source === "uploaded") {
      intoMedia(asset);
    }
    // Built on the video as it is now, not as it was when the picture was chosen (an upload can take a while, and the
    // picker can be closed meanwhile). `change` runs this at once.
    let chosen = "";
    change((current) => {
      const existing = current.overlays[0];
      if (existing) {
        chosen = existing.id;
        return edit.updateOverlay(current, existing.id, { asset: asset.id });
      }
      const result = edit.addLogo(current, asset);
      chosen = result.id;
      return result.composition;
    });
    if (chosen) setSelected({ kind: "overlay", id: chosen });
  };

  // Keep the playhead inside the video when it gets shorter.
  useEffect(() => {
    if (time > length) setTime(length);
  }, [length, time]);

  // Something selected that's gone (undone, or changed by the AI assistant) is no longer selected.
  useEffect(() => {
    if (!selected) return;
    const items = { scene: composition.scenes, text: composition.texts, overlay: composition.overlays, audio: composition.audio }[selected.kind];
    if (!items.some((item) => item.id === selected.id)) setSelected(null);
  }, [composition, selected]);

  const selectedSceneIndex = selected?.kind === "scene" ? composition.scenes.findIndex((scene) => scene.id === selected.id) : -1;
  const select = (item: Selection) => {
    setSelected(item);
    if (item?.kind === "text" && !["text", "style", "animation"].includes(inspectorTab)) setInspectorTab("text");
  };

  const addScene = (asset: StudioAsset) => {
    const scene = edit.sceneFor(asset, composition);
    const at = selectedSceneIndex >= 0 ? selectedSceneIndex + 1 : composition.scenes.length;
    const next = edit.addScene(composition, scene, at);
    change(next);
    setSelected({ kind: "scene", id: scene.id });
    setTime(timeline(next).starts[at] ?? 0);
  };

  const removeSelected = () => {
    if (!selected) return;
    if (selected.kind === "scene") change((current) => edit.removeScene(current, selected.id));
    if (selected.kind === "text") change((current) => edit.removeText(current, selected.id));
    if (selected.kind === "overlay") change((current) => edit.removeOverlay(current, selected.id));
    if (selected.kind === "audio") change((current) => edit.removeAudio(current, selected.id));
    setSelected(null);
  };

  const split = () => {
    const result = edit.splitScene(composition, time);
    if (!result) return false;
    change(result.composition);
    setSelected({ kind: "scene", id: result.id });
    return true;
  };

  // What the AI assistant is told is selected, and how it's named to the person.
  const assistantSelection: AssistantSelection = selected
    ? { kind: ({ scene: "clip", text: "text", overlay: "logo", audio: "music" } as const)[selected.kind], id: selected.id }
    : null;
  const selectionLabel = (() => {
    if (selected?.kind === "scene" && selectedSceneIndex >= 0) {
      const scene = composition.scenes[selectedSceneIndex];
      const what = scene.type === "placeholder" ? scene.label || "an empty slot" : scene.type === "color" ? "title card" : (assets[scene.asset ?? ""]?.name ?? "media");
      return `clip ${selectedSceneIndex + 1} (${what})`;
    }
    if (selected?.kind === "text") {
      const words = composition.texts.find((text) => text.id === selected.id)?.text.replace(/\s+/g, " ") ?? "";
      return `the text “${words.length > 24 ? `${words.slice(0, 24)}…` : words}”`;
    }
    if (selected?.kind === "overlay") return "the logo";
    if (selected?.kind === "audio") return "the music";
    return "";
  })();
  const suggestions = [
    !composition.scenes.length && media.some((asset) => asset.kind !== "audio") && "Put all my photos and clips in the video",
    composition.scenes.length > 0 && "Make the intro shorter",
    composition.scenes.length > 1 && "Use crossfades between every clip",
    composition.overlays.length > 0 && "Put the logo in the top right corner",
    composition.audio.length > 0 && "Make the music quieter",
    composition.texts.length > 0 && "Make the title bigger",
    composition.scenes.length > 0 && "Add a closing card that says “Thank you for watching”",
    composition.canvas.aspect !== "1:1" && "Make it square for Instagram",
  ].filter((item): item is string => Boolean(item)).slice(0, 6);

  // Keyboard: Space plays and pauses, Ctrl+Z / Ctrl+Shift+Z undo and redo, Delete removes what's selected, Escape
  // selects nothing (the whole video's settings). Nothing while the AI assistant works.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (typing(event.target) || inDialog(event.target) || busy) return;
      const mod = event.metaKey || event.ctrlKey;
      if (event.key === " " && !mod) {
        event.preventDefault();
        setPlaying((value) => !value);
      } else if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) editor.redo();
        else editor.undo();
      } else if (mod && event.key.toLowerCase() === "y") {
        event.preventDefault();
        editor.redo();
      } else if ((event.key === "Delete" || event.key === "Backspace") && selected) {
        event.preventDefault();
        removeSelected();
      } else if (event.key === "Escape" && selected) {
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const save = editor.save;
  return (
    <div className="space-y-4">
      <div inert={busy} className="flex flex-wrap items-center gap-2">
        <Link to="/studio" aria-label="Back to Motion Studio" className={buttonStyles({ variant: "ghost", size: "icon" })}>
          <ArrowLeft aria-hidden="true" className="size-4" />
        </Link>
        <input
          aria-label="Video name"
          value={name}
          maxLength={200}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => name.trim() && name.trim() !== project.name && rename.mutate({ id: project.id, name: name.trim() })}
          className={cn(fieldClass, "h-10 max-w-sm text-base font-semibold")}
        />
        {project.origin === "ai" && (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Sparkles aria-hidden="true" className="size-3" />
            Made with AI
          </span>
        )}
        <span role="status" className={cn("text-xs", save.kind === "saved" ? "text-muted-foreground" : save.kind === "saving" || save.kind === "unsaved" ? "text-foreground" : "text-red-700")}>
          {saveText(save)}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" aria-label="Undo" title="Undo (Ctrl+Z)" disabled={!editor.canUndo} onClick={editor.undo} className={buttonStyles({ variant: "ghost", size: "icon" })}>
            <Undo2 aria-hidden="true" className="size-4" />
          </button>
          <button type="button" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" disabled={!editor.canRedo} onClick={editor.redo} className={buttonStyles({ variant: "ghost", size: "icon" })}>
            <Redo2 aria-hidden="true" className="size-4" />
          </button>
          <button type="button" aria-pressed={showHistory} onClick={() => setShowHistory((value) => !value)} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            <History aria-hidden="true" className="size-3.5" />
            History
          </button>
        </div>
      </div>

      {save.kind === "conflict" && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="min-w-0 flex-1 text-pretty">
            This video was changed somewhere else (version {save.version}) since you opened it, so your latest changes aren't saved.
          </p>
          <button type="button" onClick={() => void editor.loadNewest()} className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Load the newest version
          </button>
          <button type="button" onClick={() => void editor.keepMine()} className={buttonStyles({ size: "sm" })}>
            Save mine over it
          </button>
        </div>
      )}
      {(save.kind === "refused" || save.kind === "offline") && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
          {save.message} {save.kind === "offline" ? "Mindra keeps trying to save your changes." : "Change it and Mindra saves again."}
        </div>
      )}
      {notice && (
        <div role="alert" className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
          <p className="min-w-0 flex-1">{notice}</p>
          <button type="button" onClick={() => setNotice("")} className="font-medium underline">
            Dismiss
          </button>
        </div>
      )}
      {showHistory && (
        <HistoryPanel
          project={project}
          version={editor.version}
          canRestore={editor.save.kind === "saved"}
          onRestored={(fresh) => {
            editor.reset(fresh);
            setSelected(null);
          }}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
        <div className="order-3 flex h-[30rem] min-h-0 flex-col lg:order-1 lg:h-[37rem]">
          <LeftPanel
            projectId={project.id}
            tab={panel}
            onTab={setPanel}
            locked={busy}
            assistant={
              <AssistantTab
                assistant={assistant}
                unavailable={aiStatus.data?.provider === "fake" ? NO_AI : ""}
                selection={selectionLabel}
                suggestions={suggestions}
                onAsk={(request) => void assistant.ask(request, assistantSelection, time)}
              />
            }
            composition={composition}
            media={media}
            assets={assets}
            selectedScene={selectedSceneIndex >= 0 ? { index: selectedSceneIndex, id: composition.scenes[selectedSceneIndex].id } : null}
            onUploaded={intoMedia}
            onAddScene={addScene}
            onReplace={(asset) => selected?.kind === "scene" && change((current) => edit.replaceMedia(current, selected.id, asset, assets))}
            onMusic={(asset) => {
              intoMedia(asset);
              // On the video as it is now: a song is added after its download or upload, which takes a while.
              let track = "";
              change((current) => {
                const result = edit.setMusic(current, asset);
                track = result.id;
                return result.composition;
              });
              if (track) setSelected({ kind: "audio", id: track });
            }}
            onBringIn={async (chosen) => {
              try {
                const fresh = await changeProjectMedia(project.id, chosen.map((asset) => asset.id));
                learn([...chosen, ...Object.values(fresh.assets)]);
                setMediaIds(fresh.media);
              } catch (error) {
                setNotice(error instanceof Error ? error.message : "Couldn't add these to the video.");
              }
            }}
            onRemove={async (asset) => {
              const uses = edit.usesOf(composition, asset.id);
              if (uses.scenes + uses.overlays + uses.audio) {
                change((current) => edit.removeUses(current, asset.id));
                setSelected(null);
              }
              setMediaIds((ids) => ids.filter((id) => id !== asset.id));
              try {
                const fresh = await changeProjectMedia(project.id, [asset.id], true);
                setMediaIds(fresh.media);
              } catch (error) {
                setMediaIds((ids) => (ids.includes(asset.id) ? ids : [asset.id, ...ids]));
                setNotice(error instanceof Error ? error.message : "Couldn't take this out of the video.");
              }
            }}
            onAddText={(style) => {
              const result = edit.addText(composition, time, style);
              change(result.composition);
              setSelected({ kind: "text", id: result.id });
              setInspectorTab("text");
            }}
            onTransition={(type, all) => {
              if (selectedSceneIndex < 1) return;
              const scene = composition.scenes[selectedSceneIndex];
              const transition = { type, duration: scene.transition.duration || 0.5 };
              change((current) => (all ? edit.transitionAll(current, transition) : edit.updateScene(current, scene.id, { transition }, assets)));
              setInspectorTab("transition");
            }}
            onFilter={(effect, all) => {
              if (selectedSceneIndex < 0) return;
              const scene = composition.scenes[selectedSceneIndex];
              change((current) => (all ? edit.filterAll(current, effect) : edit.updateScene(current, scene.id, { effect }, assets)));
            }}
          />
        </div>

        <div inert={busy} className={cn("order-1 min-w-0 space-y-2 transition-opacity lg:order-2", busy && "opacity-60")}>
          <div className="flex max-h-[34rem] justify-center rounded-xl bg-gray-950 p-2">
            <Preview
              composition={composition}
              assets={assets}
              time={time}
              playing={playing}
              onTime={setTime}
              onEnded={() => setPlaying(false)}
              selected={selected && selected.kind !== "audio" ? { kind: selected.kind, id: selected.id } : null}
              onSelect={(item) => select(item)}
              onMove={(kind, id, x, y) =>
                change((current) => (kind === "text" ? edit.updateText(current, id, { x, y }) : edit.updateOverlay(current, id, { x, y })), `${id}.drag`)
              }
              className="max-h-[32.5rem]"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!playing && time >= length - 0.05) setTime(0);
                setPlaying((value) => !value);
              }}
              disabled={!composition.scenes.length}
              aria-label={playing ? "Pause" : "Play"}
              className={buttonStyles({ size: "icon" })}
            >
              {playing ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
            </button>
            <input
              type="range"
              aria-label="Position in the video"
              min={0}
              max={Math.max(length, 0.1)}
              step={0.05}
              value={Math.min(time, length)}
              onChange={(event) => setTime(Number(event.target.value))}
              className="min-w-0 flex-1 accent-primary"
            />
            <span className="w-24 text-right text-xs text-muted-foreground tabular-nums">
              {formatSeconds(time)} / {formatSeconds(length)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">The preview is close to the finished video; the video you make is the final one.</p>
        </div>

        <div inert={busy} className={cn("order-4 min-w-0 space-y-4 transition-opacity lg:order-4 lg:col-span-2 xl:order-3 xl:col-span-1", busy && "opacity-60")}>
          <div className="xl:max-h-[37rem] xl:overflow-y-auto xl:rounded-xl">
            <Inspector
              composition={composition}
              assets={assets}
              selected={selected}
              onSelect={select}
              change={change}
              tab={inspectorTab}
              onTab={setInspectorTab}
              onPickLogo={() => setLogoPicker(true)}
            />
          </div>
        </div>

        <div inert={busy} className={cn("order-2 min-w-0 transition-opacity lg:order-3 lg:col-span-2 xl:order-4 xl:col-span-3", busy && "opacity-60")}>
          <Timeline
            composition={composition}
            assets={assets}
            time={time}
            onSeek={(seconds) => {
              setPlaying(false);
              setTime(seconds);
            }}
            selected={selected}
            onSelect={(item) => {
              select(item);
              if (item?.kind === "scene") {
                const index = composition.scenes.findIndex((scene) => scene.id === item.id);
                if (index >= 0 && (time < starts[index] || time > starts[index] + composition.scenes[index].duration)) setTime(starts[index]);
              }
            }}
            onMoveScene={(from, to) => change((current) => edit.moveScene(current, from, to))}
            onSceneLength={(id, seconds) => change((current) => edit.updateScene(current, id, { duration: seconds }, assets))}
            onTime={(kind, id, start, end) =>
              change((current) =>
                kind === "text" ? edit.timeText(current, id, start, end) : kind === "overlay" ? edit.timeOverlay(current, id, start, end) : edit.timeAudio(current, id, start, end),
              )
            }
            onJunction={(id) => {
              setSelected({ kind: "scene", id });
              setInspectorTab("transition");
              setPanel("transitions");
            }}
            onMuteScene={(id, muted) => change((current) => edit.updateScene(current, id, { muted }, assets))}
            onMuteAudio={(id, muted) => change((current) => edit.updateAudio(current, id, { muted }))}
            onAddText={() => {
              const result = edit.addText(composition, time);
              change(result.composition);
              setSelected({ kind: "text", id: result.id });
              setInspectorTab("text");
            }}
            onAddColor={() => {
              const scene = edit.colorScene(composition);
              const at = selectedSceneIndex >= 0 ? selectedSceneIndex + 1 : composition.scenes.length;
              change(edit.addScene(composition, scene, at));
              setSelected({ kind: "scene", id: scene.id });
            }}
            onLogo={() => (logo ? setSelected({ kind: "overlay", id: logo.id }) : setLogoPicker(true))}
            onSplit={split}
            onDuplicate={() => selected?.kind === "scene" && change((current) => edit.duplicateScene(current, selected.id))}
            onDelete={removeSelected}
          />
        </div>

        <div inert={busy} className={cn("order-5 min-w-0 transition-opacity lg:col-span-2 xl:col-span-3", busy && "opacity-60")}>
          <RenderPanel projectId={project.id} composition={composition} assets={assets} version={editor.version} flush={editor.flush} />
        </div>
        <LogoPicker
          open={logoPicker}
          onOpenChange={setLogoPicker}
          projectId={project.id}
          media={media}
          current={logo?.asset ?? null}
          onChoose={chooseLogo}
        />
      </div>
    </div>
  );
}

function Generating({ project }: { project: StudioProject }) {
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center" role="status">
      <LoaderCircle aria-hidden="true" className="mx-auto size-8 animate-spin text-primary" />
      <h2 className="text-xl font-semibold text-balance text-foreground">Mindra is putting “{project.name}” together</h2>
      <p className="text-sm text-pretty text-muted-foreground">
        It's looking at your photos and clips, choosing the order, timing, transitions and text. This usually takes under a
        minute; the editor opens by itself when it's ready.
      </p>
    </div>
  );
}

function Failed({ project, onEdit }: { project: StudioProject; onEdit: () => void }) {
  const navigate = useNavigate();
  const retry = useCreateWithAi();
  const brief = project.brief as AiBrief;
  return (
    <div className="mx-auto max-w-lg space-y-4 py-16 text-center">
      <h2 className="text-xl font-semibold text-balance text-foreground">The AI couldn't make this video</h2>
      <p role="alert" className="text-sm text-pretty text-red-700">
        {project.error || "Something went wrong."}
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {brief?.prompt && (
          <button
            type="button"
            disabled={retry.isPending}
            onClick={() => retry.mutate({ ...brief, name: project.name }, { onSuccess: (fresh) => navigate(`/studio/${fresh.id}`) })}
            className={buttonStyles()}
          >
            {retry.isPending ? "Starting…" : "Try again"}
          </button>
        )}
        <button type="button" onClick={onEdit} className={buttonStyles({ variant: "secondary" })}>
          Make it by hand instead
        </button>
      </div>
      {retry.isError && <p className="text-sm text-red-700">{retry.error.message}</p>}
    </div>
  );
}

/** The Motion Studio editor for one video project. */
export default function StudioEditor() {
  const { projectId } = useParams();
  const project = useStudioProject(projectId);
  const [editAnyway, setEditAnyway] = useState(false);

  if (project.isPending) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Opening the editor…
      </p>
    );
  }
  if (project.isError) {
    return (
      <div className="space-y-3">
        <p role="alert" className="text-sm text-red-700">
          {project.error.message}
        </p>
        <Link to="/studio" className={buttonStyles({ variant: "secondary" })}>
          Back to Motion Studio
        </Link>
      </div>
    );
  }
  const data = project.data;
  if (data.status === "generating") return <Generating project={data} />;
  if (data.status === "failed" && !editAnyway) return <Failed project={data} onEdit={() => setEditAnyway(true)} />;
  // A fresh editor when the AI's draft arrives.
  return <Editor key={`${data.id}-${data.status}`} project={data} />;
}
