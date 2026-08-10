import { 
  useGetDashboardSummary, 
  useGetHabitHeatmap, 
  useGetActivityFeed, 
  useListHabits, 
  useLogHabitSession, 
  getGetDashboardSummaryQueryKey,
  getListHabitsQueryKey
} from "@workspace/api-client-react";
import { format, subDays, isSameDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Flame, Target, Trophy, Clock, Image as ImageIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary();
  const { data: heatmap, isLoading: isLoadingHeatmap } = useGetHabitHeatmap();
  const { data: activityFeed, isLoading: isLoadingFeed } = useGetActivityFeed({ limit: 10 });
  const { data: habits, isLoading: isLoadingHabits } = useListHabits();
  
  const logSession = useLogHabitSession();

  const handleCompleteHabit = (habitId: number, targetMinutes: number) => {
    logSession.mutate({
      id: habitId,
      data: { minutesSpent: targetMinutes }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHabitsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-black tracking-tighter uppercase">Creator Hub</h1>
        <p className="text-muted-foreground font-mono text-sm">Stay disciplined. Build your craft.</p>
      </header>

      {/* Stats Row */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon={Flame} 
          label="Current Streak" 
          value={summary?.currentStreakDays ? `${summary.currentStreakDays} Days` : "0 Days"} 
          loading={isLoadingSummary} 
          highlight 
        />
        <StatCard 
          icon={Trophy} 
          label="Longest Streak" 
          value={summary?.longestStreakDays ? `${summary.longestStreakDays} Days` : "0 Days"} 
          loading={isLoadingSummary} 
        />
        <StatCard 
          icon={Target} 
          label="Completion Rate" 
          value={summary?.completionRate ? `${summary.completionRate}%` : "0%"} 
          loading={isLoadingSummary} 
        />
        <StatCard 
          icon={Clock} 
          label="Total Habits" 
          value={summary?.totalHabits?.toString() || "0"} 
          loading={isLoadingSummary} 
        />
      </section>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          {/* Heatmap */}
          <section className="bg-card border border-border p-6 rounded-lg">
            <h2 className="text-xl font-bold tracking-tight mb-6">Activity Heatmap</h2>
            {isLoadingHeatmap ? (
              <Skeleton className="h-32 w-full bg-white/5" />
            ) : (
              <Heatmap data={heatmap || []} />
            )}
          </section>

          {/* Today's Habits */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight">Today's Focus</h2>
              <span className="text-sm font-mono text-muted-foreground">{format(new Date(), 'MMM dd, yyyy')}</span>
            </div>
            
            <div className="space-y-3">
              {isLoadingHabits ? (
                Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full bg-white/5" />)
              ) : habits && habits.length > 0 ? (
                habits.map(habit => (
                  <div key={habit.id} className="flex items-center justify-between p-4 bg-card border border-border rounded-lg group hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => !habit.completedToday && handleCompleteHabit(habit.id, habit.targetMinutes)}
                        disabled={habit.completedToday || logSession.isPending}
                        className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:hover:text-muted-foreground"
                      >
                        {habit.completedToday ? (
                          <CheckCircle2 className="w-6 h-6 text-primary" />
                        ) : (
                          <Circle className="w-6 h-6" />
                        )}
                      </button>
                      <div>
                        <h3 className="font-bold text-sm tracking-wide">{habit.name}</h3>
                        <p className="text-xs text-muted-foreground font-mono">{habit.targetMinutes} min • {habit.category}</p>
                      </div>
                    </div>
                    {habit.currentStreak > 0 && (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-primary bg-primary/10 px-2 py-1 rounded">
                        <Flame className="w-3.5 h-3.5" />
                        {habit.currentStreak}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-8 text-center border border-dashed border-white/10 rounded-lg text-muted-foreground">
                  No habits set yet. Start small.
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Activity Feed */}
        <aside className="space-y-6">
          <h2 className="text-xl font-bold tracking-tight">Studio Activity</h2>
          <div className="bg-card border border-border rounded-lg p-4 space-y-6">
            {isLoadingFeed ? (
              Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full bg-white/5" />)
            ) : activityFeed && activityFeed.length > 0 ? (
              activityFeed.map(item => (
                <div key={item.id} className="flex gap-4 items-start">
                  <div className="mt-1 shrink-0">
                    {item.type === 'habit_log' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    {item.type === 'studio_post' && <ImageIcon className="w-4 h-4 text-amber-500" />}
                    {item.type === 'badge_earned' && <Trophy className="w-4 h-4 text-blue-500" />}
                    {item.type === 'module_complete' && <Target className="w-4 h-4 text-emerald-500" />}
                    {item.type === 'enrollment' && <Flame className="w-4 h-4 text-purple-500" />}
                  </div>
                  <div>
                    <p className="text-sm">{item.description}</p>
                    <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest mt-1 block">
                      {format(new Date(item.createdAt), 'MMM dd • h:mm a')}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No recent activity.</div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, loading, highlight = false }: any) {
  return (
    <div className={`p-6 rounded-lg border ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-3 mb-2 text-muted-foreground">
        <Icon className={`w-4 h-4 ${highlight ? 'text-primary' : ''}`} />
        <span className="text-xs font-mono uppercase tracking-widest">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16 bg-white/10" />
      ) : (
        <div className={`text-2xl md:text-3xl font-black tracking-tighter ${highlight ? 'text-primary' : ''}`}>
          {value}
        </div>
      )}
    </div>
  );
}

function Heatmap({ data }: { data: any[] }) {
  // Generate a fake 365 day grid for visual layout if real data is small
  // But we try to map the provided data to the last 90 days for mobile friendliness
  const days = Array.from({ length: 90 }).map((_, i) => {
    const d = subDays(new Date(), 89 - i);
    const dayData = data.find(item => isSameDay(new Date(item.date), d));
    return {
      date: d,
      level: dayData ? dayData.level : 0
    };
  });

  return (
    <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide">
      {/* 13 columns of 7 rows roughly */}
      <div className="grid grid-rows-7 grid-flow-col gap-1.5">
        {days.map((day, i) => (
          <div 
            key={i}
            className={`w-3.5 h-3.5 rounded-sm transition-colors ${
              day.level === 0 ? 'bg-white/5' :
              day.level === 1 ? 'bg-primary/30' :
              day.level === 2 ? 'bg-primary/60' :
              day.level === 3 ? 'bg-primary/80' :
              'bg-primary shadow-[0_0_8px_rgba(16,185,129,0.5)]'
            }`}
            title={`${format(day.date, 'MMM dd')}: Level ${day.level}`}
          />
        ))}
      </div>
    </div>
  );
}
