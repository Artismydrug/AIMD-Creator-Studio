import { useState, useRef, useEffect } from 'react';
import { 
  useListHabits, 
  useCreateHabit, 
  useLogHabitSession, 
  useDeleteHabit,
  useGetHabitHeatmap 
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Square, Plus, Trash2, Check, Flame, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { Link } from 'wouter';

// ─── Tier limit banner ────────────────────────────────────────────────────────

function TierLimitBanner({ habitCount, limit }: { habitCount: number; limit: number }) {
  const isAtLimit = habitCount >= limit;
  return (
    <div className={`flex items-center justify-between gap-4 px-5 py-4 border ${
      isAtLimit
        ? 'border-amber-500/40 bg-amber-500/5'
        : 'border-zinc-800 bg-zinc-900/50'
    }`}>
      <div className="flex items-center gap-3">
        <Lock className={`w-4 h-4 flex-shrink-0 ${isAtLimit ? 'text-amber-400' : 'text-zinc-500'}`} />
        <div>
          <p className={`font-mono text-xs font-bold uppercase tracking-wider ${isAtLimit ? 'text-amber-400' : 'text-zinc-400'}`}>
            Studio Starter Pass — {habitCount}/{limit} Habits
          </p>
          <p className="text-xs text-zinc-500">
            {isAtLimit
              ? 'Habit limit reached. Upgrade to Academy Pass for unlimited habit tracking.'
              : `${limit - habitCount} habit slot${limit - habitCount !== 1 ? 's' : ''} remaining on your free plan.`}
          </p>
        </div>
      </div>
      {isAtLimit && (
        <Button asChild className="flex-shrink-0 rounded-none bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase tracking-wider h-8 px-4">
          <Link href="/plans">
            <Sparkles className="w-3 h-3 mr-1.5" />
            Upgrade
          </Link>
        </Button>
      )}
    </div>
  );
}

// ─── Heatmap gate ─────────────────────────────────────────────────────────────

function HeatmapSection({ heatmap, tier }: { heatmap: any[] | undefined; tier: string | undefined }) {
  const isLocked = tier === 'free';

  return (
    <section className="bg-card border border-border p-6 relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-mono text-sm uppercase text-muted-foreground">
          {isLocked ? 'Visual Heatmap' : '60-Day Consistency'}
        </h3>
        {isLocked && (
          <span className="font-mono text-[10px] text-amber-400 border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 uppercase tracking-widest flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" /> Academy+
          </span>
        )}
      </div>
      {isLocked ? (
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <div className="flex gap-1 opacity-20 pointer-events-none select-none">
            {[...Array(30)].map((_, i) => (
              <div key={i} className={`w-4 h-4 rounded-none ${
                [0,1,2,3,4][Math.floor(Math.random()*5)] === 0 ? 'bg-border' :
                [1][0] === 1 ? 'bg-primary/30' : 'bg-primary/60'
              }`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground font-mono text-center">
            Visual heatmaps & session analytics unlock on Academy Pass.{' '}
            <Link href="/plans" className="text-emerald-400 underline">Upgrade →</Link>
          </p>
        </div>
      ) : heatmap && heatmap.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {heatmap.slice(-60).map((day, i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-none transition-colors ${
                day.level === 0 ? 'bg-background border border-border' :
                day.level === 1 ? 'bg-primary/30' :
                day.level === 2 ? 'bg-primary/60' :
                day.level === 3 ? 'bg-primary/80' :
                'bg-primary'
              }`}
              title={`${day.date}: ${day.count} logs`}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground font-mono">No logs yet — start tracking to see your heatmap.</p>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Habits() {
  const { data: response, isLoading } = useListHabits({ query: { queryKey: ['listHabits'] } }) as any;
  const { data: heatmap } = useGetHabitHeatmap({ query: { queryKey: ['getHabitHeatmap'] } });

  // API now returns { habits, meta } — support both shapes
  const habits = response?.habits ?? response ?? [];
  const meta   = response?.meta;
  const tier   = meta?.tier;

  if (isLoading) return <div className="p-8 font-mono animate-pulse">Loading tracking systems...</div>;

  return (
    <div className="p-6 md:p-10 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">Discipline Tracker</h1>
          <p className="text-muted-foreground font-mono mt-2">Log your daily grinds. Build the habit.</p>
        </div>
        {/* Hide create button if free + at limit */}
        {(!meta || !meta.atLimit) && <CreateHabitDialog />}
      </header>

      {/* Free tier usage banner */}
      {meta?.habitLimit && (
        <TierLimitBanner habitCount={meta.habitCount} limit={meta.habitLimit} />
      )}

      {/* Heatmap */}
      <HeatmapSection heatmap={heatmap as any} tier={tier} />

      {/* Habits Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {habits?.map((habit: any) => (
          <HabitCard key={habit.id} habit={habit} />
        ))}
        {habits?.length === 0 && (
          <div className="col-span-full py-12 border border-dashed border-border flex flex-col items-center justify-center text-center">
            <ZapIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-bold font-display uppercase mb-2">No Habits Yet</h3>
            <p className="text-muted-foreground font-mono text-sm">Create your first habit to start the pipeline.</p>
          </div>
        )}

        {/* Locked slot cards for free tier */}
        {meta?.habitLimit && habits && habits.length < meta.habitLimit && [...Array(meta.habitLimit - habits.length)].map((_, i) => (
          <div key={`empty-${i}`} className="border border-dashed border-zinc-800 flex flex-col items-center justify-center py-10 opacity-40">
            <Plus className="w-6 h-6 text-zinc-600 mb-2" />
            <span className="font-mono text-xs text-zinc-600 uppercase">Empty Slot</span>
          </div>
        ))}

        {meta?.atLimit && (
          <div className="border border-amber-500/20 bg-amber-500/5 flex flex-col items-center justify-center py-10 text-center gap-3 px-4">
            <Lock className="w-6 h-6 text-amber-400" />
            <div>
              <p className="font-display font-bold uppercase text-sm text-white mb-1">Habit Limit Reached</p>
              <p className="font-mono text-xs text-zinc-500">Upgrade to Academy Pass for unlimited habits.</p>
            </div>
            <Button asChild className="rounded-none bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase h-8 px-4">
              <Link href="/plans">Upgrade →</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HabitCard ────────────────────────────────────────────────────────────────

function HabitCard({ habit }: { habit: any }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const logSession  = useLogHabitSession();
  const deleteHabit = useDeleteHabit();
  
  const [isTracking, setIsTracking]     = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = () => {
    setIsTracking(true);
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
  };

  const pauseTimer = () => {
    setIsTracking(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const stopAndLog = () => {
    pauseTimer();
    const minutes = Math.ceil(elapsedSeconds / 60);
    logSession.mutate(
      { id: habit.id, data: { minutesSpent: Math.max(1, minutes) } },
      {
        onSuccess: () => {
          toast({ title: 'Session logged!', description: `${Math.max(1, minutes)} minutes recorded.` });
          setElapsedSeconds(0);
          queryClient.invalidateQueries({ queryKey: ['listHabits'] });
          queryClient.invalidateQueries({ queryKey: ['getHabitHeatmap'] });
        },
      }
    );
  };

  const handleDelete = () => {
    deleteHabit.mutate({ id: habit.id }, {
      onSuccess: () => {
        toast({ title: 'Habit removed.' });
        queryClient.invalidateQueries({ queryKey: ['listHabits'] });
      },
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const progress = Math.min(100, (elapsedSeconds / (habit.targetMinutes * 60)) * 100);

  return (
    <div className={`border bg-card p-6 flex flex-col gap-4 ${habit.completedToday ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg leading-tight truncate">{habit.name}</h3>
          <p className="text-xs text-muted-foreground font-mono mt-1">
            Target: {habit.targetMinutes}m · Streak: {habit.currentStreak}d
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {habit.completedToday && <Check className="w-5 h-5 text-primary" />}
          <button onClick={handleDelete} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>{formatTime(elapsedSeconds)}</span>
          <span>{habit.targetMinutes}m goal</span>
        </div>
        <Progress value={progress} className="h-1.5 rounded-none bg-border [&>div]:bg-primary" />
      </div>

      <div className="flex gap-2">
        {!isTracking ? (
          <Button size="sm" variant="outline" onClick={startTimer} className="flex-1 rounded-none font-mono uppercase text-xs border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground">
            <Play className="w-3 h-3 mr-1.5" /> Start
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={pauseTimer} className="flex-1 rounded-none font-mono uppercase text-xs">
            <Pause className="w-3 h-3 mr-1.5" /> Pause
          </Button>
        )}
        {elapsedSeconds > 0 && (
          <Button size="sm" variant="outline" onClick={stopAndLog} className="flex-1 rounded-none font-mono uppercase text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10">
            <Square className="w-3 h-3 mr-1.5" /> Log
          </Button>
        )}
      </div>

      {habit.currentStreak > 0 && (
        <div className="flex items-center gap-1.5 pt-2 border-t border-border">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="font-mono text-xs text-muted-foreground">{habit.currentStreak} day streak</span>
          {habit.longestStreak > habit.currentStreak && (
            <span className="font-mono text-xs text-muted-foreground ml-auto">Best: {habit.longestStreak}d</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CreateHabitDialog ────────────────────────────────────────────────────────

function CreateHabitDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName]         = useState('');
  const [minutes, setMinutes]   = useState('30');
  const [category, setCategory] = useState('');
  const createHabit = useCreateHabit();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const submit = () => {
    createHabit.mutate(
      { data: { name, targetMinutes: parseInt(minutes), category: category || undefined } },
      {
        onSuccess: () => {
          setOpen(false); setName(''); setMinutes('30'); setCategory('');
          queryClient.invalidateQueries({ queryKey: ['listHabits'] });
        },
        onError: (err: any) => {
          if (err?.data?.error === 'habit_limit') {
            toast({ title: 'Habit limit reached', description: err.data.message, variant: 'destructive' });
            setOpen(false);
          }
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-none font-mono uppercase bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> New Habit
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-2xl">Create Habit</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Habit Name</label>
            <Input className="rounded-none border-border bg-background" placeholder="e.g. Daily Drawing" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Daily Target (Minutes)</label>
            <Input type="number" min="5" max="480" className="rounded-none border-border bg-background" value={minutes} onChange={e => setMinutes(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Category (Optional)</label>
            <Input className="rounded-none border-border bg-background" placeholder="e.g. Tattooing, Fine Art" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="rounded-none bg-primary text-primary-foreground" onClick={submit} disabled={!name || !minutes}>Create Habit</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ZapIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
