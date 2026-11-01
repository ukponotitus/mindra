import { Link } from "react-router";
import type { CalendarItem } from "../../lib/calendars";
import PlatformBadge from "../content/PlatformBadge";

/** An approved content calendar item with no post yet, in the Planner: dashed, so it reads as planned, not written. It
 * opens its calendar. */
export default function PlannedItem({ item, layout }: { item: CalendarItem; layout: "month" | "week" | "agenda" }) {
  const time = new Date(item.scheduled_for).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <Link
      to={`/content-calendar/${item.calendar}`}
      title={`Planned: ${item.topic} (${item.calendar_name})`}
      className="flex min-w-0 items-center gap-1.5 rounded-md border border-dashed border-primary/40 px-1.5 py-1 text-xs text-foreground transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
    >
      <PlatformBadge platform={item.platform} withLabel={false} />
      <span className="min-w-0 flex-1 truncate">
        {layout !== "month" && <span className="text-muted-foreground tabular-nums">{time} · </span>}
        {item.topic}
      </span>
      <span className="sr-only">, planned in {item.calendar_name}, no post yet</span>
    </Link>
  );
}
