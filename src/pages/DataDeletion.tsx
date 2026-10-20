import { CircleCheck, Trash2 } from "lucide-react";
import { Link, useSearchParams } from "react-router";
import LegalLayout from "../components/landing/LegalLayout";
import { CONTACT_EMAIL } from "../lib/legal";

// Meta's data deletion callback answers with a link to this page: /data-deletion?code=<confirmation code>.
const CODE_PATTERN = /^[A-Za-z0-9_-]{4,64}$/;

export default function DataDeletionPage() {
  const [searchParams] = useSearchParams();
  const rawCode = searchParams.get("code")?.trim() ?? "";
  const code = CODE_PATTERN.test(rawCode) ? rawCode : null;
  const email = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <LegalLayout title="Data Deletion" label="Your data" icon={Trash2}>
      {/* Only after Meta's link: the static page built for crawlers has no code, so it shows the instructions alone. */}
      {code && (
        <section
          role="status"
          aria-labelledby="request-received"
          className="mb-10 rounded-xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6"
        >
          <div className="flex items-center gap-2.5">
            <CircleCheck aria-hidden="true" className="size-5 shrink-0 text-emerald-700" />
            {/* The page's prose styles give every h2 a section's top margin and size; this one heads a small panel. */}
            <h2 id="request-received" className="mt-0! text-xl!">
              Request received
            </h2>
          </div>
          <p>
            Meta sent Mindra your request to delete the data it holds from your Facebook account. Mindra deletes the
            Facebook Pages and Instagram accounts that Facebook account connected, with their access tokens, as soon as the
            request arrives, so there’s nothing more you need to do.
          </p>
          <p>
            Your confirmation code is{" "}
            <strong className="font-mono text-base break-all text-foreground tabular-nums">{code}</strong>. If you have a
            question about this request, email {email} and include the code.
          </p>
        </section>
      )}

      <p>
        You can delete what Mindra stores about you at any time. This page explains how, including the data Mindra receives
        from Facebook and Instagram when you connect a Page or an Instagram account. The{" "}
        <Link to="/privacy">Privacy Policy</Link> lists everything Mindra collects.
      </p>

      <h2>Disconnect a Facebook Page or Instagram account</h2>
      <p>
        In Mindra, go to <strong>Settings → Connected accounts</strong> and choose Disconnect next to the account. Mindra
        deletes the connection straight away: the Page or account’s name, id and picture, and its access token. It stops
        posting there, and posts scheduled to go out there go back to being reminders.
      </p>

      <h2>Remove Mindra from Facebook</h2>
      <p>
        In Facebook, remove Mindra in your{" "}
        <a href="https://www.facebook.com/settings/?tab=business_tools">
          Business integrations settings
        </a>
        . Its access tokens stop working at once, so Mindra can’t post to your Pages or Instagram accounts any more. If you
        ask Facebook to delete your data when you remove it, Meta sends Mindra a deletion request.
      </p>

      <h2>When Meta sends us a deletion request</h2>
      <p>When Meta tells us that you’ve asked for your data to be deleted, Mindra:</p>
      <ul>
        <li>
          deletes every Facebook Page and Instagram account that your Facebook account connected to Mindra, with their names,
          ids, pictures and access tokens, as soon as the request arrives;
        </li>
        <li>stops posting to them, and turns posts scheduled to go out there back into reminders;</li>
        <li>
          answers Meta with a link to this page and a confirmation code, which Meta shows you. Opening that link shows the
          code here.
        </li>
      </ul>
      <p>
        A deletion request from Meta doesn’t delete your Mindra account, projects or posts, which you made in Mindra (see
        below for deleting those), or posts already published on Facebook or Instagram, which you can delete there.
      </p>

      <h2>Delete projects and posts</h2>
      <p>
        You can delete posts, clips and whole projects in Mindra. Deleting a project deletes its recording, transcript,
        analysis, posts and clips, including their files in storage.
      </p>

      <h2>Delete your account</h2>
      <p>
        There’s no button for this in Mindra yet. Email {email} from the address you signed up with, and we’ll delete your
        account, your workspace and everything in it, including connected accounts and their access tokens, and confirm by
        email within 30 days. Copies can remain in our database backups until those backups are replaced.
      </p>

      <h2>Questions</h2>
      <p>Email {email} about any deletion request.</p>
    </LegalLayout>
  );
}
