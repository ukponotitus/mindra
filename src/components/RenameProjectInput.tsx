import { useId, useRef, useState, type FormEvent } from "react";
import { cn } from "../lib/cn";
import { useUpdateProject } from "../lib/projects";
import type { Project } from "../lib/types";

interface Props {
  project: Project;
  onDone: () => void;
  className?: string;
}

/** Inline project name editor: Enter or clicking away saves, Escape cancels. */
export default function RenameProjectInput({ project, onDone, className = "text-sm" }: Props) {
  const [name, setName] = useState(project.name);
  const update = useUpdateProject();
  const errorId = useId();
  // Enter submits and then the input loses focus; only the first of the two may save.
  const finished = useRef(false);

  const cancel = () => {
    finished.current = true;
    onDone();
  };

  const save = (event?: FormEvent) => {
    event?.preventDefault();
    if (finished.current) return;
    const trimmed = name.trim();
    if (!trimmed || trimmed === project.name) return cancel();
    finished.current = true;
    update.mutate(
      { id: project.id, name: trimmed },
      { onSuccess: onDone, onError: () => (finished.current = false) },
    );
  };

  return (
    <form onSubmit={save} className="min-w-0 flex-1">
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => save()}
        onKeyDown={(e) => e.key === "Escape" && cancel()}
        maxLength={200}
        aria-label="Project name"
        aria-invalid={update.isError || undefined}
        aria-describedby={update.isError ? errorId : undefined}
        className={cn(
          "w-full rounded-lg border border-primary bg-white px-3 py-1.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          update.isError && "border-red-600 focus-visible:ring-red-600/20",
          className,
        )}
      />
      {update.isError && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-600">
          {update.error.message}
        </p>
      )}
    </form>
  );
}
