import { Link } from "react-router";
import { loadPixel, metaAdsAvailable } from "../lib/metaPixel";

/** The sign-up forms' optional, unticked choice to let Meta know someone signed up, for measuring Mindra's own ads
 * (src/lib/metaPixel.ts, the Privacy Policy's "Measuring Mindra's ads"). Ticking it loads Meta's pixel. Nothing shows
 * when the build has no pixel. */
export default function MetaAdsChoice({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  if (!metaAdsAvailable) return null;
  return (
    <label className="mb-5 flex items-start gap-2.5 text-sm text-pretty text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => {
          onChange(event.target.checked);
          if (event.target.checked) loadPixel();
        }}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span>
        Optional: let Meta know I signed up, so Mindra can see which of its Facebook and Instagram ads work.{" "}
        <Link
          to="/privacy#ads"
          target="_blank"
          className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          What's shared<span className="sr-only"> (opens in a new tab)</span>
        </Link>
      </span>
    </label>
  );
}
