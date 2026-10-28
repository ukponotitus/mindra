import { Link } from "react-router";
import { isPlanLimit } from "../lib/api";
import { cn } from "../lib/cn";

/** The words every plan-limit message ends with (billing/limits.py in the backend). */
const PLANS_HINT = "See the plans in Billing";

/** "See plans", next to a message about a limit of the workspace's plan: an API error with the "plan_limit" code,
 * or a saved message (a project's or clip's error) that points to Billing. Nothing for any other error. */
export default function SeePlans({ error, text, className }: { error?: unknown; text?: string | null; className?: string }) {
  if (!isPlanLimit(error) && !(text ?? "").includes(PLANS_HINT)) return null;
  return (
    <Link
      to="/billing"
      className={cn(
        "inline-flex rounded font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      See plans
    </Link>
  );
}
