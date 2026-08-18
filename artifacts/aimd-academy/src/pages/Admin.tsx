import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  useGetCurrentUser,
  useCreateEvent,
  useAwardChallengeWinner,
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { MediaUpload } from '@/components/MediaUpload';
import { Calendar, ShieldCheck, Trophy, ThumbsUp } from 'lucide-react';

// ─── Challenge data (same shape the Studio Log uses) ─────────────────────────

async function fetchCurrentChallenge() {
  const r = await fetch('/api/challenges/current', { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to load challenge');
  return r.json() as Promise<{
    challenge: { week: string; theme: string; challengeWeek: string; totalSubmissions: number };
    submissions: Array<{
      id: number;
      rank: number;
      username: string;
      caption: string;
      imageUrl: string | null;
      votes: number;
    }>;
  }>;
}

// ─── Event creation ───────────────────────────────────────────────────────────

const CATEGORIES = ['workshop', 'pop-up', 'gallery', 'activation', 'community'] as const;
const EVENT_TYPES = ['free', 'ticketed', 'members-only'] as const;

function CreateEventCard() {
  const { toast } = useToast();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('community');
  const [eventType, setEventType] = useState<(typeof EVENT_TYPES)[number]>('free');
  const [location, setLocation] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [maxCapacity, setMaxCapacity] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const reset = () => {
    setTitle(''); setDescription(''); setLocation(''); setStartsAt('');
    setEndsAt(''); setMaxCapacity(''); setImageUrl(''); setIsFeatured(false);
  };

  const submit = () => {
    createEvent.mutate(
      {
        data: {
          title,
          description,
          category,
          eventType,
          location,
          imageUrl: imageUrl || null,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: endsAt ? new Date(endsAt).toISOString() : null,
          maxCapacity: maxCapacity ? parseInt(maxCapacity, 10) : null,
          isFeatured,
        },
      },
      {
        onSuccess: () => {
          toast({ title: 'Event posted!', description: `"${title}" is now live on Community Events.` });
          reset();
        },
        onError: (err: any) => {
          toast({ title: 'Could not post event', description: String(err?.message ?? err), variant: 'destructive' });
        },
      }
    );
  };

  const canSubmit = title.trim() && description.trim() && location.trim() && startsAt;

  const selectCls =
    'w-full h-10 px-3 bg-background border border-border text-sm text-white font-mono focus:outline-none focus:border-primary/50';

  return (
    <section className="border border-border bg-card p-6 md:p-8">
      <h2 className="font-display font-bold text-xl uppercase flex items-center gap-2 mb-1">
        <Calendar className="w-5 h-5 text-primary" /> Post a Community Event
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Events go live immediately on the Community Events page. Only admins can post.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Title</label>
          <Input className="rounded-none border-border bg-background" placeholder="Gallery Opening: Discipline & Form" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Description</label>
          <Textarea className="rounded-none border-border bg-background min-h-[90px] resize-none" placeholder="What's happening, who it's for..." value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Category</label>
          <select className={selectCls} value={category} onChange={(e) => setCategory(e.target.value as any)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Entry</label>
          <select className={selectCls} value={eventType} onChange={(e) => setEventType(e.target.value as any)}>
            {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Location</label>
          <Input className="rounded-none border-border bg-background" placeholder="AIMD Gallery, Los Angeles, CA" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Starts</label>
          <Input type="datetime-local" className="rounded-none border-border bg-background" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Ends (Optional)</label>
          <Input type="datetime-local" className="rounded-none border-border bg-background" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>

        <div className="space-y-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Max Capacity (Optional)</label>
          <Input type="number" min={1} className="rounded-none border-border bg-background" placeholder="e.g. 80" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} />
        </div>

        <div className="space-y-2 flex items-end pb-2">
          <label className="flex items-center gap-2 font-mono text-xs uppercase text-muted-foreground cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} className="accent-[var(--primary)] w-4 h-4" />
            Featured event
          </label>
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="font-mono text-xs uppercase text-muted-foreground">Event Image (Optional)</label>
          <MediaUpload url={imageUrl} mediaType="image" onChange={(u) => setImageUrl(u)} />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          className="rounded-none bg-primary hover:bg-primary/90 text-zinc-950 font-bold uppercase tracking-wider"
          onClick={submit}
          disabled={!canSubmit || createEvent.isPending}
        >
          {createEvent.isPending ? 'Posting…' : 'Post Event'}
        </Button>
      </div>
    </section>
  );
}

// ─── Weekly challenge winner ──────────────────────────────────────────────────

function ChallengeWinnerCard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const awardWinner = useAwardChallengeWinner();

  const { data, isLoading } = useQuery({
    queryKey: ['challenges', 'current'],
    queryFn: fetchCurrentChallenge,
  });

  const award = (submissionId: number, username: string) => {
    awardWinner.mutate(
      { submissionId },
      {
        onSuccess: (res) => {
          toast({
            title: 'Winner awarded!',
            description: `${username} received ${res.amount} AIMD Points (new balance: ${res.points}).`,
          });
          queryClient.invalidateQueries({ queryKey: ['challenges', 'current'] });
        },
        onError: (err: any) => {
          toast({ title: 'Could not award', description: String(err?.message ?? err), variant: 'destructive' });
        },
      }
    );
  };

  return (
    <section className="border border-border bg-card p-6 md:p-8">
      <h2 className="font-display font-bold text-xl uppercase flex items-center gap-2 mb-1">
        <Trophy className="w-5 h-5 text-amber-400" /> Weekly Challenge Winner
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Pick this week's winner — they get 250 AIMD Points toward reward tiers. Each week can only be awarded once per creator.
      </p>

      {isLoading ? (
        <p className="font-mono text-sm text-muted-foreground animate-pulse">Loading submissions…</p>
      ) : !data || data.submissions.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-border">
          <p className="font-mono text-sm text-muted-foreground">
            No submissions yet for {data?.challenge.week ?? 'this week'}.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.submissions.map((sub) => (
            <div key={sub.id} className="flex items-center gap-4 p-4 border border-border bg-background">
              {sub.imageUrl ? (
                <img src={sub.imageUrl} alt="" className="w-14 h-14 object-cover border border-border flex-shrink-0" />
              ) : (
                <div className="w-14 h-14 bg-muted border border-border flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">#{sub.rank} · {sub.username}</p>
                <p className="text-xs text-muted-foreground truncate">{sub.caption}</p>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" /> {sub.votes} votes
                </p>
              </div>
              <Button
                size="sm"
                className="rounded-none bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs uppercase flex-shrink-0"
                onClick={() => award(sub.id, sub.username)}
                disabled={awardWinner.isPending}
              >
                Award 250 pts
              </Button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Admin() {
  const { data: user, isLoading } = useGetCurrentUser();

  if (isLoading) {
    return (
      <div className="py-24 text-center font-mono text-sm text-muted-foreground animate-pulse">
        Loading…
      </div>
    );
  }

  if (!user?.isAdmin) {
    return (
      <div className="py-24 text-center">
        <ShieldCheck className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-mono text-sm text-muted-foreground">This area is for AIMD admins only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-white">
      <div className="border-b border-border px-6 md:px-10 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-[11px] uppercase tracking-widest mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Admin
          </div>
          <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            Post events · Pick challenge winners · Award points
          </p>
        </div>
      </div>

      <div className="px-6 md:px-10 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <CreateEventCard />
          <ChallengeWinnerCard />
        </div>
      </div>
    </div>
  );
}
