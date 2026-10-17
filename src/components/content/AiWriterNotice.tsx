import { Info } from "lucide-react";
import { useAiStatus } from "../../lib/content";

/** Says plainly when drafts come from the stand-in writer rather than an AI model. */
export default function AiWriterNotice() {
  const { data } = useAiStatus();
  if (data?.provider !== "fake") return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p className="text-pretty">
        These are <strong className="font-semibold">sample drafts</strong> from Mindra's stand-in writer, built from your
        transcript's own sentences. Add a Gemini API key to the backend (
        <code className="font-mono text-xs">GEMINI_API_KEY</code> in <code className="font-mono text-xs">.env</code>) and
        Gemini will write them.
      </p>
    </div>
  );
}
