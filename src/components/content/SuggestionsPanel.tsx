import { useId, useState, type ReactNode, type RefObject } from "react";
import { Check, RotateCw } from "lucide-react";
import { buttonStyles } from "../ui/button";
import { cn } from "../../lib/cn";
import { useSuggestPiece } from "../../lib/content";
import { platformInfo } from "../../lib/projects";
import type { Platform, Suggestions } from "../../lib/types";

const itemButton = buttonStyles({ variant: "secondary", size: "sm", className: "h-9" });

// A line made only of hashtags, like the one that closes most Instagram captions.
const HASHTAG_LINE = /^\s*#[\p{L}\p{N}_]+(?:\s+#[\p{L}\p{N}_]+)*\s*$/u;
// Lines an opener never replaces: "Title:" and "Subject:" lines, Markdown headings, on-screen text in [brackets].
const HEADER_LINE = /^(?:(?:title|subject)\s*:|#{1,6}\s|\[[^\]]*\]$)/i;
// Kept at the start of the opening line: a thread's "1/" and a script's "Hook:".
const LINE_PREFIX = /^(?:\d+\/\s*|hook\s*:\s*)/i;
// The first sentence of a line that has more after it.
const FIRST_SENTENCE = /^.+?[.!?…]+["”’')\]]*(?=\s)/;

function hashtagPattern(tag: string, flags: string) {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}_#])#${escaped}(?![\\p{L}\\p{N}_])`, flags);
}

function hasHashtag(text: string, tag: string) {
  return hashtagPattern(tag, "iu").test(text);
}

/** Adds the tag to a closing line of hashtags, or starts one. */
function addHashtag(text: string, tag: string) {
  const trimmed = text.trimEnd();
  const lines = trimmed.split("\n");
  const last = lines[lines.length - 1];
  if (HASHTAG_LINE.test(last)) {
    lines[lines.length - 1] = `${last.trimEnd()} #${tag}`;
    return lines.join("\n");
  }
  return trimmed ? `${trimmed}\n\n#${tag}` : `#${tag}`;
}

/**
 * Takes the tag out of the post. Among other tags or at the start of a line the whole tag goes (and a line it
 * leaves empty); inside a sentence ("grow in #faith") only the "#" goes, so the sentence still reads.
 */
function removeHashtag(text: string, tag: string) {
  const pattern = hashtagPattern(tag, "giu");
  const kept: string[] = [];
  for (const line of text.split("\n")) {
    let removed = false;
    const next = line.replace(pattern, (match: string, before: string, offset: number) => {
      const previous = line.slice(0, offset + before.length).trim().split(/\s+/).pop() ?? "";
      if (previous && !previous.startsWith("#")) return before + match.slice(before.length + 1);
      removed = true;
      return before;
    });
    if (!removed) kept.push(next);
    else if (next.trim()) kept.push(next.replace(/[ \t]{2,}/g, " ").trim());
    else if (kept.length > 0 && !kept[kept.length - 1].trim()) kept.pop();
  }
  return kept.join("\n").trimEnd();
}

/** Swaps the post's opening line (its first sentence, if the line runs on), keeping numbering and WhatsApp bold. */
function replaceOpener(text: string, opener: string) {
  const lines = text.split("\n");
  const index = lines.findIndex((line) => line.trim() && !HEADER_LINE.test(line.trim()) && !HASHTAG_LINE.test(line));
  if (index === -1) return text.trim() ? `${text.trimEnd()}\n\n${opener}` : opener;
  const line = lines[index];
  const indent = line.length - line.trimStart().length;
  const prefix = line.slice(indent).match(LINE_PREFIX)?.[0] ?? "";
  const rest = line.slice(indent + prefix.length);
  const bold = rest.match(/^\*[^*\n]+\*/);
  const first = bold ? bold[0] : (rest.match(FIRST_SENTENCE)?.[0] ?? rest);
  const replacement = bold ? `*${opener.replace(/^\*+|\*+$/g, "")}*` : opener;
  lines[index] = line.slice(0, indent) + prefix + replacement + rest.slice(first.length);
  return lines.join("\n");
}

/** Adds the line at the end, before a closing line of hashtags, numbered when the post is a thread. */
function addClosingLine(text: string, closing: string) {
  const lines = text.trimEnd().split("\n");
  let tail = "";
  if (lines.length > 1 && HASHTAG_LINE.test(lines[lines.length - 1])) {
    tail = lines.pop() ?? "";
    while (lines.length > 0 && !lines[lines.length - 1].trim()) lines.pop();
  }
  const main = lines.join("\n");
  const numbers = [...main.matchAll(/^(\d+)\/\s/gm)].map((match) => Number(match[1]));
  const line = numbers.length > 0 ? `${Math.max(...numbers) + 1}/ ${closing}` : closing;
  const result = main.trim() ? `${main}\n\n${line}` : line;
  return tail ? `${result}\n\n${tail}` : result;
}

/** Puts `insert` at `position`, with a space either side where it would touch a word. */
function insertAt(text: string, insert: string, position: number) {
  const before = text.slice(0, position);
  const after = text.slice(position);
  const start = before && !/\s$/.test(before) ? `${before} ` : before;
  const end = after && !/^\s/.test(after) ? ` ${after}` : after;
  return { text: start + insert + end, caret: (start + insert).length };
}

function Group({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="border-t border-border pt-4">
      <h4 className="text-sm font-semibold text-balance text-foreground">{title}</h4>
      {hint && <p className="mt-0.5 text-xs text-pretty text-muted-foreground">{hint}</p>}
      <div className="mt-2.5">{children}</div>
    </div>
  );
}

/** Grey shapes in the layout of the suggestions, shown while they're written. */
function SuggestionsSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      {[0, 1].map((card) => (
        <div key={card} className="space-y-2 rounded-lg border border-border p-3">
          <div className="h-4 w-2/5 animate-pulse rounded bg-secondary" />
          <div className="h-3.5 w-full animate-pulse rounded bg-secondary" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-secondary" />
        </div>
      ))}
      <div className="space-y-2.5 border-t border-border pt-4">
        <div className="h-4 w-1/4 animate-pulse rounded bg-secondary" />
        {[0, 1, 2].map((line) => (
          <div key={line} className="h-3.5 w-full animate-pulse rounded bg-secondary" />
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {[16, 20, 14, 24].map((width) => (
          <div key={width} className="h-8 animate-pulse rounded-full bg-secondary" style={{ width: `${width * 4}px` }} />
        ))}
      </div>
    </div>
  );
}

interface Props {
  pieceId: string;
  platform: Platform;
  /** The post text in the editor, saved or not. */
  body: string;
  /** The tone chosen in the editor's toolbar. */
  tone: string;
  /** The post's text area, so emoji go where its cursor is. */
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  /** Replaces the post text; the editor keeps the previous text for Undo. */
  onChange: (next: string) => void;
  /** True while another change to the text is on its way (a rewrite). */
  disabled?: boolean;
}

/**
 * The editor's Suggestions panel: ideas that rewrite the post, other openers, calls to action, hashtags and emoji.
 * Nothing is fetched until asked for, since each run is an AI call.
 */
export default function SuggestionsPanel({ pieceId, platform, body, tone, textareaRef, onChange, disabled = false }: Props) {
  const suggest = useSuggestPiece();
  const [result, setResult] = useState<{ suggestions: Suggestions; body: string; tone: string } | null>(null);
  const [openIdea, setOpenIdea] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const ids = useId();
  const info = platformInfo(platform);
  const empty = !body.trim();

  const run = () => {
    setNote("");
    suggest.mutate(
      { id: pieceId, tone, body },
      {
        onSuccess: (suggestions, sent) => {
          setResult({ suggestions, body: sent.body, tone });
          setOpenIdea(null);
        },
      },
    );
  };

  const apply = (next: string, message: string) => {
    if (next !== body) onChange(next);
    setNote(`${message} Undo is above the post text.`);
  };

  const insertEmoji = (emoji: string) => {
    const area = textareaRef.current;
    const position = area ? Math.min(area.selectionEnd, body.length) : body.length;
    const change = insertAt(body, emoji, position);
    apply(change.text, `${emoji} inserted.`);
    // Leave the cursor after the emoji, so the next one follows it. Focus stays on this panel.
    requestAnimationFrame(() => textareaRef.current?.setSelectionRange(change.caret, change.caret));
  };

  const suggestions = result?.suggestions;
  const stale = result !== null && result.body !== body;

  return (
    <section
      aria-labelledby={`${ids}-title`}
      aria-busy={suggest.isPending || undefined}
      className="rounded-xl border border-border bg-white p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={`${ids}-title`} className="text-sm font-semibold text-balance text-foreground">
          Suggestions
        </h3>
        {result && !suggest.isPending && (
          <button
            type="button"
            onClick={run}
            disabled={empty}
            className={buttonStyles({ variant: "ghost", size: "sm", className: "-my-1 -mr-2 h-9" })}
          >
            <RotateCw aria-hidden="true" className="size-4" />
            Refresh
          </button>
        )}
      </div>

      {!result && !suggest.isPending && (
        <>
          <p className="mt-1.5 text-sm text-pretty text-muted-foreground">
            Ideas to improve this post, with other openers, calls to action, hashtags and emoji from the recording. They
            follow the tone in the toolbar: {tone}.
          </p>
          <button
            type="button"
            onClick={run}
            disabled={empty}
            aria-describedby={empty ? `${ids}-empty` : undefined}
            className={buttonStyles({ variant: "secondary", className: "mt-4 w-full" })}
          >
            Get suggestions
          </button>
          {empty && (
            <p id={`${ids}-empty`} className="mt-2 text-sm text-muted-foreground">
              Add some text to the post first.
            </p>
          )}
        </>
      )}

      {suggest.isError && (
        <p role="alert" className="mt-3 text-sm text-pretty text-red-600">
          {suggest.error.message}
        </p>
      )}

      {suggest.isPending && (
        <div className="mt-3 space-y-4">
          <p role="status" className="text-sm text-muted-foreground">
            Getting suggestions…
          </p>
          <SuggestionsSkeleton />
        </div>
      )}

      {result && suggestions && !suggest.isPending && (
        <div className="mt-1 space-y-4">
          <p className="text-xs text-muted-foreground">Tone: {result.tone}</p>
          <p role="status" className={cn("text-sm text-pretty text-foreground", !note && "sr-only")}>
            {note}
          </p>

          {suggestions.ideas.length > 0 && (
            <Group title="Ideas">
              {stale && (
                <p className="mb-2.5 text-xs text-pretty text-amber-700">
                  Written before your latest changes, so applying one replaces them. Refresh for ideas that fit the
                  current text.
                </p>
              )}
              <ul className="space-y-3">
                {suggestions.ideas.map((idea, index) => {
                  const labelId = `${ids}-idea-${index}`;
                  const textId = `${ids}-idea-${index}-text`;
                  const open = openIdea === index;
                  const over = info.limit !== undefined && idea.body.length > info.limit;
                  return (
                    <li key={index} className="rounded-lg border border-border p-3">
                      <p id={labelId} className="text-sm font-medium text-pretty text-foreground">
                        {idea.label}
                      </p>
                      {idea.why && <p className="mt-0.5 text-sm text-pretty text-muted-foreground">{idea.why}</p>}
                      {over && (
                        <p className="mt-1 text-xs font-medium text-red-600 tabular-nums">
                          {idea.body.length.toLocaleString()} characters, over {info.label}'s limit
                        </p>
                      )}
                      <p
                        id={textId}
                        hidden={!open}
                        className="mt-2 max-h-60 overflow-y-auto rounded-md bg-background p-2.5 text-sm leading-relaxed whitespace-pre-wrap text-gray-700"
                      >
                        {idea.body}
                      </p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => apply(idea.body, `Applied “${idea.label}”.`)}
                          disabled={disabled}
                          aria-describedby={labelId}
                          className={itemButton}
                        >
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpenIdea(open ? null : index)}
                          aria-expanded={open}
                          aria-controls={textId}
                          className={buttonStyles({ variant: "ghost", size: "sm", className: "h-9" })}
                        >
                          {open ? "Hide text" : "Show text"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Group>
          )}

          {suggestions.openers.length > 0 && (
            <Group title="Openers" hint="Use one in place of the opening line.">
              <ul className="divide-y divide-border">
                {suggestions.openers.map((opener, index) => (
                  <li key={index} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                    <p id={`${ids}-opener-${index}`} className="min-w-0 flex-1 pt-1.5 text-sm text-pretty text-gray-700">
                      {opener}
                    </p>
                    <button
                      type="button"
                      onClick={() => apply(replaceOpener(body, opener), "Opening line replaced.")}
                      disabled={disabled}
                      aria-describedby={`${ids}-opener-${index}`}
                      className={itemButton}
                    >
                      Use
                    </button>
                  </li>
                ))}
              </ul>
            </Group>
          )}

          {suggestions.ctas.length > 0 && (
            <Group title="Calls to action" hint="Added as the closing line, before any hashtags.">
              <ul className="divide-y divide-border">
                {suggestions.ctas.map((cta, index) => (
                  <li key={index} className="flex items-start gap-3 py-2 first:pt-0 last:pb-0">
                    <p id={`${ids}-cta-${index}`} className="min-w-0 flex-1 pt-1.5 text-sm text-pretty text-gray-700">
                      {cta}
                    </p>
                    <button
                      type="button"
                      onClick={() => apply(addClosingLine(body, cta), "Call to action added.")}
                      disabled={disabled}
                      aria-describedby={`${ids}-cta-${index}`}
                      className={itemButton}
                    >
                      Add
                    </button>
                  </li>
                ))}
              </ul>
            </Group>
          )}

          <Group
            title="Hashtags"
            hint={
              suggestions.hashtags.length > 0
                ? "Selected tags are in the post. Select one to add it at the end, or again to remove it."
                : undefined
            }
          >
            {suggestions.hashtags.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {suggestions.hashtags.map((tag) => {
                  const on = hasHashtag(body, tag);
                  return (
                    <li key={tag}>
                      <button
                        type="button"
                        aria-pressed={on}
                        disabled={disabled}
                        onClick={() =>
                          apply(on ? removeHashtag(body, tag) : addHashtag(body, tag), on ? `#${tag} removed.` : `#${tag} added.`)
                        }
                        className={cn(
                          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50",
                          on
                            ? "border-primary bg-primary/10 text-primary hover:bg-primary/15"
                            : "border-border bg-white text-foreground hover:bg-secondary",
                        )}
                      >
                        {on && <Check aria-hidden="true" className="size-3.5" />}#{tag}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-pretty text-muted-foreground">No hashtags suggested for {info.label}.</p>
            )}
          </Group>

          <Group
            title="Emoji"
            hint={suggestions.emoji.length > 0 ? "Inserted where the cursor is in the post text, or at the end." : undefined}
          >
            {suggestions.emoji.length > 0 ? (
              <ul className="divide-y divide-border">
                {suggestions.emoji.map((item, index) => (
                  <li key={item.emoji} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <p id={`${ids}-emoji-${index}`} className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="w-7 shrink-0 text-center text-xl leading-none">{item.emoji}</span>
                      <span className="min-w-0 text-sm text-pretty text-muted-foreground">{item.where}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => insertEmoji(item.emoji)}
                      disabled={disabled}
                      aria-describedby={`${ids}-emoji-${index}`}
                      className={itemButton}
                    >
                      Insert
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-pretty text-muted-foreground">No emoji suggested for this post.</p>
            )}
          </Group>
        </div>
      )}
    </section>
  );
}
