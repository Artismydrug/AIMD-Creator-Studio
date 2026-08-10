import { useState } from "react";
import { 
  useListSkillTracks, 
  useCreateSkillTrack,
  useUpdateSkillTrack,
  getListSkillTracksQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Medal, Plus, Target, CheckSquare, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const trackSchema = z.object({
  artForm: z.string().min(1, "Art form is required"),
});

const ART_FORMS = [
  "Tattooing",
  "Fine Art",
  "Spatial Design",
  "Digital Illustration",
  "Photography",
  "Sculpture"
];

export default function SkillTracks() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: tracks, isLoading } = useListSkillTracks();
  const createTrack = useCreateSkillTrack();
  const updateTrack = useUpdateSkillTrack();

  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const form = useForm<z.infer<typeof trackSchema>>({
    resolver: zodResolver(trackSchema),
    defaultValues: { artForm: "" }
  });

  const onSubmit = (values: z.infer<typeof trackSchema>) => {
    createTrack.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSkillTracksQueryKey() });
        setIsCreateOpen(false);
        form.reset();
        toast({ title: "Track Started", description: "The path is set. Start walking." });
      }
    });
  };

  const handleToggleMilestone = (trackId: number, completedCount: number, totalCount: number, isAdding: boolean) => {
    const newCount = isAdding ? completedCount + 1 : completedCount - 1;
    if (newCount < 0 || newCount > totalCount) return;
    
    updateTrack.mutate({ 
      id: trackId, 
      data: { 
        completedMilestones: newCount,
        status: newCount === totalCount ? 'certified' : 'in_progress' 
      } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListSkillTracksQueryKey() });
      }
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase">Skill Tracks</h1>
          <p className="text-muted-foreground font-mono text-sm">Clear paths to professional certification.</p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="font-bold tracking-widest uppercase text-xs rounded-none bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              Declare Track
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md bg-card border-border rounded-none">
            <DialogHeader>
              <DialogTitle className="uppercase font-black tracking-tighter text-2xl">Choose Your Path</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="artForm"
                  render={({ field }) => (
                    <FormItem>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-background border-border rounded-none h-12">
                            <SelectValue placeholder="Select Discipline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-none">
                          {ART_FORMS.map(form => (
                            <SelectItem key={form} value={form}>{form}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={createTrack.isPending} className="w-full h-12 font-bold tracking-widest uppercase text-xs rounded-none">
                  {createTrack.isPending ? "Setting Path..." : "Commit"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-8">
        {isLoading ? (
          Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-64 w-full bg-card rounded-lg" />)
        ) : tracks && tracks.length > 0 ? (
          tracks.map((track) => {
            const isComplete = track.percentComplete === 100;
            
            return (
              <div 
                key={track.id} 
                className={`border rounded-lg overflow-hidden ${
                  isComplete 
                    ? "bg-card border-primary/30 relative" 
                    : "bg-card border-border"
                }`}
              >
                {isComplete && (
                  <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                )}
                
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className={`w-14 h-14 shrink-0 rounded flex items-center justify-center ${
                      isComplete ? "bg-primary/20 text-primary" : "bg-background border border-border text-muted-foreground"
                    }`}>
                      <Medal className="w-7 h-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight">{track.artForm} Track</h2>
                      <div className="flex items-center gap-2 mt-2 text-xs font-mono uppercase tracking-widest text-muted-foreground">
                        <Target className="w-3.5 h-3.5" />
                        {track.completedMilestones} of {track.totalMilestones} Milestones
                      </div>
                    </div>
                  </div>
                  
                  {isComplete && (
                    <div className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 font-black uppercase tracking-widest text-xs animate-in fade-in zoom-in">
                      <Sparkles className="w-4 h-4" />
                      Studio Ready Certified
                    </div>
                  )}
                </div>
                
                {/* Progress body */}
                <div className="p-6 md:p-8 relative z-10 bg-background/50">
                  <div className="mb-8">
                    <div className="flex justify-between items-end mb-3">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Overall Progress</span>
                      <span className={`text-2xl font-black ${isComplete ? 'text-primary' : 'text-foreground'}`}>
                        {Math.round(track.percentComplete)}%
                      </span>
                    </div>
                    <Progress value={track.percentComplete} className={`h-2 rounded-none bg-background border border-border ${isComplete ? '[&>div]:bg-primary shadow-[0_0_15px_rgba(16,185,129,0.3)]' : '[&>div]:bg-foreground'}`} />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Render generic milestones since the API doesn't populate them directly in this mock */}
                    {Array.from({ length: track.totalMilestones }).map((_, i) => {
                      const isMilestoneComplete = i < track.completedMilestones;
                      return (
                        <div 
                          key={i} 
                          className={`flex items-center gap-3 p-3 border rounded transition-colors ${
                            isMilestoneComplete 
                              ? "bg-card/50 border-white/5 opacity-50" 
                              : "bg-background border-border hover:border-white/20"
                          }`}
                        >
                          <button 
                            onClick={() => handleToggleMilestone(track.id, track.completedMilestones, track.totalMilestones, !isMilestoneComplete)}
                            disabled={updateTrack.isPending}
                            className={`shrink-0 transition-colors ${
                              isMilestoneComplete ? "text-primary" : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            <CheckSquare className="w-5 h-5" />
                          </button>
                          <span className={`text-sm font-medium ${isMilestoneComplete ? "line-through text-muted-foreground" : ""}`}>
                            {track.artForm} Milestone {i + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-20 bg-card border border-dashed border-border rounded-lg">
            <h3 className="text-xl font-bold mb-2">No skill tracks active</h3>
            <p className="text-muted-foreground mb-6">Declare a track to focus your efforts and earn certification.</p>
            <Button onClick={() => setIsCreateOpen(true)} className="rounded-none font-bold tracking-widest uppercase text-xs">
              Declare Track
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
