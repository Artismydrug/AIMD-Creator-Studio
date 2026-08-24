import { useGetDashboardSummary, useGetActivityFeed, useGetCurrentUser } from '@workspace/api-client-react';
import { Flame, Zap, CheckCircle2, TrendingUp, Trophy, ArrowUpRight, Coins } from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropsCountdownBanner } from '@/components/DropsCountdownBanner';

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({ query: { queryKey: ['getDashboardSummary'] } });
  const { data: feed } = useGetActivityFeed({ limit: 5 }, { query: { queryKey: ['getActivityFeed', 5] } });
  const { data: user } = useGetCurrentUser({ query: { queryKey: ['getCurrentUser'] } });

  if (isLoading) {
    return <div className="p-8 font-mono animate-pulse">Loading studio data...</div>;
  }

  return (
    <div className="p-6 md:p-10 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight">Creator Studio</h1>
          <p className="text-muted-foreground font-mono mt-2 font-bold text-primary">Discipline Eats Talent.</p>
          <p className="text-muted-foreground font-mono mt-1 text-xs uppercase tracking-wider">Welcome back to the grind.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 border border-primary/30 bg-primary/5 flex items-center gap-3">
            <Flame className="w-5 h-5 text-primary" />
            <div>
              <div className="text-xs font-mono uppercase text-muted-foreground">Current Streak</div>
              <div className="text-xl font-bold font-display">{summary?.currentStreakDays || 0} Days</div>
            </div>
          </div>
        </div>
      </header>

      {/* Live drops banner */}
      <DropsCountdownBanner />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Habits', value: summary?.totalHabits || 0, icon: Zap },
          { label: 'Posts This Month', value: summary?.totalPostsThisMonth || 0, icon: TrendingUp },
          { label: 'Enrolled Workshops', value: summary?.workshopsEnrolled || 0, icon: CheckCircle2 },
          { label: 'Badges Earned', value: summary?.badgesEarned || 0, icon: Trophy },
        ].map((stat, i) => (
          <div key={i} className="p-6 border border-border bg-card">
            <stat.icon className="w-6 h-6 text-primary mb-4" />
            <div className="text-3xl font-black font-display">{stat.value}</div>
            <div className="text-xs font-mono uppercase text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <section className="border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-primary/5 p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
            <Coins className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300">AIMD Points</p>
            <p className="font-display text-3xl font-black text-foreground">{user?.points ?? 0}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/badges"><Button variant="outline" className="rounded-none font-mono uppercase text-xs">Recognition</Button></Link>
          <Link href="/history"><Button variant="outline" className="rounded-none font-mono uppercase text-xs">History</Button></Link>
        </div>
      </section>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="md:col-span-2 space-y-8">
          {/* Focus Plan */}
          <section className="border border-border bg-card p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />
            <h2 className="text-2xl font-bold font-display uppercase mb-6 flex items-center gap-2">
              <TargetIcon className="w-6 h-6 text-primary" /> Today's Focus
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-background border border-border flex items-center justify-between group hover:border-primary/50 transition-colors">
                <div>
                  <h4 className="font-bold text-lg">Log Daily Habit</h4>
                  <p className="text-sm text-muted-foreground">Keep the {summary?.currentStreakDays} day streak alive</p>
                </div>
                <Link href="/habits">
                  <Button variant="outline" className="rounded-none font-mono uppercase text-xs">Do it</Button>
                </Link>
              </div>
              
              {summary?.skillTracksActive ? (
                <div className="p-4 bg-background border border-border flex items-center justify-between group hover:border-primary/50 transition-colors">
                  <div className="flex-1 mr-6">
                    <h4 className="font-bold text-lg mb-2">Continue Skill Track</h4>
                    <Progress value={summary.completionRate} className="h-2 rounded-none bg-border [&>div]:bg-primary" />
                  </div>
                  <Link href="/skill-tracks">
                    <Button variant="outline" className="rounded-none font-mono uppercase text-xs">Resume</Button>
                  </Link>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          {/* Activity Feed */}
          <section>
            <h3 className="font-display font-bold text-xl uppercase mb-6 flex items-center justify-between">
              Studio Activity
              <Link href="/studio-log">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none"><ArrowUpRight className="w-4 h-4" /></Button>
              </Link>
            </h3>
            <div className="space-y-4 border-l border-border ml-2 pl-6 relative">
              {feed?.length ? feed.map((item, i) => (
                <div key={i} className="relative">
                  <div className="absolute -left-[29px] top-1.5 w-2 h-2 bg-primary rounded-none" />
                  <div className="text-sm text-muted-foreground font-mono mb-1">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                  <div className="font-medium">{item.description}</div>
                </div>
              )) : (
                <div className="text-sm text-muted-foreground font-mono">No recent activity.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TargetIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
