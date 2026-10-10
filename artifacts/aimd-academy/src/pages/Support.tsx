import { Link } from 'wouter';
import { PublicLegalPage } from '@/components/PublicLegalPage';

export default function Support() {
  return (
    <PublicLegalPage title="Help & support" description="Get help with your account, creative practice, uploads, workshops, and community safety.">
      <section className="border border-[#E8E2D9] bg-white/60 p-6">
        <h2>Contact the AIMD team</h2>
        <p><a href="mailto:info@artismydrug.com?subject=Creator%20Studio%20Support">info@artismydrug.com</a></p>
        <p className="mt-3">Tell us which screen you were using, what happened, and your device/app version. A screenshot can help—remove private information first. Never send passwords, sign-in codes, or payment-card details.</p>
      </section>
      <section>
        <h2>Sign-in help</h2>
        <p>Use the same sign-in method you used when creating your account. For email/password accounts, choose “Forgot password?” on the sign-in screen. Check your spam folder for verification messages. Contact support if you still cannot get in.</p>
      </section>
      <section>
        <h2>Photos, videos, and audio</h2>
        <p>Check your connection and retry failed uploads. Camera, microphone, and photo-library access are controlled in your device settings; only enable the permissions needed for the action you choose. If an upload fails repeatedly, send support the file type and the error—not private recordings.</p>
      </section>
      <section>
        <h2>Safety and moderation</h2>
        <p>Open Safety options on a post, creator profile, or message to report a concern or block a creator. Staff can review reports and remove violating posts/messages. For additional context or a review of a moderation decision, email the team. Do not include private information about unrelated people.</p>
      </section>
      <section>
        <h2>Membership and workshop access</h2>
        <p>Existing Apple purchases can be checked with “Restore purchases” on the Membership screen. Apple-billed subscriptions are managed in your Apple account settings. If an enrolled workshop is unavailable, contact support with the workshop name and the account you enrolled with; do not send payment credentials.</p>
      </section>
      <section>
        <h2>Delete your account</h2>
        <p>Open your Profile and choose “Delete my account.” Read the confirmation: deletion is permanent. If you cannot sign in or cannot confirm completion, contact the team before retrying. See our <Link href="/privacy">Privacy Policy</Link> for retention details.</p>
      </section>
    </PublicLegalPage>
  );
}
