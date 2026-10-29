import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Check, CircleAlert, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import MediaPicker from "../components/automations/MediaPicker";
import { ErrorNote } from "../components/automations/parts";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import {
  CORNERS,
  EFFECTS,
  formatClock,
  LANGUAGES,
  PRIVACY,
  scheduleSummary,
  timeZones,
  TONES,
  TRANSITIONS,
  TRANSLATIONS,
  useAddTopics,
  useAutomation,
  useAutomationAction,
  useAutomationsEnabled,
  useRemoveTopic,
  useStartRun,
  useUpdateAutomation,
  WEEKDAY_NAMES,
  WEEKDAYS,
  type AutomationChanges,
  type AutomationConfig,
  type AutomationDetail,
  type Problem,
} from "../lib/automations";
import { cn } from "../lib/cn";
import { useConnectedAccounts } from "../lib/social";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

const SETUP_STEPS = [
  { id: "basics", label: "Basics" },
  { id: "script", label: "Topics and script" },
  { id: "voice", label: "Voice" },
  { id: "look", label: "Look and sound" },
  { id: "schedule", label: "Channel and schedule" },
  { id: "review", label: "Review" },
] as const;
type StepId = (typeof SETUP_STEPS)[number]["id"];

function errorText(error: unknown): string {
  if (!error) return "";
  return error instanceof ApiError ? error.message : "Mindra couldn't save this. Check your connection and try again.";
}

