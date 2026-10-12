import { useState, useRef, useEffect } from 'react';
import { useListStudioPosts, useCreateStudioPost, useCreateConversation, useGetCurrentUser } from '@workspace/api-client-react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import {
  Clock, Image as ImageIcon, MessageSquare, Plus,
  ThumbsUp, Trophy, Upload, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { MediaUpload, type MediaType } from '@/components/MediaUpload';
import { getGetRewardsQueryKey, useGetRewards } from '@workspace/api-client-react';

// ─── Tab type ─────────────────────────────────────────────────────────────────

type Tab = 'feed' | 'challenge';

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchCurrentChallenge() {
  const r = await fetch('/api/challenges/current', { credentials: 'include' });
  if (!r.ok) throw new Error('Failed to load challenge');
  return r.json() as Promise<{
    challenge: {
      week: string;
      theme: string;
      prompt: string;
      startsAt: string;
      deadline: string;
      prize: string;
      submissionPoints: number;
      status: 'upcoming' | 'active' | 'closed';
      challengeWeek: string;
      totalSubmissions: number;
    };
    submissions: Array<{
      id: number;
      rank: number;
      challengeWeek: string;
      username: string;
      initials: string;
      caption: string;
      imageUrl: string | null;
      tags: string[];
      votes: number;
      hasVoted: boolean;
    }>;
    hasSubmitted: boolean;
    mySubmissionId: number | null;
  }>;
}

async function submitChallengeEntry(caption: string, imageUrl: string, tags: string[]) {
  const objectPath = imageUrl.startsWith('/api/storage')
    ? imageUrl.slice('/api/storage'.length)
    : '';
  const r = await fetch('/api/challenges/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      caption,
      finalMedia: { objectPath },
      processMedia: null,
      tags,
    }),
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error(data.error ?? 'Submission failed');
  }
  return r.json();
}

