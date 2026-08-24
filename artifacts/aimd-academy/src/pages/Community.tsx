import { useState } from 'react';
import { Flame, MessageSquare, Timer } from 'lucide-react';
import StudioLog from '@/pages/StudioLog';
import Habits from '@/pages/Habits';
import Messages from '@/pages/Messages';

type CommunityView = 'challenge' | 'practice' | 'messages';

const VIEWS: Array<{ id: CommunityView; label: string; description: string; icon: typeof Flame }> = [
  { id: 'challenge', label: 'Challenge & Community', description: 'Share work, join the weekly brief, and vote for creators.', icon: Flame },
  { id: 'practice', label: 'Daily Practice', description: 'Build habits, run a session timer, and keep your streak alive.', icon: Timer },
  { id: 'messages', label: 'Messages', description: 'Keep conversations with creators in one place.', icon: MessageSquare },
];

export default function Community() {
  const [activeView, setActiveView] = useState<CommunityView>('challenge');
  const currentView = VIEWS.find((view) => view.id === activeView)!;

  return (
    <div className="min-h-full">
      <header className="px-6 pt-8 pb-5 md:px-10 md:pt-10 border-b border-border bg-card/40">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary mb-2">Creator Studio</p>
        <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tight">Community & Practice</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{currentView.description}</p>

        <div className="mt-6 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Community views">
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

      <div role="tabpanel">
        {activeView === 'challenge' && <StudioLog />}
        {activeView === 'practice' && <Habits />}
        {activeView === 'messages' && <Messages />}
      </div>
    </div>
  );
}