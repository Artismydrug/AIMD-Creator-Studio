import { Link } from 'wouter';
import { PublicLegalPage } from '@/components/PublicLegalPage';

// General policy draft: owner/legal review is required before publishing.
export default function Terms() {
  return (
    <PublicLegalPage title="Terms & community standards" description="How we use Creator Studio, respect creative work, and keep the AIMD community safe.">
      <p className="text-sm text-[#6E6660]">Last updated: October 10, 2026</p>
      <section>
        <h2>Using Creator Studio</h2>
        <p>Creator Studio by AIMD provides creative habit tools, community sharing, workshops, and learning resources. Use the service lawfully, provide accurate account information, and protect your sign-in details. Do not impersonate another person, misuse accounts, or interfere with the service.</p>
      </section>
      <section>
        <h2>Your work remains yours</h2>
        <p>You retain ownership of your original artwork, music, photos, videos, writing, and other uploads. Only share content you have permission to use, including any music, images, and people appearing in it. By uploading, you give AIMD permission to store and process the content to provide the features you use, and to display it to the audience you choose within those features.</p>
        <p className="mt-3">Public posts and profile content can be seen by other community members. Private lesson reflections are not community posts; access is limited to you and authorized staff or instructors supporting the relevant learning experience. Do not upload someone else’s private information without permission.</p>
      </section>
      <section>
        <h2>Community standards</h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>No harassment, bullying, hate, credible threats, exploitation, or encouragement of violence.</li>
          <li>No sexual exploitation, non-consensual intimate content, or content that endangers children.</li>
          <li>No scams, spam, impersonation, illegal content, or infringement of others’ rights.</li>
          <li>Do not share private contact details, credentials, or confidential information about someone else.</li>
          <li>Give constructive feedback and respect others’ boundaries, including blocks and contact preferences.</li>
        </ul>
        <p className="mt-3">Use Safety options on a post, creator profile, or message to report a concern. You can also block a creator. Authorized AIMD staff may review reported material and remove posts or messages that violate these standards. Reports are reviewed in context; submitting a report does not automatically remove another creator’s content.</p>
      </section>
      <section>
        <h2>Workshops and school participation</h2>
        <p>Workshop availability and access depend on the specific offering, enrollment, and any applicable membership. A portfolio or pathway is not a guarantee of employment, certification, school credit, or a particular outcome. Schools and educators should contact AIMD before arranging student participation to agree supervision, privacy, and access requirements. Creator Studio does not automatically sync assignments or grades with a school’s learning system.</p>
      </section>
      <section>
        <h2>Purchases and subscriptions</h2>
        <p>When a paid offering is available, its price and purchase conditions are shown before checkout. Apple-billed subscriptions and cancellation are managed through your Apple account; restoring purchases checks existing purchases and is not a new purchase. The <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">Apple Standard End User License Agreement</a> applies where used for the iOS app. These community standards also apply to content shared through Creator Studio.</p>
      </section>
      <section>
        <h2>Privacy and account deletion</h2>
        <p>Our <Link href="/privacy">Privacy Policy</Link> explains collection, sharing, permissions, and retention. You can request permanent account deletion inside the app from your Profile. Records that must be retained for legal or financial reasons are handled as described in that policy. Contact support if you cannot access your account or need help confirming a deletion request.</p>
      </section>
      <section>
        <h2>Questions and safety concerns</h2>
        <p>Email <a href="mailto:info@artismydrug.com">info@artismydrug.com</a> for support, rights requests, or community safety concerns. If you think a moderation decision was mistaken, include the report or content reference and ask for a review. Never send passwords, verification codes, or full payment-card details.</p>
      </section>
    </PublicLegalPage>
  );
}
