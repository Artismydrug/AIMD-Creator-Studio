import { useParams, Link, useLocation } from 'wouter';
import { useGetWorkshop, useEnrollInWorkshop, useCompleteWorkshopModule, useGetCurrentUser } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, PlayCircle, CheckCircle, Clock, Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';

const TIER_RANK: Record<string, number> = { free: 0, academy: 1, pro: 2 };

export default function WorkshopDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { data: workshop, isLoading } = useGetWorkshop(Number(id), { query: { enabled: !!id, queryKey: ['getWorkshop', Number(id)] } });
  const { data: user } = useGetCurrentUser();
  
  const queryClient   = useQueryClient();
  const enroll        = useEnrollInWorkshop();
  const completeModule = useCompleteWorkshopModule();
  const { toast }     = useToast();

  if (isLoading) return <div className="p-8 font-mono animate-pulse">Loading curriculum...</div>;
  if (!workshop)  return <div className="p-8 font-mono">Course not found.</div>;

  const userTier      = user?.tier ?? 'free';
  const userRank      = TIER_RANK[userTier] ?? 0;
  const isFree        = userRank === 0;

  const completedCount  = workshop.modules.filter((m: any) => m.isCompleted).length;
  const progressPercent = workshop.totalModules > 0 ? (completedCount / workshop.totalModules) * 100 : 0;

  const handleEnroll = () => {
    // Free tier can only enroll if workshop is "free" tier
    if (isFree && workshop.tier !== 'free') {
      toast({ title: 'Academy Pass Required', description: 'Full workshop access requires an Academy Pass or above.', variant: 'destructive' });
      return;
    }
    enroll.mutate({ id: Number(id) }, {
      onSuccess: () => {
        toast({ title: 'Enrolled Successfully', description: 'Welcome to the curriculum.' });
        queryClient.invalidateQueries({ queryKey: ['getWorkshop', Number(id)] });
      }
    });
  };

  const handleComplete = (moduleId: number) => {
    completeModule.mutate({ id: Number(id), moduleId }, {
      onSuccess: () => {
        toast({ title: 'Module Completed', description: 'Progress saved.' });
        queryClient.invalidateQueries({ queryKey: ['getWorkshop', Number(id)] });
      }
    });
  };

  return (
    <div className="pb-24">
      {/* Hero Header */}
      <div className="relative h-[40vh] min-h-[300px] border-b border-border bg-muted flex items-end">
        <div className="absolute inset-0 z-0">
          {workshop.thumbnailUrl && <img src={workshop.thumbnailUrl} className="w-full h-full object-cover grayscale opacity-50 mix-blend-overlay" alt="" />}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>
        
        <div className="relative z-10 p-6 md:p-10 w-full max-w-5xl">
          <Link href="/workshops">
            <Button variant="ghost" className="mb-6 rounded-none font-mono uppercase text-xs pl-0 hover:bg-transparent hover:text-primary">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Academy
            </Button>
          </Link>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="font-mono text-xs uppercase bg-primary/20 text-primary border border-primary/30 px-2 py-1">
              {workshop.category}
            </span>
            <span className="font-mono text-xs uppercase border border-border px-2 py-1 bg-background/50 backdrop-blur">
              {workshop.tier} Tier
            </span>
            {isFree && workshop.tier !== 'free' && (
              <span className="font-mono text-xs uppercase border border-amber-500/30 bg-amber-500/10 text-amber-400 px-2 py-1 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Preview Only
              </span>
            )}
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight max-w-4xl">{workshop.title}</h1>
        </div>
      </div>

      <div className="p-6 md:p-10 grid md:grid-cols-3 gap-12 max-w-7xl">
        <div className="md:col-span-2 space-y-12">
          {/* Overview */}
          <section>
            <h2 className="text-2xl font-bold font-display uppercase mb-4">About the Course</h2>
            <p className="text-lg text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
              {workshop.description}
            </p>
          </section>

          {/* Free tier preview notice */}
          {isFree && workshop.tier !== 'free' && (
            <div className="border border-amber-500/30 bg-amber-500/5 p-5 flex items-start gap-4">
              <Lock className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-white mb-1">Module 1 Preview — Academy Pass Required</p>
                <p className="text-sm text-zinc-400 mb-3">
                  Free members can preview Module 1 of every course. Upgrade to Academy Pass for full access to all modules, assignment submission, and instructor feedback.
                </p>
                <Button asChild className="rounded-none bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase h-8 px-4">
                  <Link href="/plans">
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    Upgrade to Academy Pass →
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {/* Curriculum */}
          <section>
            <h2 className="text-2xl font-bold font-display uppercase mb-6 flex items-center justify-between">
              Curriculum
              <span className="text-sm font-mono text-muted-foreground font-normal">{workshop.totalModules} Modules</span>
            </h2>
            
            <div className="space-y-4">
              {workshop.modules.map((mod: any, index: number) => {
                // Free tier: only module 1 (index 0) is accessible
                const isLockedForFree = isFree && index > 0 && workshop.tier !== 'free';

                return (
                  <div
                    key={mod.id}
                    className={`border p-5 flex gap-4 transition-opacity ${
                      mod.isCompleted
                        ? 'bg-primary/5 border-primary/20'
                        : isLockedForFree
                        ? 'bg-zinc-900/40 border-zinc-800 opacity-70'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="mt-1">
                      {mod.isCompleted ? (
                        <CheckCircle className="w-6 h-6 text-primary" />
                      ) : isLockedForFree ? (
                        <Lock className="w-6 h-6 text-amber-500/60" />
                      ) : workshop.isEnrolled ? (
                        <PlayCircle className="w-6 h-6 text-muted-foreground" />
                      ) : (
                        <Lock className="w-6 h-6 text-muted-foreground opacity-50" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <h4 className="font-bold text-lg">
                          {index + 1}. {mod.title}
                          {index === 0 && isFree && (
                            <span className="ml-2 font-mono text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 uppercase">
                              Free Preview
                            </span>
                          )}
                        </h4>
                        <span className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          <Clock className="inline w-3 h-3 mr-1" /> {mod.durationMinutes}m
                        </span>
                      </div>
                      {mod.description && <p className="text-muted-foreground text-sm mb-4">{mod.description}</p>}
                      
                      {isLockedForFree ? (
                        <Link href="/plans">
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-amber-400 hover:text-amber-300 transition-colors">
                            <Lock className="w-3 h-3" /> Academy Pass required · Upgrade →
                          </span>
                        </Link>
                      ) : workshop.isEnrolled && !mod.isCompleted ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="rounded-none font-mono uppercase text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() => handleComplete(mod.id)}
                        >
                          Mark Completed
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-8">
          <div className="border border-border bg-card p-6 sticky top-24">
            {workshop.isEnrolled ? (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono uppercase text-sm font-bold text-primary">Your Progress</span>
                    <span className="font-mono text-sm">{Math.round(progressPercent)}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2 rounded-none bg-background [&>div]:bg-primary" />
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="font-mono text-sm text-muted-foreground mb-1">Instructor</div>
                  <div className="font-bold text-lg">{workshop.instructorName || 'AIMD Faculty'}</div>
                </div>
                {progressPercent === 100 && (
                  <div className="bg-primary/10 border border-primary p-4 text-center">
                    <span className="block font-display font-bold uppercase text-primary mb-1">Course Completed</span>
                    <span className="text-xs font-mono text-muted-foreground">Badge unlocked.</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-4 text-lg">
                  <Clock className="w-5 h-5 text-primary" />
                  <span className="font-mono">{workshop.durationMinutes} Minutes total</span>
                </div>

                {isFree && workshop.tier !== 'free' ? (
                  <>
                    <Button
                      size="lg"
                      className="w-full h-14 rounded-none font-mono uppercase font-bold bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                      onClick={handleEnroll}
                    >
                      Preview Module 1
                    </Button>
                    <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                      <p className="font-mono text-xs text-amber-400 mb-3">Full access on Academy Pass ($39/mo)</p>
                      <Button asChild className="w-full rounded-none bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs uppercase h-9">
                        <Link href="/plans">Upgrade Plan →</Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="w-full h-16 rounded-none font-mono uppercase font-bold text-lg bg-primary text-primary-foreground hover:bg-primary/90"
                      onClick={handleEnroll}
                    >
                      Enroll Now
                    </Button>
                    <p className="text-xs text-center text-muted-foreground font-mono">
                      Included in your {workshop.tier} membership tier.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
