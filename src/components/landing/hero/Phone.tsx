import type { ReactNode } from "react";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { cn } from "../../../lib/cn";

/** An iPhone-style device: titanium frame, Dynamic Island, status bar and home indicator. */
export default function Phone({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative rounded-[3.1rem] bg-[linear-gradient(145deg,#55555b,#1c1c1f_38%,#121214_62%,#3a3a3f)] p-[9px] shadow-2xl ring-1 ring-white/10",
        className,
      )}
    >
      {/* Side buttons */}
      <span className="absolute top-[18%] -left-[3px] h-8 w-[3px] rounded-l bg-[#3a3a3f]" />
      <span className="absolute top-[27%] -left-[3px] h-14 w-[3px] rounded-l bg-[#3a3a3f]" />
      <span className="absolute top-[37%] -left-[3px] h-14 w-[3px] rounded-l bg-[#3a3a3f]" />
      <span className="absolute top-[30%] -right-[3px] h-20 w-[3px] rounded-r bg-[#3a3a3f]" />

      <div className="relative h-full overflow-hidden rounded-[2.55rem] bg-black">
        <div className="absolute top-2.5 left-1/2 z-30 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/[0.06]" />
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-7 pt-[14px] text-[11px] font-semibold text-white">
          <span className="tabular-nums">9:41</span>
          <span className="flex items-center gap-1">
            <Signal aria-hidden="true" className="size-3" strokeWidth={3} />
            <Wifi aria-hidden="true" className="size-3" strokeWidth={3} />
            <BatteryFull aria-hidden="true" className="size-3.5" />
          </span>
        </div>
        {children}
        <div className="absolute bottom-2 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-white/60" />
      </div>
    </div>
  );
}
