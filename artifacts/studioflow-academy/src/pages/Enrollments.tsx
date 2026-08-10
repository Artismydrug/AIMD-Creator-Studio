import { Link } from "wouter";
import { useListEnrollments } from "@workspace/api-client-react";
import { Progress } from "@/components/ui/progress";
import { Play, CheckCircle2, PauseCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

import tattooImg from "@assets/generated_images/workshop-tattoo.jpg";
import fineArtImg from "@assets/generated_images/workshop-fine-art.jpg";
import spatialImg from "@assets/generated_images/workshop-spatial.jpg";
import heroImg from "@assets/generated_images/hero.jpg";
import { Button } from "react-day-picker";

const fallbacks = [tattooImg, fineArtImg, spatialImg, heroImg];

export default function Enrollments() {
  const { data: enrollments, isLoading } = useListEnrollments();

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">My Courses</h1>
          <p className="text-muted-foreground font-mono text-sm">Finish what you start.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-[300px] w-full bg-card rounded-lg" />)
        ) : enrollments && enrollments.length > 0 ? (
          enrollments.map((enrollment, i) => (
            <Link key={enrollment.id} href={`/workshops/${enrollment.workshopId}`}>
              <div className="group bg-card border border-border flex flex-col h-full overflow-hidden hover:border-primary/50 transition-all cursor-pointer">
                {/* Thumbnail */}
                <div className="aspect-video w-full bg-background relative overflow-hidden border-b border-border">
                  <img 
                    src={enrollment.workshopThumbnailUrl || fallbacks[i % fallbacks.length]} 
                    alt={enrollment.workshopTitle} 
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
                  />
                  
                  {/* Status overlay */}
                  <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start">
                    <div className={`px-2 py-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest backdrop-blur-md ${
                      enrollment.status === 'completed' ? 'text-primary bg-primary/10 border border-primary/20' : 
                      enrollment.status === 'active' ? 'text-foreground bg-background/80 border border-border' : 
                      'text-muted-foreground bg-background/80 border border-border'
                    }`}>
                      {enrollment.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      {enrollment.status === 'active' && <Play className="w-3 h-3" />}
                      {enrollment.status === 'paused' && <PauseCircle className="w-3 h-3" />}
                      {enrollment.status}
                    </div>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-bold text-lg tracking-tight mb-6 line-clamp-2 group-hover:text-primary transition-colors">{enrollment.workshopTitle}</h3>
                  
                  <div className="mt-auto space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-2xl font-black text-foreground">{Math.round(enrollment.progressPercent || 0)}%</span>
                      <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                        {enrollment.completedModules} / {enrollment.totalModules} Mod
                      </span>
                    </div>
                    <Progress value={enrollment.progressPercent} className="h-1.5 rounded-none bg-background [&>div]:bg-primary" />
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border border-dashed border-border rounded-lg bg-card">
            <h3 className="text-xl font-bold mb-2">No enrollments yet</h3>
            <p className="text-muted-foreground mb-6">Start a masterclass to see your progress here.</p>
            <Link href="/workshops">
              <Button className="rounded-none font-bold tracking-widest uppercase text-xs border border-white/10 hover:bg-white/5">
                Browse Curriculum
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
