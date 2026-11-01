import { Check, X } from "lucide-react";
import { Link } from "react-router";
import type { Proposal } from "../../lib/assistant";
import { cn } from "../../lib/cn";
import { PLATFORMS } from "../../lib/projects";
import { buttonStyles } from "../ui/button";

// A change the assistant proposed, as a card: what would change, then Apply or Discard. Nothing changes until Apply.

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  organisation_type: "Kind of organisation",
  about: "What it does",
  location: "Where",
  website: "Website",
  whatsapp: "WhatsApp",
  socials: "Social accounts",
  pillars: "Content pillars",
  audience: "Audience",
  tone: "Tone",
  style_notes: "Style notes",
  words_to_use: "Words to use",
  words_to_avoid: "Words to avoid",
  objective: "What it's for",
  promoting: "Details posts must get right",
  starts_on: "Starts on",
  ends_on: "Ends on",
  platforms: "Where it goes",
  budget: "Budget (₦)",
  main_message: "Main message",
  link: "Where people should go",
  targets: "Targets",
};

function shown(value: unknown): string {
  if (value == null || value === "") return "—";
  if (Array.isArray(value)) {
    return value.map((item) => (item && typeof item === "object" ? Object.values(item as Record<string, unknown>).join(" ") : String(item))).join(", ");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, inner]) => inner)
      .map(([key, inner]) => `${key}: ${String(inner)}`)
      .join(", ");
  }
  return String(value);
}

function Fields({ values }: { values: Record<string, unknown> }) {
  return (
    <dl className="space-y-1.5 text-sm">
      {Object.entries(values).map(([key, value]) => (
        <div key={key}>
          <dt className="text-xs text-muted-foreground">{FIELD_LABELS[key] ?? key}</dt>
          <dd className="break-words text-foreground">{shown(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Preview({ proposal }: { proposal: Proposal }) {
  const payload = proposal.payload;
  if (proposal.kind === "post_text") {
    const platform = PLATFORMS.find((item) => item.id === payload.platform)?.label ?? "";
    return (
      <div className="space-y-2">
        {platform && <p className="text-xs text-muted-foreground">New text for the {platform} post</p>}
        {typeof payload.title === "string" && <p className="text-sm font-medium text-foreground">{payload.title}</p>}
        <p className="max-h-60 overflow-y-auto rounded-lg bg-secondary/60 p-3 text-sm whitespace-pre-wrap text-foreground">{String(payload.body ?? "")}</p>
      </div>
    );
  }
  if (proposal.kind === "brand_profile") {
    const changes = (payload.changes as Record<string, unknown>) ?? {};
    const offerings = (payload.add_offerings as { name: string; price?: string }[]) ?? [];
    return (
      <div className="space-y-2">
        {Object.keys(changes).length > 0 && <Fields values={changes} />}
        {offerings.length > 0 && (
          <div className="text-sm">
            <p className="text-xs text-muted-foreground">Offerings to add</p>
            <ul className="list-disc pl-5 text-foreground">
              {offerings.map((item) => (
                <li key={item.name}>{item.price ? `${item.name}, ${item.price}` : item.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  const fields = (payload.fields as Record<string, unknown>) ?? {};
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{payload.campaign_id && payload.name ? `Changes to “${String(payload.name)}”` : "A new campaign"}</p>
      <Fields values={fields} />
    </div>
  );
}

function where(proposal: Proposal): { to: string; label: string } | null {
  const payload = proposal.payload;
  if (proposal.kind === "post_text" && payload.post_id) return { to: `/library/${String(payload.post_id)}`, label: "Open the post" };
  if (proposal.kind === "brand_profile") return { to: "/brand", label: "Open the brand profile" };
  if (proposal.kind === "campaign" && payload.campaign_id) return { to: `/campaigns/${String(payload.campaign_id)}`, label: "Open the campaign" };
  return null;
}

interface Props {
  proposal: Proposal;
  onDecide: (decision: "apply" | "discard") => void;
  deciding: boolean;
}

export default function ProposalCard({ proposal, onDecide, deciding }: Props) {
  const link = where(proposal);
  return (
    <div className="rounded-xl border border-border bg-card p-3.5">
      <p className="text-xs font-medium tracking-wide text-primary uppercase">{proposal.kind_label}</p>
      <p className="mt-0.5 mb-3 text-sm font-semibold text-foreground">{proposal.title}</p>
      <Preview proposal={proposal} />

      {proposal.status === "proposed" ? (
        <div className="mt-3 flex gap-2">
          <button type="button" disabled={deciding} onClick={() => onDecide("apply")} className={buttonStyles({ size: "sm" })}>
            <Check aria-hidden="true" className="size-4" />
            Apply
          </button>
          <button type="button" disabled={deciding} onClick={() => onDecide("discard")} className={buttonStyles({ variant: "ghost", size: "sm" })}>
            <X aria-hidden="true" className="size-4" />
            Discard
          </button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span
            role="status"
            className={cn(
              "font-medium",
              proposal.status === "applied" && "text-emerald-700",
              proposal.status === "failed" && "text-red-600",
              proposal.status === "discarded" && "text-muted-foreground",
            )}
          >
            {proposal.status === "applied" ? proposal.result || "Applied." : proposal.status === "failed" ? proposal.result : "Discarded."}
          </span>
          {proposal.status === "applied" && link && (
            <Link to={link.to} className="font-medium text-primary underline-offset-2 hover:underline">
              {link.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
