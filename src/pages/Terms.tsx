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

      <h2>Mindra is new</h2>
      <ul>
        <li>Mindra is new and still growing. Features may change, stop working or be removed as we build it.</li>
        <li>
          At launch, every account has everything open, free, until the date shown on the Billing page. After that your
          workspace is on the Free plan unless you choose a paid one, and an account made after that date starts on the Free
          plan. Paid plans are optional: we never charge you unless you choose one and pay for it on the Billing page.
        </li>
      </ul>

      <h2>Your account and workspace</h2>
      <ul>
        <li>You must be at least 18, and give your real name and an email address you use.</li>
        <li>
          Keep your password to yourself. You’re responsible for what happens in your account, so tell us at {email} if you
          think someone else has used it.
        </li>
        <li>
          Your work lives in a workspace. If you use Mindra for an organisation, such as a business, church or charity, you
          confirm you’re allowed to accept these terms for it, and it’s bound by them too.
        </li>
      </ul>

      <h2>Plans, payments and limits</h2>
      <ul>
        <li>
          Mindra has a Free plan and paid plans. The Billing page shows what each plan includes and what it costs, in naira,
          before you pay. Each plan has monthly limits, such as recording hours, AI-written posts, clips, AI pictures and
          assistant messages; Mindra tells you when you reach one. Clips made on the Free plan carry a small “Made with
          Mindra” mark.
        </li>
        <li>
          Payments are taken by Paystack, a payment company. You enter your card or bank details on Paystack’s page, not in
          Mindra, and Paystack’s own terms also apply to the payment.
        </li>
        <li>
          A paid plan is paid in advance, for a month or a year, and renews by itself at the end of each period, charging the
          same card, until you cancel. If we change a plan’s price, your plan keeps renewing at the price you paid unless we
          email you at least 30 days before a new price applies to it.
        </li>
        <li>
          You can cancel at any time on the Billing page. Your plan stays until the end of the period you’ve paid for, and then
          your workspace moves to the Free plan. Nothing you’ve made is removed; if you have more than the Free plan allows,
          you keep it, but can’t make more until the next month or an upgrade.
        </li>
        <li>
          If a renewal payment fails, your plan keeps working for a few days after its period ends, and the Billing page shows
          until when. If it isn’t paid by then, your workspace moves to the Free plan.
        </li>
        <li>
          Moving to another plan, or from monthly to yearly, starts the new plan once it’s paid and ends the old one then. What
          was left of the old plan’s period isn’t refunded.
        </li>
        <li>
          Payments aren’t refundable, including for part of a period, except where the law requires a refund, or where we
          charged you by mistake, such as twice for the same period. Email us at {email} within 30 days of a mistaken charge
          and we’ll refund it.
        </li>
      </ul>

      <h2>Your content</h2>
      <ul>
        <li>
          You own what you upload, and the posts, clips, videos and pictures Mindra makes for you, as far as the law allows.
          AI can make similar text or pictures for other people, so we can’t promise that what it makes for you is unique.
        </li>
        <li>
          You give us permission to store, copy and process your content only as needed to run Mindra for you, which includes
          sending it to the services listed in the Privacy Policy and publishing the posts you choose to the accounts you
          connect. This permission ends when you delete the content or your account, apart from copies in backups for up to 7
          days.
        </li>
        <li>
          Mindra itself, its software, design and name, belongs to us. If you send us ideas or feedback, we may use them
          without owing you anything.
        </li>
      </ul>

      <h2>What you may upload and post</h2>
      <p>You’re responsible for what you upload and what you publish with Mindra. In particular:</p>
      <ul>
        <li>
          Only upload recordings and photos you have the right to use. If other people can be heard or seen, such as guests,
          musicians, interviewees or an audience, make sure you have their permission where it’s needed; for a child, a
          parent’s or guardian’s.
        </li>
        <li>
          Don’t upload material that belongs to someone else, such as copyrighted music or video, unless you’re allowed to use
          it this way. Music from Mindra’s music search comes with its own licence and credit, which you must keep.
        </li>
        <li>
          Don’t use Mindra for anything illegal, or to deceive, impersonate someone, harass or threaten anyone, spread hate,
          expose someone’s private information, or share sexual content involving minors.
        </li>
        <li>
          Don’t make AI pictures of real people without their permission, or of logos and products you have no right to
          show.
        </li>
        <li>
          Follow each platform’s rules for what you post there, including labelling AI-made content where they ask you to.
        </li>
      </ul>
      <p>We may remove content, or suspend an account, that breaks these rules.</p>

      <h2>AI-written content and the assistant</h2>
      <ul>
        <li>
          Mindra’s transcripts, summaries, posts, clip suggestions, video drafts, pictures and voice-overs are made by software,
          including AI models, and they can be wrong: a misheard word, a quote that’s slightly off, a reference that isn’t in
          the recording, a picture that doesn’t show your product exactly. Review everything before you publish it. You decide
          what to post, and you’re responsible for what you publish. AI pictures carry Google’s invisible SynthID watermark.
        </li>
        <li>
          The assistant suggests changes as cards, and nothing changes until you press Apply. It never publishes, schedules,
          deletes or spends anything by itself.
        </li>
        <li>
          Posts you schedule to go out automatically, and Automations you set to post without approval, go out without Mindra
          asking again.
        </li>
      </ul>

      <h2>Posting to your accounts</h2>
      <ul>
        <li>
          You can connect accounts on services such as YouTube, LinkedIn and TikTok (with Facebook, Instagram and X coming).
          Only connect accounts you’re allowed to post for. A post Mindra publishes for you is yours, as if you had posted it
          yourself, and it must follow that service’s terms and community rules.
        </li>
        <li>
          <strong>
            By connecting a YouTube channel, you agree to be bound by the{" "}
            <a href="https://www.youtube.com/t/terms">YouTube Terms of Service</a>.
          </strong>{" "}
          For TikTok, <a href="https://www.tiktok.com/legal/page/global/terms-of-service/en">TikTok’s Terms of Service</a>{" "}
          and, when you post, its{" "}
          <a href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en">Music Usage Confirmation</a> (and{" "}
          <a href="https://www.tiktok.com/legal/page/global/bc-policy/en">Branded Content Policy</a> for branded content)
          apply. For Facebook and Instagram, <a href="https://www.facebook.com/terms.php">Meta’s Terms of Service</a> and{" "}
          <a href="https://help.instagram.com/581066165581870">Instagram’s Terms of Use</a> apply; each other service’s own
          terms apply to posting there.
        </li>
        <li>
          Automatic posting can be late or fail: a service can be unavailable, turn a post down, limit how many posts an account
          makes in a day, or stop accepting a connection. When a post can’t go out, Mindra tells you so you can post it yourself.
          We can’t promise that a post goes out at the exact time you set.
        </li>
        <li>
          Services can change or withdraw the features Mindra uses. If they do, automatic posting may stop working until we can
          adapt.
        </li>
        <li>
          You can disconnect an account at any time in Settings, then Connected accounts. That deletes its access, and Mindra
          stops posting there. The <Link to="/data-deletion">Data Deletion page</Link> says more.
        </li>
      </ul>

      <h2>Using Mindra fairly</h2>
      <ul>
        <li>Don’t try to get into other people’s accounts or workspaces, or around your plan’s limits.</li>
        <li>Don’t use Mindra to post spam, or to post to accounts you don’t have the right to post for.</li>
        <li>Don’t overload, attack or disrupt Mindra, or copy it with automated tools.</li>
        <li>Don’t resell Mindra or let other people use your account.</li>
      </ul>

      <h2>Provided as is, and our liability</h2>
      <ul>
        <li>
          Mindra is provided “as is” and “as available”, without warranties of any kind. We work to keep it running and your
          files safe, but we can’t promise that it will always be available, that it will be free of errors, or that files
          will never be lost. Keep your own copies of your original recordings.
        </li>
        <li>
          To the fullest extent the law allows, {COMPANY_NAME} isn’t liable for indirect or consequential losses, or for lost
          data, income or reputation, that come from using Mindra, and our total liability to you is limited to what you paid
          us in the 12 months before the claim.
        </li>
        <li>
          You’ll cover our reasonable costs if someone makes a claim against us because of content you uploaded or published,
          or because you broke these terms.
        </li>
        <li>Nothing in these terms limits any liability, or any right you have, that the law doesn’t allow to be limited.</li>
      </ul>

      <h2>Ending your use</h2>
      <ul>
        <li>
          You can stop using Mindra at any time. You can download a copy of your data and delete your account in Settings, then
          Account; the <Link to="/data-deletion">Data Deletion page</Link> lists every way to delete your data.
        </li>
        <li>
          We may suspend or close an account that breaks these terms. Unless it’s urgent or the law stops us, we’ll tell you
          why first, and you can reply to {email} to explain or put it right.
        </li>
        <li>If we close Mindra, we’ll give you notice and time to download your data, clips and posts.</li>
      </ul>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms as Mindra changes. We’ll change the date above and email you before an important change
        applies. If you keep using Mindra after that, the new terms apply to you.
      </p>

      <h2>Disputes and the law</h2>
      <p>
        These terms are governed by the laws of {GOVERNING_COUNTRY}. If you have a problem with Mindra, email {email} first:
        most things can be put right that way. If we can’t settle it, the courts of {GOVERNING_COUNTRY} decide it. If part of
        these terms can’t be enforced, the rest still applies. You may not hand these terms to someone else without our
        agreement.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms: email {email}.</p>
    </LegalLayout>
  );
}
