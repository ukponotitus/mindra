import { cn } from "../lib/cn";

const MARK = `${import.meta.env.BASE_URL}brand/mindra-mark.png`;

/** The Mindra mark, cut from the logo (`public/brand/`). Decorative; the wordmark next to it carries the name. */
export default function BrandMark({ className }: { className?: string }) {
  return <img src={MARK} alt="" aria-hidden="true" draggable={false} className={cn("size-8 shrink-0 object-contain", className)} />;
}
