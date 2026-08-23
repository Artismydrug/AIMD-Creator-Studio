import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetInstructorSelf,
  useUpdateInstructorSelf,
  useGetInstructorCurriculum,
  useCreateWorkshopModule,
  useCreateDrillPrompt,
  useListSubmissionQueue,
  useSubmitAssignmentFeedback,
  useGetCurrentUser,
  useGetWorkshop
} from '@workspace/api-client-react';
import { Link, useLocation } from 'wouter';
import { ShieldAlert, User as UserIcon, BookOpen, Clock, ListChecks, PlayCircle, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MediaUpload, MediaType } from '@/components/MediaUpload';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';

// Helper component for creating modules
function CreateModuleDialog({ workshopId }: { workshopId: number }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [order, setOrder] = useState('0');
  const [duration, setDuration] = useState('5');
  
  const createModule = useCreateWorkshopModule();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = () => {
    createModule.mutate(
      { workshopId, data: { title, description, videoUrl: videoUrl || null, order: parseInt(order, 10), durationMinutes: parseInt(duration, 10) } },
      {
        onSuccess: () => {
          toast({ title: 'Module Created', description: 'Module has been added to the curriculum.' });
          setOpen(false);
          setTitle('');
          setDescription('');
          setVideoUrl('');
          queryClient.invalidateQueries({ queryKey: ['getInstructorCurriculum'] });
        },
        onError: (err: any) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-none font-mono text-xs uppercase" data-testid="instructor-create-module-btn">
          + Add Module
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-2xl">Create Module</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Title</label>
            <Input className="rounded-none border-border bg-background" value={title} onChange={e => setTitle(e.target.value)} data-testid="module-title-input" />
          </div>
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Description (Optional)</label>
            <Textarea className="rounded-none border-border bg-background resize-none" value={description} onChange={e => setDescription(e.target.value)} data-testid="module-desc-input" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase text-muted-foreground">Order</label>
              <Input type="number" className="rounded-none border-border bg-background" value={order} onChange={e => setOrder(e.target.value)} data-testid="module-order-input" />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-xs uppercase text-muted-foreground">Duration (Min)</label>
              <Input type="number" className="rounded-none border-border bg-background" value={duration} onChange={e => setDuration(e.target.value)} data-testid="module-duration-input" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Video (Optional)</label>
            <MediaUpload url={videoUrl} mediaType="video" onChange={setVideoUrl} allowVideo />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)} data-testid="module-cancel-btn">Cancel</Button>
          <Button className="rounded-none bg-primary text-primary-foreground" onClick={handleCreate} disabled={!title || createModule.isPending} data-testid="module-save-btn">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CurriculumWorkshop({ workshopSummary }: { workshopSummary: any }) {
  const { data: workshop } = useGetWorkshop(workshopSummary.workshopId, { query: { queryKey: ['getWorkshop', workshopSummary.workshopId], enabled: !!workshopSummary.workshopId } });
  
  if (!workshop) {
    return (
      <div className="border border-border bg-card p-6 animate-pulse">
        <h2 className="h-8 bg-muted w-1/3 mb-2"></h2>
        <p className="h-4 bg-muted w-1/4"></p>
      </div>
    );
  }

  return (
    <div className="border border-border bg-card">
      <div className="p-6 border-b border-border bg-muted/30 flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-2xl uppercase tracking-tight">{workshop.title}</h2>
          <p className="font-mono text-xs text-muted-foreground uppercase">{workshop.category} · {workshop.totalModules} Modules</p>
        </div>
        <CreateModuleDialog workshopId={workshop.id} />
      </div>
      
      <div className="p-6 space-y-4">
        {workshop.modules?.map((mod: any, i: number) => (
          <div key={mod.id} className="border border-border bg-background p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-lg">{i + 1}. {mod.title}</h3>
                <p className="font-mono text-xs text-muted-foreground"><Clock className="inline w-3 h-3 mr-1" /> {mod.durationMinutes}m · {mod.videoUrl ? 'Video attached' : 'No video'}</p>
              </div>
              <CreateDrillDialog workshopId={workshop.id} moduleId={mod.id} />
            </div>
            
            {/* Drills if any */}
            {mod.drills && mod.drills.length > 0 && (
              <div className="mt-2 pt-3 border-t border-border/50">
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary mb-2">Drill Prompts</p>
                <div className="space-y-2">
                  {mod.drills.map((drill: any) => (
                    <div key={drill.id} className="bg-muted/50 p-2 text-sm font-mono flex justify-between gap-4">
                      <span className="truncate">"{drill.prompt}"</span>
                      <span className="text-muted-foreground flex-shrink-0">≤{drill.maxDurationSeconds}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {(!workshop.modules || workshop.modules.length === 0) && (
          <p className="text-center font-mono text-sm text-muted-foreground py-4">No modules added yet.</p>
        )}
      </div>
    </div>
  );
}

function CreateDrillDialog({ workshopId, moduleId }: { workshopId: number, moduleId: number }) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [maxDuration, setMaxDuration] = useState('30');
  
  const createDrill = useCreateDrillPrompt();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleCreate = () => {
    createDrill.mutate(
      { workshopId, moduleId, data: { prompt, maxDurationSeconds: parseInt(maxDuration, 10) } },
      {
        onSuccess: () => {
          toast({ title: 'Drill Created', description: 'Drill has been added to the module.' });
          setOpen(false);
          setPrompt('');
          queryClient.invalidateQueries({ queryKey: ['getInstructorCurriculum'] });
        },
        onError: (err: any) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 rounded-none font-mono text-[10px] uppercase text-primary border border-primary/20" data-testid="instructor-create-drill-btn">
          + Add Drill
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-2xl">Create Drill</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Drill Prompt</label>
            <Textarea className="rounded-none border-border bg-background resize-none" value={prompt} onChange={e => setPrompt(e.target.value)} data-testid="drill-prompt-input" />
          </div>
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Max Duration (Seconds, ≤30)</label>
            <Input type="number" min="1" max="30" className="rounded-none border-border bg-background" value={maxDuration} onChange={e => setMaxDuration(e.target.value)} data-testid="drill-duration-input" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)} data-testid="drill-cancel-btn">Cancel</Button>
          <Button className="rounded-none bg-primary text-primary-foreground" onClick={handleCreate} disabled={!prompt || createDrill.isPending} data-testid="drill-save-btn">Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReviewAssignmentDialog({ assignment }: { assignment: any }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<'approved' | 'revision_requested'>('approved');
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackMediaUrl, setFeedbackMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<MediaType | 'audio'>('video');

  const submitFeedback = useSubmitAssignmentFeedback();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleReview = () => {
    submitFeedback.mutate(
      { 
        assignmentId: assignment.id, 
        data: { 
          status, 
          feedbackText: feedbackText || null, 
          feedbackVideoUrl: mediaType === 'video' ? feedbackMediaUrl : null,
          feedbackAudioUrl: mediaType === 'audio' ? feedbackMediaUrl : null,
        } 
      },
      {
        onSuccess: () => {
          toast({ title: 'Feedback Submitted', description: 'Your review has been recorded.' });
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: ['listSubmissionQueue'] });
        },
        onError: (err: any) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="rounded-none font-mono text-xs uppercase bg-primary text-primary-foreground" data-testid={`review-assignment-btn-${assignment.id}`}>
          Review
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none border-border bg-card max-w-3xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          <div className="flex-1 bg-black flex flex-col">
            {assignment.submissionUrl ? (
              <video src={assignment.submissionUrl} controls className="w-full h-full object-contain" />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground font-mono text-sm">No video submitted</div>
            )}
            <div className="p-4 bg-background border-t border-border">
              <h4 className="font-bold uppercase font-mono text-sm mb-1 text-primary">Student Note</h4>
              <p className="text-sm text-foreground/80">{assignment.submissionNote || 'No notes attached.'}</p>
            </div>
          </div>
          
          <div className="w-full md:w-[350px] border-l border-border bg-background flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b border-border">
              <h3 className="font-display font-bold uppercase text-lg mb-1">Submit Feedback</h3>
              <p className="font-mono text-xs text-muted-foreground">ID: #{assignment.id}</p>
            </div>
            
            <div className="p-4 space-y-6 flex-1">
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Action</label>
                <div className="flex gap-2">
                  <Button 
                    variant={status === 'approved' ? 'default' : 'outline'} 
                    className={`flex-1 rounded-none font-mono text-xs uppercase ${status === 'approved' ? 'bg-emerald-500 hover:bg-emerald-600 text-black' : ''}`}
                    onClick={() => setStatus('approved')}
                    data-testid="status-approve-btn"
                  >
                    Approve
                  </Button>
                  <Button 
                    variant={status === 'revision_requested' ? 'default' : 'outline'} 
                    className={`flex-1 rounded-none font-mono text-xs uppercase ${status === 'revision_requested' ? 'bg-amber-500 hover:bg-amber-600 text-black' : ''}`}
                    onClick={() => setStatus('revision_requested')}
                    data-testid="status-revise-btn"
                  >
                    Request Revision
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Text Feedback</label>
                <Textarea 
                  className="rounded-none border-border bg-card resize-none h-32 text-sm" 
                  placeholder="Notes for the student..." 
                  value={feedbackText} 
                  onChange={e => setFeedbackText(e.target.value)}
                  data-testid="feedback-text-input"
                />
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Audio / Video Feedback (Optional)</label>
                <MediaUpload 
                  url={feedbackMediaUrl} 
                  mediaType={mediaType} 
                  onChange={(url, type) => { setFeedbackMediaUrl(url); setMediaType(type); }} 
                  allowImage={false}
                  allowVideo 
                  allowAudio 
                  purpose="instructor_feedback"
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-border mt-auto">
              <Button 
                className="w-full rounded-none font-mono font-bold uppercase bg-primary text-primary-foreground" 
                onClick={handleReview}
                disabled={submitFeedback.isPending}
                data-testid="submit-review-btn"
              >
                Submit Review
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Instructor() {
  const { data: user, isLoading: userLoading } = useGetCurrentUser({ query: { queryKey: ['getCurrentUser'] } });
  const { data: profile, isLoading: profileLoading, error: profileError } = useGetInstructorSelf({ query: { queryKey: ['getInstructorSelf'], retry: false } });
  const updateProfile = useUpdateInstructorSelf();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editBio, setEditBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  const { data: curriculum = [] } = useGetInstructorCurriculum({ query: { queryKey: ['getInstructorCurriculum'], enabled: !!profile } });
  const { data: queue = [] } = useListSubmissionQueue({ status: 'pending' }, { query: { queryKey: ['listSubmissionQueue', 'pending'], enabled: !!profile } });

  const startEdit = () => {
    setEditBio(profile?.bio || '');
    setIsEditing(true);
  };

  const handleSaveProfile = () => {
    updateProfile.mutate(
      { data: { bio: editBio || undefined } },
      {
        onSuccess: () => {
          toast({ title: 'Profile Updated' });
          setIsEditing(false);
          queryClient.invalidateQueries({ queryKey: ['getInstructorSelf'] });
        },
        onError: (err: any) => {
          toast({ title: 'Error', description: err.message, variant: 'destructive' });
        }
      }
    );
  };

  if (userLoading || profileLoading) {
    return <div className="p-10 font-mono text-sm animate-pulse">Loading Workspace...</div>;
  }

  if (profileError || !profile) {
    if (user?.isAdmin) {
      return (
        <div className="p-10 max-w-lg mx-auto text-center space-y-4 py-24" data-testid="instructor-admin-oversight">
          <ShieldAlert className="w-12 h-12 mx-auto text-primary" />
          <h2 className="font-display font-bold text-2xl uppercase">Admin Oversight</h2>
          <p className="text-sm text-muted-foreground">
            You have admin access but no instructor profile of your own. Manage mentors, link accounts, and
            assign workshops from the admin dashboard — or create an instructor profile for yourself there.
          </p>
          <Button asChild className="rounded-none font-mono uppercase mt-4 bg-primary text-primary-foreground" data-testid="oversight-admin-link">
            <Link href="/admin">Open Instructor Management</Link>
          </Button>
        </div>
      );
    }
    return (
      <div className="p-10 max-w-lg mx-auto text-center space-y-4 py-24">
        <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground" />
        <h2 className="font-display font-bold text-2xl uppercase">Unauthorized</h2>
        <p className="text-sm text-muted-foreground">You do not have instructor access. Please contact administration if you believe this is an error.</p>
        <Button asChild variant="outline" className="rounded-none font-mono uppercase mt-4">
          <Link href="/dashboard">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <div className="border-b border-border bg-card px-6 md:px-10 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 md:items-end justify-between">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-muted border border-border flex items-center justify-center overflow-hidden flex-shrink-0">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-10 h-10 text-muted-foreground" />
              )}
            </div>
            {isEditing ? (
              <div className="space-y-3 w-full max-w-sm">
                <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight leading-none mb-2">{profile.displayName}</h1>
                <Textarea className="rounded-none resize-none h-20 text-sm" value={editBio} onChange={e => setEditBio(e.target.value)} data-testid="edit-instructor-bio" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveProfile} disabled={updateProfile.isPending} className="rounded-none font-mono uppercase text-xs" data-testid="save-instructor-btn">Save</Button>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)} className="rounded-none font-mono uppercase text-xs">Cancel</Button>
                </div>
              </div>
            ) : (
              <div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/20 bg-primary/10 px-2 py-0.5 mb-2 inline-block">Instructor Workspace</span>
                <h1 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight leading-none mb-2">{profile.displayName}</h1>
                <p className="text-sm text-muted-foreground max-w-md">{profile.bio || 'No bio provided.'}</p>
              </div>
            )}
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={startEdit} className="rounded-none font-mono uppercase text-xs" data-testid="edit-instructor-btn">
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 md:px-10 py-10">
        <Tabs defaultValue="queue">
          <TabsList className="rounded-none border-b border-border bg-transparent p-0 w-full justify-start h-auto">
            <TabsTrigger value="queue" className="rounded-none font-mono text-sm uppercase px-6 py-3 data-[state=active]:bg-primary/10 data-[state=active]:border-b-2 data-[state=active]:border-primary" data-testid="tab-queue">
              <ListChecks className="w-4 h-4 mr-2" /> Needs Review ({queue.length})
            </TabsTrigger>
            <TabsTrigger value="curriculum" className="rounded-none font-mono text-sm uppercase px-6 py-3 data-[state=active]:bg-primary/10 data-[state=active]:border-b-2 data-[state=active]:border-primary" data-testid="tab-curriculum">
              <BookOpen className="w-4 h-4 mr-2" /> My Curriculum
            </TabsTrigger>
          </TabsList>

          <TabsContent value="queue" className="pt-8">
            <div className="space-y-4">
              {queue.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-border bg-card">
                  <p className="font-mono text-muted-foreground text-sm">No pending submissions.</p>
                </div>
              ) : (
                queue.map((assignment: any) => (
                  <div key={assignment.id} className="border border-border bg-card p-5 flex flex-col md:flex-row gap-4 items-start md:items-center">
                    <div className="w-24 h-16 bg-muted border border-border flex items-center justify-center flex-shrink-0 relative overflow-hidden group cursor-pointer">
                      {assignment.submissionUrl ? (
                        <video src={assignment.submissionUrl} className="w-full h-full object-cover" />
                      ) : (
                        <PlayCircle className="w-6 h-6 text-muted-foreground" />
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <PlayCircle className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg font-display uppercase tracking-tight truncate">{assignment.workshopTitle}</h3>
                      <p className="text-sm text-muted-foreground truncate font-mono">Module {assignment.moduleId} · Submitted {new Date(assignment.submittedAt).toLocaleDateString()}</p>
                      {assignment.submissionNote && (
                        <p className="text-xs text-foreground/70 mt-1 line-clamp-1 border-l-2 border-primary/50 pl-2">
                          "{assignment.submissionNote}"
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 w-full md:w-auto">
                      <ReviewAssignmentDialog assignment={assignment} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="curriculum" className="pt-8">
            <div className="space-y-12">
              {curriculum.length === 0 ? (
                <div className="py-16 text-center border border-dashed border-border bg-card">
                  <p className="font-mono text-muted-foreground text-sm">No workshops assigned.</p>
                </div>
              ) : (
                curriculum.map((summary: any) => (
                  <CurriculumWorkshop key={summary.workshopId} workshopSummary={summary} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
