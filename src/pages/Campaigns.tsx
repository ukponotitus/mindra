import { CalendarRange, ChevronRight, Megaphone, Plus } from "lucide-react";
import { Link } from "react-router";
import EmptyState from "../components/EmptyState";
import PlatformBadge from "../components/content/PlatformBadge";
import { buttonStyles } from "../components/ui/button";
import { formatDayShort, parseDayKey } from "../lib/calendar";
import { STATUS_LABELS, objectiveLabel, useCampaigns, type Campaign } from "../lib/campaigns";
import { cn } from "../lib/cn";

const STATUS_STYLES: Record<Campaign["status"], string> = {
  upcoming: "bg-secondary text-muted-foreground",
  running: "bg-emerald-50 text-emerald-700",
  ended: "bg-secondary text-muted-foreground",
};

/** "2 Nov – 30 Nov" for a campaign's days. */
export function campaignDays(campaign: Pick<Campaign, "starts_on" | "ends_on">) {
  const start = parseDayKey(campaign.starts_on);
  const end = parseDayKey(campaign.ends_on);
  return start && end ? `${formatDayShort(start)} – ${formatDayShort(end)}` : "";
}

export function StatusChip({ status }: { status: Campaign["status"] }) {
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>{STATUS_LABELS[status]}</span>;
}

/** Campaigns: goals with dates and targets. Optional; regular content needs none. */
export default function Campaigns() {
  const campaigns = useCampaigns();
  const list = campaigns.data ?? [];

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold text-balance text-foreground">Campaigns</h2>
          <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">
            A goal with dates and targets, such as selling a new product in November or filling an event. Campaigns are
            optional: regular posts don&apos;t need one.
          </p>
        </div>
        <Link to="/campaigns/new" className={buttonStyles()}>
          <Plus aria-hidden="true" className="size-4" />
          New campaign
        </Link>
      </div>

      {campaigns.isPending ? (
        <div aria-busy="true" className="space-y-3">
          <p role="status" className="sr-only">
            Loading campaigns
          </p>
          {[0, 1].map((item) => (
            <div key={item} className="h-24 animate-pulse rounded-xl bg-secondary" />
          ))}
        </div>
      ) : campaigns.isError ? (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {campaigns.error.message}
        </p>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No campaigns yet"
          description="Create one when you're promoting something with a goal and an end date. Your Content calendar will plan posts for it."
          action={
            <Link to="/campaigns/new" className={buttonStyles()}>
              <Plus aria-hidden="true" className="size-4" />
              New campaign
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {list.map((campaign) => (
            <li key={campaign.id}>
              <Link
                to={`/campaigns/${campaign.id}`}
                className="flex min-w-0 items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-muted-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Megaphone aria-hidden="true" className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{campaign.name}</span>
                    <StatusChip status={campaign.status} />
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {objectiveLabel(campaign.objective)}
                    {campaign.offering_name && ` · ${campaign.offering_name}`}
                  </span>
                  <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                    <span className="inline-flex items-center gap-1">
                      <CalendarRange aria-hidden="true" className="size-3.5" />
                      {campaignDays(campaign)}
                    </span>
                    {campaign.platforms.map((platform) => (
                      <PlatformBadge key={platform} platform={platform} withLabel={false} />
                    ))}
                  </span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
