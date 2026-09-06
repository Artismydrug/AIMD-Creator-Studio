import { Link } from 'wouter';
import { MarketingFooter, MarketingNav } from '@/components/MarketingNav';

export default function SmsTerms() {
  return (
    <div className="min-h-screen bg-[#f3ecdf] text-[#2c2623]">
      <MarketingNav />
      <main className="mx-auto max-w-4xl px-5 py-16 md:py-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#c85a32]">Art Is My Drug</p>
        <h1 className="mt-4 text-5xl font-black uppercase tracking-[-0.05em] md:text-7xl">SMS Terms</h1>
        <p className="mt-5 text-sm text-[#6e6660]">Effective September 6, 2026</p>
        <div className="mt-12 space-y-8 text-base leading-8 text-[#5d554e]">
          <section><h2 className="text-2xl font-black uppercase text-[#2c2623]">Program</h2><p className="mt-2">By opting in, you agree to receive recurring automated promotional and personalized marketing text messages from Art Is My Drug, including art drops, appointments, events, Tattoo Bus appearances, special projects, and limited releases.</p></section>
          <section><h2 className="text-2xl font-black uppercase text-[#2c2623]">Consent and frequency</h2><p className="mt-2">Consent is not a condition of purchase. Message frequency varies. Message and data rates may apply.</p></section>
          <section><h2 className="text-2xl font-black uppercase text-[#2c2623]">Opt out and help</h2><p className="mt-2">Reply STOP to cancel. Reply HELP for help. You may receive a final confirmation after opting out.</p></section>
          <section><h2 className="text-2xl font-black uppercase text-[#2c2623]">Eligibility and delivery</h2><p className="mt-2">You must control the mobile number you provide. Carriers are not liable for delayed or undelivered messages. We may change or end the program at any time.</p></section>
          <section><h2 className="text-2xl font-black uppercase text-[#2c2623]">Privacy and contact</h2><p className="mt-2">See our <Link href="/privacy" className="font-semibold text-[#a63d21] underline">Privacy Policy</Link>. Questions may be sent to <a href="mailto:info@artismydrug.com" className="font-semibold text-[#a63d21] underline">info@artismydrug.com</a>.</p></section>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}