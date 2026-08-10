import { useState } from 'react';
import { CheckCircle2, QrCode, Shield, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Event registry ───────────────────────────────────────────────────────────

interface AimdEvent {
  code: string;
  name: string;
  date: string;
  location: string;
  badge: {
    name: string;
    description: string;
    color: string;      // tailwind accent class
    symbol: string;     // emoji
  };
  exclusive: string;    // unlocked content description
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
  'AIMD-MIA26': {
    code: 'AIMD-MIA26',
    name: 'Pro Resident Chair Drop — Miami',
    date: 'Aug 12, 2026',
    location: 'Miami, FL',
    badge: {
      name: 'Miami Resident Drop',
      description: 'Attended the Miami Chair Drop event. Early access to resident applications.',
      color: 'emerald',
      symbol: '🌴',
    },
    exclusive: 'Priority access to the next 3 Miami studio chair openings.',
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
  emerald: { text: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/40',glow: 'shadow-emerald-500/20' },
  violet:  { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/40', glow: 'shadow-violet-500/20' },
};

// ─── Badge display ────────────────────────────────────────────────────────────

function EarnedBadge({ event, onReset }: { event: AimdEvent; onReset: () => void }) {
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
        <div className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-zinc-950 border-2 ${ac.border} flex items-center justify-center`}>
          <CheckCircle2 className={`w-5 h-5 ${ac.text}`} />
        </div>
      </div>

      <div>
        <p className={`font-mono text-[11px] uppercase tracking-widest ${ac.text} mb-1`}>
          Badge Claimed
        </p>
        <h2 className="font-display font-black text-3xl uppercase tracking-tight text-white mb-1">
          {event.badge.name}
        </h2>
        <p className="text-zinc-400 text-sm max-w-xs mx-auto">{event.badge.description}</p>
      </div>

      {/* Exclusive unlock */}
      <div className={`w-full max-w-sm px-5 py-4 ${ac.bg} border ${ac.border}`}>
        <div className="flex items-start gap-3">
          <Sparkles className={`w-4 h-4 ${ac.text} flex-shrink-0 mt-0.5`} />
          <div className="text-left">
            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mb-0.5">
              Exclusive Unlocked
            </p>
            <p className="text-sm text-white">{event.exclusive}</p>
          </div>
        </div>
      </div>

      <Button
        variant="outline"
        className="rounded-none border-zinc-700 text-zinc-400 hover:text-white font-mono text-xs uppercase tracking-wider"
        onClick={onReset}
      >
        Check in another code
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Status = 'idle' | 'success' | 'error';

export default function CheckIn() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [claimedEvent, setClaimedEvent] = useState<AimdEvent | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    const event = EVENTS[trimmed];
    if (event) {
      setClaimedEvent(event);
      setStatus('success');
    } else {
      setStatus('error');
    }
  }

  function reset() {
    setCode('');
    setStatus('idle');
    setClaimedEvent(null);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 md:p-10">
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] uppercase tracking-widest mb-5">
            <QrCode className="w-3.5 h-3.5" />
            Event Check-In · POAP Badge Claim
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tight mb-3">
            Claim Your Badge
          </h1>
          <p className="text-zinc-400 text-base">
            Scan the QR code at any AIMD pop-up, drop, or live event — or enter your event code below to claim your limited-edition attendee badge and unlock exclusive content.
          </p>
        </div>

        {status === 'success' && claimedEvent ? (
          <EarnedBadge event={claimedEvent} onReset={reset} />
        ) : (
          <>
            {/* QR scan prompt */}
            <div className="relative w-full aspect-square max-w-xs mx-auto mb-8 border border-zinc-800 bg-zinc-900 flex flex-col items-center justify-center gap-4 overflow-hidden">
              {/* Corner brackets */}
              {['top-3 left-3', 'top-3 right-3 rotate-90', 'bottom-3 right-3 rotate-180', 'bottom-3 left-3 -rotate-90'].map((pos, i) => (
                <div key={i} className={`absolute ${pos} w-6 h-6 border-t-2 border-l-2 border-emerald-500/60`} />
              ))}

              <QrCode className="w-16 h-16 text-zinc-700" strokeWidth={1} />
              <p className="font-mono text-xs text-zinc-600 uppercase tracking-widest text-center px-4">
                Point camera at event QR code<br />or enter your code below
              </p>
            </div>

            {/* Code entry */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  Event Code
                </label>
                <Input
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setStatus('idle'); }}
                  placeholder="AIMD-XXXXX"
                  className="rounded-none bg-zinc-900 border-zinc-700 text-white font-mono text-base uppercase tracking-wider placeholder:text-zinc-600 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/60 h-12"
                  autoFocus
                />
                {status === 'error' && (
                  <div className="flex items-center gap-2 text-red-400 font-mono text-xs">
                    <XCircle className="w-4 h-4" />
                    Code not found. Check the event card or try again.
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-none bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider"
                disabled={!code.trim()}
              >
                <Shield className="w-4 h-4 mr-2" />
                Claim Badge
              </Button>
            </form>

            {/* Active events hint */}
            <div className="mt-10 border-t border-zinc-800 pt-6">
              <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 mb-3">
                Active Event Codes
              </p>
              <div className="space-y-2">
                {Object.values(EVENTS).map((ev) => (
                  <button
                    key={ev.code}
                    onClick={() => { setCode(ev.code); setStatus('idle'); }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors group text-left"
                  >
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                        {ev.name}
                      </p>
                      <p className="text-[11px] text-zinc-600 font-mono mt-0.5">
                        {ev.location} · {ev.date}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-zinc-600 group-hover:text-zinc-400">
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
