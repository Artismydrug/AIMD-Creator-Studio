import { useState } from 'react';
import { Calendar, Flame, MessageSquare } from 'lucide-react';
import StudioLog from '@/pages/StudioLog';
import Messages from '@/pages/Messages';
import Events from '@/pages/Events';

type CommunityView = 'feed' | 'messages' | 'events';

const VIEWS: Array<{ id: CommunityView; label: string; description: string; icon: typeof Flame }> = [
  { id: 'feed', label: 'Feed', description: 'Share work and connect with creators.', icon: Flame },
  { id: 'messages', label: 'Messages', description: 'Keep conversations with creators in one place.', icon: MessageSquare },
  { id: 'events', label: 'Events', description: 'Find pop-ups, gallery activations, and studio gatherings.', icon: Calendar },
];

export default function Community() {
  const [activeView, setActiveView] = useState<CommunityView>('feed');
  const currentView = VIEWS.find((view) => view.id === activeView)!;

  return (
    <div className="min-h-full">
      <header className="px-6 pt-8 pb-5 md:px-10 md:pt-10 border-b border-border bg-card/40">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-primary mb-2">Creator Studio</p>
        <h1 className="font-display text-4xl md:text-5xl font-black uppercase tracking-tight">Community</h1>
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
        {activeView === 'feed' && <StudioLog />}
        {activeView === 'messages' && <Messages />}
        {activeView === 'events' && <Events />}
      </div>
    </div>
  );
}