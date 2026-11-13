import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronLeft, CircleAlert, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import PlatformCards from "../components/automations/PlatformCards";
import VoicePicker from "../components/automations/VoicePicker";
import { ErrorNote } from "../components/automations/parts";
import { CheckRow, ChoiceCard, inputClass, Section, Stepper, Tag } from "../components/automations/widgets";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import {
  ART_STYLES,
  REVIEW_MODES,
  scheduleSummary,
  useAddTopics,
  useAutomation,
  useAutomationAction,
  useAutomationsEnabled,
  useAutomationSummary,
  useCharacterAction,
  useRemoveTopic,
  useStartRun,
  useUpdateAutomation,
  useVoices,
  WEEKDAYS,
  type AutomationChanges,
  type AutomationDetail,
  type Character,
  type ConfigChanges,
  type Problem,
  type ReviewMode,
  type ScriptSource,
  type Topic,
  type VisualSource,
} from "../lib/automations";
import { cn } from "../lib/cn";
import { SETUP_STEPS } from "./AutomationNew";

const LENGTHS = [1, 2, 3, 4, 5, 6, 8, 9];
const LEADS: [number, string][] = [
  [0, "Mindra's usual: a day before with approval, 3 hours without"],
  [3, "3 hours before"],
  [6, "6 hours before"],
  [12, "12 hours before"],
  [24, "A day before"],
  [48, "Two days before"],
];
const VISUAL_SOURCES: Record<VisualSource, { label: string; detail: string }> = {
  library: { label: "My photos and clips", detail: "Chosen from your uploads, in More settings." },
  ai_images: { label: "AI pictures for each scene", detail: "Made in the art style below. Needs AI pictures switched on." },
  ai_video: { label: "AI video clips for each scene", detail: "Moving footage for every scene. The dearest and slowest." },
};

function errorText(error: unknown): string {
  if (!error) return "";
  return error instanceof ApiError ? error.message : "Mindra couldn't save this. Check your connection and try again.";
}

function mergeChanges(base: AutomationChanges, changes: AutomationChanges): AutomationChanges {
  const config = { ...(base.config ?? {}) };
  for (const [part, values] of Object.entries(changes.config ?? {})) {
    config[part as keyof typeof config] = { ...(config[part as keyof typeof config] ?? {}), ...(values as object) } as never;
  }
  return { ...base, ...changes, ...(changes.config || base.config ? { config } : {}) };
}

/** Saves changes a moment after they're made, merged, so each field saves as it's changed without a Save button.
 * `pending` holds what's changed and not yet confirmed by the API, so the form shows the change at once. */
function useAutosave(id: string) {
  const update = useUpdateAutomation(id);
  const [pending, setPending] = useState<AutomationChanges>({});
  const queued = useRef<AutomationChanges>({});
  const timer = useRef<number | null>(null);
  const flush = () => {
    const changes = queued.current;
    queued.current = {};
    timer.current = null;
    if (!Object.keys(changes).length) return;
    update.mutate(changes, {
      onSettled: () => setPending((current) => (Object.keys(queued.current).length || timer.current ? current : {})),
    });
  };
  const save = (changes: AutomationChanges) => {
    queued.current = mergeChanges(queued.current, changes);
    setPending((current) => mergeChanges(current, changes));
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 600);
  };
  // Leaving the page (or a reload) sends what's still waiting, rather than losing it.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    const send = () => {
      if (timer.current) window.clearTimeout(timer.current);
      flushRef.current();
    };
    window.addEventListener("beforeunload", send);
    return () => {
      window.removeEventListener("beforeunload", send);
      send();
    };
  }, []);
  return { save, pending, saving: update.isPending || timer.current !== null, error: errorText(update.error), reset: update.reset };
}

