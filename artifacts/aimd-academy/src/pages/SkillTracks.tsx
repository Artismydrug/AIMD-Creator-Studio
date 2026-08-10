import { useListSkillTracks } from '@workspace/api-client-react';
import { Medal, CheckCircle2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export default function SkillTracks() {
  const { data: tracks, isLoading } = useListSkillTracks({ query: { queryKey: ['listSkillTracks'] } });

  if (isLoading) return <div className="p-8 font-mono animate-pulse">Loading tracks...</div>;

  return (
    <div className="p-6 md:p-10 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">Skill Tracks</h1>
          <p className="text-muted-foreground font-mono mt-2">Milestone certification for Studio Ready status.</p>
        </div>
      </header>

      {tracks?.length === 0 ? (
        <div className="py-24 text-center border border-dashed border-border bg-card">
          <Medal className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold font-display uppercase mb-2">No Active Tracks</h3>
          <p className="text-muted-foreground font-mono text-sm">Enroll in workshops to start your track.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {tracks?.map(track => (
            <div key={track.id} className="border border-border bg-card overflow-hidden relative">
              {track.status === 'certified' && (
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-4 py-1 font-mono text-xs uppercase font-bold z-10">
                  Certified
                </div>
              )}
              
              <div className="p-6 md:p-8 border-b border-border flex flex-col md:flex-row justify-between gap-6 md:items-center bg-background/50">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 flex items-center justify-center border ${track.status === 'certified' ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-card text-muted-foreground'}`}>
                    <Medal className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="font-mono text-xs uppercase text-muted-foreground mb-1">Track</div>
                    <h2 className="text-3xl font-black font-display uppercase">{track.artForm}</h2>
                  </div>
                </div>
                
                <div className="w-full md:w-64 space-y-2">
                  <div className="flex justify-between font-mono text-sm">
                    <span>Progress</span>
                    <span className="text-primary">{track.percentComplete}%</span>
                  </div>
                  <Progress value={track.percentComplete} className="h-2 rounded-none bg-border [&>div]:bg-primary" />
                </div>
              </div>

              <div className="p-6 md:p-8">
                <h3 className="font-mono uppercase text-sm font-bold mb-6 text-muted-foreground">Milestones</h3>
                <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
                  {track.milestones?.map((m: any, i: number) => (
                    <div key={m.id} className="flex items-start gap-3 group">
                      <div className="mt-0.5 shrink-0">
                        {m.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-primary" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground group-hover:text-border transition-colors" />
                        )}
                      </div>
                      <div className={`font-medium ${m.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {m.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
