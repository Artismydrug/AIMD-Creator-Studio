import { useState } from 'react';
import { trackEvent } from '@/lib/telemetry';
import {
  getGetProgressQueryKey,
  getGetRewardsQueryKey,
  useCheckInProgress,
  useGetActivityFeed,
  useGetCurrentUser,
  useGetDashboardSummary,
  useGetProgress,
  useSpinDailyReward,
  type DailySpinResult,
  type ProgressSummary,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/react';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Coins,
  Flame,
  Gift,
  Loader2,
  Sparkles,
  TrendingUp,
  Trophy,
  Zap,
} from 'lucide-react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary({ query: { queryKey: ['getDashboardSummary'] } });
  const { data: feed } = useGetActivityFeed({ limit: 5 }, { query: { queryKey: ['getActivityFeed', 5] } });
  const { data: user } = useGetCurrentUser({ query: { queryKey: ['getCurrentUser'] } });
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const progressQueryKey = getGetProgressQueryKey({ timezone });
  const {
    data: progress,
    isLoading: isProgressLoading,
    isError: isProgressError,
    refetch: refetchProgress,
  } = useGetProgress(
    { timezone },
    {
      query: {
        queryKey: progressQueryKey,
        enabled: isSignedIn === true,
        staleTime: 30_000,
      },
    },
  );
  const [rewardOpen, setRewardOpen] = useState(false);
  const [spinResult, setSpinResult] = useState<DailySpinResult | null>(null);

  const syncProgress = (nextProgress: ProgressSummary) => {
    queryClient.setQueryData(progressQueryKey, nextProgress);
    queryClient.invalidateQueries({ queryKey: ['getDashboardSummary'] });
    queryClient.invalidateQueries({ queryKey: ['getCurrentUser'] });
    queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
  };

  const checkInMutation = useCheckInProgress({
    mutation: {
      onSuccess: (nextProgress) => {
        if (!progress?.checkedInToday && nextProgress.checkedInToday) trackEvent('daily_check_in_completed');
        syncProgress(nextProgress);
      },
    },
  });

  const spinMutation = useSpinDailyReward({
    mutation: {
      onSuccess: (result) => {
        if (!result.alreadySpun) trackEvent('point_reward_claimed', { reward_type: 'daily_spin', points_awarded: result.pointsAwarded });
        setSpinResult(result);
        queryClient.setQueryData<ProgressSummary>(progressQueryKey, (current) =>
          current
            ? {
                ...current,
                points: result.newBalance,
                spinAvailableToday: false,
                todaySpin: result,
              }
            : current,
        );
        queryClient.invalidateQueries({ queryKey: ['getDashboardSummary'] });
        queryClient.invalidateQueries({ queryKey: ['getCurrentUser'] });
        queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
      },
    },
  });

  if (isLoading) {
    return <div className="p-8 font-mono animate-pulse">Loading studio data...</div>;
  }

  return (
    <div className="p-6 md:p-10 space-y-8">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight">Creator Studio</h1>
          <p className="text-muted-foreground font-mono mt-2 font-bold text-primary">Discipline eats talent.</p>
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Habits', value: summary?.totalHabits || 0, icon: Zap },
          { label: 'Posts This Month', value: summary?.totalPostsThisMonth || 0, icon: TrendingUp },
          { label: 'Enrolled Workshops', value: summary?.workshopsEnrolled || 0, icon: CheckCircle2 },
          { label: 'Badges Earned', value: summary?.badgesEarned || 0, icon: Trophy },
        ].map((stat, i) => (
          <div key={i} className="p-5 border border-border bg-card">
            <div className="mb-4 flex items-center justify-between">
              <stat.icon className="w-5 h-5 text-primary" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            </div>
            <div className="text-3xl font-black font-display">{stat.value}</div>
            <div className="text-xs font-mono uppercase text-muted-foreground mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      <DailyLoopCard
        progress={progress}
        isLoading={isProgressLoading}
        isError={isProgressError}
        isSignedIn={isSignedIn === true}
        isCheckingIn={checkInMutation.isPending}
        isSpinning={spinMutation.isPending}
        checkInError={checkInMutation.isError}
        onCheckIn={() => checkInMutation.mutate({ data: { timezone } })}
        onRetryProgress={() => refetchProgress()}
        onOpenReward={() => {
          setSpinResult(null);
          setRewardOpen(true);
        }}
      />

      <section className="border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-primary/5 p-5 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center">
            <Coins className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300">AIMD Points</p>
            <p className="font-display text-3xl font-black text-foreground">{progress?.points ?? user?.points ?? 0}</p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-muted-foreground">
              Members can use their AIMD points towards merch, events, workshops and more! Keep a look out for special drops!
            </p>
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
            <h2 className="text-2xl font-bold font-display uppercase mb-5 flex items-center gap-2">
              <TargetIcon className="w-6 h-6 text-primary" /> Today's Focus
            </h2>
            <div className="space-y-4">
              <div className="p-4 bg-background border border-border flex items-center justify-between group hover:border-primary/50 transition-colors">
                <div>
                  <h4 className="font-bold text-lg">Build your practice</h4>
                  <p className="text-sm text-muted-foreground">Turn today’s check-in into studio time.</p>
                </div>
                <Link href="/habits">
                  <Button variant="outline" className="rounded-none font-mono uppercase text-xs">Open habits</Button>
                </Link>
              </div>
              
              {summary?.skillTracksActive ? (
                <div className="p-4 bg-background border border-border flex items-center justify-between group hover:border-primary/50 transition-colors">
                  <div className="flex-1 mr-6">
                    <h4 className="font-bold text-lg mb-2">Continue skill track</h4>
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
              Activity
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

      <Dialog
        open={rewardOpen}
        onOpenChange={(open) => {
          setRewardOpen(open);
          if (!open) {
            setSpinResult(null);
            spinMutation.reset();
          }
        }}
      >
        <DialogContent className="border-primary/30 bg-card sm:max-w-md" data-testid="daily-reward-dialog">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full border border-primary/40 bg-primary/10">
              {spinResult ? <Gift className="h-6 w-6 text-primary" /> : <Sparkles className="h-6 w-6 text-primary" />}
            </div>
            <DialogTitle className="font-display text-2xl font-black uppercase">
              {spinResult ? (spinResult.alreadySpun ? 'Reward claimed' : 'You won!') : 'Daily reward'}
            </DialogTitle>
            <DialogDescription className="font-mono text-xs uppercase tracking-wider">
              {spinResult
                ? 'Your points are safely recorded to your Creator Studio balance.'
                : 'One spin. A little momentum for today.'}
            </DialogDescription>
          </DialogHeader>

          {spinResult ? (
            <div className="space-y-5 text-center">
              <div className="py-3">
                <div className="font-display text-6xl font-black text-primary">+{spinResult.pointsAwarded}</div>
                <div className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">AIMD points</div>
              </div>
              <div className="border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
                New balance: <span className="font-bold text-foreground">{spinResult.newBalance} points</span>
              </div>
              <Button
                className="w-full rounded-none bg-primary font-mono text-xs uppercase text-primary-foreground hover:bg-primary/90"
                onClick={() => setRewardOpen(false)}
                data-testid="daily-reward-close"
              >
                Keep creating
              </Button>
            </div>
          ) : (
            <div className="space-y-5 text-center">
              <div
                className={`mx-auto flex h-32 w-32 items-center justify-center rounded-full border-2 border-primary/50 bg-primary/10 ${
                  spinMutation.isPending ? 'motion-safe:animate-spin' : ''
                }`}
                aria-label={spinMutation.isPending ? 'Reward wheel is spinning' : 'Reward wheel'}
                role="img"
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/40 bg-background">
                  <Gift className="h-10 w-10 text-primary" />
                </div>
              </div>
              {spinMutation.isError && (
                <p className="text-sm text-destructive" role="alert">
                  We couldn’t process the reward right now. Please try again.
                </p>
              )}
              <Button
                className="w-full rounded-none bg-primary font-mono text-xs uppercase text-primary-foreground hover:bg-primary/90"
                onClick={() => spinMutation.mutate({ data: { timezone } })}
                disabled={spinMutation.isPending}
                data-testid="daily-reward-spin"
              >
                {spinMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" />
                    Spinning…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Tap to spin
                  </>
                )}
              </Button>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                The server decides your reward
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DailyLoopCard({
  progress,
  isLoading,
  isError,
  isSignedIn,
  isCheckingIn,
  isSpinning,
  checkInError,
  onCheckIn,
  onRetryProgress,
  onOpenReward,
}: {
  progress: ProgressSummary | undefined;
  isLoading: boolean;
  isError: boolean;
  isSignedIn: boolean;
  isCheckingIn: boolean;
  isSpinning: boolean;
  checkInError: boolean;
  onCheckIn: () => void;
  onRetryProgress: () => void;
  onOpenReward: () => void;
}) {
  return (
    <section className="relative overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/10 via-card to-background p-5 md:p-7" data-testid="daily-loop-card">
      <div className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-primary">
              <Sparkles className="h-4 w-4" /> Daily loop
            </div>
            <h2 className="font-display text-3xl font-black uppercase tracking-tight">Make something. Mark the day.</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              A small check-in keeps your creative streak alive. Come back tomorrow and keep the work moving.
            </p>
          </div>
          {progress?.phase && (
            <div className="border border-border bg-background/60 px-4 py-3 md:min-w-40">
              <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Current phase</div>
              <div className="mt-1 font-display text-lg font-bold uppercase text-primary">{progress.phase.phase}</div>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse border border-border bg-background/50" />)}
          </div>
        ) : !isSignedIn ? (
          <div className="flex flex-col items-start justify-between gap-4 border border-border bg-background/60 p-4 md:flex-row md:items-center">
            <div>
              <p className="font-bold">Sign in to start your daily loop.</p>
              <p className="mt-1 text-sm text-muted-foreground">Your streak and rewards are saved to your Creator Studio account.</p>
            </div>
            <Link href="/sign-in">
              <Button className="rounded-none bg-primary font-mono text-xs uppercase text-primary-foreground hover:bg-primary/90">Sign in</Button>
            </Link>
          </div>
        ) : isError || !progress ? (
          <div className="flex flex-col items-start justify-between gap-4 border border-destructive/30 bg-destructive/5 p-4 md:flex-row md:items-center">
            <div>
              <p className="font-bold">Your daily loop is temporarily unavailable.</p>
              <p className="mt-1 text-sm text-muted-foreground">Your progress is safe. Try loading it again.</p>
            </div>
            <Button variant="outline" className="rounded-none font-mono text-xs uppercase" onClick={onRetryProgress}>Try again</Button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <LoopStat icon={Flame} label="Day streak" value={`${progress.currentStreak}`} detail={`Best: ${progress.longestStreak}`} />
              <LoopStat
                icon={CheckCircle2}
                label="Habits today"
                value={`${progress.todayHabitsCompleted}/${progress.totalHabits}`}
                detail={progress.totalHabits ? `${Math.round((progress.todayHabitsCompleted / progress.totalHabits) * 100)}% complete` : 'Add your first habit'}
              />
              <LoopStat icon={Coins} label="AIMD points" value={`${progress.points}`} detail={progress.timezone ? progress.timezone.replace('_', ' ') : 'Your balance'} />
            </div>

            {progress.totalHabits > 0 && (
              <div className="mt-5">
                <div className="mb-2 flex justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>Today’s practice</span>
                  <span>{progress.todayHabitsCompleted} of {progress.totalHabits}</span>
                </div>
                <Progress value={(progress.todayHabitsCompleted / progress.totalHabits) * 100} className="h-2 rounded-none bg-border [&>div]:bg-primary" />
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {progress.checkedInToday ? (
                <div className="inline-flex min-h-10 items-center gap-2 border border-primary/30 bg-primary/10 px-4 py-2 font-mono text-xs font-bold uppercase text-primary" data-testid="check-in-complete">
                  <Check className="h-4 w-4" /> Checked in today
                </div>
              ) : (
                <Button
                  className="rounded-none bg-primary font-mono text-xs uppercase text-primary-foreground hover:bg-primary/90"
                  onClick={onCheckIn}
                  disabled={isCheckingIn}
                  data-testid="daily-check-in"
                >
                  {isCheckingIn ? <Loader2 className="mr-2 h-4 w-4 motion-safe:animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {isCheckingIn ? 'Checking in…' : 'Check in today'}
                </Button>
              )}

              {progress.spinAvailableToday ? (
                <Button
                  variant="outline"
                  className="rounded-none border-primary/40 font-mono text-xs uppercase hover:bg-primary/10"
                  onClick={onOpenReward}
                  disabled={isSpinning}
                  data-testid="daily-reward-open"
                >
                  <Gift className="mr-2 h-4 w-4 text-primary" /> Open daily reward
                </Button>
              ) : (
                <div className="inline-flex min-h-10 items-center gap-2 px-2 py-2 font-mono text-xs uppercase text-muted-foreground" data-testid="daily-reward-complete">
                  <Check className="h-4 w-4 text-primary" /> Reward claimed today
                </div>
              )}
            </div>
            {checkInError && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                We couldn’t record your check-in. Please try again.
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function LoopStat({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Flame;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="border border-border bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <Icon className="h-4 w-4 text-primary" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      </div>
      <div className="font-display text-2xl font-black">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-2 truncate text-xs text-muted-foreground">{detail}</div>
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
