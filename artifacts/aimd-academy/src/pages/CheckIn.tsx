import { useState } from 'react';
import { CheckCircle2, QrCode, Shield, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Event registry (client-side, for display only) ───────────────────────────

interface AimdEvent {
  code: string;
  name: string;
  date: string;
  location: string;
  badge: {
    name: string;
    description: string;
    color: string;
    symbol: string;
  };
  exclusive: string;
}

const EVENTS: Record<string, AimdEvent> = {
  'AIMD-ATL26': {
    code: 'AIMD-ATL26',
    name: 'AIMD × Cultured Concrete Pop-Up',
    date: 'Aug 22, 2026',
    location: 'Atlanta, GA',
    badge: {
      name: 'ATL Attendee',
      description: 'Present at the AIMD Atlanta Pop-Up. Certified witness to the movement.',
      color: 'amber',
      symbol: '🍑',
    },
    exclusive: 'Unlock the Atlanta studio directory & guest chair fast-track application.',
  },
  'AIMD-CHI26': {
    code: 'AIMD-CHI26',
    name: 'AIMD Chicago Art Week',
    date: 'Sep 5, 2026',
    location: 'Chicago, IL',
    badge: {
      name: 'Windy City Creator',
      description: 'Represented at AIMD Chicago Art Week. Community certified.',
      color: 'violet',
      symbol: '🏙️',
    },
    exclusive: 'Unlock the Chicago mentor network and exclusive skill-track bonus module.',
  },
};

const ACCENT: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  amber:   { text: 'text-amber-400',  bg: 'bg-amber-500/10',  border: 'border-amber-500/40',  glow: 'shadow-amber-500/20' },
  emerald: { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/40', glow: 'shadow-emerald-500/20' },
  violet:  { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/40', glow: 'shadow-violet-500/20' },
};

// ─── Badge display ────────────────────────────────────────────────────────────

function EarnedBadge({
  event,
  alreadyClaimed,
  onReset,
}: {
  event: AimdEvent;
  alreadyClaimed: boolean;
  onReset: () => void;
}) {
  const ac = ACCENT[event.badge.color];

  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      {/* Badge visual */}
      <div className="relative">
        <div
          className={`w-32 h-32 rounded-full ${ac.bg} ${ac.border} border-2 flex flex-col items-center justify-center shadow-xl ${ac.glow}`}
          style={{ boxShadow: `0 0 40px 4px var(--tw-shadow-color, rgba(0,0,0,0))` }}
        >
          <span className="text-5xl leading-none">{event.badge.symbol}</span>
        </div>
        {/* Verified ring */}
        <div className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-background border-2 ${ac.border} flex items-center justify-center`}>
          <CheckCircle2 className={`w-5 h-5 ${ac.text}`} />
        </div>
      </div>

      <div>
        <p className={`font-mono text-[11px] uppercase tracking-widest ${ac.text} mb-1`}>
          {alreadyClaimed ? 'Already Claimed' : 'Badge Claimed'}
        </p>
        <h2 className="font-display font-black text-3xl uppercase tracking-tight text-white mb-1">
          {event.badge.name}
        </h2>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto">{event.badge.description}</p>
        {alreadyClaimed && (
          <p className="text-muted-foreground text-xs mt-2 font-mono">
            You already claimed this badge — it's on your profile.
          </p>
        )}
      </div>

      {/* Exclusive unlock */}
      <div className={`w-full max-w-sm px-5 py-4 ${ac.bg} border ${ac.border}`}>
        <div className="flex items-start gap-3">
          <Sparkles className={`w-4 h-4 ${ac.text} flex-shrink-0 mt-0.5`} />
          <div className="text-left">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
              Exclusive Unlocked
            </p>
            <p className="text-sm text-white">{event.exclusive}</p>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="rounded-none border-border text-muted-foreground hover:text-white font-mono text-xs uppercase tracking-wider"
        onClick={onReset}
      >
        Check in another code
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'loading' | 'success' | 'already_claimed' | 'error' | 'not_found' | 'auth_required';

export default function CheckIn() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [claimedEvent, setClaimedEvent] = useState<AimdEvent | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();

    // Quick client-side check so we can show the event UI immediately
    const event = EVENTS[trimmed];
    if (!event) {
      setStatus('not_found');
      return;
    }

    setStatus('loading');

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ eventCode: trimmed }),
      });

      if (res.status === 401) {
        setStatus('auth_required');
        return;
      }

      if (res.status === 404) {
        setStatus('not_found');
        return;
      }

      if (!res.ok) {
        setStatus('error');
        return;
      }

      const data = await res.json();
      setClaimedEvent(event);
      setStatus(data.alreadyClaimed ? 'already_claimed' : 'success');
    } catch {
      setStatus('error');
    }
  }

  function reset() {
    setCode('');
    setStatus('idle');
    setClaimedEvent(null);
  }

  const showSuccess = (status === 'success' || status === 'already_claimed') && claimedEvent;

  return (
    <div className="min-h-screen bg-background text-white p-6 md:p-10">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 text-primary font-mono text-[11px] uppercase tracking-widest mb-5">
            <QrCode className="w-3.5 h-3.5" />
            Event Check-In · POAP Badge Claim
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tight mb-3">
            Claim Your Badge
          </h1>
          <p className="text-muted-foreground text-base">
            Scan the QR code at any AIMD pop-up, drop, or live event — or enter your event code below to claim your limited-edition attendee badge and unlock exclusive content.
          </p>
        </div>

        {showSuccess ? (
          <EarnedBadge
            event={claimedEvent}
            alreadyClaimed={status === 'already_claimed'}
            onReset={reset}
          />
        ) : (
          <>
            {/* QR scan prompt */}
            <div className="relative w-full aspect-square max-w-xs mx-auto mb-8 border border-border bg-muted/40 flex flex-col items-center justify-center gap-4 overflow-hidden">
              {/* Corner brackets */}
              {(['top-3 left-3', 'top-3 right-3 rotate-90', 'bottom-3 right-3 rotate-180', 'bottom-3 left-3 -rotate-90'] as const).map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-6 h-6 border-t-2 border-l-2 border-primary/50`} />
              ))}

              <QrCode className="w-16 h-16 text-muted-foreground" strokeWidth={1} />
              <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest text-center px-4">
                Point camera at event QR code<br />or enter your code below
              </p>
            </div>

            {/* Code entry */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  Event Code
                </label>
                <Input
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setStatus('idle'); }}
                  placeholder="AIMD-XXXXX"
                  className="rounded-none bg-muted/40 border-border text-white font-mono text-base uppercase tracking-wider placeholder:text-muted-foreground focus-visible:ring-emerald-500/40 focus-visible:border-primary/50 h-12"
                  autoFocus
                />
                {status === 'not_found' && (
                  <div className="flex items-center gap-2 text-red-400 font-mono text-xs">
                    <XCircle className="w-4 h-4" />
                    Code not found. Check the event card or try again.
                  </div>
                )}
                {status === 'auth_required' && (
                  <div className="flex items-center gap-2 text-amber-400 font-mono text-xs">
                    <XCircle className="w-4 h-4" />
                    Sign in first to claim your badge.
                  </div>
                )}
                {status === 'error' && (
                  <div className="flex items-center gap-2 text-red-400 font-mono text-xs">
                    <XCircle className="w-4 h-4" />
                    Something went wrong. Please try again.
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-none bg-primary hover:bg-primary/90 text-zinc-950 font-bold uppercase tracking-wider"
                disabled={!code.trim() || status === 'loading'}
              >
                <Shield className="w-4 h-4 mr-2" />
                {status === 'loading' ? 'Claiming…' : 'Claim Badge'}
              </Button>
            </form>

            {/* Active events hint */}
            <div className="mt-10 border-t border-border pt-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                Active Event Codes
              </p>
              <div className="space-y-2">
                {Object.values(EVENTS).map((ev) => (
                  <button
                    key={ev.code}
                    onClick={() => { setCode(ev.code); setStatus('idle'); }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-muted/40 border border-border hover:border-border transition-colors group text-left"
                  >
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-primary transition-colors">
                        {ev.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {ev.location} · {ev.date}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground group-hover:text-muted-foreground">
                      {ev.code}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
