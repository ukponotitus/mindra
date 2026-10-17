import { ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import LegalLayout from "../components/landing/LegalLayout";
import { COMPANY_NAME, CONTACT_EMAIL } from "../lib/legal";

export default function PrivacyPage() {
  const email = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <LegalLayout title="Privacy Policy" label="Privacy" icon={ShieldCheck}>
      <p>
        Mindra turns recordings of sermons, podcasts and classes into transcripts, written posts and short video clips. This
        policy explains what Mindra collects to do that, who helps us run it, how long we keep it and what you can ask us to
        do. Mindra is run by {COMPANY_NAME} (“we”).
      </p>
      <p>
        Mindra is in a private beta, and this policy will change as Mindra does. When it changes, we’ll update the date above,
        and we’ll email you before an important change applies.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name, email address and password. Passwords are stored as a one-way hash, so
          nobody at Mindra can read them.
        </li>
        <li>
          <strong>What you upload:</strong> video and audio recordings, and transcripts you paste in.
        </li>
        <li>
          <strong>What Mindra makes from them:</strong> transcripts with timestamps, summaries, quotes, written posts and video
          clips, and the changes you make to them.
        </li>
        <li>
          <strong>Your brand voice:</strong> your brand name, audience, tone, words to use or avoid, and any sample posts you
          add.
        </li>
        <li>
          <strong>Usage records:</strong> how much AI writing each workspace uses, so we can keep costs under control. These
          records hold amounts, not your content.
        </li>
        <li>
          <strong>Technical logs:</strong> like most websites, our servers keep short-lived logs, such as IP addresses and the
          pages requested, to keep Mindra running and secure.
        </li>
      </ul>
      <p>We don’t ask for payment details. Mindra is free during the beta.</p>

      <h2>How we use it</h2>
      <ul>
        <li>To run Mindra for you: signing you in, transcribing your recordings, and writing the analysis, posts and clips you ask for.</li>
        <li>To email you about your account, such as password reset links, and about important changes to the beta.</li>
        <li>To keep Mindra secure, fix problems and keep costs in check.</li>
      </ul>
      <p>
        We don’t sell your data or share it with advertisers, and Mindra itself doesn’t use your recordings or posts to train
        AI models. During the private beta, the AI writing runs on Google’s free Gemini service, whose terms let Google use
        what it’s sent to improve its products. We’ll move to Google’s paid service, where that doesn’t happen, before Mindra
        charges for plans.
      </p>

      <h2>Who helps us run Mindra</h2>
      <p>We use these companies to provide Mindra, and send each of them only what it needs for its part of the work:</p>
      <ul>
        <li>
          <strong>Render</strong> hosts the Mindra servers and database, in Frankfurt, Germany.
        </li>
        <li>
          <strong>Cloudflare</strong> stores your recordings, clips and thumbnails (Cloudflare R2) and serves this website.
        </li>
        <li>
          <strong>Deepgram</strong> turns the audio of your recordings into transcripts. We ask Deepgram not to use your
          recordings to improve its models.
        </li>
        <li>
          <strong>Google</strong> (the Gemini API) reads your transcripts and brand voice to write the analysis, posts,
          suggestions and clip ideas. During the beta this is Google’s free tier (see above). This website also loads its font
          from Google Fonts, so your browser connects to Google
          when it opens a page.
        </li>
        <li>
          <strong>Sentry</strong> receives technical reports when something goes wrong, so we can fix it.
        </li>
        <li>
          <strong>Our email provider</strong> sends account emails, such as password reset links.
        </li>
      </ul>
      <p>Some of these companies process data outside your country, including in the European Union and the United States.</p>

      <h2>Recordings of other people</h2>
      <p>
        Recordings often include more than one voice: a guest speaker, a choir, an interviewee, people in a congregation. Only
        upload a recording if you have the right to, and the permission of the people in it where that’s needed. We process
        those recordings on your behalf, and you’re responsible for having that permission. The{" "}
        <Link to="/terms">Terms of Service</Link> say more.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your recordings and everything made from them stay in your workspace until you delete them.</li>
        <li>
          Deleting a project deletes its recording, transcript, analysis, posts and clips, including their files in storage.
        </li>
        <li>Copies can remain in our database backups until those backups are replaced.</li>
        <li>Your account stays until you ask us to delete it.</li>
      </ul>

      <h2>Your choices and rights</h2>
      <p>
        You can see, edit and delete your projects and posts in Mindra at any time. For anything else, email us at {email}.
        You can ask us to:
      </p>
      <ul>
        <li>send you a copy of the personal data we hold about you;</li>
        <li>correct it;</li>
        <li>delete your account, your workspace and everything in it (there’s no button for this in Mindra yet);</li>
        <li>stop using your data for a particular purpose.</li>
      </ul>
      <p>
        We’ll reply within 30 days. If you’re unhappy with our answer, you can complain to the data protection authority in
        your country.
      </p>

      <h2>Cookies and storage in your browser</h2>
      <p>
        Mindra keeps your sign-in in your browser’s local storage, so you stay signed in until you log out, and remembers an
        unfinished upload there so it can continue where it stopped. We don’t use advertising or analytics cookies.
      </p>

      <h2>Security</h2>
      <p>
        Mindra is served over HTTPS. Your files are kept in private storage, and the links that play or download them expire
        after a short time. No system is perfectly secure; if a problem affects your data, we’ll tell you promptly.
      </p>

      <h2>Children</h2>
      <p>Mindra is for adults. You must be at least 18 to create an account.</p>

      <h2>Contact</h2>
      <p>
        {COMPANY_NAME} runs Mindra. For privacy questions and requests, email {email}.
      </p>
    </LegalLayout>
  );
}
