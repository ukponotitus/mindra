import { useId, useState, type FormEvent } from "react";
import { ExternalLink, LoaderCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { ApiError } from "../../lib/api";
import {
  LANGUAGES,
  scheduleSummary,
  useCreateAutomation,
  useReadChannel,
  type ChannelModel,
  type Preset,
} from "../../lib/automations";
import { formatDuration } from "../../lib/format";
import { buttonStyles } from "../ui/button";
import { ErrorNote } from "./parts";
import { inputClass } from "./widgets";

const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });
const TOPICS_SHOWN = 6;

function errorText(error: unknown, otherwise: string) {
  return error instanceof ApiError ? error.message : otherwise;
}

function rhythm(found: ChannelModel["found"]) {
  if (found.per_week == null) return "Too few recent videos to see a pattern";
  const often = found.per_week >= 1 ? `About ${Math.round(found.per_week)} a week` : "Less than one a week";
  const when = found.weekdays.length && found.post_time ? `, usually ${scheduleSummary(found).replace(/^(Every day|Weekdays)/, (words) => words.toLowerCase())}` : "";
  return `${often}${when}`;
}

/** New automation: paste a YouTube channel's link, look over what Mindra found on its public page and what it would
 * set up, then make the draft. Nothing is saved until "Create the automation", and only the channel's name and link
 * are kept. Shown only where the API offers it (`useChannelStart`). */
