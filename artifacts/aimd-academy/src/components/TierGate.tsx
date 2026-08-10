import { ReactNode } from 'react';
import { Link } from 'wouter';
import { Lock, Sparkles } from 'lucide-react';
import { useGetCurrentUser } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tier = 'free' | 'academy' | 'pro';

const TIER_RANK: Record<string, number> = { free: 0, academy: 1, pro: 2 };

const TIER_LABELS: Record<Tier, string> = {
  free:    'Studio Starter Pass',
  academy: 'Academy Pass',
  pro:     'Pro / Career',
};

const TIER_PRICES: Record<Tier, string> = {
  free:    '$0/mo',
  academy: '$39/mo',
  pro:     '$99/mo',
};

// ─── Default upgrade banner ───────────────────────────────────────────────────

function DefaultFallback({ required }: { required: Tier }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center border border-dashed border-zinc-700 bg-zinc-900/40">
      <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
        <Lock className="w-6 h-6 text-emerald-400" />
      </div>
      <h3 className="font-display font-black text-xl uppercase tracking-tight mb-2">
        {TIER_LABELS[required]} Required
      </h3>
      <p className="text-sm text-zinc-400 max-w-xs mb-6">
        This feature is available on the {TIER_LABELS[required]} plan
        ({TIER_PRICES[required]}) and above.
      </p>
      <Button asChild className="rounded-none bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider">
        <Link href="/plans">
          <Sparkles className="w-4 h-4 mr-2" />
          Upgrade Plan
        </Link>
      </Button>
    </div>
  );
}

// ─── Inline gate (small, inline with content) ─────────────────────────────────

export function TierGateBadge({ required, label }: { required: Tier; label?: string }) {
  const { data: user } = useGetCurrentUser();
  const userRank = TIER_RANK[user?.tier ?? 'free'] ?? 0;
  if (userRank >= TIER_RANK[required]) return null;

  return (
    <Link href="/plans">
      <span className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 cursor-pointer hover:bg-emerald-500/20 transition-colors">
        <Lock className="w-2.5 h-2.5" />
        {label ?? TIER_LABELS[required]}
      </span>
    </Link>
  );
}

// ─── Main gate wrapper ────────────────────────────────────────────────────────

interface TierGateProps {
  /** Minimum tier needed to see children */
  required: Tier;
  children: ReactNode;
  /** Custom fallback UI instead of the default upgrade card */
  fallback?: ReactNode;
}

export function TierGate({ required, children, fallback }: TierGateProps) {
  const { data: user, isLoading } = useGetCurrentUser();

  if (isLoading) return null;

  const userRank = TIER_RANK[user?.tier ?? 'free'] ?? 0;
  const requiredRank = TIER_RANK[required] ?? 0;

  if (userRank >= requiredRank) return <>{children}</>;

  return <>{fallback ?? <DefaultFallback required={required} />}</>;
}

// ─── Hook variant ─────────────────────────────────────────────────────────────

export function useTierAccess(required: Tier): { allowed: boolean; loading: boolean } {
  const { data: user, isLoading } = useGetCurrentUser();
  const userRank = TIER_RANK[user?.tier ?? 'free'] ?? 0;
  return { allowed: userRank >= TIER_RANK[required], loading: isLoading };
}
