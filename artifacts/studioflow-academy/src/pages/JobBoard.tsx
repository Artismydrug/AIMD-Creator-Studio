import { useState } from "react";
import { 
  useListJobListings,
  useApplyForJob,
  useGetCurrentUser,
  getListJobListingsQueryKey
} from "@workspace/api-client-react";
import { ListJobListingsType, JobListing } from "@workspace/api-client-react/src/generated/api.schemas";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, MapPin, DollarSign, Lock, Sparkles, Send } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function JobBoard() {
  const [activeType, setActiveType] = useState<string>("all");
  const typeParam = activeType === "all" ? undefined : (activeType as ListJobListingsType);

  const { data: jobs, isLoading } = useListJobListings({ type: typeParam, open: true });
  const { data: user } = useGetCurrentUser();
  const applyJob = useApplyForJob();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedJob, setSelectedJob] = useState<JobListing | null>(null);
  const [coverLetter, setCoverLetter] = useState("");

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;

    applyJob.mutate({ 
      id: selectedJob.id, 
      data: { coverLetter: coverLetter || null } 
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListJobListingsQueryKey() });
        setSelectedJob(null);
        setCoverLetter("");
        toast({ title: "Application Sent", description: "The studio has received your portfolio." });
      }
    });
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-card border border-border p-8 rounded-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 p-16 opacity-5 pointer-events-none">
          <Briefcase className="w-64 h-64" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-black tracking-tighter uppercase">Studio Chairs</h1>
          <p className="text-muted-foreground font-mono text-sm max-w-md mt-2">
            Elite studios looking for disciplined talent. Cold emails are dead. Apply with your verified StudioFlow portfolio.
          </p>
        </div>
        
        <div className="relative z-10 w-full md:w-auto space-y-4">
          {!user?.studioReadyBadge && (
            <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 border border-amber-500/20 px-3 py-2 text-xs font-mono uppercase tracking-widest">
              <Lock className="w-3.5 h-3.5" />
              Studio Ready Badge Required to Apply
            </div>
          )}
          <Tabs defaultValue="all" onValueChange={setActiveType} className="w-full">
            <TabsList className="bg-background border border-border h-12 w-full p-1 rounded-none">
              <TabsTrigger value="all" className="rounded-none uppercase tracking-widest text-[10px] font-bold">All</TabsTrigger>
              <TabsTrigger value="resident" className="rounded-none uppercase tracking-widest text-[10px] font-bold">Resident</TabsTrigger>
              <TabsTrigger value="guest" className="rounded-none uppercase tracking-widest text-[10px] font-bold">Guest Spot</TabsTrigger>
              <TabsTrigger value="apprenticeship" className="rounded-none uppercase tracking-widest text-[10px] font-bold">Apprentice</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => <Skeleton key={i} className="h-64 w-full bg-card rounded-lg" />)
        ) : jobs && jobs.length > 0 ? (
          jobs.map((job) => (
            <div key={job.id} className="bg-card border border-border flex flex-col hover:border-primary/50 transition-colors group">
              <div className="p-6 border-b border-white/5">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest ${
                    job.type === 'resident' ? 'text-primary bg-primary/10' : 
                    job.type === 'guest' ? 'text-purple-500 bg-purple-500/10' : 
                    'text-blue-500 bg-blue-500/10'
                  }`}>
                    {job.type}
                  </div>
                  {job.applicantCount !== undefined && (
                    <span className="text-xs font-mono text-muted-foreground">
                      {job.applicantCount} applicants
                    </span>
                  )}
                </div>
                
                <h2 className="text-xl font-bold tracking-tight mb-1">{job.title}</h2>
                <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest">
                  @ {job.studioName}
                </div>
              </div>
              
              <div className="p-6 space-y-4 flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {job.description}
                </p>
                
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {job.location}
                  </div>
                  {job.compensation && (
                    <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <DollarSign className="w-3.5 h-3.5" />
                      {job.compensation}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-6 pt-0 mt-auto">
                {job.hasApplied ? (
                  <Button className="w-full bg-white/5 text-foreground hover:bg-white/10 font-bold tracking-widest uppercase text-xs rounded-none border border-border" disabled>
                    <Send className="w-3.5 h-3.5 mr-2" />
                    Applied
                  </Button>
                ) : !user?.studioReadyBadge ? (
                  <Button className="w-full bg-background text-muted-foreground border border-border font-bold tracking-widest uppercase text-xs rounded-none" disabled>
                    <Lock className="w-3.5 h-3.5 mr-2" />
                    Locked
                  </Button>
                ) : user.tier === 'free' ? (
                  <Button className="w-full bg-amber-500 text-black hover:bg-amber-400 font-bold tracking-widest uppercase text-xs rounded-none shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    Pro Required to Apply
                  </Button>
                ) : (
                  <Dialog open={selectedJob?.id === job.id} onOpenChange={(open) => !open && setSelectedJob(null)}>
                    <DialogTrigger asChild>
                      <Button 
                        onClick={() => setSelectedJob(job)}
                        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-widest uppercase text-xs rounded-none group-hover:shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-shadow"
                      >
                        Apply for Chair
                      </Button>
                    </DialogTrigger>
                    {selectedJob?.id === job.id && (
                      <DialogContent className="sm:max-w-lg bg-card border-border rounded-none">
                        <DialogHeader>
                          <DialogTitle className="uppercase font-black tracking-tighter text-2xl">Apply to {job.studioName}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleApply} className="space-y-4 pt-4">
                          <div className="bg-background border border-border p-4 mb-4">
                            <div className="flex items-center gap-2 text-primary text-xs font-mono uppercase tracking-widest mb-2">
                              <Sparkles className="w-4 h-4" />
                              Studio Ready Certified
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Your verified StudioFlow portfolio, metrics, and skill tracks will be automatically attached to this application.
                            </p>
                          </div>
                          <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Cover Note (Optional)</label>
                            <Textarea 
                              placeholder="Why are you the right fit for this studio?"
                              className="bg-background border-border rounded-none resize-none h-32"
                              value={coverLetter}
                              onChange={(e) => setCoverLetter(e.target.value)}
                            />
                          </div>
                          <Button type="submit" disabled={applyJob.isPending} className="w-full h-12 bg-primary text-primary-foreground font-bold tracking-widest uppercase text-xs rounded-none">
                            {applyJob.isPending ? "Sending..." : "Submit Application"}
                          </Button>
                        </form>
                      </DialogContent>
                    )}
                  </Dialog>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 text-center border border-dashed border-border rounded-lg bg-card">
            <h3 className="text-xl font-bold mb-2">No chairs available</h3>
            <p className="text-muted-foreground mb-6">Check back later or adjust your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
