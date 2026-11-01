import { useEffect, useMemo, useRef, useState } from "react";
import { Check, LoaderCircle, Pause, Play, Search } from "lucide-react";
import { cn } from "../../lib/cn";
import { useVoices, type Voice } from "../../lib/automations";

function describe(voice: Voice) {
  const { accent, gender, age, descriptive, use_case: useCase } = voice.labels;
  return [gender, age, accent, descriptive, useCase?.replace(/_/g, " ")].filter(Boolean).join(" · ");
}

/** The ElevenLabs voices to read the narration in: hear each one, then choose it. */
export default function VoicePicker({ value, onChange }: { value: string; onChange: (voice: Voice) => void }) {
  const voices = useVoices();
  const [query, setQuery] = useState("");
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => audio.current?.pause(), []);

  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    const all = voices.data ?? [];
    if (!words) return all;
    return all.filter((voice) => `${voice.name} ${describe(voice)} ${voice.description}`.toLowerCase().includes(words));
  }, [voices.data, query]);

  const listen = (voice: Voice) => {
    if (playing === voice.id) {
      audio.current?.pause();
      setPlaying(null);
      return;
    }
    audio.current?.pause();
    const player = new Audio(voice.preview_url);
    player.onended = () => setPlaying(null);
    player.onerror = () => setPlaying(null);
    audio.current = player;
    setPlaying(voice.id);
    player.play().catch(() => setPlaying(null));
  };

  if (voices.isPending) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Loading the voices…
      </p>
    );
  }
  if (voices.isError) {
    return (
      <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-pretty text-amber-900">
        {voices.error.message}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, accent or style"
          aria-label="Search the voices"
          className="w-full rounded-lg border border-border bg-white py-2 pr-3 pl-9 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      {shown.length === 0 ? (
        <p className="text-sm text-muted-foreground">No voices match.</p>
      ) : (
        <ul className="grid max-h-96 gap-2 overflow-y-auto pr-1 sm:grid-cols-2" aria-label="Voices">
          {shown.map((voice) => {
            const chosen = voice.id === value;
            return (
              <li key={voice.id} className={cn("flex items-center gap-2 rounded-lg border p-2", chosen ? "border-primary bg-primary/5" : "border-border bg-white")}>
                <button
                  type="button"
                  onClick={() => listen(voice)}
                  disabled={!voice.preview_url}
                  aria-label={playing === voice.id ? `Stop ${voice.name}` : `Hear ${voice.name}`}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground hover:bg-border focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-40"
                >
                  {playing === voice.id ? <Pause aria-hidden="true" className="size-4" /> : <Play aria-hidden="true" className="size-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onChange(voice)}
                  aria-pressed={chosen}
                  className="min-w-0 flex-1 rounded-md px-1 py-0.5 text-left focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <span className="truncate">{voice.name}</span>
                    {chosen && <Check aria-hidden="true" className="size-4 shrink-0 text-primary" />}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{describe(voice) || voice.category}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
