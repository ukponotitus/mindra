import { useId, useState } from "react";
import { Languages } from "lucide-react";
import { Link } from "react-router";
import SeePlans from "../SeePlans";
import { buttonStyles } from "../ui/button";
import { useTranslatePiece, useWritingLanguages, writingLanguageName } from "../../lib/content";
import type { ContentPiece } from "../../lib/types";

/** The post editor's Translate: a new draft of this post in another language, for the same platform, linked to it. */
export default function TranslatePost({ piece, text }: { piece: ContentPiece; text: string }) {
  const languages = useWritingLanguages().data;
  const translate = useTranslatePiece();
  const ids = useId();
  const choices = (languages?.choices ?? []).filter((choice) => choice.code !== piece.language);
  const [language, setLanguage] = useState("");
  const chosen = language || choices[0]?.code || "";
  const made = translate.data;
  const name = (code: string) => writingLanguageName(code, languages);
  const checkFirst = made && languages?.choices.find((choice) => choice.code === made.language)?.check_first;

  return (
    <section aria-labelledby={`${ids}-title`} className="rounded-xl border border-border bg-card p-5">
      <h3 id={`${ids}-title`} className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <Languages aria-hidden="true" className="size-4 text-muted-foreground" />
        Translate
      </h3>
      <p className="mt-1 text-sm text-pretty text-muted-foreground">
        A new draft in another language, for the same platform. This post stays as it is.
      </p>
      {piece.translated_from && (
        <p className="mt-3 text-sm text-foreground">
          Translated from{" "}
          <Link to={`/library/${piece.translated_from.id}`} className="font-medium text-primary hover:underline">
            the {name(piece.translated_from.language)} post
          </Link>
        </p>
      )}
      {piece.translations.length > 0 && (
        <p className="mt-3 text-sm text-foreground">
          Also in{" "}
          {piece.translations.map((other, index) => (
            <span key={other.id}>
              {index > 0 && ", "}
              <Link to={`/library/${other.id}`} className="font-medium text-primary hover:underline">
                {name(other.language)}
              </Link>
            </span>
          ))}
        </p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label htmlFor={`${ids}-language`} className="sr-only">
          Language
        </label>
        <select
          id={`${ids}-language`}
          value={chosen}
          onChange={(e) => setLanguage(e.target.value)}
          disabled={translate.isPending}
          className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-card px-2.5 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
        >
          {choices.map((choice) => (
            <option key={choice.code} value={choice.code}>
              {choice.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => translate.mutate({ id: piece.id, language: chosen, body: text })}
          disabled={!chosen || !text.trim() || translate.isPending}
          className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}
        >
          {translate.isPending ? "Translating…" : "Translate"}
        </button>
      </div>
      {made && !translate.isPending && (
        <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
          <p>
            Translated into {name(made.language)}.{" "}
            <Link to={`/library/${made.id}`} className="font-medium underline">
              Open the {name(made.language)} post
            </Link>
          </p>
          {checkFirst && <p className="mt-1 text-pretty">Ask someone who speaks {name(made.language)} to read it before you post it.</p>}
        </div>
      )}
      {translate.isError && (
        <p role="alert" className="mt-3 text-sm text-pretty text-red-600">
          {translate.error.message} <SeePlans error={translate.error} text={translate.error.message} />
        </p>
      )}
    </section>
  );
}
