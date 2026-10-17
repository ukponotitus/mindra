import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-white text-foreground hover:bg-secondary",
  ghost: "text-muted-foreground hover:bg-secondary hover:text-foreground",
  danger: "bg-red-600 text-white hover:bg-red-700",
  "danger-outline": "border border-red-200 bg-white text-red-600 hover:bg-red-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-11 px-5 text-[15px]",
  icon: "size-9",
};

/** Class names for every button and button-styled link in the app, so they all look and behave alike. */
export function buttonStyles({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    // Colours transition, but not the outline, so focus rings appear at once.
    "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium whitespace-nowrap transition-[color,background-color,border-color]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
    "disabled:pointer-events-none disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
}
