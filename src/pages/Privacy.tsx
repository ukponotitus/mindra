import { ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import LegalLayout from "../components/landing/LegalLayout";
import { COMPANY_NAME, CONTACT_EMAIL } from "../lib/legal";

export default function PrivacyPage() {
  const email = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <LegalLayout title="Privacy Policy" label="Privacy" icon={ShieldCheck}>
      <p>
        Mindra turns recordings of sermons, podcasts and classes into transcripts, written posts and short video clips, and
        can post them to the Facebook Pages and Instagram accounts you connect. This policy explains what Mindra collects to
        do that, who helps us run it, how long we keep it and what you can ask us to do. Mindra is run by {COMPANY_NAME}
        (“we”).
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
          <strong>What you upload:</strong> video and audio recordings, transcripts you paste in, and photos. Photos are
          shrunk before they’re stored, and the hidden details cameras add to them, such as the location, are removed.
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
          <strong>Facebook Pages and Instagram accounts you connect:</strong> the name, id and picture of each Page and
          Instagram account, the Instagram username, the id of the Facebook account that connected them, and the access
          tokens Meta gives Mindra to post for you. See{" "}
          <a href="#facebook-instagram">Connected Facebook and Instagram accounts</a> below.
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
        <li>To publish the posts you choose to the Facebook Pages and Instagram accounts you connect.</li>
        <li>To email you about your account, such as password reset links, and about important changes to the beta.</li>
        <li>To keep Mindra secure, fix problems and keep costs in check.</li>
      </ul>
      <p>
        We don’t sell your data or share it with advertisers, and Mindra itself doesn’t use your recordings or posts to train
        AI models. During the private beta, the AI writing runs on Google’s free Gemini service, whose terms let Google use
        what it’s sent to improve its products. We’ll move to Google’s paid service, where that doesn’t happen, before Mindra
        charges for plans.
      </p>

      <h2 id="facebook-instagram">Connected Facebook and Instagram accounts</h2>
      <p>
        You can connect Facebook Pages you manage, and the Instagram business or creator accounts linked to them, by
        signing in with Facebook. You choose which Pages Mindra may use. Connecting is optional: without it, Mindra reminds
        you when it’s time to post instead.
      </p>
      <p>When you connect an account, Meta sends Mindra:</p>
      <ul>
        <li>the name, id and profile picture of each Page you choose, and an access token for posting to it;</li>
        <li>the username, id and profile picture of the Instagram account linked to each Page, if it has one;</li>
        <li>the id of your Facebook account, so we can act on a deletion request Meta sends us for you.</li>
      </ul>
      <p>
        Access tokens are encrypted before they’re stored, are never shown in Mindra, and are only ever sent back to Meta.
      </p>
      <p>What Mindra does with a connected account:</p>
      <ul>
        <li>
          It posts only the posts you choose: a post you schedule to go out automatically, at the time you set, or a post you
          tell Mindra to post now. It sends Meta the post’s text and its photos or video.
        </li>
        <li>
          After posting, it keeps the post’s id and its link on Facebook or Instagram, so you can open it from Mindra, or the
          reason Meta gave if the post couldn’t go out.
        </li>
        <li>
          It doesn’t read your messages, comments or followers, doesn’t post to your personal Facebook profile, and doesn’t
          post anything you haven’t chosen.
        </li>
      </ul>
      <p>To disconnect an account:</p>
      <ul>
        <li>
          In Mindra, go to <strong>Settings → Connected accounts</strong> and choose Disconnect. This deletes the connection
          and its access token straight away, and posts scheduled to go out there go back to being reminders.
        </li>
        <li>
          In Facebook, remove Mindra in your{" "}
          <a href="https://www.facebook.com/settings/?tab=business_tools">
            Business integrations settings
          </a>
          . Its access tokens stop working at once, so Mindra can’t post to those accounts any more. If you ask Facebook to
          delete your data when you remove it, Meta sends us a deletion request and we delete the connections too.
        </li>
      </ul>
      <p>
        The <Link to="/data-deletion">Data Deletion</Link> page explains what happens when Meta sends us a deletion
        request.
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
          <strong>Google</strong> (the Gemini API) reads your transcripts, photos and brand voice to write the analysis, posts,
          suggestions and clip ideas. During the beta this is Google’s free tier (see above). This website also loads its font
          from Google Fonts, so your browser connects to Google
          when it opens a page.
        </li>
        <li>
          <strong>Meta</strong> (Facebook and Instagram) handles the sign-in when you connect a Page or Instagram account,
          and receives the posts you choose to publish there, with their photos or video. Once a post is published, it’s
          on Facebook or Instagram under{" "}
          <a href="https://www.facebook.com/privacy/policy/">
            Meta’s Privacy Policy
          </a>
          , and you manage it there.
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
        those recordings on your behalf, and you’re responsible for having that permission. The same goes for photos: only
        upload photos of people, especially children, with their permission (for a child, a parent’s or guardian’s). The{" "}
        <Link to="/terms">Terms of Service</Link> say more.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your recordings and everything made from them stay in your workspace until you delete them.</li>
        <li>
          Deleting a project deletes its recording, transcript, analysis, posts and clips, including their files in storage.
        </li>
        <li>
          A connected Facebook Page or Instagram account, and its access token, stays until you disconnect it, or until Meta
          sends us a deletion request for the Facebook account that connected it.
        </li>
        <li>Copies can remain in our database backups until those backups are replaced.</li>
        <li>Your account stays until you ask us to delete it.</li>
      </ul>

      <h2>Your choices and rights</h2>
      <p>
        You can see, edit and delete your projects and posts in Mindra at any time, and disconnect your Facebook and
        Instagram accounts in Settings. The <Link to="/data-deletion">Data Deletion</Link> page explains each way to delete
        your data. For anything else, email us at {email}. You can ask us to:
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
        after a short time. Access tokens for connected Facebook and Instagram accounts are encrypted in our database. No
        system is perfectly secure; if a problem affects your data, we’ll tell you promptly.
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
