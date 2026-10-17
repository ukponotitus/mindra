import type { ComponentType, ReactNode } from "react";
import { cn } from "../../lib/cn";

interface Props {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>;
  children: ReactNode;
  dark?: boolean;
}

/** The small chip above each section's headline: an icon in a tile and a short label. */
export default function SectionLabel({ icon: Icon, children, dark = false }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-lg py-1 pr-2.5 pl-1 text-[13px] font-medium",
        dark ? "bg-white/[0.06] text-white/70 ring-1 ring-white/10" : "bg-white text-[#52525B] shadow-sm ring-1 ring-black/[0.06]",
      )}
    >
      <span className={cn("grid size-5 place-items-center rounded-md", dark ? "bg-white/10 text-white" : "bg-[#0B0B0F] text-white")}>
        <Icon aria-hidden="true" className="size-3" />
      </span>
      {children}
    </span>
  );
}
