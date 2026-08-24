import { useMemo } from 'react';
import { useListHabits } from '@workspace/api-client-react';
import { useQueries } from '@tanstack/react-query';
import { Calendar, CheckCircle2, Clock, History as HistoryIcon } from 'lucide-react';

export default function History() {
  const { data: response, isLoading: habitsLoading } = useListHabits({ query: { queryKey: ['listHabits'] } });
  const habits = response?.habits ?? [];
  const logQueries = useQueries({
    queries: habits.map((habit: any) => ({
      queryKey: ['listHabitLogs', habit.id, 90],
      queryFn: async () => {
        const res = await fetch(`/api/habit-logs?habitId=${habit.id}&days=90`, { credentials: 'include' });
        if (!res.ok) throw new Error('History unavailable');
        return res.json() as Promise<any[]>;
      },
      staleTime: 30_000,
    })),
  });
  const entries = useMemo(() => logQueries.flatMap((query, index) =>
    ((query.data as any[]) ?? []).map((log) => ({ ...log, habitName: habits[index]?.name ?? 'Habit' }))
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [logQueries, habits]);
  const loading = habitsLoading || logQueries.some((query) => query.isLoading);

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-10">
      <header className="border-b border-border pb-7">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary mb-2">Your practice archive</p>
        <h1 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight">Session History</h1>
        <p className="text-muted-foreground mt-3">Every logged practice session, kept in one place.</p>
      </header>
      {loading && <div className="p-8 border border-border bg-card font-mono text-sm text-muted-foreground animate-pulse">Loading session history…</div>}
      {!loading && entries.length === 0 && (
        <div className="p-12 text-center border border-dashed border-border bg-card">
          <HistoryIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="font-display text-2xl font-bold uppercase">No sessions logged yet</h2>
          <p className="text-muted-foreground mt-2">Start a timer in Habits and your practice history will build here.</p>
        </div>
      )}
      {!loading && entries.length > 0 && (
        <div className="border border-border bg-card divide-y divide-border">
          {entries.map((entry) => (
            <article key={entry.id} className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0"><CheckCircle2 className={entry.completed ? 'text-primary' : 'text-muted-foreground'} /></div>
              <div className="flex-1"><h2 className="font-bold">{entry.habitName}</h2><div className="flex flex-wrap gap-4 mt-1 text-xs font-mono text-muted-foreground"><span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{entry.date}</span><span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{entry.minutesSpent} minutes</span></div></div>
              <span className={`font-mono text-[10px] uppercase tracking-wider ${entry.completed ? 'text-primary' : 'text-muted-foreground'}`}>{entry.completed ? 'Completed' : 'In progress'}</span>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}