/** The automation as the form shows it: what the API has, with the changes not yet confirmed on top. */
function withPending(automation: AutomationDetail, pending: AutomationChanges): AutomationDetail {
  if (!Object.keys(pending).length) return automation;
  const config = { ...automation.config };
  for (const [part, values] of Object.entries(pending.config ?? {})) {
    config[part as keyof typeof config] = { ...config[part as keyof typeof config], ...(values as object) } as never;
  }
  const { config: _config, account, tiktok_account, review_mode, ...rest } = pending;
  return {
    ...automation,
    ...rest,
    config,
    ...(review_mode ? { review_mode } : {}),
    ...(account !== undefined ? { account: account === null ? null : (automation.account?.id === account ? automation.account : { ...(automation.account ?? { kind: "youtube", name: "", username: "", picture_url: "", profile_url: "", status: "active" as const }), id: account }) } : {}),
    ...(tiktok_account !== undefined
      ? { tiktok_account: tiktok_account === null ? null : (automation.tiktok_account?.id === tiktok_account ? automation.tiktok_account : { ...(automation.tiktok_account ?? { kind: "tiktok", name: "", username: "", picture_url: "", profile_url: "", status: "active" as const }), id: tiktok_account }) }
      : {}),
  };
}

function ProblemList({ problems }: { problems: Problem[] }) {
  if (!problems.length) return null;
  return (
    <ul className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
      {problems.map((problem) => (
        <li key={`${problem.field}-${problem.message}`} className="flex gap-2 text-sm text-amber-900">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {problem.message}
        </li>
      ))}
    </ul>
  );
}

/** The queue: topics Mindra writes from, or scripts the person pasted, in order. */
function Queue({ automation, source }: { automation: AutomationDetail; source: ScriptSource }) {
  const add = useAddTopics(automation.id);
  const remove = useRemoveTopic(automation.id);
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [script, setScript] = useState("");
  const ids = useId();
  const items = automation.topics.filter((topic) => !topic.clip && !topic.video);
  const unused = items.filter((topic) => !topic.used_at);
  const scripts = source !== "mindra";
  const label = source === "mine" ? "Scripts" : automation.preset === "kids" ? "Story ideas" : "Topics";
  const addTopic = () => {
    const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
    if (!lines.length) return;
    add.mutate({ topics: lines }, { onSuccess: () => setText("") });
  };
  const addScript = () => {
    if (!script.trim()) return;
    add.mutate({ scripts: [{ title: title.trim(), text: script.trim() }] }, { onSuccess: () => (setScript(""), setTitle("")) });
  };
  const line = (topic: Topic) => (
    <li key={topic.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
      <span className="w-4 shrink-0 text-muted-foreground tabular-nums">{unused.indexOf(topic) + 1 || "–"}</span>
      <span className={cn("min-w-0 flex-1 truncate", topic.used_at ? "text-muted-foreground line-through" : "text-foreground")}>{topic.text}</span>
      {topic.has_script && <Tag label="Script" />}
      {topic.source === "ai" && <Tag label="AI idea" />}
      {topic.used_at ? <Tag label="Used" /> : unused[0] === topic ? <Tag label="Next" /> : null}
      <button type="button" onClick={() => remove.mutate(topic.id)} disabled={remove.isPending} aria-label={`Remove “${topic.text}”`} className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}>
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
  return (
    <div id="queue" className="mt-4 overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-secondary/60 px-4 py-3">
        <p className="text-sm font-medium text-foreground tabular-nums">
          {label} queue · {unused.length} ready{items.length > unused.length ? ` · ${items.length - unused.length} used` : ""}
        </p>
        {add.error && <span className="text-xs text-red-700">{errorText(add.error)}</span>}
      </div>
      {items.length > 0 && <ol className="max-h-80 divide-y divide-border overflow-y-auto">{[...unused, ...items.filter((topic) => topic.used_at)].map(line)}</ol>}
      <div className="space-y-3 p-3">
        {scripts && (
          <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
            <label htmlFor={`${ids}-title`} className="block text-sm font-medium text-foreground">
              Paste a script
            </label>
            <input id={`${ids}-title`} value={title} onChange={(event) => setTitle(event.target.value)} maxLength={300} placeholder="Its title (optional)" className={inputClass} />
            <textarea
              aria-label="The script"
              value={script}
              onChange={(event) => setScript(event.target.value)}
              rows={5}
              maxLength={20000}
              placeholder="The words the narrator says, in paragraphs. Mindra reads it as it is and writes only the title and caption."
              className={cn(inputClass, "leading-relaxed")}
            />
            <button type="button" onClick={addScript} disabled={add.isPending || !script.trim()} className={buttonStyles({ variant: "secondary", size: "sm" })}>
              {add.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
              Add script
            </button>
          </div>
        )}
        {source !== "mine" && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              addTopic();
            }}
          >
            <label htmlFor={`${ids}-topic`} className="sr-only">
              Add to the queue
            </label>
            <textarea
              id={`${ids}-topic`}
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={1}
              placeholder={`Add a ${automation.preset === "kids" ? "story idea" : "topic"} and press Enter (one per line for several)`}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  addTopic();
                }
              }}
              className={cn(inputClass, "resize-none border-dashed")}
            />
          </form>
        )}
      </div>
    </div>
  );
}

