import { useListWorkshops } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { Clock, BookOpen, Lock, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Workshops() {
  const { data: workshops, isLoading } = useListWorkshops({}, { query: { queryKey: ['listWorkshops'] } });

  if (isLoading) return <div className="p-8 font-mono animate-pulse">Loading curriculum...</div>;

  return (
    <div className="p-6 md:p-10 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">Workshops & Masterclasses</h1>
          <p className="text-muted-foreground font-mono mt-2">Expert-led multi-medium curriculum with verified instructors.</p>
        </div>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {workshops?.map(workshop => (
          <WorkshopCard key={workshop.id} workshop={workshop} />
        ))}
      </div>
    </div>
  );
}

function WorkshopCard({ workshop }: { workshop: any }) {
  // Determine if it's locked based on tier logic (simplification for UI)
  const requiresUpgrade = workshop.tier === 'pro' && !workshop.isEnrolled; // Need actual user tier to know, assuming not enrolled means maybe locked if pro

  return (
    <div className="border border-border bg-card flex flex-col group relative">
      <div className="h-48 bg-muted relative overflow-hidden">
        {workshop.thumbnailUrl ? (
          <img src={workshop.thumbnailUrl} className="w-full h-full object-cover grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" alt="" />
        ) : (
          <div className="w-full h-full bg-background flex items-center justify-center border-b border-border">
            <PlayCircle className="w-12 h-12 text-border" />
          </div>
        )}
        
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <Badge className="rounded-none bg-background/90 text-foreground backdrop-blur-sm font-mono uppercase text-[10px] w-fit">
            {workshop.category}
          </Badge>
          <Badge className={`rounded-none font-mono uppercase text-[10px] w-fit ${
            workshop.tier === 'pro' ? 'bg-primary text-primary-foreground' : 'bg-foreground text-background'
          }`}>
            {workshop.tier} Tier
          </Badge>
        </div>

        {requiresUpgrade && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Lock className="w-8 h-8 text-primary mb-2" />
            <span className="font-display font-bold uppercase tracking-widest text-lg">Pro Required</span>
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <h3 className="text-2xl font-bold font-display uppercase tracking-tight mb-2 line-clamp-2">{workshop.title}</h3>
        <p className="text-muted-foreground text-sm mb-6 line-clamp-3 flex-1">{workshop.description}</p>
        
        <div className="flex items-center justify-between pt-4 border-t border-border font-mono text-xs text-muted-foreground mb-6">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            {workshop.totalModules} Mods
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            {workshop.durationMinutes}m
          </div>
        </div>
        
        <Link href={`/workshops/${workshop.id}`}>
          <Button className="w-full rounded-none font-mono uppercase bg-foreground text-background hover:bg-foreground/90">
            {workshop.isEnrolled ? 'Continue Course' : 'View Details'}
          </Button>
        </Link>
      </div>
    </div>
  );
}