async function voteOnSubmission(submissionId: number) {
  const r = await fetch(`/api/challenges/${submissionId}/vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  });
  if (!r.ok) throw new Error('Vote failed');
  return r.json() as Promise<{ submissionId: number; hasVoted: boolean; voteCount: number }>;
}

// ─── Countdown display ────────────────────────────────────────────────────────

function calcCountdown(target: Date) {
  const diff = Math.max(0, target.getTime() - Date.now());
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  };
}

/** Always called unconditionally; uses useEffect (not useState) for the interval. */
function useCountdown(target: Date) {
  const [t, setT] = useState(() => calcCountdown(target));
  useEffect(() => {
    setT(calcCountdown(target));
    const id = setInterval(() => setT(calcCountdown(target)), 1000);
    return () => clearInterval(id);
  }, [target.getTime()]);
  return t;
}

// ─── Reward tiers ─────────────────────────────────────────────────────────────

function RewardTiers() {
  const { data } = useGetRewards();
  if (!data) return null;

  const nextTier = data.tiers.find((t) => !t.unlocked);
  const progressPct = nextTier ? Math.min(100, (data.points / nextTier.points) * 100) : 100;

  return (
    <div className="border border-border bg-card p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <h3 className="font-display font-bold text-lg uppercase flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-400" /> AIMD Points Rewards
        </h3>
        <span className="font-mono text-sm text-primary font-bold">{data.points} pts</span>
      </div>

      {/* Progress toward next tier */}
      <div className="mb-6">
        <div className="h-1.5 bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="font-mono text-[11px] text-muted-foreground mt-2">
          {nextTier
            ? `${nextTier.points - data.points} pts to your next reward: ${nextTier.reward}`
            : 'All reward tiers unlocked — see the AIMD team to claim.'}
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {data.tiers.map((tier, i) => (
          <div
            key={tier.points}
            className={`p-4 border ${
              tier.unlocked ? 'border-primary/50 bg-primary/5' : 'border-border bg-background'
            }`}
          >
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Tier {i + 1} · {tier.points} pts
            </p>
            <p className={`font-display font-bold text-sm uppercase leading-tight mb-1.5 ${tier.unlocked ? 'text-primary' : 'text-foreground'}`}>
              {tier.reward}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">{tier.description}</p>
            {tier.unlocked && (
              <p className="font-mono text-[10px] text-primary uppercase tracking-widest mt-2">✓ Unlocked</p>
            )}
          </div>
        ))}
      </div>

      <p className="font-mono text-[10px] text-muted-foreground mt-4">
        Every original featured-challenge submission earns 20 points. Rewards are claimed in person with the AIMD team.
      </p>
    </div>
  );
}

// ─── Challenge tab ────────────────────────────────────────────────────────────

export function WeeklyChallenge() {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [challengeMediaType, setChallengeMediaType] = useState<MediaType>('image');
  const [tagsStr, setTagsStr] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['challenges', 'current'],
    queryFn: fetchCurrentChallenge,
  });

  const submitMutation = useMutation({
    mutationFn: () =>
      submitChallengeEntry(
        caption,
        imageUrl,
        tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      ),
    onSuccess: (result: { pointsAwarded: number; newBalance: number }) => {
      setSubmitOpen(false);
      setCaption('');
      setImageUrl('');
      setChallengeMediaType('image');
      setTagsStr('');
      queryClient.invalidateQueries({ queryKey: ['challenges', 'current'] });
      queryClient.invalidateQueries({ queryKey: getGetRewardsQueryKey() });
      toast({
        title: `+${result.pointsAwarded} AIMD points`,
        description: `Your original response was submitted. New balance: ${result.newBalance} points.`,
      });
    },
    onError: (err: Error) => {
      toast({ title: 'Submission failed', description: err.message, variant: 'destructive' });
    },
  });

  const voteMutation = useMutation({
    mutationFn: (submissionId: number) => voteOnSubmission(submissionId),
    onSuccess: (result) => {
      // Optimistically update the cached data
      queryClient.setQueryData(['challenges', 'current'], (old: typeof data) => {
        if (!old) return old;
        return {
          ...old,
          submissions: old.submissions
            .map((s) =>
              s.id === result.submissionId
                ? { ...s, votes: result.voteCount, hasVoted: result.hasVoted }
                : s,
            )
            .sort((a, b) => b.votes - a.votes)
            .map((s, i) => ({ ...s, rank: i + 1 })),
        };
      });
    },
  });

  // useCountdown must be called unconditionally before any early returns so
  // the hook count stays stable across renders (Rules of Hooks).
  // We fall back to the server-side deadline constant when data is not yet loaded.
  const FALLBACK_TARGET = new Date('2026-10-24T07:00:00.000Z');
  const countdownTarget = data
    ? new Date(data.challenge.status === 'upcoming' ? data.challenge.startsAt : data.challenge.deadline)
    : FALLBACK_TARGET;
  const cd = useCountdown(countdownTarget);

  if (isLoading) {
    return (
      <div className="py-16 text-center font-mono text-sm text-muted-foreground animate-pulse">
        Loading challenge…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="py-16 text-center font-mono text-sm text-red-400">
        Failed to load challenge. Please refresh.
      </div>
    );
  }

  const { challenge, submissions, hasSubmitted } = data;

  return (
    <div className="space-y-8">
      {/* Reward tiers */}
      <RewardTiers />

      {/* Challenge brief */}
      <div className="border border-primary/30 bg-primary/5 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
          <div>
            <span className="font-mono text-[10px] text-primary uppercase tracking-widest">
              {challenge.week} · {challenge.status}
            </span>
            <h2 className="font-display font-black text-2xl uppercase tracking-tight text-foreground mt-1">
              {challenge.theme}
            </h2>
          </div>
          {/* Countdown */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-sm text-muted-foreground">
              {challenge.status === 'upcoming' ? 'Opens in ' : challenge.status === 'active' ? '' : 'Ended · '}
              {cd.days}d {cd.hours}h {cd.minutes}m
            </span>
          </div>
        </div>

        <p className="text-sm text-foreground/80 leading-relaxed mb-4">{challenge.prompt}</p>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between pt-4 border-t border-primary/20">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-muted-foreground font-mono">{challenge.prize}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted-foreground">{challenge.totalSubmissions} entries</span>
            {hasSubmitted ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/15 border border-primary/40 text-primary font-mono text-xs uppercase">
                <Zap className="w-3 h-3" /> Submitted
              </div>
            ) : challenge.status === 'active' ? (
              <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase tracking-wider h-8 px-4">
                    <Upload className="w-3.5 h-3.5 mr-1.5" /> Submit Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-none border-border bg-card sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-display uppercase text-xl">Submit: {challenge.theme}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                       <label className="font-mono text-xs uppercase text-muted-foreground">Artwork / Challenge Proof (Required)</label>
                       <MediaUpload
                         url={imageUrl}
                          mediaType={challengeMediaType}
                          onChange={(u, nextMediaType) => {
                            setImageUrl(u);
                            setChallengeMediaType(nextMediaType);
                          }}
                          allowVideo
                         purpose="challenge_final"
                       />
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-xs uppercase text-muted-foreground">Caption / Artist Notes</label>
                      <Textarea
                        className="rounded-none border-border bg-background min-h-[100px] resize-none"
                        placeholder="Tell us about your original response..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-xs uppercase text-muted-foreground">Tags (comma separated)</label>
                      <Input
                        className="rounded-none border-border bg-background"
                        placeholder="movement, poetry, photography"
                        value={tagsStr}
                        onChange={(e) => setTagsStr(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" className="rounded-none" onClick={() => setSubmitOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="rounded-none bg-primary hover:bg-primary/90 text-primary-foreground"
                      onClick={() => submitMutation.mutate()}
                       disabled={!caption.trim() || !imageUrl || submitMutation.isPending}
                    >
                      {submitMutation.isPending ? 'Submitting…' : 'Submit Entry'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            ) : (
              <span className="border border-border px-3 py-1.5 font-mono text-xs uppercase text-muted-foreground">
                {challenge.status === 'upcoming'
                  ? `Opens ${new Date(challenge.startsAt).toLocaleDateString()}`
                  : 'Challenge closed'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Community submissions */}
      <div>
        <h3 className="font-display font-bold text-lg uppercase mb-4 flex items-center gap-2">
          <ThumbsUp className="w-5 h-5 text-primary" />
          Community Votes
          <span className="font-mono text-xs text-muted-foreground ml-auto">
            {challenge.totalSubmissions} entries · tap to vote
          </span>
        </h3>

        {submissions.length === 0 ? (
          <div className="py-16 text-center border border-dashed border-border">
            <ThumbsUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-mono text-sm text-muted-foreground">
              No submissions yet — be the first to enter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submissions.map((sub) => (
              <article key={sub.id} className="border border-border bg-card overflow-hidden">
                <div className="p-4 flex items-center gap-3 border-b border-border">
                  {/* Rank badge */}
                  <div
                    className={`w-7 h-7 flex items-center justify-center font-mono font-bold text-xs flex-shrink-0 ${
                      sub.rank === 1
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : sub.rank === 2
                        ? 'bg-muted text-muted-foreground border border-border'
                        : 'bg-muted text-muted-foreground border border-border'
                    }`}
                  >
                    #{sub.rank}
                  </div>
                  <Avatar className="w-9 h-9 border border-primary/20 rounded-none flex-shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary rounded-none font-mono text-xs">
                      {sub.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-sm">{sub.username}</div>
                    <div className="flex gap-1.5 mt-0.5">
                      {sub.tags.map((t) => (
                        <span key={t} className="font-mono text-[10px] text-primary">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {sub.imageUrl && (
                  <div className="aspect-video bg-muted relative">
                    <img
                      src={sub.imageUrl}
                      alt="Submission"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground flex-1 mr-4 line-clamp-2">{sub.caption}</p>
                  <button
                    onClick={() => voteMutation.mutate(sub.id)}
                    disabled={voteMutation.isPending}
                    className={`flex items-center gap-2 flex-shrink-0 px-3 py-1.5 border font-mono text-sm transition-all disabled:opacity-60 ${
                      sub.hasVoted
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }`}
                  >
                    <ThumbsUp className={`w-4 h-4 ${sub.hasVoted ? 'fill-current' : ''}`} />
                    <span>{sub.votes}</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {challenge.totalSubmissions > submissions.length && (
          <p className="text-center text-xs font-mono text-muted-foreground mt-6">
            Showing top {submissions.length} of {challenge.totalSubmissions} entries. Submit to see the full community feed.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Studio Feed tab ──────────────────────────────────────────────────────────

function StudioFeed() {
  const { data: posts, isLoading } = useListStudioPosts({}, { query: { queryKey: ['listStudioPosts'] } });

  if (isLoading) return <div className="py-16 font-mono animate-pulse text-center text-muted-foreground text-sm">Loading feed...</div>;

  return (
    <div className="space-y-8">
      {posts?.map(post => <PostCard key={post.id} post={post} />)}
      {posts?.length === 0 && (
        <div className="py-24 text-center border border-dashed border-border bg-card">
          <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold font-display uppercase mb-2">Feed is Empty</h3>
          <p className="text-muted-foreground font-mono text-sm">Be the first to drop some work.</p>
        </div>
      )}
    </div>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function PostCard({ post }: { post: any }) {
  const [, navigate] = useLocation();
  const { data: me } = useGetCurrentUser();
  const conversation = useCreateConversation();
  const { toast } = useToast();
  const handleMessage = () => {
    if (!me || me.id === post.userId || conversation.isPending) return;
    conversation.mutate({ data: { participantIds: [post.userId] } }, {
      onSuccess: ({ id }) => navigate(`/messages?conversation=${id}`),
      onError: () => toast({ title: 'Could not start a message', description: 'Please try again in a moment.', variant: 'destructive' }),
    });
  };

  return (
    <article className="border border-border bg-card overflow-hidden">
      <div className="p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border border-primary/20 rounded-none">
            <AvatarImage src={post.userAvatarUrl || ''} />
            <AvatarFallback className="bg-primary/10 text-primary font-mono rounded-none">
              {post.username?.[0]?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-bold text-sm leading-none">{post.username}</div>
            <div className="text-xs text-muted-foreground font-mono mt-1">
              {new Date(post.createdAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {post.imageUrl && (
        post.mediaType === 'audio' ? (
          <div className="p-5 bg-muted">
            <audio src={post.imageUrl} controls preload="metadata" className="w-full" aria-label="Audio track" />
          </div>
        ) : post.mediaType === 'video' ? (
          <div className="bg-black">
            <video src={post.imageUrl} controls playsInline preload="metadata" className="w-full max-h-[80vh]" />
          </div>
        ) : (
          <div className="aspect-square bg-muted relative">
            <img src={post.imageUrl} alt="Artwork" className="absolute inset-0 w-full h-full object-contain" />
          </div>
        )
      )}

      <div className="p-5">
        <p className="text-base whitespace-pre-wrap mb-4">{post.caption}</p>
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-2 mb-4 font-mono text-xs text-primary flex-wrap">
            {post.tags.map((tag: string, i: number) => (
              <span key={i}>#{tag.replace('#', '')}</span>
            ))}
          </div>
        )}
        {me && me.id !== post.userId && (
        <div className="flex items-center gap-6 pt-4 border-t border-border">
          <button
            onClick={handleMessage}
            disabled={conversation.isPending}
            aria-label={`Message ${post.username ?? 'creator'}`}
            className="flex min-h-11 items-center gap-2 text-sm font-mono text-primary disabled:opacity-50"
          >
            <MessageSquare className="w-5 h-5" />
            <span>{conversation.isPending ? 'Opening message…' : 'Message'}</span>
          </button>
        </div>
        )}
      </div>
    </article>
  );
}

// ─── Create post dialog ───────────────────────────────────────────────────────

function CreatePostDialog() {
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [tagsStr, setTagsStr] = useState('');
  const createPost = useCreateStudioPost();
  const queryClient = useQueryClient();

  const submit = () => {
    const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    createPost.mutate({
      data: { caption, imageUrl: mediaUrl || null, mediaType, tags: tags.length ? tags : undefined }
    }, {
      onSuccess: () => {
        setOpen(false); setCaption(''); setMediaUrl(''); setMediaType('image'); setTagsStr('');
        queryClient.invalidateQueries({ queryKey: ['listStudioPosts'] });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-none font-mono uppercase bg-primary text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" /> Log Work
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-none border-border bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display uppercase text-2xl">Create Studio Log</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Photo or Video (Optional)</label>
            <MediaUpload url={mediaUrl} mediaType={mediaType} allowVideo onChange={(u, t) => { setMediaUrl(u); setMediaType(t as 'image'|'video'); }} />
          </div>
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Caption</label>
            <Textarea className="rounded-none border-border bg-background min-h-[120px] resize-none" placeholder="What are you working on?" value={caption} onChange={e => setCaption(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase text-muted-foreground">Tags (comma separated)</label>
            <Input className="rounded-none border-border bg-background" placeholder="tattoo, flash, sketch" value={tagsStr} onChange={e => setTagsStr(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-none" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="rounded-none bg-primary text-primary-foreground" onClick={submit} disabled={!caption}>Post to Log</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudioLog() {
  const [tab, setTab] = useState<Tab>('feed');

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border px-6 md:px-10 py-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display font-black text-4xl md:text-5xl uppercase tracking-tight">Studio Log</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">Community feed · Weekly challenge</p>
          </div>
          {tab === 'feed' && <CreatePostDialog />}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-6 md:px-10">
        <div className="max-w-3xl mx-auto flex gap-0">
          {(['feed', 'challenge'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 font-mono text-xs uppercase tracking-widest border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'feed' ? 'Studio Feed' : 'Weekly Challenge'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-10 py-8">
        <div className="max-w-3xl mx-auto">
          {tab === 'feed' ? <StudioFeed /> : <WeeklyChallenge />}
        </div>
      </div>
    </div>
  );
}
