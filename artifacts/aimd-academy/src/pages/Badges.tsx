import { Award, BookOpen, Calendar, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';
import { useListBadges } from '@workspace/api-client-react';

export default function Badges() {
  const { data: badges = [], isLoading, isError } = useListBadges({
    query: { queryKey: ['listBadges'] },
  }) as any;

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-border pb-7">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary mb-2">Creator recognition</p>
          <h1 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight">Badges & Certificates</h1>
          <p className="text-muted-foreground mt-3 max-w-2xl">
            A record of the work you have actually completed in Creator Studio.
          </p>
        </div>
        <Link href="/profile" className="font-mono text-xs uppercase tracking-wider text-primary underline underline-offset-4">
          View public profile →
        </Link>
      </header>

      {isLoading && <div className="border border-border bg-card p-8 font-mono text-sm text-muted-foreground animate-pulse">Loading your recognition…</div>}
      {isError && <div className="border border-destructive/30 bg-destructive/5 p-8 text-sm text-destructive">Recognition could not be loaded. Please try again.</div>}
      {!isLoading && !isError && badges.length === 0 && (
        <div className="border border-dashed border-border bg-card p-12 text-center">
          <Award className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="font-display text-2xl font-bold uppercase">Your wall is ready</h2>
          <p className="text-muted-foreground mt-2 max-w-md mx-auto">Complete a workshop or earn a community badge and it will appear here automatically.</p>
          <Link href="/workshops" className="inline-block mt-6 bg-primary text-primary-foreground px-5 py-3 font-mono text-xs uppercase tracking-wider">Explore workshops</Link>
        </div>
      )}
      {badges.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {badges.map((badge: any) => (
            <article key={badge.id} className="border border-border bg-card p-6 flex flex-col min-h-56">
              <div className="flex items-start justify-between gap-4">
                <div className="w-14 h-14 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center">
                  {badge.imageUrl ? <img src={badge.imageUrl} alt="" className="w-9 h-9 object-contain" /> : <Award className="w-7 h-7 text-primary" />}
                </div>
                {badge.workshopId ? <span className="font-mono text-[10px] uppercase tracking-wider text-primary border border-primary/30 px-2 py-1">Workshop</span> : <ShieldCheck className="w-5 h-5 text-primary" />}
              </div>
              <h2 className="font-display text-xl font-bold uppercase mt-6">{badge.name}</h2>
              <p className="text-sm text-muted-foreground mt-2 flex-1">{badge.description}</p>
              <div className="flex items-center gap-2 mt-5 pt-4 border-t border-border text-[11px] font-mono text-muted-foreground">
                {badge.workshopTitle ? <><BookOpen className="w-3.5 h-3.5 text-primary" /> {badge.workshopTitle}</> : <><Calendar className="w-3.5 h-3.5 text-primary" /> Earned {new Date(badge.earnedAt).toLocaleDateString()}</>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}