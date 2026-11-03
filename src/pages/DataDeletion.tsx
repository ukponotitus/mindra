import { useEffect, useState } from "react";
import { CircleCheck, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import LegalLayout from "../components/landing/LegalLayout";
import { apiRequest } from "../lib/api";
import { CONTACT_EMAIL } from "../lib/legal";

// Meta's data deletion callback answers with a link to this page: /data-deletion?code=<confirmation code>. The page
// then shows what became of that request (GET /api/social/meta/data-deletion/<code>/).
const CODE_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

type DeletionStatus = { code: string; received_at: string; accounts_deleted: number; status: "done" };

function useDeletionStatus(code: string | null) {
  const [found, setFound] = useState<DeletionStatus | null>(null);
  useEffect(() => {
    if (!code) return;
    let current = true;
    apiRequest<DeletionStatus>(`/api/social/meta/data-deletion/${encodeURIComponent(code)}/`)
      .then((data) => current && setFound(data))
      .catch(() => current && setFound(null));
    return () => {
      current = false;
    };
  }, [code]);
  return found;
}

export default function DataDeletionPage() {
  const [searchParams] = useSearchParams();
  const rawCode = searchParams.get("code")?.trim() ?? "";
  const code = CODE_PATTERN.test(rawCode) ? rawCode : null;
  const found = useDeletionStatus(code);
  const email = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <LegalLayout title="Data Deletion" label="Your data" icon={Trash2}>
      {/* Only after Meta's link: the static page built for crawlers has no code, so it shows the instructions alone. */}
      {code && (
        <section role="status" aria-labelledby="request-received" className="mb-10 rounded-xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-emerald-700" />
            {/* The page's prose styles give every h2 a section's top margin and size; this one heads a small panel. */}
            <h2 id="request-received" className="mt-0! text-xl!">
              {found ? "Deletion done" : "Request received"}
            </h2>
          </div>
          <p>
            Meta sent Mindra your request to delete the data it holds from your Facebook account. Mindra deletes the Facebook
            Pages and Instagram accounts that Facebook account connected, with their access tokens and the numbers read through
            them, as soon as the request arrives, so there’s nothing more you need to do.
            {found &&
              ` It arrived on ${new Date(found.received_at).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}, and ${
                found.accounts_deleted === 1 ? "1 connected account was" : `${found.accounts_deleted} connected accounts were`
              } deleted.`}
          </p>
          <p>
            Your confirmation code is <strong className="font-mono text-base break-all text-foreground tabular-nums">{code}</strong>.
            If you have a question about this request, email {email} and include the code.
          </p>
        </section>
      )}

      <p>
        You can delete what Mindra stores about you at any time. This page explains how, service by service, and what happens
        to copies held elsewhere. The <Link to="/privacy">Privacy Policy</Link> lists everything Mindra collects.
      </p>

      <h2>Delete posts, clips, projects, videos and plans</h2>
      <ul>
        <li>
          <strong>A post:</strong> in the Content Library or on its project’s page, choose Delete. Its results go with it.
        </li>
        <li>
          <strong>A project:</strong> deleting it deletes its recording, transcript, analysis, posts and clips, including their
          files in storage.
        </li>
        <li>
          <strong>Videos, uploads and plans:</strong> Motion Studio videos, Vertical Videos, uploads and content plans each have
          their own Delete.
        </li>
        <li>
          <strong>Conversations with the assistant:</strong> delete them on the Assistant page.
        </li>
      </ul>
      <p>Files are deleted from storage at once. A Mindra short link keeps working after its post is deleted, since it may still be shared.</p>

      <h2>Disconnect an account in Mindra</h2>
      <p>
        In Settings, then Connected accounts, choose Disconnect. Mindra deletes the connection straight away: the account’s
        name, id and picture, its tokens, and the views, likes, comments and shares it read through it. It asks Google, X and
        TikTok to cancel its access too, stops posting there, and turns posts scheduled to go out there back into reminders.
      </p>

      <h2>Remove Mindra at the service</h2>
      <p>You can also take Mindra’s access away where you gave it. Mindra then can’t use it any more:</p>
      <ul>
        <li>
          <strong>Google and YouTube:</strong> in{" "}
          <a href="https://security.google.com/settings/security/permissions">your Google Account’s third-party access</a>,
          choose Mindra and remove its access. Mindra checks each channel’s access every day, and deletes the numbers it
          read through it as soon as it finds the access gone.
        </li>
        <li>
          <strong>LinkedIn:</strong> in LinkedIn’s Settings, then Data privacy, then Permitted services, remove Mindra.
        </li>
        <li>
          <strong>X:</strong> in Settings and privacy, then Security and account access, then Apps and sessions, then Connected
          apps, revoke Mindra’s access.
        </li>
        <li>
          <strong>TikTok:</strong> in TikTok’s settings for app permissions, remove Mindra.
        </li>
        <li>
          <strong>Facebook and Instagram:</strong> in Facebook, remove Mindra in your{" "}
          <a href="https://www.facebook.com/settings/?tab=business_tools">Business integrations settings</a>. If you ask
          Facebook to delete your data when you do, Meta sends Mindra a deletion request (below).
        </li>
      </ul>

      <h2>When Meta sends us a deletion request</h2>
      <p>When Meta tells us that you’ve asked for your data to be deleted, Mindra:</p>
      <ul>
        <li>
          deletes every Facebook Page and Instagram account that your Facebook account connected to Mindra, with their names,
          ids, pictures, tokens and the numbers read through them, as soon as the request arrives;
        </li>
        <li>stops posting to them, and turns posts scheduled to go out there back into reminders;</li>
        <li>
          answers Meta with a link to this page and a confirmation code, which Meta shows you. Opening the link shows the code
          and what was deleted.
        </li>
      </ul>
      <p>
        A deletion request from Meta doesn’t delete your Mindra account, projects or posts, which you made in Mindra, or posts
        already published on Facebook or Instagram, which you can delete there.
      </p>

      <h2>Phone notifications and reminder emails</h2>
      <p>
        In Settings, then Reminders, turn off notifications on a device (its push address is deleted) or reminder emails.
      </p>

      <h2>Delete your account</h2>
      <p>
        In Settings, then Account, enter your password and choose Delete my account. It deletes your account and every
        workspace where you’re the only member, with everything in it: recordings, transcripts, posts, clips, videos, plans,
        campaigns, conversations, connected accounts and their tokens. A paid plan that renews is stopped at Paystack first.
        We email you to confirm. If you share a workspace, it stays for its other members; if you own one with other members,
        email {email} and we’ll help hand it over first. You can download a copy of your data in the same place before you
        delete it.
      </p>

      <h2>What remains after deletion</h2>
      <ul>
        <li>
          <strong>Mindra’s database and storage:</strong> deleted at once; database backups keep copies for up to 7 days.
        </li>
        <li>
          <strong>Posts published on social media:</strong> stay on each platform; delete them there. Deleting something in
          Mindra deletes nothing on YouTube, TikTok or any other platform.
        </li>
        <li>
          <strong>Paystack:</strong> keeps its own records of payments, under its privacy policy and the law.
        </li>
        <li>
          <strong>AI and transcription services:</strong> Google, Anthropic and Deepgram may keep requests for a limited time
          to detect misuse, under their own terms, and then delete them; there’s nothing for Mindra to delete afterwards.
        </li>
        <li>
          <strong>Email and error reports:</strong> emails sent to you and technical error reports expire on our providers’
          schedules.
        </li>
      </ul>

      <h2>Questions</h2>
      <p>Email {email} about any deletion request.</p>
    </LegalLayout>
  );
}
