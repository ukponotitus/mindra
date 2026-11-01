import { useState, type FormEvent } from "react";
import { Target, Trash2 } from "lucide-react";
import { ApiError } from "../../lib/api";
import { SOURCE_LABELS, useCampaignResults, useDeleteResult, useRecordResult, type MetricSource } from "../../lib/campaigns";
import { buttonStyles } from "../ui/button";

// The campaign's numbers against its targets (Phase 6): each says where it comes from, and they're never added
// together. Sales, bookings and the like are recorded here by the owner.

type Metric = { id: string; label: string; source: MetricSource };

const inputClass =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden";

function note(row: { actual: number | null; source: MetricSource; metric: string; cost_per_result?: number }) {
  if (row.actual === null) {
    if (row.source === "owner") return "Record it below when you have it.";
    if (row.metric === "followers") return "Mindra doesn't read follower counts yet.";
    return "No number yet: the posts need to be out and followed.";
  }
  return row.cost_per_result ? `About ₦${row.cost_per_result.toLocaleString()} each, from the budget.` : "";
}

export default function CampaignResults({ campaignId, metrics }: { campaignId: string; metrics: Metric[] }) {
  const results = useCampaignResults(campaignId);
  const record = useRecordResult(campaignId);
  const remove = useDeleteResult(campaignId);
  const ownerMetrics = metrics.filter((metric) => metric.source === "owner");
  const [metric, setMetric] = useState("");
  const [value, setValue] = useState("");
  const [reportNote, setReportNote] = useState("");
  const [error, setError] = useState("");
  const data = results.data;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    try {
      await record.mutateAsync({ metric: metric || ownerMetrics[0]?.id || "sales", value: Number(value), note: reportNote });
      setValue("");
      setReportNote("");
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : "Couldn't record it. Try again.");
    }
  };

  return (
    <section aria-labelledby="campaign-results" className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <h3 id="campaign-results" className="flex items-center gap-2 text-base font-semibold text-foreground">
        <Target aria-hidden="true" className="size-4 text-primary" />
        Targets and results
      </h3>
      {data && <p className="mt-1 text-sm text-pretty text-muted-foreground">{data.summary}</p>}
      {data && data.targets.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No targets yet. Add them so you can tell whether it worked.</p>}
      {data && data.targets.length > 0 && (
        <ul className="mt-4 space-y-4">
          {data.targets.map((row) => (
            <li key={row.metric}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{row.label}</span>
                  <span className="block text-xs text-muted-foreground">{SOURCE_LABELS[row.source]}</span>
                </span>
                <span className="shrink-0 text-sm text-foreground tabular-nums">
                  <strong className="font-semibold">{row.actual === null ? "—" : row.actual.toLocaleString()}</strong> of {row.target.toLocaleString()}
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`${row.label}: ${row.progress ?? 0}% of the target`}
                aria-valuenow={row.progress ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary"
              >
                <div className="h-full rounded-full bg-primary" style={{ width: `${row.progress ?? 0}%` }} />
              </div>
              {note(row) && <p className="mt-1 text-xs text-muted-foreground">{note(row)}</p>}
            </li>
          ))}
        </ul>
      )}
      {data && (
        <p className="mt-4 text-xs text-muted-foreground">
          {data.posts.planned} planned · {data.posts.made} made · {data.posts.out} out · {data.posts.followed} followed for results · {data.posts.links} counting link
          {data.posts.links === 1 ? "" : "s"}
        </p>
      )}

      {ownerMetrics.length > 0 && (
        <form onSubmit={submit} className="mt-5 border-t border-border pt-5">
          <p className="mb-3 text-sm font-medium text-foreground">Record a result</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_8rem]">
            <label className="sr-only" htmlFor="result-metric">
              What
            </label>
            <select id="result-metric" value={metric || ownerMetrics[0]?.id} onChange={(event) => setMetric(event.target.value)} className={inputClass}>
              {ownerMetrics.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
            <label className="sr-only" htmlFor="result-value">
              How many
            </label>
            <input id="result-value" type="number" min={0} required value={value} onChange={(event) => setValue(event.target.value)} placeholder="e.g. 12" className={inputClass} />
          </div>
          <label className="sr-only" htmlFor="result-note">
            Note
          </label>
          <input
            id="result-note"
            value={reportNote}
            onChange={(event) => setReportNote(event.target.value)}
            maxLength={300}
            placeholder="Note (optional), e.g. WhatsApp orders this week"
            className={`${inputClass} mt-2`}
          />
          <button type="submit" disabled={record.isPending || !value} className={buttonStyles({ size: "sm", className: "mt-3" })}>
            Record
          </button>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-600">
              {error}
            </p>
          )}
        </form>
      )}
      {data && data.reports.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {data.reports.map((report) => (
            <li key={report.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 text-foreground">
                {report.label}: <strong className="font-semibold tabular-nums">{report.value.toLocaleString()}</strong>
                <span className="text-muted-foreground">
                  {" "}
                  · {report.reported_on}
                  {report.note && ` · ${report.note}`}
                </span>
              </span>
              <button
                type="button"
                onClick={() => remove.mutate(report.id)}
                aria-label={`Remove ${report.label} ${report.value}`}
                className={buttonStyles({ variant: "ghost", size: "icon", className: "size-8" })}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
