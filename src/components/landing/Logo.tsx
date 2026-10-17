import { Link } from "react-router";
import { cn } from "../../lib/cn";
import BrandMark from "../BrandMark";

/** Mindra mark and wordmark, linking home. */
export default function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Mindra home">
      <BrandMark className="size-9 rounded-xl" />
      <span className={cn("text-lg font-semibold", onDark ? "text-white" : "text-foreground")}>Mindra</span>
    </Link>
  );
}
