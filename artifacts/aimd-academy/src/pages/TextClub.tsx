import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { ArrowRight, Check, MessageSquareText } from 'lucide-react';
import { useCreateSmsSubscription } from '@workspace/api-client-react';
import { MarketingFooter, MarketingNav } from '@/components/MarketingNav';

const DISCLOSURE_VERSION = '2026-09-06-v1';

function normalizeUsPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  const national = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(national) ? `+1${national}` : null;
}

export default function TextClub() {
  const source = useMemo(() => new URLSearchParams(window.location.search).get('source')?.slice(0, 80) || 'general', []);
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const mutation = useCreateSmsSubscription();

  useEffect(() => {
    document.title = 'Join the AIMD Text List | Art Is My Drug';
    const meta = document.querySelector('meta[name="description"]');
    meta?.setAttribute('content', 'Join the Art Is My Drug text list for first access to art drops, appointments, events, Tattoo Bus appearances, and limited releases.');
  }, []);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const normalized = normalizeUsPhone(phone);
    if (!firstName.trim()) return setError('Enter your first name.');
    if (!normalized) return setError('Enter a valid US mobile number.');
    if (!consent) return setError('Check the consent box to join the text list.');

    mutation.mutate(
      {
        data: {
          firstName: firstName.trim(),
          phone: normalized,
          consentAccepted: true,
          pageUrl: window.location.href,
          source,
          consentSource: 'AIMD website text-club form',
          consentDisclosureVersion: DISCLOSURE_VERSION,
        },
      },
      {
        onSuccess: () => setComplete(true),
        onError: (err: any) => setError(err?.data?.error || err?.message || 'Text signup is temporarily unavailable. Please try again.'),
      },
    );
  };

  return (
    <div className="min-h-screen bg-[#171514] text-[#f5eee2]">
      <MarketingNav />
      <main className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_80%_15%,rgba(198,88,50,0.28),transparent_30%),radial-gradient(circle_at_10%_75%,rgba(233,163,25,0.18),transparent_28%)]" />
        <div className="container mx-auto grid min-h-[calc(100dvh-73px)] items-center gap-12 px-5 py-12 md:px-6 md:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <section>
            <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.25em] text-[#e9a319]">Direct from AIMD</p>
            <h1 className="max-w-xl text-5xl font-black uppercase leading-[0.86] tracking-[-0.06em] sm:text-7xl">
              Join the AIMD <span className="block text-[#c85a32]">Text List.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#d2c5b4]">
              Get first access to art drops, available appointments, events, Tattoo Bus appearances, special projects, and limited releases from Art Is My Drug.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#d2c5b4]">
              {['Art drops', 'Appointments', 'Tattoo Bus', 'Events'].map((item) => (
                <span key={item} className="border border-[#f5eee2]/15 px-3 py-2">{item}</span>
              ))}
            </div>
          </section>

          <section className="border border-[#f5eee2]/15 bg-[#f3ecdf] p-6 text-[#2c2623] shadow-[12px_12px_0_rgba(200,90,50,0.22)] sm:p-9">
            {complete ? (
              <div className="py-8 text-center" role="status">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#c85a32] text-white"><Check className="h-7 w-7" /></span>
                <h2 className="mt-6 text-4xl font-black uppercase tracking-tight">Check your phone</h2>
                <p className="mx-auto mt-4 max-w-md leading-7 text-[#5d554e]">
                  We sent you a confirmation message. Reply YES to finish joining the AIMD Text List. You will not receive promotional texts until you confirm.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-7 flex items-center gap-3">
                  <MessageSquareText className="h-6 w-6 text-[#c85a32]" />
                  <h2 className="text-2xl font-black uppercase tracking-tight">Get first access</h2>
                </div>
                <form onSubmit={submit} noValidate className="space-y-5">
                  <div>
                    <label htmlFor="text-first-name" className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.14em]">First name</label>
                    <input id="text-first-name" autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-13 w-full border border-[#2c2623]/25 bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#c85a32]" />
                  </div>
                  <div>
                    <label htmlFor="text-phone" className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-[0.14em]">Mobile phone number</label>
                    <input id="text-phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(555) 555-5555" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-13 w-full border border-[#2c2623]/25 bg-white px-4 text-base outline-none focus-visible:ring-2 focus-visible:ring-[#c85a32]" />
                  </div>
                  <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-[#5d554e]">
                    <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#c85a32]" />
                    <span>
                      By checking this box and submitting, I agree to receive recurring automated promotional and personalized marketing text messages from Art Is My Drug at the number provided. Consent is not a condition of purchase. Message frequency varies. Message and data rates may apply. Reply STOP to cancel or HELP for help. View our <Link href="/privacy" className="font-semibold text-[#a63d21] underline">Privacy Policy</Link> and <Link href="/sms-terms" className="font-semibold text-[#a63d21] underline">SMS Terms</Link>.
                    </span>
                  </label>
                  {error && <p role="alert" className="border-l-2 border-red-700 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
                  <button type="submit" disabled={mutation.isPending} className="flex h-14 w-full items-center justify-center gap-2 bg-[#c85a32] px-6 font-mono text-sm font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[#a94729] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2c2623] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
                    {mutation.isPending ? 'Sending…' : 'Send my confirmation text'} <ArrowRight className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}