function Field({ label, hint, children }: { label: string; hint?: string; children: (id: string, hintId?: string) => ReactNode }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
      </label>
      {children(id, hintId)}
      {hint && (
        <p id={hintId} className="text-xs text-pretty text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function Checkbox({ checked, onChange, label, hint }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-border accent-[var(--color-primary)]"
      />
      <label htmlFor={id} className="text-sm">
        <span className="font-medium text-foreground">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">{hint}</span>}
      </label>
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-xl border border-border bg-white p-5">
      <legend className="sr-only">{title}</legend>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

type StepProps = {
  automation: AutomationDetail;
  /** Save the changes, then go on (or back). */
  save: (changes: AutomationChanges, then: "next" | "back") => void;
  saving: boolean;
  error: string;
  first: boolean;
};

function Footer({ saving, error, first, onBack }: { saving: boolean; error: string; first: boolean; onBack: () => void }) {
  return (
    <div className="space-y-3">
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="flex flex-wrap justify-between gap-3">
        {first ? (
          <span />
        ) : (
          <button type="button" onClick={onBack} disabled={saving} className={buttonStyles({ variant: "secondary" })}>
            Back
          </button>
        )}
        <button type="submit" disabled={saving} className={buttonStyles({ variant: "primary" })}>
          {saving && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Save and continue
        </button>
      </div>
    </div>
  );
}

function BasicsStep({ automation, save, saving, error, first }: StepProps) {
  const [name, setName] = useState(automation.name);
  const [content, setContent] = useState(automation.config.content);
  const set = (changes: Partial<AutomationConfig["content"]>) => setContent((current) => ({ ...current, ...changes }));
  const changes = (): AutomationChanges => ({ name: name.trim() || automation.name, config: { content } });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(changes(), "next");
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title="Basics" description="What the videos are about and who they're for. The script is written from this.">
        <Field label="Name">{(id) => <input id={id} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={inputClass} />}</Field>
        <Field label="What the channel is about" hint="For example: Christian morning prayers, or personal finance for students.">
          {(id, hint) => <input id={id} aria-describedby={hint} value={content.niche} onChange={(event) => set({ niche: event.target.value })} maxLength={120} className={inputClass} />}
        </Field>
        <Field label="Who it's for">
          {(id) => <input id={id} value={content.audience} onChange={(event) => set({ audience: event.target.value })} maxLength={200} className={inputClass} />}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Language">
            {(id) => (
              <select id={id} value={content.language} onChange={(event) => set({ language: event.target.value })} className={inputClass}>
                {Object.entries(LANGUAGES).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Tone">
            {(id) => (
              <select id={id} value={content.tone} onChange={(event) => set({ tone: event.target.value })} className={inputClass}>
                {TONES.map((tone) => (
                  <option key={tone} value={tone}>
                    {tone[0].toUpperCase() + tone.slice(1)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="Length">
            {(id) => (
              <select id={id} value={content.minutes} onChange={(event) => set({ minutes: Number(event.target.value) })} className={inputClass}>
                {Array.from({ length: 10 }, (_, index) => index + 1).map((minutes) => (
                  <option key={minutes} value={minutes}>
                    {minutes} {minutes === 1 ? "minute" : "minutes"}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <div role="radiogroup" aria-label="Shape" className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["16:9", "Landscape (16:9)", "A regular YouTube video, best for 5 to 8 minutes."],
              ["9:16", "Vertical (9:16)", "For phones. Up to 3 minutes counts as a Short; longer goes up as a regular video."],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={content.shape === value}
              onClick={() => set({ shape: value })}
              className={cn(
                "rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-primary",
                content.shape === value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
              )}
            >
              <span className="block text-sm font-medium text-foreground">{label}</span>
              <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>
      </Section>
      <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
    </form>
  );
}

function TopicList({ automation }: { automation: AutomationDetail }) {
  const add = useAddTopics(automation.id);
  const remove = useRemoveTopic(automation.id);
  const [text, setText] = useState("");
  const addAll = () => {
    const topics = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!topics.length) return;
    add.mutate(topics, { onSuccess: () => setText("") });
  };
  const unused = automation.topics.filter((topic) => !topic.used_at).length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground tabular-nums">
        {automation.topics.length} {automation.topics.length === 1 ? "topic" : "topics"}, {unused} not used yet. Mindra takes them in order.
      </p>
      {automation.topics.length > 0 && (
        <ol className="divide-y divide-border rounded-lg border border-border">
          {automation.topics.map((topic) => (
            <li key={topic.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className={cn("min-w-0 flex-1", topic.used_at ? "text-muted-foreground line-through" : "text-foreground")}>{topic.text}</span>
              {topic.used_at && <span className="shrink-0 text-xs text-muted-foreground">Used</span>}
              <button
                type="button"
                onClick={() => remove.mutate(topic.id)}
                disabled={remove.isPending}
                aria-label={`Remove "${topic.text}"`}
                className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <Field label="Add topics" hint="One per line.">
        {(id, hint) => (
          <textarea
            id={id}
            aria-describedby={hint}
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            placeholder={"A prayer for a new week\nThanksgiving after a hard season"}
            className={inputClass}
          />
        )}
      </Field>
      <button type="button" onClick={addAll} disabled={add.isPending || !text.trim()} className={buttonStyles({ variant: "secondary", size: "sm" })}>
        {add.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
        Add to the list
      </button>
      {(add.error || remove.error) && <ErrorNote>{errorText(add.error || remove.error)}</ErrorNote>}
    </div>
  );
}

function ScriptStep({ automation, save, saving, error, first }: StepProps) {
  const [topics, setTopics] = useState(automation.config.topics);
  const [script, setScript] = useState(automation.config.script);
  const set = (changes: Partial<AutomationConfig["script"]>) => setScript((current) => ({ ...current, ...changes }));
  const changes = (): AutomationChanges => ({ config: { topics, script } });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(changes(), "next");
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title="Topics" description="What each video is about. Topics rest after they're used, so videos don't repeat.">
        <div role="radiogroup" aria-label="Where topics come from" className="grid gap-2 sm:grid-cols-3">
          {(
            [
              ["list", "My list", "Only the topics you add"],
              ["both", "My list, then AI ideas", "AI ideas when the list runs out"],
              ["ai", "AI ideas", "Fresh ideas from what the channel is about"],
            ] as const
          ).map(([value, label, hint]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={topics.source === value}
              onClick={() => setTopics((current) => ({ ...current, source: value }))}
              className={cn(
                "rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-primary",
                topics.source === value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
              )}
            >
              <span className="block text-sm font-medium text-foreground">{label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>
            </button>
          ))}
        </div>
        {topics.source !== "list" && (
          <Field label="Guidance for AI ideas" hint="What to cover or avoid, seasons to follow, series to keep going.">
            {(id, hint) => (
              <textarea
                id={id}
                aria-describedby={hint}
                value={topics.guidance}
                onChange={(event) => setTopics((current) => ({ ...current, guidance: event.target.value }))}
                rows={2}
                maxLength={1000}
                className={inputClass}
              />
            )}
          </Field>
        )}
        {topics.source !== "ai" && <TopicList automation={automation} />}
        <Field label="Days before a topic can come back">
          {(id) => (
            <input
              id={id}
              type="number"
              min={7}
              max={365}
              value={topics.repeat_after_days}
              onChange={(event) => setTopics((current) => ({ ...current, repeat_after_days: Number(event.target.value) }))}
              className={cn(inputClass, "max-w-32 tabular-nums")}
            />
          )}
        </Field>
      </Section>
      <Section title="Script" description="Each script is written new for its topic, at the length you chose, and checked against these.">
        <Checkbox
          checked={script.approve_first}
          onChange={(approve_first) => set({ approve_first })}
          label="Approve the script first"
          hint="You read the script before any voice-over or video is made, so nothing is spent on one you'd change."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="How it opens">
            {(id) => <textarea id={id} value={script.opening} onChange={(event) => set({ opening: event.target.value })} rows={2} maxLength={300} className={inputClass} />}
          </Field>
          <Field label="How it closes">
            {(id) => <textarea id={id} value={script.closing} onChange={(event) => set({ closing: event.target.value })} rows={2} maxLength={300} className={inputClass} />}
          </Field>
        </div>
        <Field label="Call to action">
          {(id) => <input id={id} value={script.call_to_action} onChange={(event) => set({ call_to_action: event.target.value })} maxLength={300} className={inputClass} />}
        </Field>
        <Checkbox
          checked={script.scripture}
          onChange={(scripture) => set({ scripture })}
          label="Draw on Scripture"
          hint="Every quotation is checked word for word against the translation below, or said as a paraphrase."
        />
        {script.scripture && (
          <Field label="Translation for quotations">
            {(id) => (
              <select id={id} value={script.translation} onChange={(event) => set({ translation: event.target.value as "web" | "kjv" })} className={cn(inputClass, "max-w-xs")}>
                {Object.entries(TRANSLATIONS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
        <Field label="Rules every script follows">
          {(id) => <textarea id={id} value={script.rules} onChange={(event) => set({ rules: event.target.value })} rows={3} maxLength={2000} className={inputClass} />}
        </Field>
        <Field label="Words to avoid" hint="Separate them with commas.">
          {(id, hint) => (
            <input id={id} aria-describedby={hint} value={script.words_to_avoid} onChange={(event) => set({ words_to_avoid: event.target.value })} maxLength={1000} className={inputClass} />
          )}
        </Field>
      </Section>
      <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
    </form>
  );
}

function VoiceStep({ automation, save, saving, error, first }: StepProps) {
  const [voice, setVoice] = useState(automation.config.voice);
  const set = (changes: Partial<AutomationConfig["voice"]>) => setVoice((current) => ({ ...current, ...changes }));
  const changes = (): AutomationChanges => ({
    config: { voice: { ...voice, pronunciations: voice.pronunciations.filter((item) => item.word.trim() || item.say_as.trim()) } },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(changes(), "next");
  };
  const setPronunciation = (index: number, changes: Partial<{ word: string; say_as: string }>) =>
    set({ pronunciations: voice.pronunciations.map((item, at) => (at === index ? { ...item, ...changes } : item)) });
  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title="Voice" description="Who reads the script. Voice-overs are made with ElevenLabs.">
        {!automation.voice_available ? (
          <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-pretty text-amber-900">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            Voice-overs aren&apos;t set up on Mindra yet, so there are no voices to choose from. Your other settings are saved.
          </p>
        ) : (
          <p className="rounded-lg border border-border bg-secondary/50 px-3 py-2.5 text-sm text-pretty text-muted-foreground">
            {voice.voice_name ? `Chosen voice: ${voice.voice_name}. ` : ""}
            Choosing and listening to voices comes with voice-overs, in the next update.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={`Speed: ${voice.speed.toFixed(2)}×`} hint="1 is the voice's own pace.">
            {(id, hint) => (
              <input id={id} aria-describedby={hint} type="range" min={0.7} max={1.2} step={0.05} value={voice.speed} onChange={(event) => set({ speed: Number(event.target.value) })} className="w-full accent-[var(--color-primary)]" />
            )}
          </Field>
          <Field label={`Steadiness: ${Math.round(voice.stability * 100)}%`} hint="Higher is more even; lower is more expressive.">
            {(id, hint) => (
              <input id={id} aria-describedby={hint} type="range" min={0} max={1} step={0.05} value={voice.stability} onChange={(event) => set({ stability: Number(event.target.value) })} className="w-full accent-[var(--color-primary)]" />
            )}
          </Field>
        </div>
      </Section>
      <Section title="Pronunciations" description="Names or words the voice should say a particular way.">
        {voice.pronunciations.length > 0 && (
          <ul className="space-y-2">
            {voice.pronunciations.map((item, index) => (
              <li key={index} className="flex flex-wrap items-center gap-2">
                <input aria-label="Word" value={item.word} onChange={(event) => setPronunciation(index, { word: event.target.value })} maxLength={60} placeholder="Selah" className={cn(inputClass, "w-40 flex-1")} />
                <input aria-label="Say it as" value={item.say_as} onChange={(event) => setPronunciation(index, { say_as: event.target.value })} maxLength={120} placeholder="SEH-lah" className={cn(inputClass, "w-40 flex-1")} />
                <button
                  type="button"
                  onClick={() => set({ pronunciations: voice.pronunciations.filter((_, at) => at !== index) })}
                  aria-label={`Remove ${item.word || "this word"}`}
                  className={buttonStyles({ variant: "ghost", size: "icon" })}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => set({ pronunciations: [...voice.pronunciations, { word: "", say_as: "" }] })} className={buttonStyles({ variant: "secondary", size: "sm" })}>
          <Plus aria-hidden="true" className="size-4" />
          Add a word
        </button>
      </Section>
      <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
    </form>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: Record<string, string>; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      {(id) => (
        <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
          {Object.entries(options).map(([key, text]) => (
            <option key={key} value={key}>
              {text}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

function LookStep({ automation, save, saving, error, first }: StepProps) {
  const [visuals, setVisuals] = useState(automation.config.visuals);
  const [music, setMusic] = useState(automation.config.music);
  const [captions, setCaptions] = useState(automation.config.captions);
  const [branding, setBranding] = useState(automation.config.branding);
  const [thumbnail, setThumbnail] = useState(automation.config.thumbnail);
  const changes = (): AutomationChanges => ({ config: { visuals, music, captions, branding, thumbnail } });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(changes(), "next");
  };
  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title="Photos and clips" description={`Your own media, matched to each part of the script. Choose at least 5; 20 to 30 keeps longer videos varied.`}>
        <Checkbox checked={visuals.use_all} onChange={(use_all) => setVisuals((current) => ({ ...current, use_all }))} label="Use all my photos and clips" hint="Including ones you upload later." />
        {!visuals.use_all && <MediaPicker kinds={["image", "video"]} selected={visuals.assets} onChange={(assets) => setVisuals((current) => ({ ...current, assets }))} label="photos and clips" />}
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Transition" value={visuals.transition} options={TRANSITIONS} onChange={(transition) => setVisuals((current) => ({ ...current, transition }))} />
          <SelectField label="Filter" value={visuals.effect} options={EFFECTS} onChange={(effect) => setVisuals((current) => ({ ...current, effect }))} />
        </div>
        <Checkbox checked={visuals.motion} onChange={(motion) => setVisuals((current) => ({ ...current, motion }))} label="Slow zoom on photos" />
      </Section>
      <Section title="Music" description="One of these plays under each video, a different one each time when you choose several. Use music you own or are licensed to use.">
        <MediaPicker kinds={["audio"]} selected={music.tracks} onChange={(tracks) => setMusic((current) => ({ ...current, tracks }))} label="music" />
        <Field label={`Music volume under the voice: ${Math.round(music.volume * 100)}%`}>
          {(id) => (
            <input id={id} type="range" min={0} max={0.5} step={0.01} value={music.volume} onChange={(event) => setMusic((current) => ({ ...current, volume: Number(event.target.value) }))} className="w-full max-w-sm accent-[var(--color-primary)]" />
          )}
        </Field>
        <Checkbox checked={music.fade} onChange={(fade) => setMusic((current) => ({ ...current, fade }))} label="Fade the music in and out" />
      </Section>
      <Section title="Captions">
        <Checkbox checked={captions.on} onChange={(on) => setCaptions((current) => ({ ...current, on }))} label="Show captions" hint="The words on screen as they're spoken." />
        {captions.on && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Style" value={captions.style} options={{ highlight: "Highlight the word being said", plain: "Plain" }} onChange={(style) => setCaptions((current) => ({ ...current, style: style as "highlight" | "plain" }))} />
            <SelectField label="Position" value={captions.position} options={{ bottom: "Bottom", middle: "Middle" }} onChange={(position) => setCaptions((current) => ({ ...current, position: position as "bottom" | "middle" }))} />
          </div>
        )}
      </Section>
      <Section title="Branding">
        <Field label="Logo">{() => <MediaPicker kinds={["image"]} single selected={branding.logo ? [branding.logo] : []} onChange={(ids) => setBranding((current) => ({ ...current, logo: ids[0] ?? null }))} label="a logo" />}</Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Logo corner" value={branding.corner} options={CORNERS} onChange={(corner) => setBranding((current) => ({ ...current, corner }))} />
          <Field label="Brand colour">
            {(id) => <input id={id} type="color" value={branding.accent} onChange={(event) => setBranding((current) => ({ ...current, accent: event.target.value.toUpperCase() }))} className="h-10 w-20 rounded-lg border border-border bg-white p-1" />}
          </Field>
          <Field label="Closing card" hint="Shown at the end, such as the channel's name.">
            {(id, hint) => <input id={id} aria-describedby={hint} value={branding.closing_text} onChange={(event) => setBranding((current) => ({ ...current, closing_text: event.target.value }))} maxLength={120} className={inputClass} />}
          </Field>
        </div>
      </Section>
      <Section title="Thumbnail">
        <Checkbox checked={thumbnail.on} onChange={(on) => setThumbnail((current) => ({ ...current, on }))} label="Make a thumbnail" hint="YouTube only takes custom thumbnails from verified channels; on others, YouTube picks one." />
        {thumbnail.on && (
          <Field label="Text colour">
            {(id) => <input id={id} type="color" value={thumbnail.text_colour} onChange={(event) => setThumbnail((current) => ({ ...current, text_colour: event.target.value.toUpperCase() }))} className="h-10 w-20 rounded-lg border border-border bg-white p-1" />}
          </Field>
        )}
      </Section>
      <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
    </form>
  );
}

function ScheduleStep({ automation, save, saving, error, first }: StepProps) {
  const accounts = useConnectedAccounts();
  const channels = (accounts.data ?? []).filter((account) => account.kind === "youtube");
  const [account, setAccount] = useState<number | null>(automation.account?.id ?? null);
  const [weekdays, setWeekdays] = useState(automation.weekdays);
  const [postTime, setPostTime] = useState(automation.post_time?.slice(0, 5) ?? "");
  const [timeZone, setTimeZone] = useState(automation.time_zone);
  const [startsOn, setStartsOn] = useState(automation.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(automation.ends_on ?? "");
  const [publishing, setPublishing] = useState(automation.config.publishing);
  const [zones] = useState(() => {
    const all = timeZones();
    return all.includes(automation.time_zone) ? all : [automation.time_zone, ...all];
  });
  const changes = (): AutomationChanges => ({
    account,
    weekdays,
    post_time: postTime || null,
    time_zone: timeZone,
    starts_on: startsOn || null,
    ends_on: endsOn || null,
    config: { publishing },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(changes(), "next");
  };
  const toggleDay = (day: number) => setWeekdays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort()));
  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title="YouTube channel" description="Where the videos go.">
        {accounts.isPending ? (
          <div className="h-10 animate-pulse rounded-lg bg-secondary" />
        ) : channels.length === 0 ? (
          <p className="text-sm text-pretty text-muted-foreground">
            No YouTube channel is connected.{" "}
            <Link to="/settings#accounts" className="font-medium text-primary underline-offset-2 hover:underline">
              Connect one in Settings
            </Link>
            , then come back here.
          </p>
        ) : (
          <Field label="Channel">
            {(id) => (
              <select id={id} value={account ?? ""} onChange={(event) => setAccount(event.target.value ? Number(event.target.value) : null)} className={cn(inputClass, "max-w-md")}>
                <option value="">Choose a channel</option>
                {channels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name}
                    {channel.status === "needs_reconnect" ? " (needs reconnecting)" : ""}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
      </Section>
      <Section title="When videos go out" description="At most one a day. Each video is made ahead of its time: a day before when it waits for your approval.">
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Days</p>
          <div role="group" aria-label="Days" className="flex flex-wrap gap-2">
            {WEEKDAYS.map((day, index) => (
              <button
                key={day}
                type="button"
                aria-pressed={weekdays.includes(index)}
                aria-label={WEEKDAY_NAMES[index]}
                onClick={() => toggleDay(index)}
                className={cn(
                  "h-9 min-w-12 rounded-lg border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary",
                  weekdays.includes(index) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-white text-foreground hover:bg-secondary",
                )}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Time">{(id) => <input id={id} type="time" value={postTime} onChange={(event) => setPostTime(event.target.value)} className={inputClass} />}</Field>
          <Field label="Time zone">
            {(id) => (
              <select id={id} value={timeZone} onChange={(event) => setTimeZone(event.target.value)} className={inputClass}>
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field label="First day (optional)">{(id) => <input id={id} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className={inputClass} />}</Field>
          <Field label="Last day (optional)">{(id) => <input id={id} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} className={inputClass} />}</Field>
        </div>
      </Section>
      <Section title="On YouTube">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Visibility" value={publishing.privacy} options={PRIVACY} onChange={(privacy) => setPublishing((current) => ({ ...current, privacy: privacy as "public" | "unlisted" | "private" }))} />
        </div>
        <Checkbox checked={publishing.made_for_kids} onChange={(made_for_kids) => setPublishing((current) => ({ ...current, made_for_kids }))} label="Made for kids" hint="YouTube's setting for videos made for children." />
        <p className="rounded-lg bg-secondary/60 px-3 py-2.5 text-sm text-pretty text-muted-foreground">
          You approve each video before it goes out. Once you&apos;ve approved one, you can let this automation post on its own from its page.
        </p>
      </Section>
      <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
    </form>
  );
}

function ProblemList({ problems }: { problems: Problem[] }) {
  return (
    <ul className="space-y-1.5">
      {problems.map((problem) => (
        <li key={`${problem.field}-${problem.message}`} className="flex gap-2 text-sm text-pretty text-amber-900">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {problem.message}
        </li>
      ))}
    </ul>
  );
}

function ReviewStep({ automation, go }: { automation: AutomationDetail; go: (step: StepId) => void }) {
  const navigate = useNavigate();
  const start = useStartRun(automation.id);
  const action = useAutomationAction(automation.id);
  const config = automation.config;
  const visuals = config.visuals.use_all ? "All your photos and clips" : `${config.visuals.assets.length} photos and clips`;
  const rows: { step: StepId; title: string; lines: string[] }[] = [
    {
      step: "basics",
      title: "Basics",
      lines: [
        `${config.content.niche || "No subject given"}${config.content.audience ? `, for ${config.content.audience}` : ""}`,
        `${config.content.minutes} minutes, ${config.content.shape === "16:9" ? "landscape" : "vertical"}, ${config.content.tone}, ${LANGUAGES[config.content.language] ?? config.content.language}`,
      ],
    },
    {
      step: "script",
      title: "Topics and script",
      lines: [
        `${automation.topics.filter((topic) => !topic.used_at).length} topics waiting${config.topics.source === "list" ? "" : ", then AI ideas"}`,
        `${config.script.approve_first ? "You approve each script first" : "Scripts aren't approved separately"}${config.script.scripture ? `; Scripture from the ${TRANSLATIONS[config.script.translation]}` : ""}`,
      ],
    },
    { step: "voice", title: "Voice", lines: [config.voice.voice_name || "No voice chosen", `Speed ${config.voice.speed.toFixed(2)}×, ${config.voice.pronunciations.length} pronunciations`] },
    {
      step: "look",
      title: "Look and sound",
      lines: [
        `${visuals}, ${TRANSITIONS[config.visuals.transition]?.toLowerCase()} transitions`,
        `${config.music.tracks.length} music ${config.music.tracks.length === 1 ? "track" : "tracks"} at ${Math.round(config.music.volume * 100)}%; captions ${config.captions.on ? "on" : "off"}; ${config.branding.logo ? "logo" : "no logo"}; thumbnail ${config.thumbnail.on ? "on" : "off"}`,
      ],
    },
    {
      step: "schedule",
      title: "Channel and schedule",
      lines: [
        automation.account?.name ?? "No channel chosen",
        `${scheduleSummary(automation)} (${automation.time_zone.replace(/_/g, " ")}), ${PRIVACY[config.publishing.privacy].toLowerCase()}`,
      ],
    },
  ];
  const test = () => start.mutate("test", { onSuccess: (run) => navigate(`/automations/runs/${run.id}`) });
  const activate = () => action.mutate({ action: "activate" }, { onSuccess: () => navigate(`/automations/${automation.id}`) });
  return (
    <div className="space-y-5">
      <section className="divide-y divide-border rounded-xl border border-border bg-white">
        {rows.map((row) => (
          <div key={row.step} className="flex items-start gap-4 p-4">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground">{row.title}</h3>
              {row.lines.map((line) => (
                <p key={line} className="mt-0.5 text-sm text-pretty text-muted-foreground">
                  {line}
                </p>
              ))}
            </div>
            <button type="button" onClick={() => go(row.step)} className={buttonStyles({ variant: "ghost", size: "sm" })}>
              Change
            </button>
          </div>
        ))}
      </section>
      {automation.problems.length > 0 ? (
        <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">Before it can be switched on</h3>
          <ProblemList problems={automation.problems} />
        </section>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <Check aria-hidden="true" className="size-4" />
          Everything is ready. The first video will be made ahead of {automation.post_time ? formatClock(automation.post_time) : "its time"} on its first day.
        </p>
      )}
      {(start.error || action.error) && <ErrorNote>{errorText(start.error || action.error)}</ErrorNote>}
      <div className="flex flex-wrap justify-end gap-2">
        <Link to={`/automations/${automation.id}`} className={buttonStyles({ variant: "secondary" })}>
          Save as draft
        </Link>
        <button type="button" onClick={test} disabled={start.isPending || automation.test_problems.length > 0} className={buttonStyles({ variant: "secondary" })}>
          {start.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Make a test video
        </button>
        <button type="button" onClick={activate} disabled={action.isPending || automation.problems.length > 0} className={buttonStyles({ variant: "primary" })}>
          {action.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Switch on
        </button>
      </div>
      <p className="text-right text-xs text-pretty text-muted-foreground">A test video waits for your approval and is never posted.</p>
    </div>
  );
}

/** Setting an automation up, in six steps, each saved as you go on. */
export default function AutomationSetup() {
  const enabled = useAutomationsEnabled();
  const { automationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const automation = useAutomation(automationId);
  const update = useUpdateAutomation(automationId ?? "");
  const wanted = searchParams.get("step");
  const index = Math.max(0, SETUP_STEPS.findIndex((step) => step.id === wanted));
  const current = SETUP_STEPS[index];

  if (!enabled) return <Navigate to="/dashboard" replace />;

  const go = (step: StepId) => {
    update.reset();
    setSearchParams({ step }, { replace: false });
    window.scrollTo({ top: 0 });
  };
  const save = (changes: AutomationChanges, then: "next" | "back") =>
    update.mutate(changes, {
      onSuccess: () => go(SETUP_STEPS[Math.min(SETUP_STEPS.length - 1, Math.max(0, index + (then === "next" ? 1 : -1)))].id),
    });

  return (
    <div className="max-w-3xl space-y-6">
      <Link to={automationId ? `/automations/${automationId}` : "/automations"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {automation.data?.name ?? "Automations"}
      </Link>
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Set up {automation.data?.name ?? "the automation"}</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Each step is saved as you go on, so you can come back to it.</p>
      </div>
      <ol aria-label="Setup steps" className="flex flex-wrap gap-x-1 gap-y-2">
        {SETUP_STEPS.map((step, at) => (
          <li key={step.id} aria-current={at === index ? "step" : undefined} className="flex items-center gap-1.5 text-xs">
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full font-semibold tabular-nums",
                at < index ? "bg-primary/15 text-primary" : at === index ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground",
              )}
            >
              {at < index ? <Check aria-hidden="true" className="size-3.5" /> : at + 1}
            </span>
            <span className={cn("mr-2", at === index ? "font-medium text-foreground" : "text-muted-foreground")}>{step.label}</span>
          </li>
        ))}
      </ol>
      {automation.isPending ? (
        <div aria-busy="true" className="h-96 animate-pulse rounded-xl border border-border bg-white" />
      ) : automation.isError ? (
        <ErrorNote>{automation.error.message}</ErrorNote>
      ) : current.id === "review" ? (
        <ReviewStep automation={automation.data} go={go} />
      ) : (
        (() => {
          const props: StepProps = { automation: automation.data, save, saving: update.isPending, error: errorText(update.error), first: index === 0 };
          switch (current.id) {
            case "basics":
              return <BasicsStep key="basics" {...props} />;
            case "script":
              return <ScriptStep key="script" {...props} />;
            case "voice":
              return <VoiceStep key="voice" {...props} />;
            case "look":
              return <LookStep key="look" {...props} />;
            case "schedule":
              return <ScheduleStep key="schedule" {...props} />;
          }
        })()
      )}
    </div>
  );
}
