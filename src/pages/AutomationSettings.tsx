import { useId, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronDown, CircleAlert, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import MediaPicker from "../components/automations/MediaPicker";
import PlatformCards from "../components/automations/PlatformCards";
import QueueEditor from "../components/automations/QueueEditor";
import VoicePicker from "../components/automations/VoicePicker";
import { ErrorNote, PlatformMarks } from "../components/automations/parts";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import {
  CORNERS,
  EFFECTS,
  KINDS,
  LANGUAGES,
  MIN_VISUALS,
  MODES,
  PACES,
  PLATFORM_LABELS,
  PRIVACY,
  scheduleSummary,
  stepsFor,
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
  WORDS_A_MINUTE,
  type AutomationChanges,
  type AutomationConfig,
  type AutomationDetail,
  type PlatformId,
  type Problem,
  type TikTokConfig,
} from "../lib/automations";
import { cn } from "../lib/cn";

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60";

// The person's journey: what to automate, the content, the video, where it's posted, when (and with whose approval),
// and a last look before switching it on. A step's problems from the API are shown on it (Problem.field).
const SETUP_STEPS = [
  { id: "automation", label: "What to automate" },
  { id: "content", label: "Content" },
  { id: "video", label: "Video" },
  { id: "platforms", label: "Platforms" },
  { id: "schedule", label: "Schedule and approval" },
  { id: "review", label: "Review" },
] as const;
type StepId = (typeof SETUP_STEPS)[number]["id"];
const STEP_FOR_FIELD: Record<string, StepId> = { content: "content", video: "video", platforms: "platforms", schedule: "schedule" };

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

function Checkbox({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (value: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded border-border accent-[var(--color-primary)] disabled:opacity-50"
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
    <fieldset className="space-y-4 rounded-xl border border-border bg-card p-5">
      <legend className="sr-only">{title}</legend>
      <div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{description}</p>}
      </div>
      {children}
    </fieldset>
  );
}

/** Settings most people never need, kept out of the way until opened. */
function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-foreground focus-visible:outline-2 focus-visible:outline-primary">
        {label}
        <ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-border p-3">{children}</div>
    </details>
  );
}

function SelectField({ label, value, options, onChange, hint }: { label: string; value: string; options: Record<string, string>; onChange: (value: string) => void; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      {(id, hintId) => (
        <select id={id} aria-describedby={hintId} value={value} onChange={(event) => onChange(event.target.value)} className={inputClass}>
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

function Choices<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; title: string; detail: string; disabled?: boolean }[]; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-3 sm:grid-cols-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          disabled={option.disabled}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50",
            value === option.id ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
          )}
        >
          <span className="block text-sm font-medium text-foreground">{option.title}</span>
          <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">{option.detail}</span>
        </button>
      ))}
    </div>
  );
}