export default function StartFromChannel({ presets }: { presets: Preset[] }) {
  const id = useId();
  const navigate = useNavigate();
  const read = useReadChannel();
  const create = useCreateAutomation();
  const [link, setLink] = useState("");
  const [allTopics, setAllTopics] = useState(false);
  const model = read.data;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!link.trim() || read.isPending) return;
    setAllTopics(false);
    create.reset();
    read.mutate(link.trim());
  };

  const start = () => {
    if (!model || create.isPending) return;
    const { suggestion, channel } = model;
    create.mutate(
      {
        preset: suggestion.preset,
        name: suggestion.name,
        config: suggestion.config,
        topics: suggestion.topics,
        ...(suggestion.weekdays.length ? { weekdays: suggestion.weekdays } : {}),
        ...(suggestion.post_time ? { post_time: suggestion.post_time } : {}),
        modelled_on: { name: channel.name, url: channel.url },
      },
      { onSuccess: (automation) => navigate(`/automations/${automation.id}/setup`) },
    );
  };

  const content = model?.suggestion.config.content ?? {};
  const template = presets.find((preset) => preset.id === model?.suggestion.preset);
  const topics = model?.suggestion.topics ?? [];

  return (
    <section aria-labelledby={`${id}-title`} className="rounded-xl border border-border bg-card p-5">
      <h3 id={`${id}-title`} className="font-semibold text-foreground">
        Start from a channel
      </h3>
      <p className="mt-1 max-w-3xl text-sm text-pretty text-muted-foreground">
        Paste the link of a YouTube channel you&apos;d like yours to be like. Mindra reads its public details (titles, descriptions, lengths and how often it posts,
        never the videos themselves) and drafts an automation that makes new videos of the same kind.
      </p>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label htmlFor={`${id}-link`} className="mb-1.5 block text-sm font-medium text-foreground">
            YouTube channel link
          </label>
          <input
            id={`${id}-link`}
            type="text"
            inputMode="url"
            autoComplete="off"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://www.youtube.com/@channel"
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={!link.trim() || read.isPending} className={buttonStyles({ variant: model ? "secondary" : "primary" })}>
          {read.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
          {read.isPending ? "Reading the channel" : model ? "Read it again" : "Read the channel"}
        </button>
      </form>
      <p role="status" className="sr-only">
        {read.isPending ? "Reading the channel. This can take half a minute." : model ? `Mindra read ${model.channel.name}.` : ""}
      </p>
      {read.isPending && <p className="mt-3 text-sm text-muted-foreground">This can take half a minute.</p>}
      {read.error && (
        <div className="mt-4">
          <ErrorNote>{errorText(read.error, "Mindra couldn't read the channel. Check your connection and try again.")}</ErrorNote>
        </div>
      )}

      {model && !read.isPending && (
        <div className="mt-5 grid gap-5 border-t border-border pt-5 lg:grid-cols-2">
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              What Mindra found on{" "}
              <a href={model.channel.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                {model.channel.name}
                <ExternalLink aria-hidden="true" className="size-3.5" />
                <span className="sr-only">(opens YouTube)</span>
              </a>
            </h4>
            {model.found.summary && <p className="mt-2 text-sm text-pretty text-foreground">{model.found.summary}</p>}
            <dl className="mt-3 space-y-2 text-sm">
              <Fact label="Videos read">
                <span className="tabular-nums">Its newest {model.found.videos}</span>
              </Fact>
              <Fact label="Usual length">
                <span className="tabular-nums">{formatDuration(model.found.typical_seconds)}</span>
                {model.found.short ? ", short vertical videos" : ""}
              </Fact>
              <Fact label="How often">
                <span className="tabular-nums">{rhythm(model.found)}</span>
              </Fact>
              {model.found.title_style && <Fact label="Titles">{model.found.title_style}</Fact>}
            </dl>
            {model.found.top.length > 0 && (
              <>
                <p className="mt-4 text-sm font-medium text-foreground">Most watched</p>
                <ul className="mt-1.5 space-y-1.5 text-sm">
                  {model.found.top.map((video) => (
                    <li key={video.url} className="flex items-baseline justify-between gap-3">
                      <a href={video.url} target="_blank" rel="noreferrer" className="min-w-0 truncate text-foreground hover:text-primary hover:underline">
                        {video.title}
                      </a>
                      {video.views != null && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{compact.format(video.views)} views on YouTube</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-foreground">What Mindra will set up</h4>
            {model.note && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-pretty text-amber-900">{model.note}</p>}
            <dl className="mt-3 space-y-2 text-sm">
              <Fact label="Template">{template?.name ?? "Start from scratch"}</Fact>
              {content.niche && <Fact label="About">{content.niche}</Fact>}
              {content.audience && <Fact label="For">{content.audience}</Fact>}
              {content.tone && (
                <Fact label="Tone">
                  <span className="capitalize">{content.tone}</span>
                  {content.language && content.language !== "en" ? `, in ${LANGUAGES[content.language] ?? content.language}` : ""}
                </Fact>
              )}
              <Fact label="Each video">
                <span className="tabular-nums">
                  About {content.minutes} {content.minutes === 1 ? "minute" : "minutes"}, {content.shape === "9:16" ? "vertical (9:16)" : "landscape (16:9)"}
                </span>
              </Fact>
              <Fact label="Schedule">
                <span className="tabular-nums">
                  {model.suggestion.weekdays.length && model.suggestion.post_time ? scheduleSummary(model.suggestion) : "The template's own, until you change it"}
                </span>
              </Fact>
            </dl>
            {topics.length > 0 && (
              <>
                <p className="mt-4 text-sm font-medium text-foreground tabular-nums">{topics.length} new topics to start with</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-foreground">
                  {(allTopics ? topics : topics.slice(0, TOPICS_SHOWN)).map((topic) => (
                    <li key={topic}>{topic}</li>
                  ))}
                </ul>
                {topics.length > TOPICS_SHOWN && (
                  <button type="button" aria-expanded={allTopics} onClick={() => setAllTopics((value) => !value)} className="mt-2 text-sm font-medium text-primary hover:underline">
                    {allTopics ? "Show fewer" : `Show all ${topics.length}`}
                  </button>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 lg:col-span-2">
            <p className="max-w-2xl text-sm text-pretty text-muted-foreground">
              Mindra writes its own scripts on new topics; it never copies or re-uploads this channel&apos;s videos. You can change everything in the setup, and
              nothing is made or posted until you switch the automation on.
            </p>
            <button type="button" onClick={start} disabled={create.isPending} className={buttonStyles()}>
              {create.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              Create the automation
            </button>
          </div>
          {create.error && (
            <div className="lg:col-span-2">
              <ErrorNote>{errorText(create.error, "Mindra couldn't start the automation. Try again.")}</ErrorNote>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-28 shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-pretty text-foreground">{children}</dd>
    </div>
  );
}
