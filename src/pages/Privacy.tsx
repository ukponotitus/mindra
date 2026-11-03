import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Link } from "react-router";
import LegalLayout from "../components/landing/LegalLayout";
import { COMPANY_NAME, CONTACT_EMAIL } from "../lib/legal";

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table>
        <thead>
          <tr>
            {head.map((cell) => (
              <th key={cell} scope="col">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => (
                <td key={column}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PrivacyPage() {
  const email = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

  return (
    <LegalLayout title="Privacy Policy" label="Privacy" icon={ShieldCheck}>
      <p>
        Mindra helps organisations and creators turn their recordings, photos, flyers and plans into posts, clips and short
        videos, plan when they go out, post them to the accounts they connect, and see how they did. This policy explains what
        Mindra collects, why, who helps us run it, where it goes, how long we keep it, and your rights. {COMPANY_NAME} runs
        Mindra (“we”).
      </p>
      <p>
        Mindra is new, and this policy will change as Mindra does. When it changes, we’ll update the date above, and we’ll
        email you before an important change applies.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account:</strong> your name, email address and password, and when you confirmed you’re 18 or older.
          Passwords are stored as a one-way hash, so nobody at Mindra can read them.
        </li>
        <li>
          <strong>What you upload:</strong> video and audio recordings, photos, flyers, content plans (pasted or as a file),
          logos, the music you choose, and text you paste in. Photos are made smaller and the details cameras add, such as the
          location, are removed. Video and audio are kept as you upload them, with any details your device added; the clips
          and videos Mindra makes from them don’t carry those details.
        </li>
        <li>
          <strong>What Mindra makes from them:</strong> transcripts with timestamps, summaries, quotes, the text read from
          flyers, written posts, clips and videos, and the changes you make to them.
        </li>
        <li>
          <strong>Your brand profile:</strong> what kind of organisation you are, what you offer and at what price, your
          audience, voice, content pillars, links, logo, colours and photos. If you ask Mindra to fill it in from your
          website, it reads that site’s main page.
        </li>
        <li>
          <strong>Campaigns:</strong> their goals, dates, platforms, budget (for your own reporting) and targets.
        </li>
        <li>
          <strong>Conversations with the assistant:</strong> what you ask, its answers, the page you asked from, and what
          you applied or discarded from its suggestions.
        </li>
        <li>
          <strong>Feedback:</strong> what you send with the feedback form on Home, how you said Mindra is working for you,
          and the page you sent it from. The team reads it to improve Mindra.
        </li>
        <li>
          <strong>Accounts you connect:</strong> each account’s name, id and picture, and the access tokens the service gives
          Mindra to post for you. See <a href="#connected-accounts">Connected accounts</a> below.
        </li>
        <li>
          <strong>Post results:</strong> the views, likes, comments and shares the platform reports for a post Mindra
          posted, one you shared yourself that Mindra found on your connected account, or one whose link you pasted in,
          read for a month after it goes out (a YouTube video’s are read again at least every 30 days while it’s on
          YouTube; see <a href="#youtube">YouTube</a>). Mindra reads the numbers only, not the comments or who left them.
        </li>
        <li>
          <strong>Follower counts:</strong> once a day, how many people follow each connected YouTube channel, Facebook
          Page and Instagram account, kept day by day to show the change. The number only, never who they are.
        </li>
        <li>
          <strong>Clicks on Mindra links:</strong> when you choose to count the clicks on a web address in a post, Mindra
          puts a short link (mindra.online/l/…) in its place. When someone clicks it, Mindra counts the click by day and hour,
          by the country Cloudflare says it came from, by the kind of device (phone, tablet or computer) and by where it came
          from (such as an app or a search engine), then sends them on. It doesn’t keep the person’s IP address, their
          browser’s details or any cookie, and link previews (WhatsApp, Facebook and the like) aren’t counted.
        </li>
        <li>
          <strong>Reminders:</strong> if you turn on phone notifications, your browser’s push address for that device.
          Reminder emails include the post’s text.
        </li>
        <li>
          <strong>Payments, if you pay for a plan:</strong> the plan, amounts and dates, each payment’s reference, how it
          was paid, the card’s brand and last four digits, and Paystack’s customer and subscription codes. Your full card
          number never reaches Mindra: you enter it on Paystack’s page.
        </li>
        <li>
          <strong>Usage records:</strong> how much each workspace uses (AI writing, assistant messages, recording hours),
          so we can apply plan limits and keep costs in check, and when you last used Mindra. These records hold amounts
          and dates, not your content.
        </li>
        <li>
          <strong>Technical logs:</strong> like most websites, our servers keep short-lived logs, such as IP addresses and the
          pages requested, to keep Mindra running and secure.
        </li>
      </ul>

      <h2>Why we use it</h2>
      <p>The law requires a reason for each use (the Nigeria Data Protection Act 2023, section 25). Ours are:</p>
      <Table
        head={["What we do", "Why we may"]}
        rows={[
          ["Run Mindra for you: your account, uploads, transcripts, posts, clips, the assistant, posting and results", "Our agreement with you"],
          ["Take payments and keep their records", "Our agreement with you, and our legal duty to keep records"],
          ["Keep Mindra secure, prevent misuse, fix problems and keep costs in check", "Our legitimate interests"],
          ["Count clicks on Mindra short links", "Our and your legitimate interest in knowing which posts work, without keeping who clicked"],
          ["Connect your social accounts and send phone notifications", "Your consent, which you withdraw by disconnecting or turning them off"],
          ["Email you about your account and important changes", "Our agreement with you"],
          ["Send follow-up emails when you haven't used Mindra for a while (at most one every few days), and see how Mindra is used", "Our legitimate interest in helping you get value from Mindra; stop them from any of them, or in Settings, under Reminders"],
        ]}
      />

      <h2 id="ai">AI</h2>
      <p>
        Mindra uses AI to write summaries, posts, plans and video drafts, to read flyers and plans, to make AI pictures, and
        for the assistant. Mindra itself doesn’t train AI models on your content. AI makes drafts for you to check; it doesn’t
        make decisions about you or anyone else.
      </p>
      <ul>
        <li>
          <strong>Writing and reading</strong> run on Anthropic’s Claude API. Under Anthropic’s commercial terms, what
          Mindra sends it isn’t used to train its models.
        </li>
        <li>
          <strong>AI pictures</strong> are made with Google’s Gemini API on its paid service, from the description you
          write and up to three photos you choose. Google marks each picture with its invisible SynthID watermark.
        </li>
        <li>
          <strong>The assistant</strong> runs on Anthropic’s Claude API. Under Anthropic’s commercial terms, what Mindra
          sends it isn’t used to train its models. It sees your brand profile, campaigns, Planner, results and the page you
          ask from, and reads more only when your question needs it. Your YouTube numbers go to it only when you ask it
          about your results.
        </li>
        <li>
          <strong>Transcription</strong> is done by Deepgram. We ask Deepgram not to use your recordings to improve its
          models.
        </li>
      </ul>
      <p>Each provider may keep requests for a limited time to detect misuse, under its own terms.</p>

      <h2 id="connected-accounts">Connected accounts</h2>
      <p>
        Connecting an account is optional. Without one, Mindra reminds you when it’s time to post. You can connect YouTube
        channels, LinkedIn profiles and TikTok accounts; Facebook Pages, Instagram professional accounts and X are coming,
        and this section applies to them once they’re available.
      </p>
      <ul>
        <li>
          <strong>What Mindra keeps:</strong> each account’s name, id and picture; for Facebook, the id of the Facebook account
          that connected it, so we can act on Meta’s deletion requests; and the access token, plus a refresh token where the
          service gives one, encrypted. A LinkedIn connection ends after 60 days unless you reconnect.
        </li>
        <li>
          <strong>What Mindra does with it:</strong> it posts only what you choose, at the time you set or when you say “post
          now”, sending the post’s text and its photos or video. It keeps the post’s id and link. For 30 days it reads the
          post’s views, likes, comments and shares. When you mark a post as posted yourself, it looks through the account’s
          recent posts for about a day to find it, comparing titles and captions, and keeps only the match. Once a day it reads
          how many followers a YouTube channel, Facebook Page or Instagram account has. It doesn’t read your messages or
          comments, or who your followers are, and never posts to a personal Facebook profile.
        </li>
        <li>
          <strong>Disconnecting:</strong> Settings, then Connected accounts, then Disconnect deletes the connection and its
          tokens at once, deletes the numbers Mindra read through it, asks Google, X and TikTok to cancel Mindra’s access, and
          turns posts scheduled to go out there back into reminders. Posts already published stay on the platform, under its
          own privacy policy.
        </li>
      </ul>
      <p>
        The <Link to="/data-deletion">Data Deletion page</Link> explains how to remove Mindra at each service, and what
        happens when Meta sends us a deletion request.
      </p>

      <h3 id="youtube">YouTube</h3>
      <p>
        Mindra uses the YouTube API Services. By connecting a channel you agree to{" "}
        <a href="https://www.youtube.com/t/terms">YouTube’s Terms of Service</a>, and the{" "}
        <a href="http://www.google.com/policies/privacy">Google Privacy Policy</a> applies. Mindra’s use of information
        received from Google APIs will adhere to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy">Google API Services User Data Policy</a>,
        including the Limited Use requirements.
      </p>
      <ul>
        <li>
          <strong>What Mindra reads:</strong> the channel’s id, name, handle and picture, read again every day; its
          subscriber count, once a day; the views, likes and comment counts of the videos Mindra uploads for you or finds on
          the channel; and the channel’s recent uploads for about a day when you mark a post as posted yourself, keeping
          only the video that matches. With your permission Mindra uploads the videos you schedule or post now, with the
          title, description and visibility you choose. It doesn’t read your messages or who your subscribers are.
        </li>
        <li>
          <strong>What Mindra keeps, and for how long:</strong> the channel’s details while it’s connected; its access token
          and refresh token, encrypted; each video’s id, link and numbers while the channel is connected and the video is on
          YouTube. Numbers are read again at least every 30 days, and a video that’s gone or private loses its numbers.
          Mindra checks every day that it can still use the channel’s access.
        </li>
        <li>
          <strong>How it’s used:</strong> only to post what you ask and to show you how your videos did, on their own and as
          YouTube counts them. Your YouTube numbers are sent to Anthropic’s Claude only when you ask the assistant about your
          results. Google data isn’t sold, used for advertising, or used to train AI models, by Mindra or anyone it shares
          it with.
        </li>
        <li>
          <strong>Taking access back and deleting it:</strong> disconnect the channel in Settings, then Connected accounts,
          or remove Mindra in{" "}
          <a href="https://security.google.com/settings/security/permissions">Google’s security settings</a>.
          Disconnecting deletes everything Mindra read through the channel at once; access removed at Google is found by the
          next day’s check, and the same is deleted then. You can also ask us at {email} to delete it, and we do within 7
          days. Deleting it in Mindra doesn’t delete anything on YouTube.
        </li>
      </ul>

      <h3 id="tiktok">TikTok</h3>
      <ul>
        <li>
          <strong>What Mindra keeps:</strong> the account’s TikTok id (open_id), display name and username; its access token
          and refresh token, encrypted; and for each post Mindra makes, TikTok’s id for the upload (publish_id) and the
          post’s link. Before each post it reads the account’s current posting options from TikTok (who can see posts,
          whether comments, duets and stitches are allowed) and doesn’t keep them.
        </li>
        <li>
          <strong>What Mindra sends:</strong> only the post you choose, when you post it now or at the time you approved:
          its caption (and a photo post’s title), its video or photos, and the choices you made on the posting screen. TikTok
          fetches the video or photos from Mindra’s own address. Mindra adds no mark or branding of its own to what it posts
          on TikTok.
        </li>
        <li>
          <strong>Taking access back:</strong> disconnect the account in Settings, then Connected accounts, which deletes it
          and its tokens at once and asks TikTok to cancel Mindra’s access, or remove Mindra in your TikTok account’s
          settings, where TikTok lists the apps with access to your account.
        </li>
      </ul>

      <h2>Who helps us run Mindra</h2>
      <p>We send each of these companies only what its part of the work needs:</p>
      <Table
        head={["Company", "What it does for Mindra", "What it receives", "Based in"]}
        rows={[
          ["Render", "Hosts our servers and database, in Frankfurt, Germany", "Everything stored in Mindra", "United States"],
          ["Cloudflare", "Serves the website and short links; stores files (R2)", "Files; visitors’ IP address and browser details", "United States"],
          ["Google", "AI pictures, the website’s font, YouTube", "Picture descriptions and the photos you choose for them; visitors’ IP address; YouTube posts", "United States"],
          ["Anthropic", "AI writing and reading, and the assistant", "Transcripts, photos, flyers, plans, brand profile; your questions to the assistant, campaigns, Planner, results and what it reads to answer", "United States"],
          ["Deepgram", "Transcription", "The audio of your recordings", "United States"],
          ["ElevenLabs", "Voice-overs in Automations, if you use them", "The script", "United States"],
          ["Jamendo", "Music search and previews", "Your searches; listeners’ IP address", "Luxembourg"],
          ["LinkedIn and TikTok, and Meta and X once available", "Sign-in and publishing", "The posts you publish, with their photos or video", "United States, or as each platform states"],
          ["Paystack", "Payments", "Your email address, the plan, amount, a reference and your workspace’s number", "Nigeria"],
          ["Resend", "Account and reminder emails", "Your email address; reminder emails include the post’s text", "United States"],
          ["Sentry", "Error reports", "Technical details of what went wrong, not your content", "United States"],
          ["Your browser maker’s push service", "Phone notifications, if you turn them on", "Reminders, encrypted so it can’t read them", "Google, Mozilla, Apple or Microsoft"],
        ]}
      />

      <h2>Sending data outside Nigeria</h2>
      <p>
        Most of the companies above are based outside Nigeria, mainly in Germany and the United States. We send each only
        what its part needs, under its terms for protecting the data it receives.
      </p>

      <h2>People in recordings and photos</h2>
      <p>
        Recordings often include more than one voice: a guest speaker, a choir, an interviewee, an audience. Only upload a
        recording if you have the right to, and the permission of the people in it where that’s needed. The same goes for
        photos: only upload photos of people, especially children, with their permission (for a child, a parent’s or
        guardian’s). Recordings can reveal what people believe or details of their health; Mindra uses them only to do what you
        ask with them. The <Link to="/terms">Terms of Service</Link> say more.
      </p>
      <p>
        If you’re in a recording or photo someone uploaded, or you clicked a Mindra short link, and want to ask about your data,
        email {email}. For recordings and photos, the organisation or person who uploaded them decides about their content, so
        we’ll usually pass your request to them, and act ourselves where the law requires.
      </p>

      <h2>How long we keep it</h2>
      <Table
        head={["What", "Kept until"]}
        rows={[
          ["Your account", "You delete it (Settings, then Account)"],
          ["Recordings, photos, transcripts, posts, clips, videos and plans", "You delete them, or their workspace. Deleting a project deletes its recording, transcript, posts and clips, with their files"],
          ["A connected account and its tokens", "You disconnect it, or Meta sends a deletion request for it"],
          ["A post’s results", "The post is deleted or the account it was read through is disconnected; 30 days after Mindra can no longer use that account’s access. YouTube: deleted at once when Google refuses the channel’s access, and when the video is gone or private"],
          ["Counts for a Mindra short link", "The workspace is deleted. The link keeps working after its post is deleted, since it may still be shared"],
          ["Conversations with the assistant", "You delete them, or your account"],
          ["Feedback you send", "You delete your account"],
          ["When you last used Mindra, and the follow-up emails sent to you", "You delete your account"],
          ["Payment records", "The workspace is deleted. Paystack keeps its own records, under its privacy policy"],
          ["Database backups", "Up to 7 days after the data is deleted"],
          ["Server logs", "A short time, set by our hosting providers"],
        ]}
      />

      <h2>Your choices and rights</h2>
      <p>
        You can see, change and delete your projects, posts and clips at any time, disconnect accounts, download a copy of
        your data and delete your account in Settings. The <Link to="/data-deletion">Data Deletion page</Link> explains each
        way to delete your data. You can also ask us to:
      </p>
      <ul>
        <li>give you a copy of the personal data we hold about you, in a format you can reuse;</li>
        <li>correct it, or delete it;</li>
        <li>stop or limit using it, or stop using it for a particular purpose;</li>
        <li>review anything you think was decided about you by AI alone.</li>
      </ul>
      <p>
        Where you gave consent, you can withdraw it at any time. Email {email} and we’ll reply within 30 days. If you’re not
        satisfied, you can complain to the <a href="https://ndpc.gov.ng">Nigeria Data Protection Commission</a>, or to the
        data protection authority where you live.
      </p>

      <h2>Cookies and storage in your browser</h2>
      <p>
        Mindra keeps your sign-in in your browser’s local storage, so you stay signed in until you log out, and remembers there
        an unfinished upload (so it can continue), your light or dark choice, which sidebar groups are open, and whether the
        assistant’s panel is open with which conversation. We don’t use advertising or analytics cookies. Your browser
        connects to Google Fonts for the website’s font, and to Jamendo when you preview a song.
      </p>

      <h2>Security and breaches</h2>
      <p>
        Mindra is served over HTTPS. Passwords are stored as a one-way hash. Your files are kept in private storage, and the
        links that play or download them expire within 6 hours. The tokens for every connected account are encrypted in our
        database. Our staff open a workspace’s content only to help when you ask, to keep Mindra secure, or when the law
        requires it. No system is perfectly secure. If a breach puts your data at risk, we tell the Nigeria Data Protection
        Commission within 72 hours of learning of it, and when the risk to you is high we tell you straight away, with what
        you can do.
      </p>

      <h2>Children</h2>
      <p>
        Mindra is for adults: you must be 18 or older to create an account, and you confirm it when you sign up. If you upload
        photos or recordings of children, you need a parent’s or guardian’s permission. To report a child’s data uploaded
        without it, email {email} and we’ll remove it.
      </p>

      <h2>Contact</h2>
      <p>
        {COMPANY_NAME} runs Mindra. For privacy questions and requests, email {email}.
      </p>
    </LegalLayout>
  );
}
