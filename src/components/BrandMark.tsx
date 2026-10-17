import { cn } from "../lib/cn";

/** The Mindra mark: a sound wave on the brand colour. Decorative; the wordmark next to it carries the name. */
export default function BrandMark({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("grid size-8 shrink-0 place-items-center rounded-lg bg-primary", className)}>
      <svg viewBox="0 0 18 18" fill="white" className="size-[55%]">
        <rect x="1" y="6" width="2.6" height="6" rx="1.3" />
        <rect x="5.4" y="2" width="2.6" height="14" rx="1.3" />
        <rect x="9.8" y="4.5" width="2.6" height="9" rx="1.3" />
        <rect x="14.2" y="7" width="2.6" height="4" rx="1.3" />
      </svg>
    </span>
  );
}
