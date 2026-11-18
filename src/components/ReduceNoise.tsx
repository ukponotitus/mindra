import { useId } from "react";
import { cn } from "../lib/cn";

/** What "Reduce background noise" does, measured on speech (the backend's clips/render.py, noise_filters). */
export const REDUCE_NOISE_HINT =
  "Turns down hum, hiss, fans and generators, and lowers crowd chatter. Music behind the voice is turned down too.";

/** "Reduce background noise", for a clip, a vertical video or a Motion Studio clip: cleaned when the video is made. */
export default function ReduceNoise({
  checked,
  onChange,
  disabled,
  note,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  /** A line after the hint, such as that the preview plays the sound as recorded. */
  note?: string;
  className?: string;
}) {
  const hint = useId();
  return (
    <label className={cn("flex items-start gap-2.5 rounded-lg border border-border px-3 py-2.5", disabled && "opacity-60", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-describedby={hint}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">Reduce background noise</span>
        <span id={hint} className="block text-xs text-pretty text-muted-foreground">
          {REDUCE_NOISE_HINT}
          {note ? ` ${note}` : ""}
        </span>
      </span>
    </label>
  );
}