function ProblemList({ problems, go }: { problems: Problem[]; go?: (step: StepId) => void }) {
  return (
    <ul className="space-y-1.5">
      {problems.map((problem) => {
        const step = STEP_FOR_FIELD[problem.field];
        return (
          <li key={`${problem.field}-${problem.message}`} className="flex gap-2 text-sm text-pretty text-amber-900">
            <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>
              {problem.message}
              {go && step && (
                <>
                  {" "}
                  <button type="button" onClick={() => go(step)} className="font-medium underline underline-offset-2">
                    Go to {SETUP_STEPS.find((item) => item.id === step)?.label}
                  </button>
                </>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** This step's own problems, from the API, at its top. */
function StepProblems({ automation, field }: { automation: AutomationDetail; field: string }) {
  const found = automation.problems.filter((problem) => problem.field === field);
  if (!found.length) return null;
  return (
    <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-medium text-amber-900">Needed before it can be switched on (checked each time you save)</p>
      <ProblemList problems={found} />
    </div>
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

function Footer({ saving, error, first, onBack, label = "Save and continue" }: { saving: boolean; error: string; first: boolean; onBack: () => void; label?: string }) {
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
          {label}
        </button>
      </div>
    </div>
  );
}

// 1. What to automate

function AutomationStep({ automation, save, saving, error, first }: StepProps) {
  const [name, setName] = useState(automation.name);
  const changes = (): AutomationChanges => ({ name: name.trim() || automation.name });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(changes(), "next");
  };
  const kind = KINDS[automation.kind];
  return (
    <form onSubmit={submit} className="space-y-5">
      <Section title={kind.label} description={kind.description}>
        <Field label="Name" hint="Only you see this, on your Automations page.">
          {(id, hint) => <input id={id} aria-describedby={hint} value={name} onChange={(event) => setName(event.target.value)} maxLength={120} className={inputClass} />}
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">What happens for each video</p>
          <ol className="grid gap-2 sm:grid-cols-2">
            {stepsFor(automation.kind).map((step, index) => (
              <li key={step.name} className="flex gap-3 rounded-lg bg-secondary/50 p-3">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-card text-xs font-semibold text-foreground tabular-nums">{index + 1}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{step.label}</span>
                  <span className="block text-xs text-pretty text-muted-foreground">{step.description}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-pretty text-muted-foreground">
          To automate something else, <Link to="/automations/new" className="font-medium text-primary underline-offset-2 hover:underline">start a new automation</Link>.
        </p>
      </Section>
      <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
    </form>
  );
}

// 2. Content

function TopicList({ automation }: { automation: AutomationDetail }) {
  const add = useAddTopics(automation.id);
  const remove = useRemoveTopic(automation.id);
  const [text, setText] = useState("");
  const topics = automation.topics.filter((topic) => !topic.clip && !topic.video);
  const addAll = () => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (!lines.length) return;
    add.mutate({ topics: lines }, { onSuccess: () => setText("") });
  };
  const unused = topics.filter((topic) => !topic.used_at).length;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground tabular-nums">
        {topics.length} {topics.length === 1 ? "topic" : "topics"}, {unused} not used yet. Mindra takes them in order, one for each video.
      </p>
      {topics.length > 0 && (
        <ol className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {topics.map((topic) => (
            <li key={topic.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <span className={cn("min-w-0 flex-1", topic.used_at ? "text-muted-foreground line-through" : "text-foreground")}>{topic.text}</span>
              {topic.source === "ai" && <span className="shrink-0 text-xs text-muted-foreground">AI idea</span>}
              {topic.used_at && <span className="shrink-0 text-xs text-muted-foreground">Used</span>}
              <button
                type="button"
                onClick={() => remove.mutate(topic.id)}
                disabled={remove.isPending}
                aria-label={`Remove “${topic.text}”`}
                className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ol>
      )}
      <Field label="Add topics" hint="One per line, for example: A prayer for a new job.">
        {(id, hint) => (
          <textarea id={id} aria-describedby={hint} value={text} onChange={(event) => setText(event.target.value)} rows={3} className={inputClass} />
        )}
      </Field>
      {add.error && <ErrorNote>{errorText(add.error)}</ErrorNote>}
      <button type="button" onClick={addAll} disabled={add.isPending || !text.trim()} className={buttonStyles({ variant: "secondary", size: "sm" })}>
        {add.isPending ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Plus aria-hidden="true" className="size-4" />}
        Add to the list
      </button>
    </div>
  );
}

function ChannelFields({ content, set, minutes = true }: { content: AutomationConfig["content"]; set: (changes: Partial<AutomationConfig["content"]>) => void; minutes?: boolean }) {
  const words = Math.round(content.minutes * (WORDS_A_MINUTE[content.tone] ?? 135));
  return (
    <>
      <Field label="What the channel is about" hint="For example: Christian morning prayers, or personal finance for students.">
        {(id, hint) => <input id={id} aria-describedby={hint} value={content.niche} onChange={(event) => set({ niche: event.target.value })} maxLength={120} className={inputClass} />}
      </Field>
      <Field label="Who it's for">{(id) => <input id={id} value={content.audience} onChange={(event) => set({ audience: event.target.value })} maxLength={200} className={inputClass} />}</Field>
      <div className={cn("grid gap-4", minutes ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        <SelectField label="Language" value={content.language} options={LANGUAGES} onChange={(language) => set({ language })} />
        <SelectField label="Tone" value={content.tone} options={Object.fromEntries(TONES.map((tone) => [tone, tone[0].toUpperCase() + tone.slice(1)]))} onChange={(tone) => set({ tone })} />
        {minutes && (
          <Field label="Length" hint={`About ${words} words of narration.`}>
            {(id, hint) => (
              <select id={id} aria-describedby={hint} value={content.minutes} onChange={(event) => set({ minutes: Number(event.target.value) })} className={inputClass}>
                {Array.from({ length: 9 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value} {value === 1 ? "minute" : "minutes"}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}
      </div>
    </>
  );
}

function ContentStep({ automation, save, saving, error, first }: StepProps) {
  const [content, setContent] = useState(automation.config.content);
  const [topics, setTopics] = useState(automation.config.topics);
  const [script, setScript] = useState(automation.config.script);
  const [source, setSource] = useState(automation.config.source);
  const setC = (changes: Partial<AutomationConfig["content"]>) => setContent((current) => ({ ...current, ...changes }));
  const setT = (changes: Partial<AutomationConfig["topics"]>) => setTopics((current) => ({ ...current, ...changes }));
  const setS = (changes: Partial<AutomationConfig["script"]>) => setScript((current) => ({ ...current, ...changes }));
  // Scripture settings belong to the Christian templates only (or an automation already using them).
  const scripture = automation.preset === "prayer" || automation.config.script.scripture;
  const changes = (): AutomationChanges => ({ config: { content, topics, script, source } });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(changes(), "next");
  };

  if (automation.kind !== "create") {
    return (
      <form onSubmit={submit} className="space-y-5">
        <StepProblems automation={automation} field="content" />
        {automation.kind === "repurpose" ? (
          <Section title="Which clips" description="Clips Mindra found (or you made) in your recordings, each already a finished video.">
            <Choices
              label="Which clips"
              value={source.clips}
              onChange={(clips) => setSource({ clips })}
              options={[
                { id: "newest", title: "The newest clips, automatically", detail: "Each slot takes your newest made clip this automation hasn't posted." },
                { id: "chosen", title: "Clips I choose", detail: "Only the clips on the list below, in its order." },
              ]}
            />
            {source.clips === "chosen" && <QueueEditor automation={automation} what="clips" />}
          </Section>
        ) : (
          <Section title="Your videos" description="Posted one for each slot, in this order. Each is posted once.">
            <QueueEditor automation={automation} what="videos" />
          </Section>
        )}
        <Section title="For the titles and captions" description="The AI writes each video's title, description and caption from what's said or seen in it, in this voice.">
          <ChannelFields content={content} set={setC} minutes={false} />
          <Field label="Words and phrases never to use" hint="Separate them with commas.">
            {(id, hint) => <input id={id} aria-describedby={hint} value={script.words_to_avoid} onChange={(event) => setS({ words_to_avoid: event.target.value })} maxLength={1000} className={inputClass} />}
          </Field>
        </Section>
        <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
      </form>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <StepProblems automation={automation} field="content" />
      <Section title="What the videos are about" description="The script for each video is written from this.">
        <ChannelFields content={content} set={setC} />
      </Section>
      <Section title="Topics" description="Each video is about one topic.">
        <Choices
          label="Where topics come from"
          value={topics.source}
          onChange={(value) => setT({ source: value })}
          options={[
            { id: "list", title: "My list", detail: "Only the topics you add below, in order." },
            { id: "both", title: "My list, then AI ideas", detail: "When the list runs out, the AI suggests a new topic each time." },
            { id: "ai", title: "AI ideas", detail: "The AI suggests a new topic for each video, unlike the recent ones." },
          ]}
        />
        {topics.source !== "list" && (
          <Field label="Guidance for AI ideas" hint="For example: seasons of life, the church calendar, questions young adults ask.">
            {(id, hint) => <textarea id={id} aria-describedby={hint} value={topics.guidance} onChange={(event) => setT({ guidance: event.target.value })} maxLength={1000} rows={2} className={inputClass} />}
          </Field>
        )}
        {topics.source !== "ai" && <TopicList automation={automation} />}
        <More label="When a topic can come back">
          <Field label="Days before a used topic can be used again">
            {(id) => (
              <input id={id} type="number" min={7} max={365} value={topics.repeat_after_days} onChange={(event) => setT({ repeat_after_days: Number(event.target.value) || 90 })} className={cn(inputClass, "max-w-32")} />
            )}
          </Field>
        </More>
      </Section>
      <Section title="The script" description="How each script opens and closes. Leave these empty to let the writer decide.">
        <Field label="How to open">{(id) => <input id={id} value={script.opening} onChange={(event) => setS({ opening: event.target.value })} maxLength={300} className={inputClass} />}</Field>
        <Field label="How to close">{(id) => <input id={id} value={script.closing} onChange={(event) => setS({ closing: event.target.value })} maxLength={300} className={inputClass} />}</Field>
        <Field label="Call to action near the end">
          {(id) => <input id={id} value={script.call_to_action} onChange={(event) => setS({ call_to_action: event.target.value })} maxLength={300} className={inputClass} />}
        </Field>
        {scripture && (
          <div className="space-y-3 rounded-lg bg-secondary/50 p-3">
            <Checkbox
              checked={script.scripture}
              onChange={(value) => setS({ scripture: value })}
              label="Draw on Scripture"
              hint="Quotes are word for word from the translation you choose, with the reference read aloud; anything else is called a paraphrase. Mindra checks each quote against the translation, word for word, before you approve the script."
            />
            {script.scripture && (
              <div className="max-w-xs">
                <SelectField label="Translation" value={script.translation} options={TRANSLATIONS} onChange={(value) => setS({ translation: value as "web" | "kjv" })} />
                <p className="mt-1.5 text-xs text-pretty text-muted-foreground">
                  Both are public domain, so Mindra carries them to check quotes. Translations under copyright, such as the NIV, can&apos;t be carried
                  without a licence, so they can&apos;t be chosen.
                </p>
              </div>
            )}
          </div>
        )}
        <More label="Rules for the writer">
          <Field label="Rules" hint="Anything the writer must always or never do.">
            {(id, hint) => <textarea id={id} aria-describedby={hint} value={script.rules} onChange={(event) => setS({ rules: event.target.value })} maxLength={2000} rows={3} className={inputClass} />}
          </Field>
          <Field label="Words and phrases never to use" hint="Separate them with commas. A video that uses one waits for your approval, even in automatic mode.">
            {(id, hint) => <input id={id} aria-describedby={hint} value={script.words_to_avoid} onChange={(event) => setS({ words_to_avoid: event.target.value })} maxLength={1000} className={inputClass} />}
          </Field>
        </More>
      </Section>
      <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
    </form>
  );
}

// 3. Video

function SampleButton({ automation }: { automation: AutomationDetail }) {
  const navigate = useNavigate();
  const start = useStartRun(automation.id);
  const blocked = automation.test_problems.length > 0;
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium text-foreground">See it before switching it on</p>
      <p className="text-sm text-pretty text-muted-foreground">
        A sample uses these settings to make one video now: about a minute long, so it&apos;s quick and uses little of the voice-over allowance. It isn&apos;t saved to the
        Content Library or posted. Save this step first.
      </p>
      {blocked && <ProblemList problems={automation.test_problems} />}
      {start.error && <ErrorNote>{errorText(start.error)}</ErrorNote>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={blocked || start.isPending}
          onClick={() => start.mutate({ kind: "test", length: "short" }, { onSuccess: (run) => navigate(`/automations/runs/${run.id}`) })}
          className={buttonStyles({ variant: "secondary", size: "sm" })}
        >
          {start.isPending && start.variables?.length === "short" && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Make a 1-minute sample
        </button>
        <button
          type="button"
          disabled={blocked || start.isPending}
          onClick={() => start.mutate({ kind: "test", length: "full" }, { onSuccess: (run) => navigate(`/automations/runs/${run.id}`) })}
          className={buttonStyles({ variant: "ghost", size: "sm" })}
        >
          {start.isPending && start.variables?.length === "full" && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          Full length ({automation.config.content.minutes} min)
        </button>
      </div>
    </div>
  );
}

function Pronunciations({ value, onChange }: { value: AutomationConfig["voice"]["pronunciations"]; onChange: (value: AutomationConfig["voice"]["pronunciations"]) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground">Pronunciations</p>
      <p className="text-xs text-pretty text-muted-foreground">Words the voice says wrong, and how to say them. The captions keep the word as written.</p>
      {value.map((item, index) => (
        <div key={index} className="flex gap-2">
          <input aria-label="Word" value={item.word} onChange={(event) => onChange(value.map((entry, at) => (at === index ? { ...entry, word: event.target.value } : entry)))} maxLength={60} placeholder="Selah" className={inputClass} />
          <input aria-label="Say it as" value={item.say_as} onChange={(event) => onChange(value.map((entry, at) => (at === index ? { ...entry, say_as: event.target.value } : entry)))} maxLength={120} placeholder="SEH-lah" className={inputClass} />
          <button type="button" onClick={() => onChange(value.filter((_, at) => at !== index))} aria-label={`Remove ${item.word || "this pronunciation"}`} className={buttonStyles({ variant: "ghost", size: "icon" })}>
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...value, { word: "", say_as: "" }])} disabled={value.length >= 50} className={buttonStyles({ variant: "secondary", size: "sm" })}>
        <Plus aria-hidden="true" className="size-4" />
        Add a word
      </button>
    </div>
  );
}

function VideoStep({ automation, save, saving, error, first }: StepProps) {
  const config = automation.config;
  const [content, setContent] = useState(config.content);
  const [voice, setVoice] = useState(config.voice);
  const [visuals, setVisuals] = useState(config.visuals);
  const [music, setMusic] = useState(config.music);
  const [captions, setCaptions] = useState(config.captions);
  const [branding, setBranding] = useState(config.branding);
  const [thumbnail, setThumbnail] = useState(config.thumbnail);
  const ids = { speed: useId(), stability: useId(), volume: useId(), accent: useId() };
  const changes = (): AutomationChanges => ({ config: { content, voice, visuals, music, captions, branding, thumbnail } });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(changes(), "next");
  };

  if (automation.kind !== "create") {
    return (
      <form onSubmit={submit} className="space-y-5">
        <Section
          title="Your videos are posted as they are"
          description={
            automation.kind === "repurpose"
              ? "Clips keep the shape, captions and length they were made with. To change one, open it on its recording's Clips tab and make it again."
              : "Videos are posted as you uploaded them (made ready at up to 1080p). Mindra writes the title, description and caption for each."
          }
        >
          <p className="text-sm text-pretty text-muted-foreground">Vertical videos up to 3 minutes go up on YouTube as Shorts; anything else as a regular video.</p>
        </Section>
        <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
      </form>
    );
  }

  const chosenVisuals = visuals.use_all ? null : visuals.assets.length;

  return (
    <form onSubmit={submit} className="space-y-5">
      <StepProblems automation={automation} field="video" />
      <Section title="Narration" description="The voice that reads each script. Press play to hear one.">
        {automation.services.voice ? (
          <VoicePicker value={voice.voice_id} onChange={(chosen) => setVoice((current) => ({ ...current, voice_id: chosen.id, voice_name: chosen.name }))} />
        ) : (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-pretty text-amber-900">Voice-overs aren&apos;t set up on Mindra yet (ELEVENLABS_API_KEY).</p>
        )}
        <div className="max-w-sm space-y-1.5">
          <label htmlFor={ids.speed} className="flex justify-between text-sm font-medium text-foreground">
            Speaking speed <span className="text-muted-foreground tabular-nums">{voice.speed.toFixed(2)}×</span>
          </label>
          <input id={ids.speed} type="range" min={0.7} max={1.2} step={0.05} value={voice.speed} onChange={(event) => setVoice((current) => ({ ...current, speed: Number(event.target.value) }))} className="w-full accent-[var(--color-primary)]" />
        </div>
        <More label="More voice settings">
          <div className="max-w-sm space-y-1.5">
            <label htmlFor={ids.stability} className="flex justify-between text-sm font-medium text-foreground">
              Steadiness <span className="text-muted-foreground tabular-nums">{Math.round(voice.stability * 100)}%</span>
            </label>
            <input id={ids.stability} type="range" min={0} max={1} step={0.05} value={voice.stability} onChange={(event) => setVoice((current) => ({ ...current, stability: Number(event.target.value) }))} className="w-full accent-[var(--color-primary)]" />
            <p className="text-xs text-pretty text-muted-foreground">Higher is steadier and calmer; lower is more expressive.</p>
          </div>
          <Pronunciations value={voice.pronunciations} onChange={(pronunciations) => setVoice((current) => ({ ...current, pronunciations }))} />
        </More>
      </Section>

      <Section title="Visuals" description={`Your own photos and clips, shown under the narration (at least ${MIN_VISUALS}). Each is shown once before any comes back.`}>
        <Checkbox checked={visuals.use_all} onChange={(use_all) => setVisuals((current) => ({ ...current, use_all }))} label="Use all my photos and clips" hint="Including ones you upload later, in Motion Studio or here." />
        {!visuals.use_all && (
          <>
            <MediaPicker kinds={["image", "video"]} selected={visuals.assets} onChange={(assets) => setVisuals((current) => ({ ...current, assets }))} label="photos and clips" />
            {chosenVisuals !== null && chosenVisuals < MIN_VISUALS && (
              <p className="text-sm text-amber-800 tabular-nums">
                {chosenVisuals} chosen; choose at least {MIN_VISUALS}.
              </p>
            )}
          </>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="How often the picture changes" value={visuals.pace} options={Object.fromEntries(Object.entries(PACES).map(([key, pace]) => [key, pace.label]))} onChange={(pace) => setVisuals((current) => ({ ...current, pace: pace as AutomationConfig["visuals"]["pace"] }))} hint={PACES[visuals.pace].detail} />
          <SelectField label="Between pictures" value={visuals.transition} options={TRANSITIONS} onChange={(transition) => setVisuals((current) => ({ ...current, transition }))} />
          <SelectField label="Colour filter" value={visuals.effect} options={EFFECTS} onChange={(effect) => setVisuals((current) => ({ ...current, effect }))} />
        </div>
        <Checkbox checked={visuals.motion} onChange={(motion) => setVisuals((current) => ({ ...current, motion }))} label="Slow zoom on photos" hint="Photos drift in or out a little, so a still picture doesn't look frozen." />
      </Section>

      <Section title="Background music" description="Under the narration, quiet enough to hear every word. With several tracks, each video takes the next.">
        <MediaPicker kinds={["audio"]} selected={music.tracks} onChange={(tracks) => setMusic((current) => ({ ...current, tracks }))} label="music" />
        <p className="text-xs text-pretty text-muted-foreground">
          Find free music to use in{" "}
          <Link to="/studio" className="font-medium text-primary underline-offset-2 hover:underline">
            Motion Studio
          </Link>
          &apos;s Audio tab; it appears here once it&apos;s in your media.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor={ids.volume} className="flex justify-between text-sm font-medium text-foreground">
              Music volume <span className="text-muted-foreground tabular-nums">{Math.round(music.volume * 100)}%</span>
            </label>
            <input id={ids.volume} type="range" min={0} max={0.5} step={0.01} value={music.volume} onChange={(event) => setMusic((current) => ({ ...current, volume: Number(event.target.value) }))} className="w-full accent-[var(--color-primary)]" />
          </div>
          <Checkbox checked={music.fade} onChange={(fade) => setMusic((current) => ({ ...current, fade }))} label="Fade in and out" />
        </div>
      </Section>

      <Section title="Captions" description="Every spoken word on screen, timed to the narration, so the video works with the sound off.">
        <Checkbox checked={captions.on} onChange={(on) => setCaptions((current) => ({ ...current, on }))} label="Show captions" />
        {captions.on && (
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField label="Style" value={captions.style} options={{ highlight: "The word being said in your colour", plain: "Plain white lines" }} onChange={(style) => setCaptions((current) => ({ ...current, style: style as "highlight" | "plain" }))} />
            <SelectField label="Where" value={captions.position} options={{ bottom: "Near the bottom", middle: "In the middle" }} onChange={(position) => setCaptions((current) => ({ ...current, position: position as "bottom" | "middle" }))} />
          </div>
        )}
      </Section>

      <Section title="Shape and quality">
        <Choices
          label="Shape"
          value={content.shape}
          onChange={(shape) => setContent((current) => ({ ...current, shape }))}
          options={[
            { id: "16:9", title: "Landscape (16:9)", detail: "A regular YouTube video: best for 5 to 9 minutes. On TikTok it shows with bars." },
            { id: "9:16", title: "Vertical (9:16)", detail: "Fills a phone screen: for TikTok, and YouTube Shorts up to 3 minutes." },
          ]}
        />
        <Choices
          label="Quality"
          value={content.quality}
          onChange={(quality) => setContent((current) => ({ ...current, quality }))}
          options={[
            { id: "standard", title: "Standard (720p)", detail: "Made faster. Clear on phones, and fine for photo-based videos." },
            { id: "high", title: "High (1080p)", detail: "Sharper on big screens; takes about twice as long to make." },
          ]}
        />
      </Section>

      <Section title="Branding" description="Your logo on every video, and a line to close on.">
        <MediaPicker kinds={["image"]} single selected={branding.logo ? [branding.logo] : []} onChange={(chosen) => setBranding((current) => ({ ...current, logo: chosen[0] ?? null }))} label="a logo" />
        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label="Logo corner" value={branding.corner} options={CORNERS} onChange={(corner) => setBranding((current) => ({ ...current, corner }))} />
          <div className="space-y-1.5">
            <label htmlFor={ids.accent} className="block text-sm font-medium text-foreground">
              Your colour
            </label>
            <input id={ids.accent} type="color" value={branding.accent} onChange={(event) => setBranding((current) => ({ ...current, accent: event.target.value.toUpperCase() }))} className="h-10 w-20 cursor-pointer rounded-lg border border-border bg-card p-1" />
            <p className="text-xs text-muted-foreground">For the word being said in the captions, and the thumbnail.</p>
          </div>
          <Field label="Closing line (optional)" hint="Shown for the last few seconds.">
            {(id, hint) => <input id={id} aria-describedby={hint} value={branding.closing_text} onChange={(event) => setBranding((current) => ({ ...current, closing_text: event.target.value }))} maxLength={120} placeholder="See you tomorrow" className={inputClass} />}
          </Field>
        </div>
        <div className="space-y-3 border-t border-border pt-4">
          <Checkbox
            checked={thumbnail.on}
            onChange={(on) => setThumbnail((current) => ({ ...current, on }))}
            label="Make a YouTube thumbnail"
            hint="For landscape videos: the clearest frame of the video, with your colour and logo. You see it, and can change it, when you approve each video. YouTube takes custom thumbnails only from verified channels; Shorts show a frame YouTube picks."
          />
          {thumbnail.on && (
            <Checkbox checked={thumbnail.title} onChange={(title) => setThumbnail((current) => ({ ...current, title }))} label="Put the title on it" />
          )}
        </div>
      </Section>

      <SampleButton automation={automation} />
      <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
    </form>
  );
}

// 4. Platforms

function PlatformsStep({ automation, save, saving, error, first }: StepProps) {
  const [platforms, setPlatforms] = useState<PlatformId[]>(automation.config.publishing.platforms);
  const [youtube, setYoutube] = useState<number | null>(automation.account?.id ?? null);
  const [tiktok, setTiktok] = useState<number | null>(automation.tiktok_account?.id ?? null);
  const [publishing, setPublishing] = useState(automation.config.publishing);
  const [tiktokConfig, setTiktokConfig] = useState<TikTokConfig>(automation.config.tiktok);
  const changes = (): AutomationChanges => ({ account: youtube, tiktok_account: tiktok, config: { publishing: { ...publishing, platforms }, tiktok: tiktokConfig } });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(changes(), "next");
  };
  const videoSeconds = automation.kind === "create" ? automation.config.content.minutes * 60 : null;
  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <p className="text-sm text-pretty text-muted-foreground">
          Where each video goes. Every video is also saved in your Content Library, with its post for each platform. Connecting an account doesn&apos;t post anything by
          itself: what&apos;s posted, and when, is set in the next step.
        </p>
      </div>
      <StepProblems automation={automation} field="platforms" />
      <PlatformCards
        platforms={platforms}
        setPlatforms={setPlatforms}
        youtube={youtube}
        setYoutube={setYoutube}
        tiktok={tiktok}
        setTiktok={setTiktok}
        publishing={publishing}
        setPublishing={(change) => setPublishing((current) => ({ ...current, ...change }))}
        tiktokConfig={tiktokConfig}
        setTiktokConfig={(change) => setTiktokConfig((current) => ({ ...current, ...change }))}
        drafts={automation.mode === "draft"}
        tiktokPublic={automation.services.tiktok_public}
        videoSeconds={videoSeconds}
      />
      <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
    </form>
  );
}

// 5. Schedule and approval

type Frequency = "daily" | "weekdays" | "weekly" | "custom";

function frequencyOf(weekdays: number[]): Frequency {
  if (weekdays.length === 7) return "daily";
  if (weekdays.length === 5 && [0, 1, 2, 3, 4].every((day) => weekdays.includes(day))) return "weekdays";
  if (weekdays.length === 1) return "weekly";
  return "custom";
}

function ScheduleStep({ automation, save, saving, error, first }: StepProps) {
  const zones = timeZones();
  const [weekdays, setWeekdays] = useState<number[]>(automation.weekdays);
  const [frequency, setFrequency] = useState<Frequency>(frequencyOf(automation.weekdays));
  const [postTime, setPostTime] = useState(automation.post_time?.slice(0, 5) ?? "");
  const [timeZone, setTimeZone] = useState(zones.includes(automation.time_zone) ? automation.time_zone : automation.time_zone || zones[0]);
  const [startsOn, setStartsOn] = useState(automation.starts_on ?? "");
  const [endsOn, setEndsOn] = useState(automation.ends_on ?? "");
  const [mode, setMode] = useState<"draft" | "approval" | "automatic">(automation.mode);
  const [approveFirst, setApproveFirst] = useState(automation.config.script.approve_first);
  const changes = (): AutomationChanges => ({
    weekdays,
    post_time: postTime || null,
    time_zone: timeZone,
    starts_on: startsOn || null,
    ends_on: endsOn || null,
    ...(mode !== "automatic" ? { mode } : {}),
    config: { script: { approve_first: approveFirst } },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(changes(), "next");
  };
  const toggleDay = (day: number) => setWeekdays((current) => (current.includes(day) ? current.filter((item) => item !== day) : [...current, day].sort()));
  const chooseFrequency = (value: Frequency) => {
    setFrequency(value);
    if (value === "daily") setWeekdays([0, 1, 2, 3, 4, 5, 6]);
    if (value === "weekdays") setWeekdays([0, 1, 2, 3, 4]);
    if (value === "weekly") setWeekdays((current) => [current[0] ?? 0]);
  };
  const lead = mode === "approval" ? "a day" : "three hours";

  return (
    <form onSubmit={submit} className="space-y-5">
      <StepProblems automation={automation} field="schedule" />
      <Section title="When videos go out" description={`At most one a day. Each video starts being made ${lead} before its time, so it's ready.`}>
        <SelectField
          label="How often"
          value={frequency}
          options={{ daily: "Every day", weekdays: "Every weekday (Monday to Friday)", weekly: "Once a week", custom: "On the days I choose" }}
          onChange={(value) => chooseFrequency(value as Frequency)}
        />
        {(frequency === "custom" || frequency === "weekly") && (
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">{frequency === "weekly" ? "Day" : "Days"}</p>
            <div role="group" aria-label="Days" className="flex flex-wrap gap-2">
              {WEEKDAYS.map((day, index) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={weekdays.includes(index)}
                  aria-label={WEEKDAY_NAMES[index]}
                  onClick={() => (frequency === "weekly" ? setWeekdays([index]) : toggleDay(index))}
                  className={cn(
                    "h-9 min-w-12 rounded-lg border px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-primary",
                    weekdays.includes(index) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-secondary",
                  )}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Time">{(id) => <input id={id} type="time" value={postTime} onChange={(event) => setPostTime(event.target.value)} className={inputClass} />}</Field>
          <Field label="Time zone">
            {(id) => (
              <select id={id} value={timeZone} onChange={(event) => setTimeZone(event.target.value)} className={inputClass}>
                {(zones.includes(timeZone) ? zones : [timeZone, ...zones]).map((zone) => (
                  <option key={zone} value={zone}>
                    {zone.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </div>
        <More label="Start and end days">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First day (optional)">{(id) => <input id={id} type="date" value={startsOn} onChange={(event) => setStartsOn(event.target.value)} className={inputClass} />}</Field>
            <Field label="Last day (optional)">{(id) => <input id={id} type="date" value={endsOn} onChange={(event) => setEndsOn(event.target.value)} className={inputClass} />}</Field>
          </div>
        </More>
      </Section>
      <Section title="What happens to each video" description="You can change this any time.">
        <div role="radiogroup" aria-label="Publishing" className="space-y-2">
          {(["draft", "approval", "automatic"] as const).map((value) => {
            const locked = value === "automatic" && mode !== "automatic";
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                disabled={locked}
                onClick={() => setMode(value)}
                className={cn(
                  "flex w-full gap-3 rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed",
                  mode === value ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
                  locked && "opacity-60 hover:bg-transparent",
                )}
              >
                <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", mode === value ? "border-primary" : "border-border")}>
                  {mode === value && <span className="size-2 rounded-full bg-primary" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{MODES[value].label}</span>
                  <span className="mt-0.5 block text-xs text-pretty text-muted-foreground">{MODES[value].description}</span>
                  {locked && (
                    <span className="mt-1 block text-xs text-pretty text-muted-foreground">
                      {automation.approved_once
                        ? "Turn it on from the automation's page, where you'll confirm it."
                        : "Available once you've approved one of this automation's videos, so you've seen what it makes."}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
        {mode === "automatic" && (
          <p className="rounded-lg bg-secondary/60 px-3 py-2.5 text-sm text-pretty text-muted-foreground">
            This automation posts automatically. To go back to approving each video, choose Approve each video or Save as drafts.
          </p>
        )}
        {automation.kind === "create" && mode === "approval" && (
          <Checkbox checked={approveFirst} onChange={setApproveFirst} label="Approve each script before it's narrated" hint="Read and edit the script first. The narration is only made once you approve it." />
        )}
      </Section>
      <Footer saving={saving} error={error} first={first} onBack={() => save(changes(), "back")} />
    </form>
  );
}

// 6. Review

function ReviewStep({ automation, go }: { automation: AutomationDetail; go: (step: StepId) => void }) {
  const navigate = useNavigate();
  const start = useStartRun(automation.id);
  const action = useAutomationAction(automation.id);
  const config = automation.config;
  const create = automation.kind === "create";
  const visuals = config.visuals.use_all ? "all your photos and clips" : `${config.visuals.assets.length} of your photos and clips`;
  const waiting = automation.topics.filter((item) => !item.used_at);
  const places = config.publishing.platforms.map((platform) => {
    const account = platform === "youtube" ? automation.account : automation.tiktok_account;
    return `${PLATFORM_LABELS[platform]}${account ? ` (${account.name})` : ""}`;
  });

  const rows: { step: StepId; title: string; lines: string[] }[] = [
    {
      step: "content",
      title: "What Mindra will create",
      lines: create
        ? [
            `A ${config.content.minutes}-minute ${config.content.tone} video about ${config.content.niche || "your topics"}${config.content.audience ? `, for ${config.content.audience}` : ""}, in ${LANGUAGES[config.content.language] ?? config.content.language}.`,
            config.topics.source === "ai"
              ? "A new AI topic for each video."
              : `${waiting.filter((item) => !item.clip && !item.video).length} topics waiting${config.topics.source === "both" ? ", then AI ideas" : ""}.`,
          ]
        : automation.kind === "repurpose"
          ? [config.source.clips === "newest" ? "Your newest made clip for each slot." : `${waiting.filter((item) => item.clip).length} clips waiting on the list.`, "A title, description and caption written for each."]
          : [`${waiting.filter((item) => item.video).length} videos waiting on the list.`, "A title, description and caption written for each."],
    },
    {
      step: "video",
      title: "How the video is put together",
      lines: create
        ? [
            `Read by ${config.voice.voice_name || "a voice you haven't chosen yet"}, over ${visuals}${config.music.tracks.length ? `, with music at ${Math.round(config.music.volume * 100)}%` : ", without music"}.`,
            `${config.content.shape === "16:9" ? "Landscape" : "Vertical"}, ${config.content.quality === "high" ? "1080p" : "720p"}, ${config.captions.on ? "captions on" : "no captions"}, ${config.branding.logo ? "your logo" : "no logo"}. Made in Motion Studio, where you can open each one.`,
          ]
        : ["Posted as it is."],
    },
    {
      step: "platforms",
      title: "Where it's posted",
      lines: [
        places.length ? `${places.join(" and ")}, and saved in your Content Library.` : "No platform chosen.",
        config.publishing.platforms.includes("youtube") ? `On YouTube: ${PRIVACY[config.publishing.privacy].toLowerCase()}.` : "",
        config.publishing.platforms.includes("tiktok") ? "On TikTok: each post waits for your approval (TikTok's rules)." : "",
      ].filter(Boolean),
    },
    {
      step: "schedule",
      title: "When it runs, and approval",
      lines: [
        `${scheduleSummary(automation)} (${automation.time_zone.replace(/_/g, " ")}).`,
        `${MODES[automation.mode].label}: ${MODES[automation.mode].description}`,
        create && automation.mode === "approval" && config.script.approve_first ? "You approve each script before it's narrated." : "",
      ].filter(Boolean),
    },
  ];
  const sample = (length: "short" | "full") => start.mutate({ kind: "test", length }, { onSuccess: (run) => navigate(`/automations/runs/${run.id}`) });
  const activate = () => action.mutate({ action: "activate" }, { onSuccess: () => navigate(`/automations/${automation.id}`) });

  return (
    <div className="space-y-5">
      <section className="divide-y divide-border rounded-xl border border-border bg-card">
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
        <div className="p-4">
          <h3 className="text-sm font-semibold text-foreground">If something goes wrong</h3>
          <p className="mt-0.5 text-sm text-pretty text-muted-foreground">
            A step that hits a passing problem (a busy service) is tried again on its own, up to three times. Anything else stops that video at its step, with the reason, on
            the automation&apos;s page. You can try again from that step: nothing made before it is made again. A post YouTube or TikTok refuses stops the same way, and
            you get the usual reminder to post it yourself.
          </p>
        </div>
      </section>
      {automation.problems.length > 0 ? (
        <section className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900">Before it can be switched on</h3>
          <ProblemList problems={automation.problems} go={go} />
        </section>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-pretty text-emerald-800">
          <Check aria-hidden="true" className="size-4 shrink-0" />
          Everything is ready. Once it&apos;s on, the first video is made ahead of its first slot.
        </p>
      )}
      {(start.error || action.error) && <ErrorNote>{errorText(start.error || action.error)}</ErrorNote>}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="mr-auto">
          <PlatformMarks platforms={config.publishing.platforms} drafts={automation.mode === "draft"} />
        </span>
        <Link to={`/automations/${automation.id}`} className={buttonStyles({ variant: "ghost" })}>
          Leave it off for now
        </Link>
        <button type="button" onClick={() => sample(create ? "short" : "full")} disabled={start.isPending || automation.test_problems.length > 0} className={buttonStyles({ variant: "secondary" })}>
          {start.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {create ? "Make a 1-minute sample" : "Make a sample"}
        </button>
        <button type="button" onClick={activate} disabled={action.isPending || automation.problems.length > 0 || automation.status === "active"} className={buttonStyles({ variant: "primary" })}>
          {action.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {automation.status === "active" ? "Switched on" : "Switch on"}
        </button>
      </div>
      <p className="text-right text-xs text-pretty text-muted-foreground">A sample is never saved or posted, and doesn&apos;t use up a topic or video.</p>
    </div>
  );
}

/** Every setting of an automation, in six steps (the setup page's "More settings"), each saved as you go on. */
export default function AutomationSettings() {
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
  const problemSteps = new Set((automation.data?.problems ?? []).map((problem) => STEP_FOR_FIELD[problem.field]).filter(Boolean));

  return (
    <div className="max-w-3xl space-y-6">
      <Link to={automationId ? `/automations/${automationId}` : "/automations"} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft aria-hidden="true" className="size-4" />
        {automation.data?.name ?? "Automations"}
      </Link>
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Set up {automation.data?.name ?? "the automation"}</h2>
        <p className="mt-1 text-sm text-pretty text-muted-foreground">Each step is saved as you go on, so you can come back to it. Nothing runs until you switch it on.</p>
      </div>
      <nav aria-label="Setup steps">
        <ol className="flex flex-wrap gap-x-1 gap-y-2">
          {SETUP_STEPS.map((step, at) => (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => go(step.id)}
                aria-current={at === index ? "step" : undefined}
                className="flex items-center gap-1.5 rounded-md py-0.5 pr-2 text-xs focus-visible:outline-2 focus-visible:outline-primary"
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full font-semibold tabular-nums",
                    at === index ? "bg-primary text-primary-foreground" : problemSteps.has(step.id) ? "bg-amber-100 text-amber-900" : at < index ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground",
                  )}
                >
                  {at < index && !problemSteps.has(step.id) ? <Check aria-hidden="true" className="size-3.5" /> : at + 1}
                </span>
                <span className={at === index ? "font-medium text-foreground" : "text-muted-foreground"}>{step.label}</span>
                {problemSteps.has(step.id) && <span className="sr-only">(needs something)</span>}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      {automation.isPending ? (
        <div aria-busy="true" className="h-96 animate-pulse rounded-xl border border-border bg-card" />
      ) : automation.isError ? (
        <ErrorNote>{automation.error.message}</ErrorNote>
      ) : current.id === "review" ? (
        <ReviewStep automation={automation.data} go={go} />
      ) : (
        (() => {
          const props: StepProps = { automation: automation.data, save, saving: update.isPending, error: errorText(update.error), first: index === 0 };
          switch (current.id) {
            case "automation":
              return <AutomationStep key="automation" {...props} />;
            case "content":
              return <ContentStep key="content" {...props} />;
            case "video":
              return <VideoStep key="video" {...props} />;
            case "platforms":
              return <PlatformsStep key="platforms" {...props} />;
            case "schedule":
              return <ScheduleStep key="schedule" {...props} />;
          }
        })()
      )}
    </div>
  );
}
