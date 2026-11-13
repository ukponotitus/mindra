import { Tabs } from "@base-ui/react/tabs";
import { CalendarRange, ChevronRight, Plus } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router";
import PlatformBadge from "../components/content/PlatformBadge";
import OwnPlans from "../components/plans/OwnPlans";
import { buttonStyles } from "../components/ui/button";
import { parseDayKey } from "../lib/calendar";
import { leadingVersion, useCalendars, VERSION_LABELS } from "../lib/calendars";
import type { Platform } from "../lib/types";

// The page's two tabs; the address's #part names the open one, so links such as /content-calendar#own open it.
const TABS = [
  { id: "mindra", label: "Mindra plans it" },
  { id: "own", label: "Bring your own plan" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function shortDate(key: string) {
  return parseDayKey(key)?.toLocaleDateString(undefined, { day: "numeric", month: "short" }) ?? key;
}

/** The calendars Mindra drafts, and starting a new one. */
function MindraCalendars() {
  const calendars = useCalendars();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-xl text-sm text-pretty text-muted-foreground">
          Mindra drafts what goes out, when and where, from your brand profile; you change it and approve it, and the approved
          items wait in the Planner for their brief and post.
        </p>
        <Link to="/content-calendar/new" className={buttonStyles()}>
          <Plus aria-hidden="true" className="size-4" />
          New calendar
        </Link>
      </div>

      {calendars.isPending ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : calendars.isError ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-pretty text-red-800">
          Couldn't load your calendars: {calendars.error.message}{" "}
          <button type="button" onClick={() => calendars.refetch()} className="font-medium underline">
            Try again
          </button>
        </div>
      ) : (calendars.data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <CalendarRange aria-hidden="true" className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-3 font-medium text-foreground">No calendars yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Start with next month: choose the platforms and how often, and say what to focus on.</p>
          <Link to="/content-calendar/new" className={buttonStyles({ className: "mt-5" })}>
            Plan next month
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {calendars.data?.map((calendar) => {
            // A draft, else the approved version: a later draft that failed doesn't make the calendar look failed.
            const newest = leadingVersion(calendar.versions);
            return (
              <li key={calendar.id}>
                <Link
                  to={`/content-calendar/${calendar.id}`}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <CalendarRange aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{calendar.name}</span>
                      {newest && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">{VERSION_LABELS[newest.status]}</span>}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">
                      {shortDate(calendar.starts_on)} to {shortDate(calendar.ends_on)} · {calendar.approved_items} approved
                      {calendar.campaign_name && ` · ${calendar.campaign_name}`}
                    </span>
                    <span className="mt-1.5 flex flex-wrap gap-1.5">
                      {(Object.keys(calendar.cadence) as Platform[]).map((platform) => (
                        <PlatformBadge key={platform} platform={platform} withLabel={false} />
                      ))}
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The Content calendar page: the calendars Mindra drafts, and, in its second tab, plans people bring in themselves.
 * Both end the same way, as approved posts in the Planner. */
export default function ContentCalendars() {
  const { hash, search } = useLocation();
  const navigate = useNavigate();
  const tab: TabId = TABS.find((candidate) => `#${candidate.id}` === hash)?.id ?? "mindra";
  // Changing the tab leaves the other tab's ?page= behind; the address keeps the open tab.
  const choose = (value: TabId) => navigate({ search: value === tab ? search : "", hash: value === "mindra" ? "" : `#${value}` }, { replace: true });

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-balance text-foreground">Content calendar</h2>
        <p className="mt-1 max-w-xl text-sm text-pretty text-muted-foreground">
          Plan what goes out, when and where: let Mindra draft it, or bring a plan you already have.
        </p>
      </div>

      <Tabs.Root value={tab} onValueChange={(value) => choose(value as TabId)}>
        <Tabs.List aria-label="Content calendar" className="mb-5 inline-flex max-w-full gap-1 overflow-x-auto rounded-xl bg-muted p-1">
          {TABS.map(({ id, label }) => (
            <Tabs.Tab
              key={id}
              value={id}
              className="shrink-0 rounded-lg px-3.5 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary data-[active]:bg-card data-[active]:text-foreground data-[active]:shadow-sm"
            >
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>

        <Tabs.Panel value="mindra" className="outline-none">
          <MindraCalendars />
        </Tabs.Panel>
        <Tabs.Panel value="own" className="outline-none">
          <OwnPlans />
        </Tabs.Panel>
      </Tabs.Root>
    </div>
  );
}
