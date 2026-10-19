import { dayKey, formatDayLong } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import type { ContentPiece } from "../../lib/types";
import CalendarPost from "./CalendarPost";
import type { DragAndDrop } from "./dragAndDrop";

interface Props {
  /** The days of the month being shown; only those with posts are listed. */
  days: Date[];
  posts: Map<string, ContentPiece[]>;
  today: string;
  dnd: DragAndDrop;
  postHref: (id: string) => string;
  /** "October 2026", for the empty message. */
  periodName: string;
}

/** The month as a list of the days that have posts. The default on phones. */
export default function AgendaView({ days, posts, today, dnd, postHref, periodName }: Props) {
  const listed = days.filter((day) => posts.has(dayKey(day)));

  if (listed.length === 0) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="font-semibold text-balance text-foreground">Nothing planned in {periodName}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-pretty text-muted-foreground">
          Pick a post from{" "}
          <a
            href="#ready-to-schedule"
            className="rounded font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Ready to schedule
          </a>{" "}
          and choose when it goes out.
        </p>
      </div>
    );
  }

  return (
    <ol className="divide-y divide-border">
      {listed.map((day) => {
        const key = dayKey(day);
        const list = posts.get(key) ?? [];
        const isToday = key === today;
        return (
          <li
            key={key}
            data-day={key}
            {...dnd.dayTarget(key)}
            className={cn("p-3 transition-colors sm:p-4", dnd.overDay === key && "bg-primary/5 outline-2 -outline-offset-2 outline-primary")}
          >
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-balance text-foreground">
              {formatDayLong(day)}
              {isToday && <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Today</span>}
            </h4>
            <ul className="space-y-1.5">
              {list.map((piece) => (
                <li key={piece.id}>
                  <CalendarPost piece={piece} to={postHref(piece.id)} dnd={dnd} layout="agenda" />
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
