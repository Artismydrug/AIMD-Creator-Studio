import { useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetWorkshop,
  useCreateWorkshopModule,
  useUpdateWorkshopModule,
  useUpdateInstructorWorkshop,
  useEnrollWorkshopParticipant,
  useListWorkshopParticipants,
  getGetWorkshopQueryKey,
  getGetInstructorCurriculumQueryKey,
  getListWorkshopsQueryKey,
  getListWorkshopParticipantsQueryKey,
  type WorkshopModule,
} from '@workspace/api-client-react';
import { Clock, Trash2, Pencil, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { WorkshopVideoUpload } from './WorkshopVideoUpload';

function useInvalidate(workshopId: number) {
  const qc = useQueryClient();
  return () => Promise.all([
    qc.invalidateQueries({ queryKey: getGetWorkshopQueryKey(workshopId) }),
    qc.invalidateQueries({ queryKey: getGetInstructorCurriculumQueryKey() }),
    qc.invalidateQueries({ queryKey: getListWorkshopsQueryKey({}) }),
    qc.invalidateQueries({ queryKey: getListWorkshopParticipantsQueryKey(workshopId) }),
  ]);
}

const lbl = 'font-mono text-xs uppercase text-muted-foreground';
const inp = 'rounded-none border-border bg-background';

/** Media slot: undefined = unchanged, null = clear on save, string = newly uploaded. */
function MediaSlot({ workshopId, kind, title, stored, pending, setPending }: {
  workshopId: number; kind: 'preview' | 'lesson'; title: string; stored?: boolean;
  pending: string | null | undefined; setPending: (v: string | null | undefined) => void;
}) {
  const state = pending === null ? 'Will be removed on save' : typeof pending === 'string' ? 'New upload ready — save to attach' : stored ? 'Attached' : 'None';
  return (
    <div className="space-y-2 border border-border p-3">
      <div className="flex justify-between items-center gap-2">
        <span className={lbl}>{title}</span>
        <span className="font-mono text-[10px] uppercase text-primary" data-testid={`media-state-${kind}`}>{state}</span>
      </div>
      <div className="flex flex-wrap gap-2 items-start">
        <WorkshopVideoUpload key={pending === undefined ? 'saved' : pending === null ? 'removed' : 'changed'} workshopId={workshopId} kind={kind} label={stored || pending ? 'Replace' : 'Upload'} onUploaded={(u) => setPending(u)} testId={`upload-${kind}`} />
        {(stored || typeof pending === 'string') && pending !== null && (
          <Button type="button" variant="ghost" size="sm" className="rounded-none font-mono text-xs uppercase text-destructive" onClick={() => setPending(null)} data-testid={`remove-${kind}`}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />Remove
          </Button>
        )}
        {pending !== undefined && (
          <Button type="button" variant="ghost" size="sm" className="rounded-none font-mono text-xs uppercase" onClick={() => setPending(undefined)}>Undo</Button>
        )}
      </div>
    </div>
  );
}

function ModuleDialog({ workshopId, module, trigger }: { workshopId: number; module?: WorkshopModule; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(module?.title ?? '');
  const [description, setDescription] = useState(module?.description ?? '');
  const [order, setOrder] = useState(String(module?.order ?? 0));
  const [duration, setDuration] = useState(String(module?.durationMinutes ?? 5));
  const [preview, setPreview] = useState<string | null | undefined>(undefined);
  const [lesson, setLesson] = useState<string | null | undefined>(undefined);
  const create = useCreateWorkshopModule();
  const update = useUpdateWorkshopModule();
  const invalidate = useInvalidate(workshopId);
  const { toast } = useToast();
  const pending = create.isPending || update.isPending;

  const onSettled = {
    onSuccess: async () => { await invalidate(); toast({ title: module ? 'Module updated' : 'Module created' }); setOpen(false); setPreview(undefined); setLesson(undefined); },
    onError: (e: any) => toast({ title: 'Save failed', description: e?.message, variant: 'destructive' }),
  };

  const save = () => {
    const base = { title, description: description || null, order: parseInt(order, 10) || 0, durationMinutes: parseInt(duration, 10) || 1 };
    if (module) {
      update.mutate({ workshopId, moduleId: module.id, data: {
        ...base,
        ...(preview !== undefined ? { previewVideoUrl: preview } : {}),
        ...(lesson !== undefined ? { videoUrl: lesson } : {}),
      } }, onSettled);
    } else {
      create.mutate({ workshopId, data: {
        ...base,
        ...(typeof preview === 'string' ? { previewVideoUrl: preview } : {}),
        ...(typeof lesson === 'string' ? { videoUrl: lesson } : {}),
      } }, onSettled);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (nextOpen) {
        setTitle(module?.title ?? '');
        setDescription(module?.description ?? '');
        setOrder(String(module?.order ?? 0));
        setDuration(String(module?.durationMinutes ?? 5));
        setPreview(undefined);
        setLesson(undefined);
      }
      setOpen(nextOpen);
    }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-none border-border bg-card sm:max-w-md">
        <DialogHeader><DialogTitle className="font-display uppercase text-2xl">{module ? 'Edit Module' : 'Create Module'}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
          <div className="space-y-2"><label className={lbl}>Title</label><Input className={inp} value={title} onChange={(e) => setTitle(e.target.value)} data-testid="module-title-input" /></div>
          <div className="space-y-2"><label className={lbl}>Description</label><Textarea className={`${inp} resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} data-testid="module-desc-input" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><label className={lbl}>Order</label><Input type="number" className={inp} value={order} onChange={(e) => setOrder(e.target.value)} data-testid="module-order-input" /></div>
            <div className="space-y-2"><label className={lbl}>Duration (min)</label><Input type="number" className={inp} value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="module-duration-input" /></div>
          </div>
          <MediaSlot workshopId={workshopId} kind="preview" title="Module teaser (public)" stored={!!module?.previewVideoUrl} pending={preview} setPending={setPreview} />
          <MediaSlot workshopId={workshopId} kind="lesson" title="Full lesson (members only)" stored={!!(module?.videoUrl || module?.hasVideo)} pending={lesson} setPending={setLesson} />
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)} data-testid="module-cancel-btn">Cancel</Button>
          <Button className="rounded-none" onClick={save} disabled={!title.trim() || pending} data-testid="module-save-btn">{pending ? 'Saving…' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RosterPanel({ workshopId }: { workshopId: number }) {
  const { data, isLoading, isError, refetch } = useListWorkshopParticipants(workshopId, { query: { queryKey: getListWorkshopParticipantsQueryKey(workshopId), staleTime: 15_000 } });
  const enroll = useEnrollWorkshopParticipant();
  const invalidate = useInvalidate(workshopId);
  const { toast } = useToast();
  const [username, setUsername] = useState('');

  const run = (name: string, status: 'active' | 'paused') =>
    enroll.mutate({ workshopId, data: { username: name.trim(), status } }, {
      onSuccess: async () => { await invalidate(); toast({ title: status === 'active' ? 'Access granted' : 'Access paused', description: name }); if (name === username) setUsername(''); },
      onError: (e: any) => toast({ title: 'Could not update access', description: e?.message, variant: 'destructive' }),
    });

  return (
    <div className="space-y-3" data-testid="roster-panel">
      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Participant access</p>
      <div className="flex flex-wrap gap-2">
        <Input className={`${inp} max-w-xs`} placeholder="Exact public username" value={username} onChange={(e) => setUsername(e.target.value)} data-testid="roster-username-input" />
        <Button size="sm" className="rounded-none font-mono text-xs uppercase" disabled={!username.trim() || enroll.isPending} onClick={() => run(username, 'active')} data-testid="roster-grant-btn">Grant access</Button>
        <Button size="sm" variant="outline" className="rounded-none font-mono text-xs uppercase" disabled={!username.trim() || enroll.isPending} onClick={() => run(username, 'paused')} data-testid="roster-pause-btn">Pause</Button>
      </div>
      {isLoading ? <p className="font-mono text-xs animate-pulse">Loading roster…</p>
        : isError ? <Button size="sm" variant="outline" className="rounded-none font-mono text-xs uppercase" onClick={() => void refetch()}><RefreshCw className="w-3 h-3 mr-1" />Roster failed — retry</Button>
        : !data?.length ? <p className="font-mono text-xs text-muted-foreground">No participants granted yet.</p>
        : (
          <ul className="divide-y divide-border border border-border">
            {data.map((p) => (
              <li key={p.userId} className="flex items-center justify-between p-2 text-sm" data-testid={`roster-row-${p.userId}`}>
                <span className="font-mono">@{p.username} <span className="text-muted-foreground text-xs uppercase ml-2">{p.status}</span></span>
                <Button size="sm" variant="ghost" className="rounded-none font-mono text-xs uppercase" disabled={enroll.isPending} onClick={() => run(p.username, p.status === 'active' ? 'paused' : 'active')}>
                  {p.status === 'active' ? 'Pause' : 'Resume'}
                </Button>
              </li>
            ))}
          </ul>
        )}
    </div>
  );
}

export function CurriculumWorkshop({ workshopId, drillAction }: { workshopId: number; drillAction: (workshopId: number, moduleId: number) => ReactNode }) {
  const { data: w, isError, refetch } = useGetWorkshop(workshopId, { query: { queryKey: getGetWorkshopQueryKey(workshopId) } });
  const updateWorkshop = useUpdateInstructorWorkshop();
  const invalidate = useInvalidate(workshopId);
  const { toast } = useToast();
  const [teaser, setTeaser] = useState<string | null | undefined>(undefined);

  if (isError) return <div className="border border-border p-6"><Button variant="outline" className="rounded-none font-mono text-xs uppercase" onClick={() => void refetch()}>Workshop failed to load — retry</Button></div>;
  if (!w) return <div className="border border-border bg-card p-6 animate-pulse"><div className="h-8 bg-muted w-1/3 mb-2" /><div className="h-4 bg-muted w-1/4" /></div>;

  const save = (data: { previewVideoUrl?: string | null; isPublished?: boolean }, ok: string) =>
    updateWorkshop.mutate({ workshopId, data: data as { previewVideoUrl: string | null; isPublished: boolean } }, {
      onSuccess: async () => { await invalidate(); setTeaser(undefined); toast({ title: ok }); },
      onError: (e: any) => toast({ title: 'Save failed', description: e?.message, variant: 'destructive' }),
    });
  const published = !!w.isPublished;

  return (
    <div className="border border-border bg-card" data-testid={`curriculum-workshop-${w.id}`}>
      <div className="p-6 border-b border-border bg-muted/30 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display font-black text-2xl uppercase tracking-tight">{w.title}</h2>
            <p className="font-mono text-xs text-muted-foreground uppercase">{w.category} · {w.totalModules} Modules · <span data-testid={`status-published-${w.id}`}>{published ? 'Published' : 'Draft'}</span></p>
          </div>
          <div className="flex gap-2">
            <ModuleDialog workshopId={w.id} trigger={<Button variant="outline" size="sm" className="rounded-none font-mono text-xs uppercase" data-testid="instructor-create-module-btn">+ Add Module</Button>} />
            <Button size="sm" variant={published ? 'outline' : 'default'} className="rounded-none font-mono text-xs uppercase" disabled={updateWorkshop.isPending}
              onClick={() => save({ isPublished: !published }, published ? 'Workshop unpublished' : 'Workshop published')} data-testid={`publish-toggle-${w.id}`}>
              {published ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </div>
        {!published && <p className="font-mono text-[10px] uppercase text-muted-foreground">Publishing needs a workshop teaser or at least one module teaser.</p>}
        <MediaSlot workshopId={w.id} kind="preview" title="Workshop teaser (public)" stored={!!w.previewVideoUrl} pending={teaser} setPending={setTeaser} />
        {teaser !== undefined && (
          <Button size="sm" className="rounded-none font-mono text-xs uppercase" disabled={updateWorkshop.isPending} data-testid="save-workshop-teaser"
            onClick={() => save({ previewVideoUrl: teaser, isPublished: published }, teaser === null ? 'Teaser removed' : 'Teaser saved')}>
            {updateWorkshop.isPending ? 'Saving…' : 'Save teaser'}
          </Button>
        )}
        {w.previewVideoUrl && teaser === undefined && <video src={w.previewVideoUrl} controls preload="metadata" className="w-full max-w-sm aspect-video bg-black" />}
      </div>

      <div className="p-6 space-y-4">
        {w.modules.map((mod, i) => (
          <div key={mod.id} className="border border-border bg-background p-4 space-y-3" data-testid={`curriculum-module-${mod.id}`}>
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-bold text-lg">{i + 1}. {mod.title}</h3>
                <p className="font-mono text-xs text-muted-foreground"><Clock className="inline w-3 h-3 mr-1" />{mod.durationMinutes}m · {mod.previewVideoUrl ? 'Teaser' : 'No teaser'} · {mod.videoUrl || mod.hasVideo ? 'Full video' : 'No full video'}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <ModuleDialog key={`${mod.id}-${mod.title}-${mod.order}-${mod.durationMinutes}-${!!mod.videoUrl}-${!!mod.previewVideoUrl}`} workshopId={w.id} module={mod}
                  trigger={<Button variant="outline" size="sm" className="h-6 px-2 rounded-none font-mono text-[10px] uppercase" data-testid={`edit-module-${mod.id}`}><Pencil className="w-3 h-3 mr-1" />Edit</Button>} />
                {drillAction(w.id, mod.id)}
              </div>
            </div>
            {mod.drills && mod.drills.length > 0 && (
              <div className="pt-3 border-t border-border/50 space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Drill Prompts</p>
                {mod.drills.map((d) => (
                  <div key={d.id} className="bg-muted/50 p-2 text-sm font-mono flex justify-between gap-4"><span className="truncate">"{d.prompt}"</span><span className="text-muted-foreground">≤{d.maxDurationSeconds}s</span></div>
                ))}
              </div>
            )}
          </div>
        ))}
        {w.modules.length === 0 && <p className="text-center font-mono text-sm text-muted-foreground py-4">No modules added yet.</p>}
        <div className="pt-4 border-t border-border"><RosterPanel workshopId={w.id} /></div>
      </div>
    </div>
  );
}
