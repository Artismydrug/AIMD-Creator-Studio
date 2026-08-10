import { useRoute, Link } from "wouter";
import { 
  useGetWorkshop, 
  useEnrollInWorkshop, 
  useCompleteWorkshopModule,
  getGetWorkshopQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, PlayCircle, CheckCircle2, Lock, Clock, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

import heroImg from "@assets/generated_images/hero.jpg";

export default function WorkshopDetail() {
  const [, params] = useRoute("/workshops/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: workshop, isLoading } = useGetWorkshop(id, { query: { enabled: !!id, queryKey: getGetWorkshopQueryKey(id) } });
  
  const enroll = useEnrollInWorkshop();
  const completeModule = useCompleteWorkshopModule();

  const handleEnroll = () => {
    enroll.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWorkshopQueryKey(id) });
        toast({ title: "Enrolled", description: "You're in. Time to work." });
      }
    });
  };

  const handleCompleteModule = (moduleId: number) => {
    completeModule.mutate({ id, moduleId }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetWorkshopQueryKey(id) });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-8">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!workshop) {
    return <div className="p-10 text-center text-muted-foreground">Workshop not found.</div>;
  }

  const completedModules = workshop.modules?.filter(m => m.isCompleted).length || 0;
  const progressPercent = workshop.totalModules > 0 ? (completedModules / workshop.totalModules) * 100 : 0;
  
  const tierColor = workshop.tier === 'pro' ? 'text-amber-500 bg-amber-500/10' : 
                    workshop.tier === 'workshop' ? 'text-primary bg-primary/10' : 
                    'text-foreground bg-white/5';

  return (
    <div className="pb-20">
      {/* Header Hero */}
      <div className="relative h-[40vh] min-h-[400px] bg-background border-b border-border">
        <div className="absolute inset-0">
          <img 
            src={workshop.thumbnailUrl || heroImg} 
            alt={workshop.title} 
            className="w-full h-full object-cover opacity-40 mix-blend-luminosity"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        </div>
        
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10 max-w-5xl mx-auto">
          <Link href="/workshops" className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary transition-colors mb-6 uppercase tracking-widest w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Curriculum
          </Link>
          
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest ${tierColor}`}>
              {workshop.tier === 'free' ? 'Phase 1' : workshop.tier === 'workshop' ? 'Phase 2' : 'Phase 3'}
            </span>
            <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest border-l border-white/20 pl-3">
              {workshop.category}
            </span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">{workshop.title}</h1>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Instructor: <span className="text-foreground">{workshop.instructorName || "StudioFlow"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {workshop.durationMinutes ? `${Math.round(workshop.durationMinutes/60)} hours` : 'Self-paced'}
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Includes Certificate
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-10 max-w-5xl mx-auto grid md:grid-cols-3 gap-10">
        <div className="md:col-span-2 space-y-10">
          {/* About */}
          <section>
            <h2 className="text-xl font-bold tracking-tight mb-4 uppercase">About This Masterclass</h2>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
              {workshop.description}
            </div>
          </section>

          {/* Curriculum */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold tracking-tight uppercase">Curriculum</h2>
              <span className="text-xs font-mono text-muted-foreground">{workshop.totalModules} Modules</span>
            </div>
            
            <div className="space-y-3">
              {workshop.modules?.map((module, i) => {
                const isLocked = !workshop.isEnrolled && i > 0; // First module free to preview
                
                return (
                  <div 
                    key={module.id} 
                    className={`p-4 border flex items-center justify-between gap-4 transition-colors ${
                      module.isCompleted 
                        ? 'bg-card/50 border-white/5 opacity-70' 
                        : isLocked
                          ? 'bg-background border-border opacity-50'
                          : 'bg-card border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-background border border-border flex items-center justify-center font-mono text-xs font-bold text-muted-foreground shrink-0">
                        {String(module.order).padStart(2, '0')}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm tracking-tight">{module.title}</h3>
                        <p className="text-xs text-muted-foreground font-mono mt-1">{module.durationMinutes} min</p>
                      </div>
                    </div>
                    
                    <div>
                      {isLocked ? (
                        <Lock className="w-5 h-5 text-muted-foreground" />
                      ) : module.isCompleted ? (
                        <CheckCircle2 className="w-6 h-6 text-primary" />
                      ) : workshop.isEnrolled ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleCompleteModule(module.id)}
                          disabled={completeModule.isPending}
                          className="font-mono text-[10px] uppercase tracking-widest text-primary hover:text-primary hover:bg-primary/20"
                        >
                          Mark Complete
                        </Button>
                      ) : (
                        <PlayCircle className="w-6 h-6 text-primary" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Action Sidebar */}
        <aside className="space-y-6">
          <div className="bg-card border border-border p-6 sticky top-24">
            {workshop.isEnrolled ? (
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-3xl font-black text-primary mb-1">{Math.round(progressPercent)}%</div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Completed</div>
                </div>
                
                <Progress value={progressPercent} className="h-2 rounded-none bg-background [&>div]:bg-primary" />
                
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>Modules</span>
                    <span className="text-foreground">{completedModules} / {workshop.totalModules}</span>
                  </div>
                </div>
                
                {progressPercent === 100 ? (
                  <Button className="w-full h-12 bg-primary/20 text-primary hover:bg-primary/30 font-bold tracking-widest uppercase text-xs rounded-none border border-primary/50" disabled>
                    Masterclass Completed
                  </Button>
                ) : (
                  <Button className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-widest uppercase text-xs rounded-none">
                    Continue Learning
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <div className="text-2xl font-black mb-2 uppercase tracking-tighter">
                    {workshop.tier === 'free' ? 'Free Access' : workshop.tier === 'workshop' ? 'Phase 2 Pass' : 'Pro Tier Only'}
                  </div>
                  <p className="text-sm text-muted-foreground">Enroll to unlock all modules, assignments, and earn your certificate.</p>
                </div>
                
                <Button 
                  onClick={handleEnroll} 
                  disabled={enroll.isPending}
                  className="w-full h-14 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-widest uppercase text-xs rounded-none shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                >
                  {enroll.isPending ? "Processing..." : "Enroll Now"}
                </Button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
