import { dayKey, formatDayLong } from "../../lib/calendar";
import { cn } from "../../lib/cn";
import type { ContentPiece } from "../../lib/types";
import CalendarPost from "./CalendarPost";
import type { DragAndDrop } from "./dragAndDrop";

interface Props {
  /** Whole weeks, from the week the month starts in to the one it ends in. */
  days: Date[];
  month: Date;
  posts: Map<string, ContentPiece[]>;
  today: string;
  dnd: DragAndDrop;
  postHref: (id: string) => string;
  /** "+N more": show that day's week, where every post fits. */
  onShowDay: (day: string) => void;
  label: string;
}

/** Posts a day box shows before "+N more". */
const SHOWN_PER_DAY = 3;

export default function MonthView({ days, month, posts, today, dnd, postHref, onShowDay, label }: Props) {
  return (
    <div>
      <div aria-hidden="true" className="grid grid-cols-7 border-b border-border">
        {days.slice(0, 7).map((day) => (
          <div key={day.getDay()} className="py-2 text-center text-xs font-medium text-muted-foreground">
            {day.toLocaleDateString(undefined, { weekday: "short" })}
          </div>
        ))}
      </div>
      <ol aria-label={label} className="grid grid-cols-7">
        {days.map((day, index) => {
          const key = dayKey(day);
          const list = posts.get(key) ?? [];
          const shown = list.slice(0, list.length > SHOWN_PER_DAY ? SHOWN_PER_DAY - 1 : SHOWN_PER_DAY);
          const hidden = list.length - shown.length;
          const inMonth = day.getMonth() === month.getMonth();
          const isToday = key === today;
          return (
            <li
              key={key}
              data-day={key}
              {...dnd.dayTarget(key)}
              className={cn(
                "min-h-24 min-w-0 border-b border-border p-1 transition-colors sm:min-h-28 sm:p-1.5",
                index % 7 !== 6 && "border-r",
                !inMonth && "bg-background",
                dnd.overDay === key && "bg-primary/5 outline-2 -outline-offset-2 outline-primary",
              )}
            >
              <p className="mb-1 flex">
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs font-medium tabular-nums",
                    isToday ? "bg-primary text-primary-foreground" : inMonth ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {day.getDate()}
                </span>
                <span className="sr-only">
                  {formatDayLong(day)}
                  {isToday && ", today"}
                  {list.length > 0 && `, ${list.length} post${list.length === 1 ? "" : "s"}`}
                </span>
              </p>
              {shown.length > 0 && (
                <ul className="space-y-0.5">
                  {shown.map((piece) => (
                    <li key={piece.id}>
                      <CalendarPost piece={piece} to={postHref(piece.id)} dnd={dnd} layout="month" />
                    </li>
                  ))}
                </ul>
              )}
              {hidden > 0 && (
                <button
                  type="button"
                  onClick={() => onShowDay(key)}
                  aria-label={`Show all ${list.length} posts on ${formatDayLong(day)}`}
                  className="mt-0.5 rounded px-1 text-[11px] font-medium text-primary tabular-nums hover:underline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary"
                >
                  +{hidden}
                  <span className="hidden sm:inline"> more</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
