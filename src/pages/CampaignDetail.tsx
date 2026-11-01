import { ChevronRight, Link2, Megaphone, PenLine, Target, Trash2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import EmptyState from "../components/EmptyState";
import PlatformBadge from "../components/content/PlatformBadge";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { buttonStyles } from "../components/ui/button";
import { ApiError } from "../lib/api";
import { SOURCE_LABELS, objectiveLabel, useCampaign, useCampaignMetrics, useDeleteCampaign } from "../lib/campaigns";
import { shortAddress } from "../lib/results";
import { StatusChip, campaignDays } from "./Campaigns";

const crumbLink = "rounded hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });

/** One campaign: its brief and targets. Its posts (from the Content calendar) and results arrive in later phases. */
export default function CampaignDetail() {
  const { campaignId } = useParams();
  const navigate = useNavigate();
  const query = useCampaign(campaignId);
  const metrics = useCampaignMetrics().data ?? [];
  const remove = useDeleteCampaign();
  const campaign = query.data;

  if (query.isPending) {
    return (
      <div aria-busy="true" className="max-w-3xl space-y-4">
        <p role="status" className="sr-only">
          Loading the campaign
        </p>
        <div className="h-8 w-60 animate-pulse rounded bg-secondary" />
        <div className="h-64 animate-pulse rounded-xl bg-secondary" />
      </div>
    );
  }
  if (query.isError || !campaign) {
    const missing = query.error instanceof ApiError && query.error.status === 404;
    return (
      <EmptyState
        icon={Megaphone}
        title={missing ? "This campaign isn't here" : "Couldn't load this campaign"}
        description={missing ? "It may have been deleted." : (query.error?.message ?? "Try again in a moment.")}
        action={
          <Link to="/campaigns" className={buttonStyles({ variant: "secondary" })}>
            Back to Campaigns
          </Link>
        }
      />
    );
  }

  const facts: [string, string][] = [
    ["What it's for", objectiveLabel(campaign.objective)],
    ["Promotes", campaign.offering_name],
    ["Who it's for", campaign.audience],
    ["Main message", campaign.main_message],
    ["Budget", campaign.budget ? `${naira.format(Number(campaign.budget))}, for reporting cost per result` : ""],
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex min-w-0 items-center gap-1.5 text-sm text-muted-foreground">
            <li className="shrink-0">
              <Link to="/campaigns" className={crumbLink}>
                Campaigns
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="size-4 shrink-0" />
            </li>
            <li className="min-w-0 truncate">{campaign.name}</li>
          </ol>
        </nav>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="min-w-0 text-2xl font-semibold text-balance text-foreground">{campaign.name}</h2>
              <StatusChip status={campaign.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {campaignDays(campaign)} · {campaign.days} {campaign.days === 1 ? "day" : "days"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to={`/campaigns/${campaign.id}/edit`} className={buttonStyles({ variant: "secondary", size: "sm", className: "h-9" })}>
              <PenLine aria-hidden="true" className="size-4" />
              Change
            </Link>
            <ConfirmDialog
              trigger={
                <button type="button" disabled={remove.isPending} className={buttonStyles({ variant: "danger-outline", size: "sm", className: "h-9" })}>
                  <Trash2 aria-hidden="true" className="size-4" />
                  Delete
                </button>
              }
              title={`Delete "${campaign.name}"?`}
              description="The campaign is deleted. Posts you've made aren't touched. This can't be undone."
              confirmLabel="Delete campaign"
              onConfirm={() => remove.mutate(campaign.id, { onSuccess: () => navigate("/campaigns", { replace: true }) })}
            />
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-border bg-white p-5 sm:p-6">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {facts
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm text-pretty text-foreground">{value}</dd>
              </div>
            ))}
        </dl>
        {campaign.promoting && <p className="mt-4 rounded-lg bg-background p-3 text-sm text-pretty whitespace-pre-wrap text-gray-700">{campaign.promoting}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {campaign.platforms.map((platform) => (
            <PlatformBadge key={platform} platform={platform} />
          ))}
          {campaign.link && (
            <a href={campaign.link} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1.5 rounded text-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary">
              <Link2 aria-hidden="true" className="size-4 shrink-0" />
              <span className="truncate">{shortAddress(campaign.link)}</span>
            </a>
          )}
        </div>
      </section>

      <section aria-labelledby="campaign-targets" className="rounded-xl border border-border bg-white p-5 sm:p-6">
        <h3 id="campaign-targets" className="flex items-center gap-2 text-base font-semibold text-foreground">
          <Target aria-hidden="true" className="size-4 text-primary" />
          Targets
        </h3>
        {campaign.targets.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No targets yet. Add them so you can tell whether it worked.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {campaign.targets.map((target) => {
              const metric = metrics.find((item) => item.id === target.metric);
              return (
                <li key={target.metric} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{metric?.label ?? target.metric}</span>
                    {metric && <span className="block text-xs text-muted-foreground">{SOURCE_LABELS[metric.source]}</span>}
                  </span>
                  <span className="text-sm font-semibold text-foreground tabular-nums">{target.value.toLocaleString()}</span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-pretty text-muted-foreground">
          Progress against these targets shows here once the campaign has posts and results.
        </p>
      </section>

      <section className="rounded-xl border border-dashed border-border p-5 text-sm text-pretty text-muted-foreground">
        Planning this campaign&apos;s posts comes with the Content calendar: you&apos;ll ask the assistant for a calendar for it, and
        each post will carry this campaign&apos;s name.
      </section>
    </div>
  );
}
