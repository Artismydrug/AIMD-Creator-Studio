import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useListPlans, useCreateCheckoutSession } from '@workspace/api-client-react';
import { useGetCurrentUser } from '@workspace/api-client-react';
import { BookOpen, BriefcaseBusiness, Compass, Layers3, Sparkles, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

// ─── Tier rank helper ─────────────────────────────────────────────────────────

const TIER_RANK: Record<string, number> = { free: 0, academy: 1, pro: 2 };
const TIER_DISPLAY_NAMES: Record<string, string> = { free: 'Discovering Artist', academy: 'Dedicated Artist', pro: 'Professional Artist' };
const TIER_CONTENT = {
  free: {
    description: 'Start your practice. Find your people.',
    icon: Sparkles,
    features: [
      { icon: Sparkles, label: 'Make & share' },
      { icon: Compass, label: 'Daily practice' },
      { icon: Users, label: 'Community & events' },
    ],
  },
  academy: {
    description: 'Learn deeper. Get real feedback.',
    icon: Layers3,
    features: [
      { icon: BookOpen, label: 'Workshops' },
      { icon: Users, label: 'Instructor feedback' },
      { icon: Sparkles, label: 'Badges & priority events' },
    ],
  },
  pro: {
    description: 'Support for the work beyond the studio.',
    icon: BriefcaseBusiness,
    features: [
      { icon: Compass, label: 'Monthly coaching' },
      { icon: BriefcaseBusiness, label: 'Creative opportunities' },
      { icon: Layers3, label: 'Partner pipeline' },
    ],
  },
} as const;

const FALLBACK_PLANS = [
  { id: 'discovering-artist', tier: 'free', name: 'Discovering Artist', description: '', featured: false, features: [] },
  { id: 'dedicated-artist', tier: 'academy', name: 'Dedicated Artist', description: '', featured: true, features: [] },
  { id: 'professional-artist', tier: 'pro', name: 'Professional Artist', description: '', featured: false, features: [] },
];
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
  const isComingSoon = plan.tier !== 'free' && !isCurrentPlan;
  const tierContent = TIER_CONTENT[plan.tier as keyof typeof TIER_CONTENT] ?? TIER_CONTENT.free;
  const TierIcon = tierContent.icon;
  // Enforce requested prices locally based on tier
  const localPriceMonthly = plan.tier === 'academy' ? 39 : plan.tier === 'pro' ? 99 : 0;
  const localPriceAnnual = plan.tier === 'academy' ? 399 : plan.tier === 'pro' ? 999 : 0;

  const displayPrice = annual && localPriceAnnual
    ? Math.round(localPriceAnnual / 12)
    : localPriceMonthly;

  const annualSavings = localPriceAnnual
    ? localPriceMonthly * 12 - localPriceAnnual
    : 0;

  return (
    <div className={`relative flex flex-col border transition-all duration-200 ${
      plan.featured
        ? 'border-primary/50 bg-muted shadow-[0_0_40px_rgba(16,185,129,0.08)]'
        : 'border-border bg-background'
    }`}>
      {/* Most Popular badge */}
      {plan.featured && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="bg-primary text-zinc-950 font-mono text-[11px] font-bold uppercase tracking-widest px-3 py-0.5">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-8 flex flex-col flex-1">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-display font-black text-xl uppercase tracking-tight text-foreground">
              {TIER_DISPLAY_NAMES[plan.tier] ?? plan.name}
            </h3>
            {isCurrentPlan ? (
              <span className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/30 bg-primary/10 px-2 py-0.5">
                Current
              </span>
            ) : isComingSoon ? (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-foreground border border-amber-500/40 bg-amber-400/20 px-2 py-0.5">
                <Compass className="w-3 h-3" /> Coming soon
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <TierIcon className="w-4 h-4 text-primary shrink-0" />
            <p>{tierContent.description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          <div className="flex items-end gap-2">
            <span className="text-5xl font-black font-display leading-none text-foreground">
              ${annual && localPriceAnnual ? localPriceAnnual : localPriceMonthly}
            </span>
            <span className="text-muted-foreground font-mono text-sm pb-1.5">
              {localPriceMonthly === 0 ? 'forever' : annual && localPriceAnnual ? '/year' : '/mo'}
            </span>
          </div>
          {annual && annualSavings > 0 && (
            <p className="font-mono text-xs text-primary mt-1.5">
              Save ${annualSavings}/year vs monthly
            </p>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1">
          {tierContent.features.map((feature) => {
            const FeatureIcon = feature.icon;
            return (
            <li key={feature.label} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-primary/20 bg-primary/10 text-primary">
                <FeatureIcon className="w-3.5 h-3.5" />
              </span>
              <span className="text-sm text-foreground/80 pt-1">{feature.label}</span>
            </li>
            );
          })}
        </ul>

        {/* CTA */}
        {localPriceMonthly === 0 ? (
          isCurrentPlan ? (
            <Button disabled className="w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider opacity-50">
              Current Plan
            </Button>
          ) : (
            <Button
              asChild
              variant="outline"
              className="w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider border-border text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              <Link href="/community">Start Free</Link>
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
            className="w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider border-border text-muted-foreground opacity-50"
          >
            Downgrade
          </Button>
        ) : isComingSoon ? (
          <Button
            disabled
            className="w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider border border-primary/30 bg-primary/10 text-primary opacity-100"
          >
            Coming Soon
          </Button>
        ) : (
          <Button
            onClick={() => onSubscribe(plan.id, annual && localPriceAnnual ? 'annual' : 'monthly')}
            disabled={isPending}
            className={`w-full h-12 rounded-none font-mono font-bold uppercase tracking-wider ${
              plan.featured
                ? 'bg-primary hover:bg-primary/90 text-zinc-950'
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Plans() {
  const { data: plans, isLoading } = useListPlans({ query: { queryKey: ['listPlans'] } });
  const { data: user } = useGetCurrentUser();
  const checkout = useCreateCheckoutSession();
  const [annual, setAnnual] = useState(false);
  const queryClient = useQueryClient();
  const [upgradeStatus, setUpgradeStatus] = useState<'verifying' | 'done' | 'failed' | null>(null);
  const launchPlans = FALLBACK_PLANS.map(
    (fallback) => plans?.find((plan: any) => plan.tier === fallback.tier) ?? fallback,
  );

  // Returning from a successful Stripe Checkout: verify the session with the
  // server (which confirms payment with Stripe) so the new tier applies
  // immediately, even if the webhook hasn't landed yet.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (params.get('success') !== '1' || !sessionId) return;

    setUpgradeStatus('verifying');
    fetch('/api/payments/verify-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then(() => {
        setUpgradeStatus('done');
        queryClient.invalidateQueries();
      })
      .catch(() => setUpgradeStatus('failed'));

    // Clean the query params so refreshes don't re-verify.
    window.history.replaceState({}, '', window.location.pathname);
  }, [queryClient]);

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

  if (isLoading) return <div className="p-8 font-mono animate-pulse text-muted-foreground">Loading membership tiers…</div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-16 py-16">

        {/* Post-checkout status */}
        {upgradeStatus === 'verifying' && (
          <div data-testid="upgrade-verifying" className="max-w-2xl mx-auto p-4 border border-border bg-muted/40 font-mono text-sm text-muted-foreground text-center animate-pulse">
            Confirming your payment with Stripe…
          </div>
        )}
        {upgradeStatus === 'done' && (
          <div data-testid="upgrade-success" className="max-w-2xl mx-auto p-4 border border-primary/40 bg-primary/10 font-mono text-sm text-primary text-center">
            Payment confirmed — your membership is now active. Welcome to the next level.
          </div>
        )}
        {upgradeStatus === 'failed' && (
          <div data-testid="upgrade-failed" className="max-w-2xl mx-auto p-4 border border-destructive/40 bg-destructive/10 font-mono text-sm text-destructive text-center">
            We couldn't confirm the payment yet. If you completed checkout, your membership will activate automatically within a few minutes.
          </div>
        )}

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 text-primary font-mono text-[11px] uppercase tracking-widest mb-2">
            <Zap className="w-3.5 h-3.5" />
            AIMD Membership
          </div>
          <h1 className="text-5xl md:text-7xl font-black font-display uppercase tracking-tight">
            Invest in the Grind
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            One practice. Three artist paths. Start free.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 mt-4 p-1 border border-border bg-muted/40">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                !annual ? 'bg-primary text-zinc-950 font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-1.5 font-mono text-xs uppercase tracking-wider transition-colors ${
                annual ? 'bg-primary text-zinc-950 font-bold' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Annual
              <span className="ml-1.5 text-[10px] bg-primary/15 text-primary border border-primary/30 px-1 py-0.5">
                Save
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          {launchPlans.map((plan: any) => (
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
        <div className="text-center text-xs font-mono text-muted-foreground space-y-1">
          <p>All paths begin in the AIMD community.</p>
          <Link href="/mission" className="text-primary underline">Learn about our mission →</Link>
        </div>

      </div>
    </div>
  );
}
