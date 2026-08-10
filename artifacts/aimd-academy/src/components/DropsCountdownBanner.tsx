import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { ChevronRight, Clock, Sparkles } from 'lucide-react';

// ─── Drop definitions ─────────────────────────────────────────────────────────

interface Drop {
  id: string;
  type: 'chair' | 'masterclass' | 'event';
  title: string;
  subtitle: string;
  dropsAt: Date;
  href: string;
  accent: string;       // tailwind text color
  bgAccent: string;     // tailwind bg/border
}

const DROPS: Drop[] = [
  {
    id: 'miami-chair',
    type: 'chair',
    title: 'Pro Resident Chair Drop — Miami',
    subtitle: '3 open resident spots at AIMD Miami. Studio Ready required.',
    dropsAt: new Date('2026-08-12T18:00:00'),
    href: '/job-board',
    accent: 'text-emerald-400',
    bgAccent: 'border-emerald-500/30 bg-emerald-500/5',
  },
  {
    id: 'masterclass-voss',
    type: 'masterclass',
    title: 'Tattooing Masterclass — Elena Voss',
    subtitle: 'Limited seats. Fine line & botanical deep-dive. 6-week cohort.',
    dropsAt: new Date('2026-08-15T12:00:00'),
    href: '/workshops',
    accent: 'text-violet-400',
    bgAccent: 'border-violet-500/30 bg-violet-500/5',
  },
  {
    id: 'popup-atl',
    type: 'event',
    title: 'AIMD × Cultured Concrete Pop-Up — ATL',
    subtitle: 'Live tattooing, mural installation, and badge check-in.',
    dropsAt: new Date('2026-08-22T20:00:00'),
    href: '/events',
    accent: 'text-amber-400',
    bgAccent: 'border-amber-500/30 bg-amber-500/5',
  },
];

const TYPE_LABELS: Record<Drop['type'], string> = {
  chair: 'Chair Drop',
  masterclass: 'Masterclass',
  event: 'Live Event',
};

// ─── Countdown hook ───────────────────────────────────────────────────────────

function useCountdown(target: Date) {
  const calc = () => {
    const diff = Math.max(0, target.getTime() - Date.now());
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000) / 60_000),
      seconds: Math.floor((diff % 60_000) / 1_000),
      expired: diff === 0,
    };
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [target.getTime()]);
  return t;
}

// ─── Single drop card ─────────────────────────────────────────────────────────

function DropCard({ drop }: { drop: Drop }) {
  const cd = useCountdown(drop.dropsAt);

  const Pad = ({ n }: { n: number }) => (
    <span>{String(n).padStart(2, '0')}</span>
  );

  return (
    <Link href={drop.href}>
      <div
        className={`flex items-center gap-4 px-5 py-4 border ${drop.bgAccent} cursor-pointer group transition-all hover:brightness-110`}
      >
        {/* Type pill */}
        <span
          className={`font-mono text-[10px] uppercase tracking-widest ${drop.accent} border border-current px-2 py-0.5 flex-shrink-0`}
        >
          {TYPE_LABELS[drop.type]}
        </span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{drop.title}</p>
          <p className="text-xs text-zinc-500 truncate hidden sm:block">{drop.subtitle}</p>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Clock className={`w-3.5 h-3.5 ${drop.accent}`} />
          <span className={`font-mono text-xs tabular-nums ${drop.accent}`}>
            {cd.expired ? (
              <span className="text-zinc-400">Live now</span>
            ) : cd.days > 0 ? (
              <><Pad n={cd.days} />d <Pad n={cd.hours} />h</>
            ) : (
              <><Pad n={cd.hours} />:<Pad n={cd.minutes} />:<Pad n={cd.seconds} /></>
            )}
          </span>
        </div>

        <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}

// ─── Banner ───────────────────────────────────────────────────────────────────

export function DropsCountdownBanner() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-zinc-800 hover:bg-zinc-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span className="font-mono text-xs uppercase tracking-widest text-zinc-300">
            Upcoming Drops
          </span>
          <span className="font-mono text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5">
            {DROPS.length} Live
          </span>
        </div>
        <span className="font-mono text-[10px] text-zinc-600 uppercase">
          {collapsed ? 'Show' : 'Hide'}
        </span>
      </button>

      {/* Drop list */}
      {!collapsed && (
        <div className="divide-y divide-zinc-800/60">
          {DROPS.map((drop) => (
            <DropCard key={drop.id} drop={drop} />
          ))}
        </div>
      )}
    </section>
  );
}