function CharacterCard({ automation, character }: { automation: AutomationDetail; character: Character }) {
  const act = useCharacterAction(automation.id);
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border p-3">
      {character.picture_url ? (
        <img src={character.picture_url} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
      ) : (
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-lg bg-primary/10 text-lg font-semibold text-primary">
          {character.name.slice(0, 1)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground">{character.name}</span>
        <span className="block truncate text-sm text-muted-foreground">{[character.kind, character.voice_name ? `${character.voice_name} voice` : "no voice yet"].filter(Boolean).join(" · ")}</span>
      </span>
      <button type="button" onClick={() => act.mutate({ action: "remove", character: character.id })} disabled={act.isPending} aria-label={`Remove ${character.name}`} className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}>
        <Trash2 aria-hidden="true" className="size-4" />
      </button>
    </li>
  );
}

function AddCharacter({ automation }: { automation: AutomationDetail }) {
  const act = useCharacterAction(automation.id);
  const voices = useVoices(automation.services.voice);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("");
  const [description, setDescription] = useState("");
  const [voice, setVoice] = useState("");
  const ids = useId();
  if (!open) {
    return (
      <li>
        <button type="button" onClick={() => setOpen(true)} className="flex h-full min-h-20 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-primary/50 p-3 text-sm font-medium text-primary hover:bg-primary/5">
          <Plus aria-hidden="true" className="size-4" />
          Add character
        </button>
      </li>
    );
  }
  const chosen = (voices.data ?? []).find((item) => item.id === voice);
  return (
    <li className="space-y-3 rounded-lg border border-primary/40 p-3 sm:col-span-2 xl:col-span-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-name`} className="mb-1 block text-sm font-medium text-foreground">
            Name
          </label>
          <input id={`${ids}-name`} value={name} onChange={(event) => setName(event.target.value)} maxLength={60} placeholder="e.g. Benny" className={inputClass} />
        </div>
        <div>
          <label htmlFor={`${ids}-kind`} className="mb-1 block text-sm font-medium text-foreground">
            What they are
          </label>
          <input id={`${ids}-kind`} value={kind} onChange={(event) => setKind(event.target.value)} maxLength={60} placeholder="e.g. Bunny, or Narrator" className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor={`${ids}-description`} className="mb-1 block text-sm font-medium text-foreground">
          How they look and act
        </label>
        <textarea id={`${ids}-description`} value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={2000} placeholder="e.g. A small grey bunny with a red scarf, cheerful and a little bossy." className={inputClass} />
      </div>
      <div>
        <label htmlFor={`${ids}-voice`} className="mb-1 block text-sm font-medium text-foreground">
          Voice
        </label>
        {automation.services.voice ? (
          <select id={`${ids}-voice`} value={voice} onChange={(event) => setVoice(event.target.value)} className={inputClass}>
            <option value="">The automation's own voice</option>
            {(voices.data ?? []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.description ? ` · ${item.description}` : ""}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-muted-foreground">Voices aren&apos;t set up on Mindra yet.</p>
        )}
      </div>
      {act.error && <ErrorNote>{errorText(act.error)}</ErrorNote>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={act.isPending || !name.trim()}
          onClick={() =>
            act.mutate(
              { action: "add", body: { name: name.trim(), kind: kind.trim(), description: description.trim(), voice_id: voice, voice_name: chosen?.name ?? "" } },
              { onSuccess: () => (setOpen(false), setName(""), setKind(""), setDescription(""), setVoice("")) },
            )
          }
          className={buttonStyles({ size: "sm" })}
        >
          {act.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Add
        </button>
        <button type="button" onClick={() => setOpen(false)} className={buttonStyles({ variant: "ghost", size: "sm" })}>
          Cancel
        </button>
      </div>
    </li>
  );
}

function Labelled({ label, children }: { label: string; children: (id: string) => ReactNode }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-foreground">
        {label}
      </label>
      {children(id)}
    </div>
  );
}

/** The setup, on one page that saves as it's changed: name, where the scripts come from and the queue, the characters
 * (the kids cartoon), look and voice, schedule, review and posting, with the summary beside it. Everything else is
 * in More settings (the older six-step wizard). */
function SetupForm({ automation: saved }: { automation: AutomationDetail }) {
  const navigate = useNavigate();
  const { save, pending, saving, error } = useAutosave(saved.id);
  const automation = withPending(saved, pending);
  const action = useAutomationAction(automation.id);
  const start = useStartRun(automation.id);
  const summary = useAutomationSummary();
  const [name, setName] = useState(automation.name);
  const [showVoice, setShowVoice] = useState(false);
  const config = automation.config;
  const kids = automation.preset === "kids";
  const create = automation.kind === "create";
  const ids = useId();
  const set = (part: keyof ConfigChanges, values: object) => save({ config: { [part]: values } as ConfigChanges });
  const platforms = config.publishing.platforms;
  const perWeek = automation.weekdays.length;
  const queue = automation.queue.count;
  const credits = summary.data?.credits;
  const reviewLabel = automation.review_mode === "drafts" ? "Saved as drafts, not posted" : REVIEW_MODES[automation.review_mode].label;
  const scriptsLabel =
    config.script.source === "mine" ? `You write · ${queue} ready` : config.script.source === "both" ? `Yours first, then Mindra · ${queue} in the queue` : `Mindra writes · ${queue} ${kids ? (queue === 1 ? "idea" : "ideas") : queue === 1 ? "topic" : "topics"}`;
  const weeks = perWeek ? Math.round((queue / perWeek) * 10) / 10 : 0;
  const voicePicked = config.voice.voice_name || (config.voice.voice_id ? "Chosen" : "");

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="min-w-0 space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="max-w-xl flex-1">
            <label htmlFor={`${ids}-name`} className="mb-2 block text-sm font-medium text-foreground">
              Automation name
            </label>
            <input
              id={`${ids}-name`}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (event.target.value.trim()) save({ name: event.target.value.trim() });
              }}
              maxLength={120}
              className={cn(inputClass, "text-lg font-semibold")}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:mt-7" role="status">
            {saving ? "Saving…" : error ? "" : "Saved as you go"}
          </p>
        </div>
        {error && <ErrorNote>{error}</ErrorNote>}

        {create ? (
          <Section title="Where do the scripts come from?" hint="Each scheduled day, Mindra takes the next item from the queue below.">
            <div className="grid gap-3 sm:grid-cols-3">
              <ChoiceCard name="source" value="mindra" current={config.script.source} onChange={(value) => set("script", { source: value })} title="Mindra writes them" detail={`From ${kids ? "story ideas" : "topics"} you list`} />
              <ChoiceCard name="source" value="mine" current={config.script.source} onChange={(value) => set("script", { source: value })} title="I'll write them" detail="Paste finished scripts" />
              <ChoiceCard name="source" value="both" current={config.script.source} onChange={(value) => set("script", { source: value })} title="Both" detail="Use my scripts first, then Mindra fills gaps" />
            </div>
            {config.script.source !== "mine" && (
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <CheckRow label="Let Mindra suggest topics when the queue runs out" checked={config.topics.source !== "list"} onChange={(on) => set("topics", { source: on ? "both" : "list" })} />
              </div>
            )}
            <Queue automation={automation} source={config.script.source} />
            {automation.queue.low && config.topics.source === "list" && (
              <p className="mt-3 text-sm text-pretty text-amber-800">Fewer than 3 in the queue: add more, or let Mindra suggest topics, so it doesn&apos;t run out.</p>
            )}
          </Section>
        ) : (
          <Section title={automation.kind === "repurpose" ? "The clips to post" : "The videos to post"} hint="Choose them in More settings; each slot takes the next one.">
            <p className="text-sm text-muted-foreground tabular-nums">
              {queue} {automation.queue.what} ready.{" "}
              <Link to={`/automations/${automation.id}/settings?step=content`} className="font-medium text-primary hover:underline">
                Choose {automation.queue.what}
              </Link>
            </p>
          </Section>
        )}

        {kids && (
          <Section title="Characters" hint="Each character keeps the same look and voice in every episode.">
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {automation.characters.map((character) => (
                <CharacterCard key={character.id} automation={automation} character={character} />
              ))}
              <AddCharacter automation={automation} />
            </ul>
          </Section>
        )}

        {create && (
          <Section title="Look and voice">
            <div className="grid gap-4 sm:grid-cols-3">
              <Labelled label="Length">
                {(id) => (
                  <select id={id} value={config.content.minutes} onChange={(event) => set("content", { minutes: Number(event.target.value) })} className={inputClass}>
                    {LENGTHS.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        About {minutes} minute{minutes === 1 ? "" : "s"}
                      </option>
                    ))}
                  </select>
                )}
              </Labelled>
              <Labelled label="Shape">
                {(id) => (
                  <select id={id} value={config.content.shape} onChange={(event) => set("content", { shape: event.target.value })} className={inputClass}>
                    <option value="16:9">Landscape 16:9</option>
                    <option value="9:16">Vertical 9:16</option>
                  </select>
                )}
              </Labelled>
              <Labelled label="Pictures">
                {(id) => (
                  <select id={id} value={config.visuals.source} onChange={(event) => set("visuals", { source: event.target.value })} className={inputClass}>
                    {(Object.keys(VISUAL_SOURCES) as VisualSource[]).map((source) => (
                      <option key={source} value={source}>
                        {VISUAL_SOURCES[source].label}
                      </option>
                    ))}
                  </select>
                )}
              </Labelled>
            </div>
            <p className="mt-1.5 text-xs text-pretty text-muted-foreground">{VISUAL_SOURCES[config.visuals.source].detail}</p>
            {config.visuals.source !== "library" && (
              <div className="mt-4 max-w-xs">
                <Labelled label="Art style">
                  {(id) => (
                    <select id={id} value={config.content.art_style} onChange={(event) => set("content", { art_style: event.target.value })} className={inputClass}>
                      {Object.entries(ART_STYLES).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                </Labelled>
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
              <CheckRow label="Captions on screen" checked={config.captions.on} onChange={(on) => set("captions", { on })} />
              <CheckRow label="Vary the opening and visuals each episode" checked={config.content.vary} onChange={(vary) => set("content", { vary })} />
            </div>
            <dl className="mt-4 space-y-1.5 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Background music:</dt>
                <dd className="font-medium text-foreground">{config.music.tracks.length ? `${config.music.tracks.length} track${config.music.tracks.length === 1 ? "" : "s"}` : "None"}</dd>
                <Link to={`/automations/${automation.id}/settings?step=video`} className="font-medium text-primary hover:underline">
                  Change
                </Link>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted-foreground">Voice:</dt>
                <dd className="font-medium text-foreground">{voicePicked || "Not chosen yet"}</dd>
                {automation.services.voice ? (
                  <button type="button" onClick={() => setShowVoice((value) => !value)} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    {showVoice ? "Hide voices" : "Change"}
                    <ChevronDown aria-hidden="true" className={cn("size-3.5 transition-transform", showVoice && "rotate-180")} />
                  </button>
                ) : (
                  <span className="text-muted-foreground">(voices aren&apos;t set up on Mindra yet)</span>
                )}
              </div>
            </dl>
            {showVoice && (
              <div className="mt-3">
                <VoicePicker value={config.voice.voice_id} onChange={(voice) => set("voice", { voice_id: voice.id, voice_name: voice.name })} />
              </div>
            )}
          </Section>
        )}

        <Section title="Schedule">
          <p className="mb-2 text-sm font-medium text-foreground">Days</p>
          <div role="group" aria-label="Days" className="flex flex-wrap gap-2">
            {WEEKDAYS.map((label, day) => {
              const active = automation.weekdays.includes(day);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => save({ weekdays: active ? automation.weekdays.filter((item) => item !== day) : [...automation.weekdays, day].sort() })}
                  className={cn(
                    "h-10 w-14 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    active ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground hover:bg-secondary",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Labelled label="Post at">
              {(id) => <input id={id} type="time" value={(automation.post_time ?? "").slice(0, 5)} onChange={(event) => save({ post_time: event.target.value ? `${event.target.value}:00` : null })} className={cn(inputClass, "tabular-nums")} />}
            </Labelled>
            <Labelled label="Start making each video">
              {(id) => (
                <select id={id} value={automation.lead_hours ?? 0} onChange={(event) => save({ lead_hours: Number(event.target.value) || null })} className={inputClass}>
                  {LEADS.map(([hours, label]) => (
                    <option key={hours} value={hours}>
                      {label}
                    </option>
                  ))}
                </select>
              )}
            </Labelled>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Times are in {automation.time_zone}.{" "}
            <Link to={`/automations/${automation.id}/settings?step=schedule`} className="font-medium text-primary hover:underline">
              Change the time zone, start or end date
            </Link>
          </p>
        </Section>

        <Section title="Review and posting">
          <p className="mb-2 text-sm font-medium text-foreground">When should Mindra wait for you?</p>
          <div className="space-y-3">
            {(Object.keys(REVIEW_MODES) as Exclude<ReviewMode, "drafts">[]).map((mode, index) => (
              <ChoiceCard
                key={mode}
                name="review"
                value={mode}
                current={automation.review_mode}
                onChange={(value) => save({ review_mode: value as Exclude<ReviewMode, "drafts"> })}
                title={REVIEW_MODES[mode].label}
                detail={REVIEW_MODES[mode].detail || undefined}
                badge={index === 0 ? "Recommended" : undefined}
                disabled={mode === "auto" && !automation.can_post_automatically}
              />
            ))}
          </div>

          <p className="mt-5 mb-2 text-sm font-medium text-foreground">Post to</p>
          <PlatformCards
            platforms={platforms}
            setPlatforms={(next) => set("publishing", { platforms: next })}
            youtube={automation.account?.id ?? null}
            setYoutube={(account) => save({ account })}
            tiktok={automation.tiktok_account?.id ?? null}
            setTiktok={(tiktok_account) => save({ tiktok_account })}
            publishing={config.publishing}
            setPublishing={(changes) => set("publishing", changes)}
            tiktokConfig={config.tiktok}
            setTiktokConfig={(changes) => set("tiktok", changes)}
            drafts={automation.mode === "draft"}
            tiktokPublic={automation.services.tiktok_public}
            videoSeconds={automation.minutes ? automation.minutes * 60 : null}
          />

          <div className="mt-4 space-y-3 rounded-lg bg-secondary/60 p-4">
            {kids && (
              <div>
                <p className="text-sm font-medium text-foreground">Always on for this template</p>
                <p className="mt-1.5 flex gap-2 text-sm text-foreground">
                  <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-emerald-700" />
                  Marked “Made for kids” on YouTube, as YouTube requires for videos made for children. Comments are turned off by YouTube for these videos.
                </p>
              </div>
            )}
            <div>
              <CheckRow label="Label the videos as AI-generated on every platform" checked={config.publishing.ai_label} onChange={(ai_label) => set("publishing", { ai_label })} />
              <p className="mt-1 text-sm text-pretty text-muted-foreground">
                YouTube and TikTok require this label on realistic AI-made videos (voices or footage that could pass as real). Turn it off only for videos that clearly aren&apos;t.
              </p>
            </div>
          </div>
        </Section>

        <p className="text-sm text-muted-foreground">
          Music, the logo and colours, captions&apos; style, the thumbnail, pronunciations and the writer&apos;s rules are in{" "}
          <Link to={`/automations/${automation.id}/settings`} className="font-medium text-primary hover:underline">
            More settings
          </Link>
          .
        </p>
      </div>

      <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
        <section className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold text-foreground">Summary</h3>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
            {[
              ["Scripts", create ? scriptsLabel : `${queue} ${automation.queue.what} ready`],
              ["Video", create ? `${config.content.minutes} min, ${config.content.shape === "16:9" ? "landscape" : "vertical"}` : "As they are"],
              ["When", perWeek ? `${scheduleSummary(automation)}` : "No days chosen"],
              ["Review", reviewLabel],
              ["Posts to", platforms.map((platform) => (platform === "youtube" ? "YouTube" : "TikTok")).join(" and ") || "Nothing chosen"],
            ].map(([label, value]) => (
              <div key={label} className="contents">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium text-pretty text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          {create && (
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">Estimated cost</p>
              <p className="text-xl font-semibold text-foreground tabular-nums">{automation.credits_per_video} credits / video</p>
              <p className="mt-1 text-sm text-pretty text-muted-foreground tabular-nums">
                About {automation.credits_per_month} credits a month
                {credits ? (credits.limit === null ? " · your plan doesn't limit them" : ` · you have ${credits.left} left`) : ""}
              </p>
              {queue > 0 && perWeek > 0 && (
                <p className="mt-2 text-sm text-pretty text-muted-foreground tabular-nums">
                  {queue} {queue === 1 ? automation.queue.what.replace(/s$/, "") : automation.queue.what} {queue === 1 ? "lasts" : "last"} about {weeks < 1 ? "a week" : `${weeks} week${weeks === 1 ? "" : "s"}`}. Mindra reminds you when 3 are left.
                </p>
              )}
            </div>
          )}
          <div className="mt-4 space-y-2">
            <ProblemList problems={automation.problems} />
            {(action.error || start.error) && <ErrorNote>{errorText(action.error || start.error)}</ErrorNote>}
            {create && (
              <button
                type="button"
                disabled={start.isPending || automation.test_problems.length > 0}
                onClick={() => start.mutate({ kind: "test", length: "short" }, { onSuccess: (run) => navigate(`/automations/runs/${run.id}`) })}
                className={buttonStyles({ variant: "secondary", className: "w-full bg-primary/10 text-primary hover:bg-primary/15" })}
              >
                {start.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                Make a sample first
              </button>
            )}
            {automation.status === "active" ? (
              <button type="button" disabled={action.isPending} onClick={() => action.mutate({ action: "pause" })} className={buttonStyles({ variant: "secondary", className: "w-full" })}>
                Pause
              </button>
            ) : (
              <button
                type="button"
                disabled={action.isPending || automation.problems.length > 0 || saving}
                onClick={() => action.mutate({ action: "activate" }, { onSuccess: () => navigate("/automations") })}
                className={buttonStyles({ className: "w-full" })}
              >
                {action.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                Switch on
              </button>
            )}
            <p className="text-xs text-pretty text-muted-foreground">
              Switch on starts the schedule: the first video is made before the next day you ticked. A sample is made now and never posted.
            </p>
          </div>
        </section>
      </aside>
    </div>
  );
}

export default function AutomationSetup() {
  const enabled = useAutomationsEnabled();
  const { automationId } = useParams();
  const automation = useAutomation(automationId);
  if (!enabled) return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/automations" aria-label="Back to Automations" className={buttonStyles({ variant: "secondary", size: "icon" })}>
            <ChevronLeft aria-hidden="true" className="size-4" />
          </Link>
          <h2 className="text-lg font-semibold text-foreground">{automation.data?.status === "draft" ? "New automation" : "Edit automation"}{automation.data ? ` · ${automation.data.name}` : ""}</h2>
        </div>
        <Stepper steps={SETUP_STEPS} current={1} done={[0]} />
      </div>
      {automation.isPending ? (
        <div aria-busy="true" className="h-96 animate-pulse rounded-xl border border-border bg-card" />
      ) : automation.isError ? (
        <ErrorNote>{automation.error.message}</ErrorNote>
      ) : (
        <SetupForm key={automation.data.id} automation={automation.data} />
      )}
    </div>
  );
}
