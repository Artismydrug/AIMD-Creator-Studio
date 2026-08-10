import { useState } from 'react';
import { useListPlans, useCreateCheckoutSession } from '@workspace/api-client-react';
import { useGetCurrentUser } from '@workspace/api-client-react';
import { Check, HeartHandshake, Lock, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

// ─── Tier rank helper ─────────────────────────────────────────────────────────

const TIER_RANK: Record<string, number> = { free: 0, academy: 1, pro: 2 };

// ─── Plan card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  annual,
  userTier,
  onSubscribe,
  isPending,
}: {
  plan: any;
  annual: boolean;
  userTier: string | undefined;
  onSubscribe: (planId: string, billing: 'monthly' | 'annual') => void;
  isPending: boolean;
}) {
  const isCurrentPlan = plan.tier === userTier;
  const userRank      = TIER_RANK[userTier ?? 'free'] ?? 0;
  const planRank      = TIER_RANK[plan.tier]  ?? 0;
  const isDowngrade   = planRank < userRank;

  const displayPrice = annual && plan.priceAnnual
    ? Math.round(plan.priceAnnual / 12)
    : plan.priceMonthly;

  const annualSavings = plan.priceAnnual
    ? plan.priceMonthly * 12 - plan.priceAnnual
    : 0;

  return (
    <div className={`relative flex flex-col border transition-all duration-200 ${
      plan.featured
        ? 'border-emerald-500/60 bg-zinc-900 shadow-[0_0_40px_rgba(16,185,129,0.08)]'
        : 'border-zinc-800 bg-zinc-900/50'
    }`}>
      {/* Top accent line */}
      {plan.featured && (
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
      )}

      {/* Most Popular badge */}
      {plan.featured && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="bg-emerald-500 text-zinc-950 font-mono text-[11px] font-bold uppercase tracking-widest px-3 py-0.5">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-8 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-display font-black text-xl uppercase tracking-tight text-white">
              {plan.name}
            </h3>
            {isCurrentPlan && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5">
                Current
              </span>
            )}
          </div>
          <p className="text-zinc-400 text-sm leading-relaxed">{plan.description}</p>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black font-display leading-none text-white">
              ${displayPrice}
            </span>
            <span className="text-zinc-500 font-mono text-sm pb-1.5">
              {plan.priceMonthly === 0 ? 'forever' : annual && plan.priceAnnual ? '/mo, billed annually' : '/mo'}
            </span>
          </div>
          {annual && annualSavings > 0 && (
            <p className="font-mono text-xs text-emerald-400 mt-1.5">
              Save ${annualSavings}/year vs monthly
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((f: string, i: number) => (
            <li key={i} className="flex items-start gap-3">
              <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-zinc-300">{f}</span>
            </li>
          ))}
        </ul>

        {/* Limits note for free tier */}
        {plan.tier === 'free' && (
          <div className="flex items-center gap-2 mb-6 px-3 py-2 bg-zinc-800 border border-zinc-700">
            <Lock className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
            <span className="font-mono text-xs text-zinc-500">
              3 habit limit · Module 1 only
            </span>
          </div>
        )}

        {/* CTA */}
        {plan.priceMonthly === 0 ? (
          isCurrentPlan ? (
            <Button disabled className="w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider opacity-50">
              Current Plan
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <Link href="/studio-log">Start Free</Link>
            </Button>
          )
        ) : isCurrentPlan ? (
          <Button disabled className="w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider opacity-50">
            Current Plan
          </Button>
        ) : isDowngrade ? (
          <Button
            variant="outline"
            disabled
            className="w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider border-zinc-700 text-zinc-500 opacity-50"
          >
            Downgrade
          </Button>
        ) : (
          <Button
            onClick={() => onSubscribe(plan.id, annual && plan.priceAnnual ? 'annual' : 'monthly')}
            disabled={isPending}
            className={`w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider ${
              plan.featured
                ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950'
                : 'bg-white hover:bg-zinc-100 text-zinc-950'
            }`}
          >
            {isPending ? 'Redirecting…' : 'Subscribe →'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Sponsor section ──────────────────────────────────────────────────────────

function SponsorSection() {
  const [loading, setLoading] = useState<'39' | '99' | null>(null);
  const [creator, setCreator] = useState('');
  const [message, setMessage] = useState('');

  async function startCheckout(amount: '39' | '99') {
    setLoading(amount);
    try {
      const res = await fetch('/api/payments/create-sponsor-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, creatorName: creator || undefined, message: message || undefined }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } finally {
      setLoading(null);
    }
  }

  return (
    <section className="border border-zinc-800 bg-zinc-900/50 p-8 md:p-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <HeartHandshake className="w-6 h-6 text-emerald-400" />
          <span className="font-mono text-[11px] uppercase tracking-widest text-emerald-400">
            501(c)(3) Tax-Deductible Donation
          </span>
        </div>
        <h2 className="font-display font-black text-3xl uppercase tracking-tight text-white mb-3">
          Sponsor a Creator
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed mb-8 max-w-xl">
          Gift an Academy Pass or Pro / Career membership to a deserving Free-tier artist. 100% goes directly to the creator's access. You'll receive a donation receipt.
        </p>

        {/* Optional fields */}
        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 block mb-1.5">
              Creator Name (Optional)
            </label>
            <input
              value={creator}
              onChange={(e) => setCreator(e.target.value)}
              placeholder="Name or @handle"
              className="w-full h-10 px-3 bg-zinc-950 border border-zinc-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/60 placeholder:text-zinc-600"
            />
          </div>
          <div>
            <label className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 block mb-1.5">
              Message (Optional)
            </label>
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A note to the artist..."
              className="w-full h-10 px-3 bg-zinc-950 border border-zinc-700 text-white text-sm font-mono focus:outline-none focus:border-emerald-500/60 placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Sponsor tiers */}
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            {
              amount: '39' as const,
              label: 'Academy Pass',
              desc: 'Unlimited habits, full workshop access, certification path — 1 month.',
              color: 'border-emerald-500/30 hover:border-emerald-500/60',
            },
            {
              amount: '99' as const,
              label: 'Pro / Career',
              desc: 'Everything in Academy + Studio Ready badge, directory listing, placement priority — 1 month.',
              color: 'border-violet-500/30 hover:border-violet-500/60',
            },
          ].map(({ amount, label, desc, color }) => (
            <button
              key={amount}
              onClick={() => startCheckout(amount)}
              disabled={!!loading}
              className={`text-left p-5 border ${color} bg-zinc-950 transition-all group`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="font-display font-black text-lg uppercase text-white">{label}</span>
                <span className="font-mono font-bold text-2xl text-white">${amount}</span>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed mb-4">{desc}</p>
              <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400 group-hover:gap-2 transition-all">
                <Sparkles className="w-3.5 h-3.5" />
                {loading === amount ? 'Redirecting…' : 'Donate & Sponsor →'}
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Plans() {
  const { data: plans, isLoading } = useListPlans({ query: { queryKey: ['listPlans'] } });
  const { data: user } = useGetCurrentUser();
  const checkout = useCreateCheckoutSession();
  const [annual, setAnnual] = useState(false);

  const handleSubscribe = (planId: string, billing: 'monthly' | 'annual') => {
    checkout.mutate(
      { data: { planId, billing } as any },
      {
        onSuccess: (res: any) => {
          if (res.checkoutUrl) window.location.href = res.checkoutUrl;
        },
      }
    );
  };

  if (isLoading) return <div className="p-8 font-mono animate-pulse text-zinc-500">Loading membership tiers…</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-16 py-16">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] uppercase tracking-widest mb-2">
            <Zap className="w-3.5 h-3.5" />
            AIMD Membership
          </div>
          <h1 className="text-5xl md:text-7xl font-black font-display uppercase tracking-tight">
            Invest in the Grind
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Select your tier. Access the academy. Build your career.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 mt-4 p-1 border border-zinc-800 bg-zinc-900">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                !annual ? 'bg-emerald-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                annual ? 'bg-emerald-500 text-zinc-950 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Annual
              <span className="ml-1.5 text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1 py-0.5">
                Save $69
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {plans?.map((plan: any) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              annual={annual}
              userTier={user?.tier}
              onSubscribe={handleSubscribe}
              isPending={checkout.isPending}
            />
          ))}
        </div>

        {/* Feature comparison note */}
        <div className="text-center text-xs font-mono text-zinc-600 space-y-1">
          <p>All plans include access to the AIMD community. Cancel anytime.</p>
          <p>
            Academy Pass annual billing: $399/year (equivalent to ~$33/mo).{' '}
            <Link href="/mission" className="text-emerald-400 underline">Learn about our mission →</Link>
          </p>
        </div>

        {/* Sponsor section */}
        <SponsorSection />
      </div>
    </div>
  );
}
