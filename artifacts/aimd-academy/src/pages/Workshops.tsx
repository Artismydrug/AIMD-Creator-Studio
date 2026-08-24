import { useListWorkshops } from '@workspace/api-client-react';
import { Clock, BookOpen, PlayCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Workshops() {
  const { data: workshops, isLoading } = useListWorkshops({}, { query: { queryKey: ['listWorkshops'] } });
  const tattooApprenticeship = workshops?.find((workshop: any) =>
    workshop.title.toLowerCase().includes('tattoo apprenticeship')
    && workshop.title.toLowerCase().includes('poncho'),
  );

  if (isLoading) return <div className="p-8 font-mono animate-pulse">Loading curriculum...</div>;

  return (
    <div className="p-6 md:p-10 space-y-12">
       <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">Workshops</h1>
           <p className="text-muted-foreground font-mono mt-2">A first look at the tattoo apprenticeship coming to Creator Studio.</p>
        </div>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        {tattooApprenticeship ? (
          <WorkshopCard workshop={tattooApprenticeship} />
        ) : (
          <div className="md:col-span-2 border border-border bg-card p-8 text-center">
            <h2 className="text-xl font-bold font-display uppercase tracking-tight mb-2">No workshops available</h2>
            <p className="text-muted-foreground">There are no published workshops to display right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function WorkshopCard({ workshop }: { workshop: any }) {
  return (
    <div className="border-2 border-fuchsia-500/50 bg-card flex flex-col group relative overflow-hidden">
      <div className="h-64 bg-muted relative overflow-hidden">
        {workshop.thumbnailUrl ? (
          <img src={workshop.thumbnailUrl} className="w-full h-full object-cover grayscale opacity-70 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" alt="" />
        ) : (
          <div className="w-full h-full bg-zinc-950 flex items-center justify-center border-b border-border">
            <PlayCircle className="w-12 h-12 text-fuchsia-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/85 via-zinc-950/10 to-transparent" />
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Badge className="rounded-none bg-background/90 text-foreground backdrop-blur-sm font-mono uppercase text-[10px] w-fit">
            {workshop.category}
          </Badge>
          <Badge className="rounded-none bg-fuchsia-500 text-white backdrop-blur-sm font-mono uppercase text-[10px] w-fit">
            Coming Soon
          </Badge>
        </div>
        <div className="absolute bottom-5 left-6 right-6">
          <p className="font-mono text-[10px] tracking-[.2em] text-cyan-300 uppercase">AIMD / Workshop 01</p>
          <p className="mt-1 font-display font-black text-3xl uppercase tracking-tight text-white">Tattoo</p>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-2xl font-bold font-display uppercase tracking-tight mb-2 line-clamp-2">{workshop.title}</h3>
        <p className="text-muted-foreground text-sm mb-6 flex-1">Train your eye. Build your hand. Learn the studio mindset with Poncho.</p>
        
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-border font-mono text-[10px] uppercase text-muted-foreground mb-5">
          <div className="flex flex-col gap-1 border border-border bg-muted/40 p-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {workshop.totalModules} modules
          </div>
          <div className="flex flex-col gap-1 border border-border bg-muted/40 p-2">
            <Clock className="w-4 h-4 text-cyan-500" />
            30-sec drills
          </div>
          <div className="flex flex-col gap-1 border border-border bg-muted/40 p-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Feedback
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3 border border-cyan-500/30 bg-cyan-500/10 p-3">
          <BookOpen className="w-5 h-5 shrink-0 text-cyan-400" />
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-300">Dedicated Artist membership</p>
            <p className="text-sm text-foreground">$39/month when it opens</p>
          </div>
        </div>
        
        <Button disabled className="w-full rounded-none font-mono uppercase bg-muted text-muted-foreground">
          <Sparkles className="w-4 h-4 mr-2" /> Coming Soon
        </Button>
      </div>
    </div>
  );
}
