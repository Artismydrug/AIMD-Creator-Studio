import { useEffect } from 'react';
import { Link } from 'wouter';
import {
  ArrowLeft,
  Camera,
  ChevronRight,
  Database,
  FileText,
  Image,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
} from 'lucide-react';
import aimdLogo from '@assets/AIMD_Logo_Original-White_1787712004194.png';

const sections = [
  { id: 'overview', label: 'Overview' },
  { id: 'account-data', label: 'Account Data' },
  { id: 'user-content', label: 'User Content' },
  { id: 'device-permissions', label: 'Device Permissions' },
  { id: 'use-and-sharing', label: 'Use & Sharing' },
  { id: 'retention', label: 'Retention & Choices' },
  { id: 'contact', label: 'Contact' },
];

function PolicySection({
  id,
  number,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  number: string;
  icon: typeof ShieldCheck;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 border-t border-[#E8E2D9] py-10 md:py-14">
      <div className="grid gap-5 md:grid-cols-[170px_1fr] md:gap-10">
        <div className="flex items-start gap-3">
          <span className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#BC3A20]">{number}</span>
          <Icon className="mt-[-2px] h-5 w-5 text-[#BC3A20]" strokeWidth={1.8} aria-hidden="true" />
        </div>
        <div>
          <h2 className="mb-5 text-2xl font-black uppercase tracking-tight text-[#2C2623] md:text-3xl">{title}</h2>
          <div className="space-y-4 text-[15px] leading-7 text-[#5D554E]">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default function Privacy() {
  useEffect(() => {
    const description =
      'Read the Creator Studio by AIMD Privacy Policy, including how we handle account data, creator content, and device permissions.';
    document.title = 'Privacy Policy | Creator Studio by AIMD';

    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', `${window.location.origin}${window.location.pathname}`);
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C2623]">
      <header className="sticky top-0 z-40 border-b border-[#E8E2D9]/90 bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Art Is My Drug home">
            <span className="inline-flex h-10 min-w-[78px] items-center justify-center bg-[#2C2623] px-2.5 shadow-[0_3px_0_rgba(44,38,35,0.16)]">
              <img src={aimdLogo} alt="AIMD — Art Is My Drug" width={120} height={36} className="h-8 w-auto object-contain" />
            </span>
          </Link>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 border border-[#2C2623]/15 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#2C2623] transition-colors hover:border-[#BC3A20]/50 hover:text-[#BC3A20] sm:px-4"
          >
            Creator App
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main>
        <section id="overview" className="relative overflow-hidden border-b border-[#E8E2D9]">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#E9A319]/15 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-28 bottom-[-10rem] h-96 w-96 rounded-full bg-[#D6247A]/10 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-7xl px-5 py-16 sm:px-8 md:py-24">
            <Link href="/" className="mb-12 inline-flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#BC3A20] transition-colors hover:text-[#2C2623]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to AIMD
            </Link>
            <div className="grid gap-10 lg:grid-cols-[1fr_320px] lg:items-end lg:gap-20">
              <div className="max-w-3xl">
                <div className="mb-5 inline-flex items-center gap-2 border border-[#BC3A20]/25 bg-[#BC3A20]/8 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#BC3A20]">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Your data, your creative space
                </div>
                <h1 className="text-5xl font-black uppercase leading-[0.92] tracking-[-0.055em] text-[#2C2623] sm:text-6xl md:text-8xl">
                  Privacy
                  <span className="block text-[#BC3A20]">Policy.</span>
                </h1>
                <p className="mt-7 max-w-2xl text-lg leading-8 text-[#5D554E] md:text-xl">
                  Creator Studio by AIMD is built for people who make things. This policy explains what we collect, why we need it, and the choices you have.
                </p>
              </div>
              <aside className="border-l-2 border-[#BC3A20] pl-5">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#8A8077]">Policy details</p>
                <p className="mt-2 font-display text-xl font-bold uppercase text-[#2C2623]">Last updated October 10, 2026</p>
                <p className="mt-3 text-sm leading-6 text-[#6E6660]">
                  This policy applies to the Creator Studio web and mobile experiences operated by Art Is My Drug (“AIMD,” “we,” or “us”).
                </p>
              </aside>
            </div>
          </div>
        </section>

        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-12 sm:px-8 lg:grid-cols-[220px_1fr] lg:gap-20 lg:py-16">
          <aside className="h-fit lg:sticky lg:top-28">
            <p className="mb-4 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A8077]">On this page</p>
            <nav aria-label="Privacy Policy sections" className="grid grid-cols-2 gap-x-4 gap-y-2 lg:grid-cols-1">
              {sections.slice(1).map((section, index) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="group flex items-center gap-2 py-1.5 text-sm text-[#6E6660] transition-colors hover:text-[#BC3A20]"
                >
                  <span className="font-mono text-[10px] text-[#BC3A20]">{String(index + 1).padStart(2, '0')}</span>
                  <span>{section.label}</span>
                </a>
              ))}
            </nav>
          </aside>

          <div className="max-w-3xl">
            <PolicySection id="account-data" number="01" icon={UserRound} title="Account Data">
              <p>
                When you create or use an AIMD account, we may receive your email address, name, username, profile photo, account identifiers, and other profile details you choose to add. Authentication is provided by <strong className="font-semibold text-[#2C2623]">Clerk</strong>, which securely handles sign-in, account sessions, and passwords. AIMD does not receive or store your password.
              </p>
              <p>
                We use account data to sign you in, create your creator profile, keep your account secure, connect you with community features, and provide account-related support. If you use memberships, workshops, or creator pathways, we also use the account information needed to provide those services.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {[
                  ['Clerk', 'Authentication and account security'],
                  ['AIMD', 'Your profile and creator experience'],
                ].map(([name, detail]) => (
                  <div key={name} className="flex items-start gap-3 border border-[#E8E2D9] bg-white/55 p-4">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[#BC3A20]" aria-hidden="true" />
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#2C2623]">{name}</p>
                      <p className="mt-1 text-sm leading-5 text-[#6E6660]">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PolicySection>

            <PolicySection id="user-content" number="02" icon={Image} title="User Content">
              <p>
                You may add photos, videos, audio tracks, captions, artwork, challenge submissions, workshop assignments, habit proof, and other creative work (“User Content”). You keep ownership of your User Content.
              </p>
              <p>
                We process User Content to store it, display it where you choose to share it, support workshop and challenge features, and help the AIMD team review submissions when a feature calls for review. Public posts, profile artwork, usernames, and related information may be visible to other creators according to the feature and your settings.
              </p>
              <p>
                Direct messages are shared with conversation participants, not the public feed. Private lesson reflections are available to you and authorized instructors or staff supporting the relevant learning experience. Authorized AIMD staff may review a reported message or other reported content to handle safety concerns; this does not make the whole conversation public.
              </p>
              <div className="flex gap-3 border-l-2 border-[#0E7490] bg-[#0E7490]/6 p-4 text-sm leading-6 text-[#4B5B5E]">
                <FileText className="mt-1 h-4 w-4 shrink-0 text-[#0E7490]" aria-hidden="true" />
                <p>
                  Please only upload work you have the right to share. Avoid including private information about yourself or anyone else in media you submit.
                </p>
              </div>
            </PolicySection>

            <PolicySection id="device-permissions" number="03" icon={Camera} title="Device Permissions">
              <p>
                The mobile app asks for device access only when a feature needs it. You can browse Creator Studio without granting these permissions.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="border border-[#E8E2D9] bg-white/55 p-5">
                  <Camera className="mb-4 h-5 w-5 text-[#BC3A20]" aria-hidden="true" />
                  <h3 className="font-display text-lg font-black uppercase text-[#2C2623]">Camera</h3>
                  <p className="mt-2 text-sm leading-6 text-[#6E6660]">
                    Used when you choose to capture live photos or videos for creator work, drills, or challenge proof.
                  </p>
                </div>
                <div className="border border-[#E8E2D9] bg-white/55 p-5">
                  <Image className="mb-4 h-5 w-5 text-[#0E7490]" aria-hidden="true" />
                  <h3 className="font-display text-lg font-black uppercase text-[#2C2623]">Photo Library</h3>
                  <p className="mt-2 text-sm leading-6 text-[#6E6660]">
                    Used when you choose existing photos or videos to attach to a post, workshop assignment, or optional proof.
                  </p>
                </div>
              </div>
              <p>
                Microphone access is used when you choose to record sound with a creator video or practice recording. Choosing an existing audio file uploads that file; it does not require continuous microphone access.
              </p>
              <p>
                You can allow, deny, or later change these permissions in your device settings. If access is denied, the related capture or attachment feature may not work, but other parts of the app remain available.
              </p>
            </PolicySection>

            <PolicySection id="use-and-sharing" number="04" icon={Database} title="How We Use & Share Information">
              <p>
                Membership and purchase providers, including RevenueCat and Apple for supported iOS purchases and Stripe for supported web purchases, help verify purchase status and access. Purchase and entitlement information may be linked to your account identifier. Full payment-card numbers are handled by payment providers, not stored in Creator Studio. Provider SDKs may also process device, session, and diagnostic information to deliver and troubleshoot their services.
              </p>
              <p>We use information to operate and improve Creator Studio, including to:</p>
              <ul className="list-disc space-y-2 pl-5 marker:text-[#BC3A20]">
                <li>provide profiles, community, messaging, workshops, challenges, and creator tools;</li>
                <li>authenticate accounts, prevent misuse, and protect the service;</li>
                <li>respond to questions, support requests, and important service messages; and</li>
                <li>understand what features help creators and improve the experience.</li>
              </ul>
              <p>
                We share information with service providers that help us run the service, such as Clerk for authentication and infrastructure providers for secure storage and delivery. We may share relevant User Content with authorized AIMD staff, instructors, or reviewers when needed to run a workshop, challenge, or proof-review feature. We do not sell your personal information.
              </p>
              <p>
                If you voluntarily join the AIMD Text List, we process your name, mobile number, signup source, consent record, and message status to deliver the texts you requested and honor STOP or HELP requests. Promotional messages begin only after you confirm the double opt-in.
              </p>
            </PolicySection>

            <PolicySection id="retention" number="05" icon={Trash2} title="Retention & Your Choices">
              <p>
                We keep account information and User Content for as long as needed to provide the service, meet operational and legal obligations, resolve disputes, and enforce our agreements. Retention can vary by feature—for example, a challenge record may need to remain available for judging or recognition.
              </p>
              <p>
                You can update profile information in the app where those controls are available. You can remove content through the feature that created it when supported, or contact us to request account or content deletion. We may retain limited information where required for security, fraud prevention, legal compliance, or legitimate recordkeeping.
              </p>
              <div className="flex gap-3 border-l-2 border-[#8F5A00] bg-[#8F5A00]/7 p-4 text-sm leading-6 text-[#5E513B]">
                <Sparkles className="mt-1 h-4 w-4 shrink-0 text-[#8F5A00]" aria-hidden="true" />
                <p>
                  We may update this policy as Creator Studio grows. When we make a material change, we will update the effective date and provide notice through the service when appropriate.
                </p>
              </div>
            </PolicySection>

            <PolicySection id="contact" number="06" icon={Mail} title="Contact AIMD">
              <p>
                Questions about this policy, your account data, or a deletion request can be sent to{' '}
                <a href="mailto:info@artismydrug.com" className="font-semibold text-[#BC3A20] underline decoration-[#BC3A20]/30 underline-offset-4 hover:decoration-[#BC3A20]">
                  info@artismydrug.com
                </a>
                . Please include enough information for us to understand your request, but do not send your password or other login credentials.
              </p>
            </PolicySection>

          </div>
        </div>
      </main>

      <footer className="border-t border-[#E8E2D9] bg-[#F2ECE1]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-9 min-w-[70px] items-center justify-center bg-[#2C2623] px-2">
              <img src={aimdLogo} alt="" width={100} height={30} className="h-7 w-auto object-contain" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A8077]">Art Is My Drug</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#6E6660]">
            <Link href="/" className="hover:text-[#BC3A20]">Home</Link>
            <Link href="/app" className="hover:text-[#BC3A20]">Creator App</Link>
            <Link href="/privacy" className="hover:text-[#BC3A20]">Privacy</Link>
            <span>© {new Date().getFullYear()} AIMD</span>
          </div>
        </div>
      </footer>
    </div>
  );
}