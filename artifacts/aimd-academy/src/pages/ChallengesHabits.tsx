import { useState } from 'react';
import { Flame, Timer } from 'lucide-react';
import { WeeklyChallenge } from '@/pages/StudioLog';
import Habits from '@/pages/Habits';

type View = 'challenges' | 'habits';

const VIEWS: Array<{ id: View; label: string; description: string; icon: typeof Flame }> = [
  { id: 'challenges', label: 'Challenges', description: 'Take on the weekly brief, share your work, and vote for creators.', icon: Flame },
  { id: 'habits', label: 'Habits', description: 'Log your daily practice, run a session timer, and keep your streak alive.', icon: Timer },
];

export default function ChallengesHabits() {
  const [activeView, setActiveView] = useState<View>('challenges');
  const currentView = VIEWS.find((view) => view.id === activeView)!;

  return (
    <div className="min-h-full">
      <header className="px-6 pt-8 pb-5 md:px-10 md:pt-10 border-b border-border bg-card/40">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary mb-2">Creator Studio</p>
        <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tight">Challenges &amp; Habits</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{currentView.description}</p>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Challenges and habits views">
          {VIEWS.map((view) => {
            const Icon = view.icon;
            const selected = activeView === view.id;
            return (
              <button
                key={view.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveView(view.id)}
                className={`flex shrink-0 items-center gap-2 border px-4 py-2.5 font-mono text-xs uppercase tracking-wide transition-colors ${
                  selected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {view.label}
              </button>
            );
          })}
        </div>
      </header>

      <div role="tabpanel" className="px-6 md:px-10 py-8">
        <div className="max-w-3xl mx-auto">
          {activeView === 'challenges' ? <WeeklyChallenge /> : <Habits />}
        </div>
      </div>
    </div>
  );
}