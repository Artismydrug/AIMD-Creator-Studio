import { useListWorkshops } from '@workspace/api-client-react';
import { Brush, Dumbbell, Headphones, Scissors, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Preview = {
  title: string;
  eyebrow: string;
  description: string;
  icon: typeof Brush;
  accent: string;
  iconSurface: string;
  chips: string[];
  tier: string;
};

const PREVIEWS: Preview[] = [
  {
    title: 'Fashion Workshop',
    eyebrow: '01 / Fashion',
    description: 'Design, sketching, garment construction',
    icon: Scissors,
    accent: 'text-amber-300',
    iconSurface: 'bg-amber-400/15 border-amber-300/30',
    chips: ['8 focused modules', '30-min drills', 'Artist feedback'],
    tier: 'FASHION DESIGN - DEDICATED ARTIST MEMBERSHIP',
  },
  {
    title: 'Music Workshop',
    eyebrow: '02 / Music',
    description: 'Audio production, beat-making, mixing',
    icon: Headphones,
    accent: 'text-cyan-300',
    iconSurface: 'bg-cyan-400/15 border-cyan-300/30',
    chips: ['10 focused modules', '30-min drills', 'Artist feedback'],
    tier: 'MUSIC PRODUCTION - DEDICATED ARTIST MEMBERSHIP',
  },
  {
    title: 'Basketball Workshop',
    eyebrow: '03 / Basketball',
    description: 'Skills, IQ, physical fitness',
    icon: Dumbbell,
    accent: 'text-orange-300',
    iconSurface: 'bg-orange-400/15 border-orange-300/30',
    chips: ['12 focused modules', '30-min drills', 'Artist feedback'],
    tier: 'BASKETBALL - DEDICATED ARTIST MEMBERSHIP',
  },
  {
    title: 'Visual Arts Workshop',
    eyebrow: '04 / Visual Arts',
    description: 'Painting, illustration, mixed media',
    icon: Brush,
    accent: 'text-fuchsia-300',
    iconSurface: 'bg-fuchsia-400/15 border-fuchsia-300/30',
    chips: ['10 focused modules', '30-min drills', 'Artist feedback'],
    tier: 'VISUAL ARTS - DEDICATED ARTIST MEMBERSHIP',
  },
];

export default function Workshops() {
  const { isLoading } = useListWorkshops({}, { query: { queryKey: ['listWorkshops'] } });

  if (isLoading) return <div className="p-8 font-mono animate-pulse text-muted-foreground">Loading workshops…</div>;

  return (
    <div className="p-6 md:p-10 space-y-8">
      <header className="flex flex-col gap-3 pb-6 border-b border-border">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" /> AIMD Workshop Preview
        </p>
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">One craft. One apprenticeship.</h1>
        <p className="text-muted-foreground font-mono text-sm">Choose your lane. Build the work.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 lg:gap-6">
        {PREVIEWS.map((preview) => <WorkshopCard key={preview.title} preview={preview} />)}
      </div>
    </div>
  );
}

function WorkshopCard({ preview }: { preview: Preview }) {
  const Icon = preview.icon;

  return (
    <article className="group relative overflow-hidden border border-white/10 bg-slate-950 text-white shadow-xl transition-transform duration-300 hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-transparent to-amber-400/10 pointer-events-none" />
      <div className="relative flex min-h-[330px] flex-col p-5 md:p-6">
        <Badge className="w-fit rounded-full border border-fuchsia-300/30 bg-fuchsia-500/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-fuchsia-100 hover:bg-fuchsia-500/15">
          Coming Soon
        </Badge>

        <div className="mt-7 flex items-start justify-between gap-4">
          <div>
            <p className={`font-mono text-[10px] uppercase tracking-[0.2em] ${preview.accent}`}>{preview.eyebrow}</p>
            <h2 className="mt-2 font-display text-2xl font-black uppercase tracking-tight">{preview.title}</h2>
            <p className="mt-2 max-w-xs text-sm text-slate-300">{preview.description}</p>
          </div>
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${preview.iconSurface}`}>
            <Icon className={`h-6 w-6 ${preview.accent}`} />
          </div>
        </div>

        <div className="mt-auto pt-6">
          <div className="flex flex-wrap gap-2">
            {preview.chips.map((chip) => (
              <span key={chip} className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wide text-slate-200">
                <Sparkles className={`h-3 w-3 ${preview.accent}`} /> {chip}
              </span>
            ))}
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-fuchsia-200">{preview.tier}</p>
            <p className="mt-1 text-xs text-slate-300">Workshop access begins at $39/month when it opens.</p>
          </div>
        </div>
      </div>
    </article>
  );
}
