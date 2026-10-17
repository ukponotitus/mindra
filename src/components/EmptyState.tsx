import { isValidElement, type ReactElement, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";

interface Props {
  /** A lucide-react icon (e.g. `icon={Search}`) or an element. Strings such as old emoji icons are not shown. */
  icon?: LucideIcon | ReactElement | string;
  title: string;
  description: string;
  /** The one thing to do next. */
  action?: ReactNode;
  /** Extra classes, e.g. `border-0` when the empty state already sits inside a card. */
  className?: string;
}

function renderIcon(icon: Props["icon"]) {
  if (!icon || typeof icon === "string") return null;
  if (isValidElement(icon)) return icon;
  const Icon = icon;
  return <Icon className="size-5" aria-hidden="true" />;
}

export default function EmptyState({ icon, title, description, action, className }: Props) {
  const iconNode = renderIcon(icon);
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white px-6 py-12 text-center",
        className,
      )}
    >
      {iconNode && (
        <div className="mb-4 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">{iconNode}</div>
      )}
      <h3 className="mb-1 font-semibold text-balance text-foreground">{title}</h3>
      <p className="max-w-sm text-sm text-pretty text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
