import { dayKey, formatDayLong } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import type { ContentPiece } from "../../lib/types";
import CalendarPost from "./CalendarPost";
import type { DragAndDrop } from "./dragAndDrop";

interface Props {
  days: Date[];
  posts: Map<string, ContentPiece[]>;
  today: string;
  dnd: DragAndDrop;
  postHref: (id: string) => string;
  label: string;
}

/** Seven columns on computers, seven rows on phones, with every post of each day. */
export default function WeekView({ days, posts, today, dnd, postHref, label }: Props) {
  return (
    <ol aria-label={label} className="grid divide-y divide-border md:grid-cols-7 md:divide-x md:divide-y-0">
      {days.map((day) => {
        const key = dayKey(day);
        const list = posts.get(key) ?? [];
        const isToday = key === today;
        return (
          <li
            key={key}
            data-day={key}
            {...dnd.dayTarget(key)}
            className={cn(
              "min-w-0 p-2 transition-colors md:min-h-96",
              dnd.overDay === key && "bg-primary/5 outline-2 -outline-offset-2 outline-primary",
            )}
          >
            <p className="mb-2 flex items-center gap-2 md:flex-col md:items-start md:gap-0.5">
              <span aria-hidden="true" className="text-xs font-medium text-muted-foreground">
                {day.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "grid size-7 place-items-center rounded-full text-sm font-semibold tabular-nums",
                  isToday ? "bg-primary text-primary-foreground" : "text-foreground",
                )}
              >
                {day.getDate()}
              </span>
              <span className="sr-only">
                {formatDayLong(day)}
                {isToday && ", today"}
                {`, ${list.length === 0 ? "nothing planned" : `${list.length} post${list.length === 1 ? "" : "s"}`}`}
              </span>
            </p>
            {list.length > 0 ? (
              <ul className="space-y-1.5">
                {list.map((piece) => (
                  <li key={piece.id}>
                    <CalendarPost piece={piece} to={postHref(piece.id)} dnd={dnd} layout="week" />
                  </li>
                ))}
              </ul>
            ) : (
              <p aria-hidden="true" className="text-xs text-muted-foreground md:hidden">
                Nothing planned
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
