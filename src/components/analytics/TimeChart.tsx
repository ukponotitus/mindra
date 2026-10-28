import { useState } from "react";
import { cn } from "../../lib/cn";
import { formatCount } from "../../lib/results";

export type ChartPoint = { label: string; long: string; value: number; posts?: number };

/** A clean top for the scale: 1, 2 or 5 times a power of ten, at least 4. */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const power = 10 ** Math.floor(Math.log10(value));
  return [1, 2, 5, 10].map((step) => step * power).find((step) => step >= value) ?? value;
}

/**
 * One series over time, as YouTube Studio draws it: a 2px line with a faint fill, hairline gridlines and the scale on
 * the right, a few dates below, a marker under each day posts went out, and a crosshair with the day's value on hover.
 * "Show as table" gives the same numbers as a table.
 */
export default function TimeChart({
  points,
  name,
  unit,
  format = formatCount,
}: {
  points: ChartPoint[];
  /** What's drawn, for the chart's description: "Views". */
  name: string;
  /** One of it, for the tooltip: "view". */
  unit: [string, string];
  format?: (value: number) => string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const count = points.length;
  const top = niceMax(Math.max(0, ...points.map((point) => point.value)));
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const width = Math.max(count - 1, 1);
  const x = (index: number) => (count === 1 ? 0.5 : index);
  const y = (value: number) => 100 - (value / top) * 100;
  const line = points.map((point, index) => `${index ? "L" : "M"}${x(index)},${y(point.value)}`).join(" ");
  const area = count ? `${line} L${x(count - 1)},100 L${x(0)},100 Z` : "";
  const busiest = points.reduce((best, point) => (point.value > best.value ? point : best), points[0] ?? { long: "", value: 0, label: "" });
  const ticks = count > 1 ? [0, Math.round((count - 1) / 4), Math.round((count - 1) / 2), Math.round(((count - 1) * 3) / 4), count - 1] : [0];
  const word = (value: number) => (value === 1 ? unit[0] : unit[1]);

  return (
    <figure>
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={() => setAsTable((value) => !value)}
          aria-pressed={asTable}
          className="rounded px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          {asTable ? "Show as chart" : "Show as table"}
        </button>
      </div>
      {asTable ? (
        <div className="max-h-72 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th scope="col" className="py-1.5 font-medium">
                  Day
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  {name}
                </th>
                <th scope="col" className="py-1.5 text-right font-medium">
                  Posts out
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.long} className="border-t border-border">
                  <td className="py-1.5 text-foreground">{point.long}</td>
                  <td className="py-1.5 text-right text-foreground tabular-nums">{format(point.value)}</td>
                  <td className="py-1.5 text-right text-muted-foreground tabular-nums">{point.posts ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div className="flex gap-3">
            <div className="relative h-56 min-w-0 flex-1" onMouseLeave={() => setHovered(null)}>
              {/* Hairline gridlines at 0, half and the top. */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                <span className="border-t border-border" />
                <span className="border-t border-border" />
                <span className="border-t border-border" />
              </div>
              <svg
                role="img"
                aria-label={`${name} day by day: ${format(total)} in all${busiest.value ? `; most on ${busiest.long}, ${format(busiest.value)}` : ""}.`}
                viewBox={`0 0 ${width} 100`}
                preserveAspectRatio="none"
                className="absolute inset-0 size-full overflow-visible text-primary"
              >
                {count > 1 && <path d={area} fill="currentColor" opacity={0.1} />}
                {count > 1 && <path d={line} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />}
              </svg>
              {hovered !== null && points[hovered] && (
                <>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 w-px bg-foreground/30"
                    style={{ left: `${(x(hovered) / width) * 100}%` }}
                  />
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary"
                    style={{ left: `${(x(hovered) / width) * 100}%`, top: `${y(points[hovered].value)}%` }}
                  />
                  <div
                    role="status"
                    className={cn(
                      "pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-md bg-foreground px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-sm",
                      hovered < count / 3 ? "" : hovered > (count * 2) / 3 ? "-translate-x-full" : "-translate-x-1/2",
                    )}
                    style={{ left: `${(x(hovered) / width) * 100}%` }}
                  >
                    <p className="font-medium">{points[hovered].long}</p>
                    <p className="tabular-nums">
                      {format(points[hovered].value)} {word(points[hovered].value)}
                      {points[hovered].posts ? ` · ${points[hovered].posts} ${points[hovered].posts === 1 ? "post" : "posts"} out` : ""}
                    </p>
                  </div>
                </>
              )}
              {/* The whole column is the hover target, not the line. */}
              <div className="absolute inset-0 flex">
                {points.map((point, index) => (
                  <div key={point.long} onMouseEnter={() => setHovered(index)} className="h-full flex-1" />
                ))}
              </div>
            </div>
            <div aria-hidden="true" className="flex h-56 w-10 shrink-0 flex-col justify-between text-[11px] text-muted-foreground tabular-nums">
              <span className="-translate-y-1/2">{format(top)}</span>
              <span>{format(top / 2)}</span>
              <span className="translate-y-1/2">0</span>
            </div>
          </div>
          {/* A marker under each day posts went out. */}
          <div aria-hidden="true" className="relative mt-2 mr-[3.25rem] h-3">
            {points.map((point, index) =>
              point.posts ? (
                <span
                  key={point.long}
                  title={`${point.posts} ${point.posts === 1 ? "post" : "posts"} out on ${point.long}`}
                  className="absolute top-0 size-2.5 -translate-x-1/2 rounded-full border border-primary bg-white"
                  style={{ left: `${(x(index) / width) * 100}%` }}
                />
              ) : null,
            )}
          </div>
          <div aria-hidden="true" className="relative mt-1 mr-[3.25rem] h-4 text-[11px] text-muted-foreground">
            {ticks.map((index, order) => (
              <span
                key={index}
                className={cn("absolute whitespace-nowrap", order === 0 ? "" : order === ticks.length - 1 ? "-translate-x-full" : "-translate-x-1/2")}
                style={{ left: `${(x(index) / width) * 100}%` }}
              >
                {points[index]?.label}
              </span>
            ))}
          </div>
        </>
      )}
    </figure>
  );
}
