import { useEffect, useState } from 'react';
import { WorkshopPreviewVideo } from './WorkshopPreviewVideo';
import { Link } from 'wouter';
import { SignInButton, useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetWorkshop, useCompleteWorkshopModule, useEnrollInWorkshop, getGetWorkshopQueryKey, getListEnrollmentsQueryKey, getListWorkshopsQueryKey } from '@workspace/api-client-react';
import { ArrowLeft, Lock, PlayCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { LessonPlayer } from './LessonPlayer';

/** Server-authoritative workshop detail used by both /learn/:id (public) and /workshops/:id. */
export function WorkshopView({ id, backHref }: { id: number; backHref: '/learn' | '/workshops' }) {
  const { isSignedIn, userId } = useAuth();
  const { data: w, isLoading, isError, refetch } = useGetWorkshop(id, { query: { enabled: Number.isFinite(id), queryKey: [...getGetWorkshopQueryKey(id), userId ?? 'anon'] } });
  const complete = useCompleteWorkshopModule();
  const enroll = useEnrollInWorkshop();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [teaserId, setTeaserId] = useState<number | null>(null);
  const [gated, setGated] = useState(false);

  useEffect(() => {
    setActiveId(null); setTeaserId(null); setGated(false);
    if (userId !== undefined) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isSignedIn]);

  if (isLoading) return <div className="p-8 max-w-5xl mx-auto space-y-4" data-testid="workshop-loading"><Skeleton className="h-10 w-1/2 rounded-none" /><Skeleton className="aspect-video rounded-none" /></div>;
  if (isError || !w) {
    return (
      <div className="p-12 text-center space-y-4" data-testid="workshop-error">
        <p className="font-mono text-sm text-muted-foreground">This workshop could not be loaded or is not available.</p>
        <Button variant="outline" className="rounded-none font-mono text-xs uppercase" onClick={() => void refetch()}><RefreshCw className="w-3.5 h-3.5 mr-2" />Retry</Button>
      </div>
    );
  }

  const unavailable = w.accessStatus === 'unavailable';
  const full = !!w.hasFullAccess && !gated && !unavailable;
  const enrolled = !!w.isEnrolled;
  const startWorkshop = () => enroll.mutate({ id: w.id }, {
    onSuccess: (en) => {
      void qc.invalidateQueries({ queryKey: getGetWorkshopQueryKey(w.id) });
      void qc.invalidateQueries({ queryKey: getListEnrollmentsQueryKey() });
      void qc.invalidateQueries({ queryKey: getListWorkshopsQueryKey({}) });
      if (en?.status === 'paused') toast({ title: 'Enrollment is paused', description: 'Progress cannot be saved until it is resumed.', variant: 'destructive' });
      else toast({ title: 'Workshop started' });
    },
    onError: (e: any) => toast({ title: 'Could not start workshop', description: e?.message, variant: 'destructive' }),
  });
  const active = w.modules.find((m) => m.id === activeId);

  const gate = (
    <div className="border border-amber-500/30 bg-amber-500/5 p-5 space-y-3" data-testid="gate-membership">
      <p className="font-bold flex items-center gap-2"><Lock className="w-4 h-4" /> Full lessons are locked</p>
      <p className="text-sm text-muted-foreground">
        Full lessons require an active Dedicated Artist subscription ($39/month) or enrollment in this workshop by the instructor.
        Teasers are open to everyone. Membership checkout is not open yet — see the plan details for what is coming.
      </p>
      <div className="flex flex-wrap gap-2">
        {!isSignedIn && (
          <SignInButton mode="modal" forceRedirectUrl={window.location.pathname + window.location.search}>
            <Button className="rounded-none font-mono text-xs uppercase" data-testid="button-signin-check-access">Sign in to check access</Button>
          </SignInButton>
        )}
        <Button asChild variant="outline" className="rounded-none font-mono text-xs uppercase">
          <Link href="/plans" data-testid="link-membership-options">Membership options</Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="pb-24 max-w-5xl mx-auto p-6 md:p-10 space-y-10">
      <div>
        <Link href={backHref} className="inline-flex items-center font-mono text-xs uppercase hover:text-primary mb-6"><ArrowLeft className="w-4 h-4 mr-2" />All workshops</Link>
        <div className="flex flex-wrap gap-2 mb-3 font-mono text-[10px] uppercase">
          <span className="border border-primary/30 bg-primary/10 text-primary px-2 py-1">{w.category}</span>
          {w.isPublished === false && <span className="border border-border px-2 py-1">Draft · staff only</span>}
          {w.isStaff && <span className="border border-border px-2 py-1">Staff view</span>}
        </div>
        <h1 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight" data-testid="text-workshop-title">{w.title}</h1>
        {w.instructorName && <p className="font-mono text-sm text-muted-foreground mt-2">with {w.instructorName}</p>}
      </div>

      {w.previewVideoUrl && (
        <WorkshopPreviewVideo src={w.previewVideoUrl} controls preload="metadata" playsInline className="w-full aspect-video bg-black" data-testid="video-workshop-teaser" />
      )}
      <p className="text-lg text-muted-foreground whitespace-pre-wrap leading-relaxed">{w.description}</p>

      {unavailable ? (
        <div className="border border-border bg-card p-5 space-y-3" data-testid="access-unverified">
          <p className="font-bold">Unable to verify your access</p>
          <p className="text-sm text-muted-foreground">We could not confirm your membership or enrollment right now. This is not a lock on your account.</p>
          <Button variant="outline" className="rounded-none font-mono text-xs uppercase" onClick={() => { setGated(false); void refetch(); }} data-testid="button-retry-access"><RefreshCw className="w-3.5 h-3.5 mr-2" />Retry</Button>
        </div>
      ) : !full && gate}
      {full && isSignedIn && !enrolled && (
        <div className="border border-primary/30 bg-primary/5 p-5 flex flex-wrap items-center justify-between gap-3" data-testid="start-workshop">
          <p className="text-sm text-muted-foreground">Start this workshop to save progress and submit assignments.</p>
          <Button className="rounded-none font-mono text-xs uppercase" disabled={enroll.isPending} onClick={startWorkshop} data-testid="button-start-workshop">{enroll.isPending ? 'Starting…' : 'Start workshop'}</Button>
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-display uppercase flex justify-between">Curriculum <span className="text-sm font-mono text-muted-foreground font-normal">{w.totalModules} modules</span></h2>
        {w.modules.length === 0 && <p className="font-mono text-sm text-muted-foreground border border-dashed border-border p-6 text-center">No modules have been added yet.</p>}
        {w.modules.map((m, i) => {
          const locked = !full || (m.isLocked ?? false);
          return (
            <div key={m.id} className="border border-border bg-card p-5 space-y-3" data-testid={`module-${m.id}`}>
              <div className="flex items-start gap-3 justify-between">
                <div className="flex gap-3">
                  {m.isCompleted ? <CheckCircle className="w-5 h-5 text-primary mt-1" /> : locked ? <Lock className="w-5 h-5 text-muted-foreground mt-1" /> : <PlayCircle className="w-5 h-5 text-primary mt-1" />}
                  <div>
                    <h3 className="font-bold text-lg">{i + 1}. {m.title}</h3>
                    {!locked && m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                  </div>
                </div>
                <span className="font-mono text-xs text-muted-foreground whitespace-nowrap"><Clock className="inline w-3 h-3 mr-1" />{m.durationMinutes}m</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {m.previewVideoUrl && (
                  <Button variant="outline" size="sm" className="rounded-none font-mono text-xs uppercase" onClick={() => setTeaserId(teaserId === m.id ? null : m.id)} data-testid={`button-teaser-${m.id}`}>
                    <PlayCircle className="w-3.5 h-3.5 mr-1.5" />{teaserId === m.id ? 'Hide teaser' : 'Watch teaser'}
                  </Button>
                )}
                {!locked && m.hasVideo && (
                  <Button size="sm" className="rounded-none font-mono text-xs uppercase" onClick={() => setActiveId(m.id)} data-testid={`button-lesson-${m.id}`}>
                    {m.isCompleted ? 'Review lesson' : 'Open full lesson'}
                  </Button>
                )}
                {!locked && !m.hasVideo && <span className="font-mono text-xs text-muted-foreground self-center">Full video not released yet</span>}
                {locked && !unavailable && (
                  <Button asChild size="sm" variant="outline" className="rounded-none font-mono text-xs uppercase border-amber-500/50 text-amber-500">
                    <Link href="/plans" data-testid={`link-unlock-${m.id}`}><Lock className="w-3 h-3 mr-1.5" />Unlock with membership</Link>
                  </Button>
                )}
              </div>
              {teaserId === m.id && m.previewVideoUrl && <WorkshopPreviewVideo src={m.previewVideoUrl} controls autoPlay playsInline className="w-full aspect-video bg-black" />}
            </div>
          );
        })}
      </section>

      {active && full && (
        <section className="border border-border bg-card" data-testid="section-active-lesson">
          <div className="p-5 border-b border-border flex justify-between items-start gap-4">
            <div>
              <p className="font-mono text-xs text-primary uppercase mb-1">Module {active.order} · {active.durationMinutes} min</p>
              <h2 className="text-2xl font-display font-bold uppercase">{active.title}</h2>
            </div>
            <Button variant="ghost" className="rounded-none font-mono text-xs uppercase" onClick={() => setActiveId(null)}>Close</Button>
          </div>
          <LessonPlayer workshopId={w.id} moduleId={active.id} onGate={() => { setGated(true); setActiveId(null); void refetch().then((r) => { if (r.data?.hasFullAccess && r.data.accessStatus === 'granted') setGated(false); }); }} />
          <div className="p-5 space-y-4">
            {active.description && <p className="text-muted-foreground">{active.description}</p>}
            {(active.drills?.length ?? 0) > 0 && (
              <div className="border border-border bg-muted/30 p-4 space-y-3">
                <p className="font-mono text-xs uppercase text-primary">Practice drills · submit in the mobile app</p>
                {active.drills!.map((d) => (
                  <div key={d.id} className="flex gap-3 border-t border-border pt-3 text-sm text-muted-foreground">
                    <span className="flex-1">{d.prompt}</span><span className="font-mono text-xs text-primary">≤{d.maxDurationSeconds}s</span>
                  </div>
                ))}
              </div>
            )}
            {isSignedIn && enrolled && !active.isCompleted && (
              <Button className="rounded-none font-mono text-xs uppercase" disabled={complete.isPending} data-testid="button-complete-lesson"
                onClick={() => complete.mutate({ id: w.id, moduleId: active.id }, {
                  onSuccess: () => { toast({ title: 'Progress saved' }); void qc.invalidateQueries({ queryKey: getGetWorkshopQueryKey(w.id) }); },
                  onError: (e: any) => toast({ title: 'Could not save progress', description: e?.message, variant: 'destructive' }),
                })}>
                <CheckCircle className="w-4 h-4 mr-2" />Mark lesson complete
              </Button>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
