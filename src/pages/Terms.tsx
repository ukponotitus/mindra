import { FileText } from "lucide-react";
import { Link } from "react-router";
import LegalLayout from "../components/landing/LegalLayout";
import { COMPANY_NAME, CONTACT_EMAIL, GOVERNING_COUNTRY } from "../lib/legal";

export default function TermsPage() {
  const email = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <LegalLayout title="Terms of Service" label="Terms" icon={FileText}>
      <p>
        These terms are the agreement between you and {COMPANY_NAME} (“we”) for using Mindra. By creating an account, you
        agree to them. Read them with our <Link to="/privacy">Privacy Policy</Link>, which explains how we handle your data.
      </p>

      <h2>Mindra is in beta</h2>
      <ul>
        <li>Mindra is in a private beta. Features may change, stop working or be removed while we build it.</li>
        <li>
          There may be limits on how long a recording can be and how many hours of recordings your workspace can process each
          month. Mindra tells you when you reach one.
        </li>
        <li>
          Mindra is free during the beta. If we introduce paid plans, we’ll tell you well before, and we’ll never charge you
          without your agreement.
        </li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>You must be at least 18, and give your real name and an email address you use.</li>
        <li>
          Keep your password to yourself. You’re responsible for what happens in your account, so tell us at {email} if you
          think someone else has used it.
        </li>
      </ul>

      <h2>Your content</h2>
      <p>
        You own the recordings and transcripts you upload, and the posts and clips Mindra makes from them. You give us
        permission to store, copy and process your content only as needed to run Mindra for you, which includes sending it to
        the services listed in the Privacy Policy. This permission ends when you delete the content or your account, apart
        from copies in backups until they’re replaced.
      </p>

      <h2>What you may upload</h2>
      <p>Only upload recordings you have the right to use. In particular:</p>
      <ul>
        <li>
          If other people can be heard or seen in a recording, such as guest speakers, musicians, interviewees or a
          congregation, make sure you have their permission where it’s needed.
        </li>
        <li>
          Don’t upload material that belongs to someone else, such as copyrighted music or video, unless you’re allowed to use
          it this way.
        </li>
        <li>Don’t upload anything illegal, or anything that harasses or threatens someone or exposes their private information.</li>
      </ul>
      <p>We may remove content, or suspend an account, that breaks these rules.</p>

      <h2>AI-written content</h2>
      <p>
        Mindra’s transcripts, summaries, posts and clip suggestions are made by software, including AI models, and they can be
        wrong: a misheard word, a quote that’s slightly off, a reference that isn’t in the recording. Review everything before
        you publish it. You decide what to post, and you’re responsible for what you publish.
      </p>

      <h2>Using Mindra fairly</h2>
      <ul>
        <li>Don’t try to get into other people’s accounts or workspaces, or around the beta limits.</li>
        <li>Don’t overload, attack or disrupt Mindra, or copy it with automated tools.</li>
        <li>Don’t resell Mindra or let other people use your account.</li>
      </ul>

      <h2>Provided as is</h2>
      <p>
        Mindra is provided “as is” and “as available”, without warranties of any kind. We work to keep it running and your
        files safe, but we can’t promise that it will always be available, that it will be free of errors, or that files will
        never be lost. Keep your own copies of your original recordings.
      </p>
      <p>
        To the fullest extent the law allows, {COMPANY_NAME} isn’t liable for indirect or consequential losses, or for lost
        data, income or reputation, that come from using Mindra. Nothing in these terms limits any liability that the law
        doesn’t allow to be limited.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can stop using Mindra at any time, and ask us to delete your account by emailing {email}. We may suspend or close
        an account that breaks these terms. If we end the beta or close Mindra, we’ll give you notice and time to download
        your clips and copy your posts.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms as Mindra changes. We’ll change the date above and email you before an important change
        applies. If you keep using Mindra after that, the new terms apply to you.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of {GOVERNING_COUNTRY}.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: email {email}.</p>
    </LegalLayout>
  );
}
