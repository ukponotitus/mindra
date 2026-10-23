import { useId, useState, type DragEvent, type FormEvent } from "react";
import { ChevronRight, ClipboardList, FileSpreadsheet, FileText, ImageIcon, LoaderCircle, Upload } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router";
import EmptyState from "../components/EmptyState";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { formatDayShort, parseDayKey, timeZoneName } from "../lib/calendar";
import { cn } from "../lib/cn";
import { formatDate, formatExtensions, formatFileSize } from "../lib/format";
import { photoAccept, photoRules, preparePhoto } from "../lib/photos";
import {
  nextMonday,
  PLAN_MAX_MB,
  PLAN_SHEET_TYPES,
  PLAN_TEXT_MAX,
  PLAN_TEXT_TYPES,
  planBusy,
  planFileKind,
  PLANS_PAGE_SIZE,
  useCreatePlan,
  usePlans,
  type PlanFileKind,
} from "../lib/plans";
import { useUploadOptions } from "../lib/projects";
import type { ContentPlan } from "../lib/types";

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 aria-invalid:border-red-400";

const EXAMPLE = `Monday 9am, Instagram and LinkedIn: a quote from this week's episode
Wednesday 6pm, WhatsApp: reminder about Thursday's live session, 7pm on Zoom
Friday, TikTok: a clip from the episode
Saturday, Instagram: the event flyer`;

type Mode = "paste" | "file";

const FILE_ICONS: Record<PlanFileKind, typeof FileText> = { text: FileText, sheet: FileSpreadsheet, picture: ImageIcon };

