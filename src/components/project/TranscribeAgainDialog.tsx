import { useRef, useState, type FormEvent } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { LoaderCircle, X } from "lucide-react";
import { useNavigate } from "react-router";
import { buttonStyles } from "../ui/button";
import { useTranscribeAgain, useUploadOptions } from "../../lib/projects";
import type { Project } from "../../lib/types";

/** "Wrong language?": transcribe a finished or failed recording again in the language chosen. */
export default function TranscribeAgainDialog({ project }: { project: Project }) {
  const navigate = useNavigate();
  const options = useUploadOptions().data;
  const transcribeAgain = useTranscribeAgain();
  const select = useRef<HTMLSelectElement>(null);
  const [open, setOpen] = useState(false);
  // null until someone picks one: the server's default (English).
  const [language, setLanguage] = useState<string | null>(null);
  const chosen = language ?? options?.default_language ?? "en";

  const submit = (event: FormEvent) => {
    event.preventDefault();
    transcribeAgain.mutate(
      { id: project.id, language: chosen },
      { onSuccess: () => navigate(`/projects/${project.id}/processing`) },
    );
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) transcribeAgain.reset();
      }}
    >
      <Dialog.Trigger className="-mx-1 inline-flex min-h-8 items-center rounded px-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        Wrong language?
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Popup
          initialFocus={select}
          className="fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl bg-white p-6 shadow-xl transition-[opacity,scale] duration-150 ease-out data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
        >
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-semibold text-balance text-foreground">
              Transcribe in another language
            </Dialog.Title>
            <Dialog.Close aria-label="Close" className={buttonStyles({ variant: "ghost", size: "icon", className: "-mt-1 -mr-2" })}>
              <X aria-hidden="true" className="size-4" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="mt-1 text-sm text-pretty text-muted-foreground">
            {project.source_type === "video"
              ? "The transcript and summary are made again. Your posts and clips stay."
              : "The transcript and summary are made again. Your posts stay."}
          </Dialog.Description>

          <form onSubmit={submit} className="mt-5">
            <label htmlFor="transcribe-again-language" className="mb-2 block text-sm font-medium text-foreground">
              Spoken language
            </label>
            <select
              ref={select}
              id="transcribe-again-language"
              value={chosen}
              disabled={transcribeAgain.isPending}
              onChange={(event) => setLanguage(event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-white px-3.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
            >
              {(options?.languages ?? []).map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>

            {transcribeAgain.isError && (
              <p role="alert" className="mt-3 text-sm text-pretty text-red-600">
                {transcribeAgain.error.message}
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <Dialog.Close className={buttonStyles({ variant: "secondary" })}>Cancel</Dialog.Close>
              <button type="submit" disabled={transcribeAgain.isPending} className={buttonStyles()}>
                {transcribeAgain.isPending && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
                {transcribeAgain.isPending ? "Starting…" : "Transcribe again"}
              </button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
