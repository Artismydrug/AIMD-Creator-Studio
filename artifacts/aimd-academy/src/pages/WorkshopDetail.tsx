import { useState } from 'react';
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
  const [activeModuleId, setActiveModuleId] = useState<number | null>(null);

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
      toast({ title: 'Upgrade Required', description: 'Full workshop access requires a Dedicated Artist plan or above.', variant: 'destructive' });
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

  const activeModule = workshop.modules.find((module: any) => module.id === activeModuleId);

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
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Workshops
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
                <p className="font-bold text-white mb-1">Module 1 Preview — Dedicated Artist Required</p>
                <p className="text-sm text-muted-foreground mb-3">
                  Discovering Artists can preview Module 1 of every course. Upgrade to Dedicated Artist for full access to all modules, drills, assignment submission, and direct verified instructor feedback.
                </p>
                <Button asChild className="rounded-none bg-primary hover:bg-primary/90 text-zinc-950 font-bold text-xs uppercase h-8 px-4">
                  <Link href="/plans">
                    <Sparkles className="w-3 h-3 mr-1.5" />
                    Upgrade to Dedicated Artist →
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
                        ? 'bg-muted/40/40 border-border opacity-70'
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
                            <span className="ml-2 font-mono text-[10px] text-primary border border-primary/30 bg-primary/10 px-1.5 py-0.5 uppercase">
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
                            <Lock className="w-3 h-3" /> Dedicated Artist required · Upgrade →
                          </span>
                        </Link>
                      ) : workshop.isEnrolled || (isFree && index === 0) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-none font-mono uppercase text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          onClick={() => setActiveModuleId(mod.id)}
                        >
                          <PlayCircle className="w-3.5 h-3.5 mr-1.5" />
                          {mod.isCompleted ? 'Review lesson' : 'Open lesson'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {activeModule && (
            <section className="border border-border bg-card">
              <div className="p-5 md:p-7 border-b border-border flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-primary uppercase tracking-widest mb-2">
                    Module {activeModule.order} · {activeModule.durationMinutes} minutes
                  </p>
                  <h2 className="text-2xl font-display font-bold uppercase">{activeModule.title}</h2>
                </div>
                <Button variant="ghost" className="rounded-none font-mono text-xs uppercase" onClick={() => setActiveModuleId(null)}>
                  Close lesson
                </Button>
              </div>
              {activeModule.videoUrl ? (
                <div className="aspect-video bg-black">
                  <video
                    src={activeModule.videoUrl}
                    controls
                    playsInline
                    className="w-full h-full object-contain"
                  >
                    Your browser cannot play this lesson video.
                  </video>
                </div>
              ) : (
                <div className="aspect-video bg-muted flex items-center justify-center p-8 text-center">
                  <div className="max-w-md">
                    <PlayCircle className="w-10 h-10 mx-auto mb-4 text-primary/70" />
                    <h3 className="font-display font-bold uppercase text-xl mb-2">Lesson video is being prepared</h3>
                    <p className="text-sm text-muted-foreground">
                      This is a published curriculum blueprint. The instructor video will appear here when it is ready; progress cannot be marked complete before then.
                    </p>
                  </div>
                </div>
              )}
              <div className="p-5 md:p-7 space-y-5">
                {activeModule.description && <p className="text-muted-foreground leading-relaxed">{activeModule.description}</p>}
                <div className="border border-border bg-muted/30 p-4">
                  <p className="font-mono text-xs uppercase text-primary mb-2">Practice checkpoint</p>
                  <p className="text-sm text-muted-foreground">Choose a published drill, then submit one focused 30-second fake-skin or station-practice clip for a master-instructor video breakdown and critique.</p>
                  {(activeModule.drills?.length ?? 0) > 0 && (
                    <div className="mt-4 space-y-3">
                      {activeModule.drills?.map((drill: any) => (
                        <div key={drill.id} className="flex items-start gap-3 border-t border-border pt-3">
                          <span className="font-mono text-[10px] uppercase text-cyan-500 shrink-0 pt-0.5">Drill</span>
                          <p className="flex-1 text-sm text-muted-foreground leading-relaxed">{drill.prompt}</p>
                          <span className="font-mono text-xs text-primary whitespace-nowrap">≤{drill.maxDurationSeconds}s</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {activeModule.videoUrl && workshop.isEnrolled && !activeModule.isCompleted && (
                  <Button
                    className="rounded-none bg-primary text-primary-foreground font-mono uppercase text-xs"
                    onClick={() => handleComplete(activeModule.id)}
                    disabled={completeModule.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" /> Mark lesson complete
                  </Button>
                )}
                {!workshop.isEnrolled && !isFree && (
                  <p className="font-mono text-xs text-muted-foreground">Enroll to save progress and submit assignments.</p>
                )}
              </div>
            </section>
          )}
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
                      className="w-full h-14 rounded-none font-mono uppercase font-bold bg-primary hover:bg-primary/90 text-zinc-950"
                      onClick={handleEnroll}
                    >
                      Preview Module 1
                    </Button>
                    <div className="border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                      <p className="font-mono text-xs text-amber-400 mb-3">Full access on Dedicated Artist ($39/mo)</p>
                      <Button asChild className="w-full rounded-none bg-muted hover:bg-zinc-700 text-white font-mono text-xs uppercase h-9">
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
