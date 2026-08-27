import { useState, useRef, useEffect } from 'react';
import { useListStudioPosts, useCreateStudioPost, useLikeStudioPost } from '@workspace/api-client-react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';

async function fetchComments(postId: number) {
  const r = await fetch(`/api/studio-posts/${postId}/comments`);
  return r.ok ? r.json() : [];
}

async function postComment(postId: number, content: string, parentId?: number) {
  const r = await fetch(`/api/studio-posts/${postId}/comments`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, parentId }),
  });
  return r.json();
}
import {
  Clock, Heart, Image as ImageIcon, MessageSquare, Plus,
  ThumbsUp, Trophy, Upload, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { MediaUpload, type MediaType } from '@/components/MediaUpload';
import EmojiPicker from '@/components/EmojiPicker';
import { useGetRewards } from '@workspace/api-client-react';

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
      deadline: string;
      prize: string;
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
  const r = await fetch('/api/challenges/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ caption, imageUrl: imageUrl || null, tags }),
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
        Earn {data.challengeWinnerPoints} pts by winning the weekly challenge. Rewards are claimed in person with the AIMD team.
      </p>
    </div>
  );
}

// ─── Challenge tab ────────────────────────────────────────────────────────────

function WeeklyChallenge() {
  const [submitOpen, setSubmitOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
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
    onSuccess: () => {
      setSubmitOpen(false);
      setCaption('');
      setImageUrl('');
      setTagsStr('');
      queryClient.invalidateQueries({ queryKey: ['challenges', 'current'] });
      toast({
        title: 'Submission received!',
        description: `Your entry is in the queue.`,
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
  const FALLBACK_DEADLINE = new Date('2026-08-24T06:59:00.000Z');
  const deadline = data ? new Date(data.challenge.deadline) : FALLBACK_DEADLINE;
  const cd = useCountdown(deadline);

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
            <span className="font-mono text-[10px] text-primary uppercase tracking-widest">{challenge.week} · Active</span>
            <h2 className="font-display font-black text-2xl uppercase tracking-tight text-foreground mt-1">
              {challenge.theme}
            </h2>
          </div>
          {/* Countdown */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-mono text-sm text-muted-foreground">
              {cd.days}d {cd.hours}h {cd.minutes}m left
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
            ) : (
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
                      <label className="font-mono text-xs uppercase text-muted-foreground">Artwork Photo (Optional)</label>
                      <MediaUpload url={imageUrl} mediaType="image" onChange={(u) => setImageUrl(u)} />
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-xs uppercase text-muted-foreground">Caption / Artist Notes</label>
                      <Textarea
                        className="rounded-none border-border bg-background min-h-[100px] resize-none"
                        placeholder="Describe your piece, process, or intent..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-xs uppercase text-muted-foreground">Tags (comma separated)</label>
                      <Input
                        className="rounded-none border-border bg-background"
                        placeholder="flash, watercolor, maritime"
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
                      disabled={!caption || submitMutation.isPending}
                    >
                      {submitMutation.isPending ? 'Submitting…' : 'Submit Entry'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

function CommentThread({ postId, onCount }: { postId: number; onCount: (n: number) => void }) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: rawComments, isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => fetchComments(postId) as Promise<any[]>,
  });
  const comments: any[] = rawComments ?? [];

  const addComment = useMutation({
    mutationFn: (content: string) => postComment(postId, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comments', postId] });
      setDraft('');
    },
  });

  const submit = () => { if (draft.trim()) addComment.mutate(draft.trim()); };

  return (
    <div className="border-t border-border bg-background/40">
      {/* Existing comments */}
      {isLoading ? (
        <p className="px-5 py-3 font-mono text-xs text-muted-foreground animate-pulse">Loading…</p>
      ) : comments.length === 0 ? (
        <p className="px-5 py-3 font-mono text-xs text-muted-foreground">No critiques yet — be the first.</p>
      ) : (
        <div className="px-5 py-3 space-y-3">
          {(comments as any[]).map((c: any) => (
            <div key={c.id} className="flex gap-2.5">
              <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-mono text-[10px] text-primary flex-shrink-0 mt-0.5">
                {c.username?.[0]?.toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-bold text-xs text-foreground">{c.username}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/80 leading-relaxed">{c.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer */}
      <div className="px-5 pb-4 flex gap-2">
        <EmojiPicker onSelect={(emoji) => setDraft(current => `${current}${emoji}`)} />
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Add a critique…"
          className="flex-1 h-8 px-3 bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-mono"
        />
        <button
          onClick={submit}
          disabled={!draft.trim() || addComment.isPending}
          className="px-3 h-8 bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground font-bold text-xs uppercase font-mono transition-colors"
        >
          Post
        </button>
      </div>
    </div>
  );
}

function PostCard({ post }: { post: any }) {
  const queryClient = useQueryClient();
  const likePost = useLikeStudioPost();
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  const handleLike = () => {
    likePost.mutate({ id: post.id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['listStudioPosts'] }),
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
        post.mediaType === 'video' ? (
          <div className="bg-black">
            <video src={post.imageUrl} controls playsInline preload="metadata" className="w-full max-h-[80vh]" />
          </div>
        ) : (
          <div className="aspect-square bg-muted relative">
            <img src={post.imageUrl} alt="Artwork" className="absolute inset-0 w-full h-full object-cover" />
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
        <div className="flex items-center gap-6 pt-4 border-t border-border">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 text-sm font-mono transition-colors ${
              post.likedByMe ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className={`w-5 h-5 ${post.likedByMe ? 'fill-current' : ''}`} />
            <span>{post.likes}</span>
          </button>
          <button
            onClick={() => setShowComments(v => !v)}
            className={`flex items-center gap-2 text-sm font-mono transition-colors ${
              showComments ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <MessageSquare className={`w-5 h-5 ${showComments ? 'fill-current/20' : ''}`} />
            <span>{showComments && commentCount > 0 ? commentCount : 'Critique'}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <CommentThread postId={post.id} onCount={setCommentCount} />
      )}
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
