import { useState } from "react";
import { Link } from "wouter";
import { useListWorkshops } from "@workspace/api-client-react";
import { ListWorkshopsTier, Workshop } from "@workspace/api-client-react/src/generated/api.schemas";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Users, Clock, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import tattooImg from "@assets/generated_images/workshop-tattoo.jpg";
import fineArtImg from "@assets/generated_images/workshop-fine-art.jpg";
import spatialImg from "@assets/generated_images/workshop-spatial.jpg";
import heroImg from "@assets/generated_images/hero.jpg";

// Fallback images based on index
const fallbacks = [tattooImg, fineArtImg, spatialImg, heroImg];

export default function Workshops() {
  const [activeTier, setActiveTier] = useState<string>("all");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const tierParam = activeTier === "all" ? undefined : (activeTier as ListWorkshopsTier);
  const categoryParam = activeCategory === "all" ? undefined : activeCategory;

  const { data: workshops, isLoading } = useListWorkshops({ tier: tierParam, category: categoryParam });

  // Extract unique categories for filter
  const allCategories = ["all", ...Array.from(new Set(workshops?.map(w => w.category) || []))];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Curriculum</h1>
          <p className="text-muted-foreground font-mono text-sm">Elite masterclasses for serious creators.</p>
        </div>
        
        <Tabs defaultValue="all" onValueChange={setActiveTier} className="w-full md:w-auto">
          <TabsList className="bg-card border-border h-12 w-full md:w-auto p-1 rounded-none">
            <TabsTrigger value="all" className="rounded-none uppercase tracking-widest text-[10px] font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">All</TabsTrigger>
            <TabsTrigger value="free" className="rounded-none uppercase tracking-widest text-[10px] font-bold data-[state=active]:bg-background data-[state=active]:text-foreground">Phase 1 (Free)</TabsTrigger>
            <TabsTrigger value="workshop" className="rounded-none uppercase tracking-widest text-[10px] font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Phase 2 (Pass)</TabsTrigger>
            <TabsTrigger value="pro" className="rounded-none uppercase tracking-widest text-[10px] font-bold data-[state=active]:bg-amber-500 data-[state=active]:text-black">Phase 3 (Pro)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {allCategories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 text-xs font-mono uppercase tracking-widest border transition-colors ${
              activeCategory === cat 
                ? 'bg-foreground text-background border-foreground' 
                : 'bg-card border-border text-muted-foreground hover:border-muted-foreground'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-[400px] w-full bg-card rounded-lg" />)
        ) : workshops && workshops.length > 0 ? (
          workshops.map((workshop, i) => (
            <WorkshopCard key={workshop.id} workshop={workshop} fallbackImg={fallbacks[i % fallbacks.length]} />
          ))
        ) : (
          <div className="col-span-full py-20 text-center border border-dashed border-border rounded-lg text-muted-foreground">
            No workshops found for the selected filters.
          </div>
        )}
      </div>
    </div>
  );
}

function WorkshopCard({ workshop, fallbackImg }: { workshop: Workshop, fallbackImg: string }) {
  const isLocked = !workshop.isEnrolled && workshop.tier !== 'free'; // Simplified lock logic, real app uses User Tier
  const tierColor = workshop.tier === 'pro' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' : 
                    workshop.tier === 'workshop' ? 'text-primary border-primary/30 bg-primary/10' : 
                    'text-muted-foreground border-border bg-background';

  return (
    <Link href={`/workshops/${workshop.id}`}>
      <div className="group bg-card border border-border flex flex-col h-full overflow-hidden hover:border-primary/50 transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.05)] cursor-pointer">
        {/* Thumbnail */}
        <div className="aspect-video w-full bg-background relative overflow-hidden border-b border-border">
          <img 
            src={workshop.thumbnailUrl || fallbackImg} 
            alt={workshop.title} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3 flex gap-2">
            <div className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${tierColor}`}>
              {workshop.tier === 'free' ? 'Phase 1' : workshop.tier === 'workshop' ? 'Phase 2' : 'Phase 3'}
            </div>
          </div>
          {isLocked && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-background border border-border px-4 py-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                <Lock className="w-4 h-4 text-primary" />
                Upgrade Required
              </div>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-5 flex flex-col flex-1">
          <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2">
            {workshop.category} • by {workshop.instructorName || "StudioFlow"}
          </div>
          <h3 className="font-bold text-xl tracking-tight mb-3 line-clamp-2">{workshop.title}</h3>
          
          <div className="mt-auto pt-4 border-t border-white/5 grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-widest">Modules</span>
              </div>
              <span className="text-sm font-bold">{workshop.totalModules}</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-widest">Time</span>
              </div>
              <span className="text-sm font-bold">{workshop.durationMinutes ? `${Math.round(workshop.durationMinutes/60)}h` : '--'}</span>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono uppercase tracking-widest">Enrolled</span>
              </div>
              <span className="text-sm font-bold">{workshop.enrolledCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