/** Paste a plan or choose a file of it; Mindra reads it into posts, and the plan's page opens. */
function NewPlan() {
  const options = useUploadOptions().data;
  const pictureTypes = photoRules(options).types;
  const navigate = useNavigate();
  const create = useCreatePlan();
  const ids = useId();
  const [mode, setMode] = useState<Mode>("paste");
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<PlanFileKind | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [problem, setProblem] = useState("");
  const [dragging, setDragging] = useState(false);
  const [name, setName] = useState("");
  const [startsOn, setStartsOn] = useState(() => nextMonday());
  const busy = create.isPending || preparing;
  const readable = [...PLAN_TEXT_TYPES, ...PLAN_SHEET_TYPES, ...pictureTypes];

  const choose = async (candidate: File | undefined) => {
    if (!candidate || busy) return;
    create.reset();
    const candidateKind = planFileKind(candidate.name, pictureTypes);
    if (!candidateKind) {
      setProblem(`Mindra can't read this type of file. Use ${formatExtensions(readable)}.`);
      return;
    }
    let chosen = candidate;
    if (candidateKind === "picture") {
      // Smaller on the device first, so a phone photo sends quickly and fits the limit.
      setPreparing(true);
      try {
        chosen = (await preparePhoto(candidate)).file;
      } finally {
        setPreparing(false);
      }
    }
    if (chosen.size > PLAN_MAX_MB * 1024 * 1024) {
      setProblem(`This file is ${formatFileSize(chosen.size)}. Plans can be up to ${PLAN_MAX_MB} MB.`);
      return;
    }
    setProblem("");
    setFile(chosen);
    setKind(candidateKind);
  };

  const removeFile = () => {
    setFile(null);
    setKind(null);
    setNote("");
    create.reset();
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void choose(event.dataTransfer.files[0]);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (mode === "paste" && !text.trim()) {
      setProblem("Paste your plan first.");
      return;
    }
    if (mode === "file" && !file) {
      setProblem("Choose the file of your plan.");
      return;
    }
    setProblem("");
    create.mutate(
      mode === "paste"
        ? { text, name, startsOn }
        : { file, text: kind === "picture" ? note : undefined, name, startsOn },
      { onSuccess: (plan) => navigate(`/plans/${plan.id}`) },
    );
  };

  const fieldErrors = create.error instanceof ApiError ? create.error.fieldErrors : {};
  const fieldError = (field: string) => fieldErrors[field]?.[0] ?? "";
  const planError = problem || fieldError("text") || fieldError("file");
  const otherError =
    create.error && !planError && !fieldError("starts_on") && !fieldError("name")
      ? create.error instanceof ApiError
        ? create.error.message
        : "Mindra couldn't take the plan. Check your connection and try again."
      : "";
  const startDay = parseDayKey(startsOn);
  const FileIcon = kind ? FILE_ICONS[kind] : FileText;

  return (
    <form onSubmit={submit} noValidate aria-busy={busy} className="min-w-0 space-y-5 rounded-xl border border-border bg-white p-5">
      <fieldset>
        <legend className="text-sm font-medium text-foreground">Your plan</legend>
        <div role="group" className="mt-2 inline-flex rounded-lg bg-secondary p-1">
          {(
            [
              ["paste", "Paste it"],
              ["file", "Choose a file"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              disabled={busy}
              onClick={() => {
                setMode(id);
                setProblem("");
                create.reset();
              }}
              className={cn(
                "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60",
                mode === id ? "bg-white text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "paste" ? (
          <div className="mt-3">
            <label htmlFor={`${ids}-text`} className="sr-only">
              Your plan
            </label>
            <textarea
              id={`${ids}-text`}
              value={text}
              rows={8}
              maxLength={PLAN_TEXT_MAX}
              disabled={busy}
              placeholder={EXAMPLE}
              aria-invalid={planError ? true : undefined}
              aria-describedby={`${ids}-text-hint`}
              onChange={(event) => {
                setText(event.target.value);
                if (problem) setProblem("");
              }}
              className={cn(inputClass, "resize-y leading-relaxed")}
            />
            <p id={`${ids}-text-hint`} className="mt-1.5 text-xs text-pretty text-muted-foreground">
              Write it any way you like, or paste it from a spreadsheet or a message: each post&apos;s day, time,
              platform and what it&apos;s about.
            </p>
          </div>
        ) : file ? (
          <div className="mt-3 space-y-3">
            <div className="flex items-center gap-4 rounded-lg border border-border p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
                <FileIcon aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatFileSize(file.size)}</p>
              </div>
              {!busy && (
                <button type="button" onClick={removeFile} className={buttonStyles({ variant: "ghost", size: "sm" })}>
                  Remove
                </button>
              )}
            </div>
            {kind === "picture" && (
              <div>
                <label htmlFor={`${ids}-note`} className="mb-2 block text-sm font-medium text-foreground">
                  Anything to add <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id={`${ids}-note`}
                  value={note}
                  rows={3}
                  maxLength={2000}
                  disabled={busy}
                  placeholder="e.g. All posts go on Instagram unless it says otherwise."
                  onChange={(event) => setNote(event.target.value)}
                  className={cn(inputClass, "resize-y")}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <input
              id={`${ids}-file`}
              type="file"
              accept={[...PLAN_TEXT_TYPES, ...PLAN_SHEET_TYPES, photoAccept(photoRules(options))].join(",")}
              aria-describedby={`${ids}-file-hint`}
              aria-invalid={planError ? true : undefined}
              disabled={busy}
              className="peer sr-only"
              onChange={(event) => {
                void choose(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <label
              htmlFor={`${ids}-file`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors",
                "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-primary",
                dragging ? "border-primary bg-primary/5" : planError ? "border-red-300" : "border-border hover:bg-background",
              )}
            >
              <span className="mb-4 grid size-12 place-items-center rounded-lg bg-secondary text-muted-foreground">
                {preparing ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <Upload aria-hidden="true" className="size-5" />}
              </span>
              <span className="mb-1 block font-medium text-balance text-foreground">Drop your plan here</span>
              <span className="mb-4 block text-sm text-pretty text-muted-foreground">
                A spreadsheet, a CSV or text file, or a photo or screenshot of it
              </span>
              <span className={buttonStyles({ variant: "secondary" })}>Choose File</span>
              <span id={`${ids}-file-hint`} className="mt-3 block text-xs text-pretty text-muted-foreground tabular-nums">
                {formatExtensions([...PLAN_TEXT_TYPES, ...PLAN_SHEET_TYPES])} or a picture, up to {PLAN_MAX_MB} MB.
              </span>
            </label>
          </div>
        )}
        {planError && (
          <p role="alert" className="mt-2 text-xs text-pretty text-red-600">
            {planError}
          </p>
        )}
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${ids}-starts`} className="mb-2 block text-sm font-medium text-foreground">
            The plan starts on
          </label>
          <input
            id={`${ids}-starts`}
            type="date"
            value={startsOn}
            disabled={busy}
            aria-invalid={fieldError("starts_on") ? true : undefined}
            aria-describedby={`${ids}-starts-hint`}
            onChange={(event) => setStartsOn(event.target.value)}
            className={cn(inputClass, "tabular-nums")}
          />
          <p id={`${ids}-starts-hint`} className={cn("mt-1.5 text-xs text-pretty", fieldError("starts_on") ? "text-red-600" : "text-muted-foreground")}>
            {fieldError("starts_on") ||
              `Days in the plan such as "Sunday" are counted from ${startDay ? formatDayShort(startDay) : "this day"}. Times are in ${timeZoneName()}.`}
          </p>
        </div>
        <div>
          <label htmlFor={`${ids}-name`} className="mb-2 block text-sm font-medium text-foreground">
            Name <span className="font-normal text-muted-foreground">(optional)</span>
          </label>
          <input
            id={`${ids}-name`}
            type="text"
            value={name}
            maxLength={120}
            disabled={busy}
            placeholder="e.g. Last week of October"
            aria-invalid={fieldError("name") ? true : undefined}
            onChange={(event) => setName(event.target.value)}
            className={inputClass}
          />
          {fieldError("name") && (
            <p role="alert" className="mt-1.5 text-xs text-pretty text-red-600">
              {fieldError("name")}
            </p>
          )}
        </div>
      </div>

      {otherError && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-pretty text-red-700">
          {otherError}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button type="submit" disabled={busy} className={buttonStyles({ size: "lg", className: "sm:w-auto" })}>
          {create.isPending ? (
            <>
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Sending…
            </>
          ) : (
            "Read the plan"
          )}
        </button>
        <p className="text-xs text-pretty text-muted-foreground">
          Nothing is written or posted yet: you check the posts Mindra finds first.
        </p>
      </div>
    </form>
  );
}

/** "Mon 27 Oct – Sun 2 Nov", or one day, or "" with no times yet. */
function planDays(plan: ContentPlan) {
  if (!plan.first_at || !plan.last_at) return "";
  const first = new Date(plan.first_at);
  const last = new Date(plan.last_at);
  const start = formatDayShort(first);
  const end = formatDayShort(last);
  return start === end ? start : `${start} – ${end}`;
}

function PlanStatus({ plan }: { plan: ContentPlan }) {
  if (plan.status === "reading") {
    return (
      <span className="inline-flex items-center gap-1.5 text-primary">
        <LoaderCircle aria-hidden="true" className="size-3.5 animate-spin" />
        Reading the plan…
      </span>
    );
  }
  if (plan.status === "failed") return <span className="text-red-600">Couldn&apos;t be read</span>;
  const { total, written, approved, needs, writing } = plan.counts;
  if (total === 0) return <span>No posts found</span>;
  const parts = [`${total} ${total === 1 ? "post" : "posts"}`];
  if (writing > 0) parts.push(`${writing} being written`);
  if (written > 0) parts.push(`${written} written`);
  if (approved > 0) parts.push(`${approved} approved`);
  return (
    <span>
      {parts.join(" · ")}
      {needs > 0 && <span className="text-amber-700"> · {needs} need you</span>}
    </span>
  );
}

function PlanRow({ plan }: { plan: ContentPlan }) {
  const days = planDays(plan);
  return (
    <li>
      <Link
        to={`/plans/${plan.id}`}
        className="flex min-w-0 items-center gap-4 rounded-xl border border-border bg-white p-4 transition-colors hover:border-muted-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          {planBusy(plan) ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" /> : <ClipboardList aria-hidden="true" className="size-5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{plan.name}</span>
          <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
            <PlanStatus plan={plan} />
          </span>
        </span>
        <span className="hidden shrink-0 text-right text-xs text-muted-foreground tabular-nums sm:block">
          {days && <span className="block font-medium text-foreground">{days}</span>}
          <span className="block">Added {formatDate(plan.created_at)}</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </Link>
    </li>
  );
}

/** Give Mindra a content plan; it reads, writes and (once approved) schedules every post in it. */
export default function Plans() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const plans = usePlans(page);
  const list = plans.data?.results ?? [];
  const pages = Math.max(1, Math.ceil((plans.data?.count ?? 0) / PLANS_PAGE_SIZE));
  const goToPage = (next: number) => setSearchParams(next === 1 ? {} : { page: String(next) });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Content Plans</h2>
        <p className="mt-1 max-w-3xl text-sm text-pretty text-muted-foreground">
          Give Mindra your content plan. It finds every post in it and writes each one from your recordings, clips,
          flyers or the plan&apos;s own words. You check them, and the ones you approve go on your calendar to go out at their
          time.
        </p>
      </div>

      <div className="max-w-3xl">
        <NewPlan />
      </div>

      <section aria-labelledby="plan-list" className="max-w-3xl space-y-4">
        <h3 id="plan-list" className="text-lg font-semibold text-foreground">
          Your plans
        </h3>
        {plans.isPending ? (
          <div aria-busy="true" className="space-y-3">
            <p role="status" className="sr-only">
              Loading plans
            </p>
            {[0, 1, 2].map((item) => (
              <div key={item} className="flex items-center gap-4 rounded-xl border border-border bg-white p-4">
                <div className="size-10 shrink-0 animate-pulse rounded-lg bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 animate-pulse rounded bg-secondary" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : plans.isError ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-pretty text-red-800">
            {plans.error.message}
          </p>
        ) : list.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No plans yet"
            description="Paste your plan above or choose a file of it. The posts Mindra finds appear on the plan's page for you to check."
          />
        ) : (
          <>
            <ul className="space-y-3">
              {list.map((plan) => (
                <PlanRow key={plan.id} plan={plan} />
              ))}
            </ul>
            {pages > 1 && (
              <nav aria-label="Plan pages" className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1}
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground tabular-nums">
                  Page {page} of {pages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= pages}
                  className={buttonStyles({ variant: "secondary", size: "sm" })}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </section>
    </div>
  );
}
