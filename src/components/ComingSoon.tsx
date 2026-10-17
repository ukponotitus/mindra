import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";
import { buttonStyles } from "./ui/button";

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  points: string[];
  note?: string;
}

/** An honest placeholder for a part of Mindra that isn't built yet. */
export default function ComingSoon({ icon: Icon, title, description, points, note }: Props) {
  return (
    <div className="mx-auto max-w-2xl py-6 text-center sm:py-10">
      <div className="mx-auto mb-5 grid size-12 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <p className="mb-3 inline-block rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-gray-700">Coming soon</p>
      <h2 className="mb-2 text-2xl font-semibold text-balance text-foreground">{title}</h2>
      <p className="mx-auto mb-8 max-w-lg text-pretty text-muted-foreground">{description}</p>

      <section aria-labelledby="coming-soon-points" className="rounded-xl border border-border bg-white p-6 text-left">
        <h3 id="coming-soon-points" className="mb-4 text-sm font-semibold text-foreground">
          What you'll be able to do
        </h3>
        <ul className="space-y-3">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-3 text-sm text-pretty text-gray-700">
              <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
              {point}
            </li>
          ))}
        </ul>
      </section>

      {note && <p className="mt-6 text-sm text-pretty text-muted-foreground">{note}</p>}

      <Link to="/projects" className={buttonStyles({ className: "mt-8" })}>
        Back to your projects
      </Link>
    </div>
  );
}
