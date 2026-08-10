import { useState } from 'react';
import { useListJobListings, useApplyForJob } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { MapPin, DollarSign, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function JobBoard() {
  const [filter, setFilter] = useState<string | null>(null);
  // @ts-ignore
  const { data: jobs, isLoading } = useListJobListings({ type: filter, open: true }, { query: { queryKey: ['listJobListings', filter] } });

  if (isLoading) return <div className="p-8 font-mono animate-pulse">Loading opportunities...</div>;

  return (
    <div className="p-6 md:p-10 space-y-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-border">
        <div>
          <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">Studio Placement</h1>
          <p className="text-muted-foreground font-mono mt-2">Residencies, guest spots, and apprenticeships.</p>
        </div>
        <div className="flex gap-2 bg-background p-1 border border-border">
          {['all', 'resident', 'guest', 'apprenticeship'].map(type => (
            <Button 
              key={type}
              variant="ghost" 
              size="sm"
              className={`rounded-none font-mono uppercase text-xs ${
                (filter === type || (filter === null && type === 'all')) ? 'bg-primary text-primary-foreground' : 'hover:bg-white/5'
              }`}
              onClick={() => setFilter(type === 'all' ? null : type)}
            >
              {type}
            </Button>
          ))}
        </div>
      </header>

      <div className="space-y-6 max-w-4xl">
        {jobs?.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
        {jobs?.length === 0 && (
          <div className="py-24 text-center border border-dashed border-border bg-card">
            <h3 className="text-xl font-bold font-display uppercase mb-2">No Openings Found</h3>
            <p className="text-muted-foreground font-mono text-sm">Check back later for new spots.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: any }) {
  const [open, setOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  
  const queryClient = useQueryClient();
  const apply = useApplyForJob();
  const { toast } = useToast();

  const handleApply = () => {
    apply.mutate({
      id: job.id,
      data: { coverLetter }
    }, {
      onSuccess: () => {
        setOpen(false);
        toast({ title: 'Application Submitted', description: 'The studio will review your profile.' });
        queryClient.invalidateQueries({ queryKey: ['listJobListings'] });
      }
    });
  };

  return (
    <div className="border border-border bg-card p-6 md:p-8 flex flex-col group hover:border-primary/50 transition-colors">
      <div className="flex flex-col md:flex-row justify-between gap-6 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="font-display font-bold text-xl uppercase tracking-widest text-primary">{job.studioName}</span>
            <Badge className="rounded-none bg-background/50 border-border text-foreground font-mono uppercase text-[10px]">
              {job.type}
            </Badge>
          </div>
          <h3 className="text-3xl font-black font-display uppercase leading-none tracking-tight">{job.title}</h3>
        </div>
        
        <div className="shrink-0 space-y-2 font-mono text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" /> {job.location}
          </div>
          {job.compensation && (
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" /> {job.compensation}
            </div>
          )}
        </div>
      </div>

      <div className="mb-8">
        <p className="text-base text-muted-foreground whitespace-pre-wrap">{job.description}</p>
        
        {job.requirements && (
          <div className="mt-4 p-4 bg-background border border-white/5">
            <div className="font-mono text-xs uppercase text-primary mb-2">Requirements</div>
            <p className="text-sm text-muted-foreground">{job.requirements}</p>
          </div>
        )}
      </div>

      <div className="mt-auto pt-6 border-t border-border flex items-center justify-between">
        <div className="font-mono text-xs text-muted-foreground">
          {job.applicantCount} applicants so far
        </div>
        
        {job.hasApplied ? (
          <Button disabled variant="outline" className="rounded-none font-mono uppercase border-primary/50 text-primary">
            Applied
          </Button>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-none font-mono uppercase bg-foreground text-background hover:bg-foreground/90 px-8">
                Apply Now <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-none border-border bg-card sm:max-w-xl">
              <DialogHeader>
                <DialogTitle className="font-display uppercase text-2xl">Apply for {job.title}</DialogTitle>
                <DialogDescription className="font-mono text-sm text-muted-foreground">
                  Your creator profile and portfolio links will be sent automatically.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-2">
                  <label className="font-mono text-xs uppercase text-primary">Cover Letter / Intro (Optional)</label>
                  <Textarea 
                    className="rounded-none border-border bg-background min-h-[150px]" 
                    placeholder="Why are you a good fit for this spot?" 
                    value={coverLetter} 
                    onChange={e => setCoverLetter(e.target.value)} 
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)}>Cancel</Button>
                <Button className="rounded-none bg-primary text-primary-foreground" onClick={handleApply}>Submit Application</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
