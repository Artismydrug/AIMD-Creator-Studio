import { useParams, Link, useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { useCreateConversation, useFollowUser, useGetCurrentUser, useListBadges, useUnfollowUser, useUpdateCurrentUser } from '@workspace/api-client-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useClerk } from '@clerk/react';
import {
  Award, BookOpen, Briefcase, Calendar, ExternalLink,
  Flame, GraduationCap, LogOut, MapPin, MessageSquare, Pencil, Shield,
  Star, Users, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { MediaUpload } from '@/components/MediaUpload';


const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free:    { label: 'Discovering Artist',   color: 'text-foreground border-foreground/30 bg-foreground/5' },
  academy: { label: 'Dedicated Artist',     color: 'text-emerald-300 border-emerald-400/40 bg-emerald-400/10' },
  pro:     { label: 'Professional Artist',  color: 'text-violet-300 border-violet-400/40 bg-violet-400/10' },
};

const DISCIPLINE_COLORS: Record<string, string> = {
  'Tattooing':         'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Fine Art':          'bg-violet-400/10 text-violet-300 border-violet-400/25',
  'Fine Art & Murals': 'bg-violet-400/10 text-violet-300 border-violet-400/25',
  'Mural & Street Art':'bg-sky-400/10 text-sky-300 border-sky-400/25',
  'Graphic Design':    'bg-rose-400/10 text-rose-300 border-rose-400/25',
  'Illustration':      'bg-primary/10 text-primary border-primary/20',
};

function disciplineColor(d: string | null) {
  if (!d) return 'bg-muted text-muted-foreground border-border';
  return DISCIPLINE_COLORS[d] ?? 'bg-muted text-muted-foreground border-border';
}

async function fetchPublicProfile(userId: number) {
  const r = await fetch(`/api/users/${userId}/profile`);
  if (!r.ok) return null;
  return r.json();
}

async function fetchUserPosts(userId: number) {
  const r = await fetch(`/api/studio-posts?userId=${userId}&limit=6`);
  if (!r.ok) return [];
  return r.json();
}

// ─── Stats chip ───────────────────────────────────────────────────────────────

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1 px-6 py-4 border-r border-border last:border-r-0">
      <Icon className="w-4 h-4 text-primary mb-0.5" />
      <span className="font-display font-black text-2xl text-foreground">{value}</span>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Badge tile ───────────────────────────────────────────────────────────────

function BadgeTile({ badge }: { badge: any }) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 border border-border bg-muted/40 group hover:border-primary/30 transition-colors">
      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
        {badge.imageUrl
          ? <img src={badge.imageUrl} alt={badge.name} className="w-8 h-8 object-contain" />
          : <Award className="w-6 h-6 text-primary" />
        }
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground text-center leading-tight">{badge.name}</p>
      {badge.earnedAt && (
        <p className="font-mono text-[9px] text-muted-foreground">
          {new Date(badge.earnedAt).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

// ─── Post grid thumbnail ──────────────────────────────────────────────────────

function PostThumb({ post }: { post: any }) {
  return (
    <div className="aspect-square bg-muted/40 border border-border overflow-hidden group relative">
      {post.imageUrl ? (
        <img src={post.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
          <Zap className="w-5 h-5 text-primary mb-2" />
          <p className="text-[11px] text-muted-foreground line-clamp-3 leading-snug">{post.caption}</p>
        </div>
      )}
      <div className="absolute bottom-0 inset-x-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-background">
        <div className="flex items-center gap-1 text-xs text-foreground font-mono">
          <Star className="w-3 h-3 text-primary" />
          <span>{post.likes ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Edit profile dialog ──────────────────────────────────────────────────────

const DISCIPLINES = ['Tattooing', 'Fine Art', 'Fine Art & Murals', 'Mural & Street Art', 'Graphic Design', 'Illustration'];
const HANDLE_PATTERN = /^[a-zA-Z0-9_]{3,28}$/;

function normalizeHandle(value: string): string {
  return value.trim().replace(/\s+/g, '_');
}

function getHandleError(value: string): string | null {
  if (HANDLE_PATTERN.test(value)) return null;
  return 'Use 3–28 letters, numbers, or underscores. Spaces are saved as underscores.';
}

function getProfileSaveError(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'data' in error &&
    error.data &&
    typeof error.data === 'object' &&
    'error' in error.data &&
    typeof error.data.error === 'string'
  ) {
    return error.data.error;
  }
  return 'Please try again.';
}

function EditProfileDialog({ user }: { user: any }) {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [location, setLocation] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [bookingOpen, setBookingOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setUsername(normalizeHandle(user.username ?? ''));
      setAvatarUrl(user.avatarUrl ?? '');
      setBio(user.bio ?? '');
      setDiscipline(user.discipline ?? '');
      setLocation(user.location ?? '');
      setPortfolioUrl(user.portfolioUrl ?? '');
      setBookingOpen(!!user.bookingOpen);
    }
  }, [open]);

  const handle = normalizeHandle(username);
  const handleError = getHandleError(handle);

  const update = useUpdateCurrentUser({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['getCurrentUser'] });
        toast({ title: 'Profile updated' });
        setOpen(false);
      },
      onError: (err: any) => {
        toast({
          title: 'Could not save profile',
          description: getProfileSaveError(err),
          variant: 'destructive',
        });
      },
    },
  });

  const save = () => {
    if (handleError) {
      toast({
        title: 'Update your handle',
        description: handleError,
        variant: 'destructive',
      });
      return;
    }

    const avatarChanged = avatarUrl !== (user.avatarUrl ?? '');

    update.mutate({
      data: {
        username: handle,
        ...(avatarChanged ? { avatarUrl: avatarUrl || null } : {}),
        bio: bio.trim() || null,
        discipline: discipline || null,
        location: location.trim() || null,
        portfolioUrl: portfolioUrl.trim() || null,
        bookingOpen,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-none font-mono text-xs uppercase h-9">
          <Pencil className="w-3.5 h-3.5 mr-1.5" />
          Edit Profile
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display uppercase tracking-tight">Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Profile photo</Label>
            <MediaUpload url={avatarUrl} mediaType="image" onChange={(url) => setAvatarUrl(url)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-username">Username</Label>
            <Input
              id="pf-username"
              value={username}
              onChange={(e) => setUsername(normalizeHandle(e.target.value))}
              maxLength={28}
              aria-invalid={!!handleError}
            />
            <p className={`text-[11px] ${handleError ? 'text-destructive' : 'text-muted-foreground'}`}>
              {handleError ?? '3–28 characters — letters, numbers, underscores. Spaces become underscores.'}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-bio">Bio</Label>
            <Textarea id="pf-bio" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} rows={3} placeholder="Tell people about your art…" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-discipline">Discipline</Label>
            <select
              id="pf-discipline"
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="w-full h-9 border border-input bg-background px-3 text-sm"
            >
              <option value="">— None —</option>
              {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-location">Location</Label>
            <Input id="pf-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, State" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pf-portfolio">Portfolio link</Label>
            <Input id="pf-portfolio" type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div className="flex items-center justify-between border border-border p-3">
            <div>
              <p className="text-sm font-medium">Open to bookings</p>
              <p className="text-[11px] text-muted-foreground">Show a "Request Booking" button on your profile</p>
            </div>
            <Switch checked={bookingOpen} onCheckedChange={setBookingOpen} />
          </div>
          <Button onClick={save} disabled={update.isPending || !!handleError} className="w-full rounded-none font-mono text-xs uppercase">
            {update.isPending ? 'Saving…' : 'Save Profile'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Profile content ──────────────────────────────────────────────────────────

function ProfileContent({ user, badges, posts, isOwnProfile }: { user: any; badges: any[]; posts: any[]; isOwnProfile?: boolean }) {
  const tier = TIER_LABELS[user.tier] ?? TIER_LABELS['free'];
  const hasStudioReady = user.studioReadyBadge;
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const follow = useFollowUser({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['publicProfile', user.id] }) } });
  const unfollow = useUnfollowUser({ mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: ['publicProfile', user.id] }) } });
  const conversation = useCreateConversation();
  const following = Boolean(user.followedByMe);
  const isWorking = follow.isPending || unfollow.isPending;
  const openConversation = () => conversation.mutate({ data: { participantIds: [user.id] } }, { onSuccess: ({ id }) => navigate(`/messages?conversation=${id}`) });

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Hero banner */}
      <div className="h-32 bg-gradient-to-br from-primary/20 via-secondary/25 to-primary/10 border-b border-border" />

      {/* Avatar + header */}
      <div className="px-6 md:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 mb-8">
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-background rounded-full">
              <AvatarImage src={user.avatarUrl || ''} />
              <AvatarFallback className="bg-primary/15 text-primary font-black text-2xl rounded-full">
                {user.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {hasStudioReady && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-background" title="Studio Ready™">
                <Shield className="w-3 h-3 text-primary-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display font-black text-3xl text-foreground">{user.username}</h1>
              {hasStudioReady && (
                <span className="font-mono text-[10px] uppercase tracking-widest text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 flex items-center gap-1">
                  <Shield className="w-2.5 h-2.5" /> Studio Ready™
                </span>
              )}
              <span className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-0.5 ${tier.color}`}>
                {tier.label}
              </span>
            </div>

            {/* Discipline + location */}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {user.discipline && (
                <span className={`font-mono text-[11px] uppercase tracking-wider border px-2 py-0.5 ${disciplineColor(user.discipline)}`}>
                  {user.discipline}
                </span>
              )}
              {user.location && (
                <span className="flex items-center gap-1 text-muted-foreground font-mono text-xs">
                  <MapPin className="w-3 h-3" /> {user.location}
                </span>
              )}
              {user.bookingOpen && (
                <span className="flex items-center gap-1 font-mono text-[11px] text-primary border border-primary/30 bg-primary/10 px-2 py-0.5">
                  <Briefcase className="w-2.5 h-2.5" /> Open to Book
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 sm:ml-auto">
            {isOwnProfile && <EditProfileDialog user={user} />}
            {isOwnProfile && <SignOutButton />}
            {!isOwnProfile && user.bookingOpen && (
              <Button asChild variant="outline" className="rounded-none border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs uppercase h-9">
                <a href={`mailto:booking@artismydrug.com?subject=Booking Request — ${user.username}`}>
                  <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                  Request Booking
                </a>
              </Button>
            )}
            {!isOwnProfile && (
              <Button variant="outline" onClick={() => following ? unfollow.mutate({ id: user.id }) : follow.mutate({ id: user.id })} disabled={isWorking} className="rounded-none border-border text-foreground/80 hover:bg-muted font-mono text-xs uppercase h-9">
                <Users className="w-3.5 h-3.5 mr-1.5" />
                {isWorking ? 'Working…' : following ? 'Following' : 'Follow'}
              </Button>
            )}
            {!isOwnProfile && (
              <Button variant="outline" onClick={openConversation} disabled={conversation.isPending} className="rounded-none border-border text-foreground/80 hover:bg-muted font-mono text-xs uppercase h-9">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                {conversation.isPending ? 'Opening…' : 'Message'}
              </Button>
            )}
          </div>
          {!isOwnProfile && (follow.isError || unfollow.isError || conversation.isError) && (
            <p className="font-mono text-[10px] text-destructive">Could not complete that action. Please try again.</p>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xl line-clamp-2">{user.bio}</p>
        )}

        {/* Portfolio link */}
        {user.portfolioUrl && (
          <a
            href={user.portfolioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-mono text-xs text-primary hover:text-primary mb-6"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {user.portfolioUrl.replace(/^https?:\/\//, '')}
          </a>
        )}

        {/* Stats bar */}
        <div className="flex border border-border bg-muted/40/50 mb-10 overflow-x-auto">
          <Stat icon={BookOpen}   label="Posts"    value={user.postCount   ?? 0} />
          <Stat icon={Award}      label="Badges"   value={badges.length} />
          <Stat icon={Flame}      label="Streak"   value={`${user.currentStreak ?? 0}d`} />
          <Stat icon={GraduationCap} label="Enrolled" value={user.workshopsEnrolled ?? 0} />
          <Stat icon={Users} label="Followers" value={user.followerCount ?? 0} />
          <Stat icon={Users} label="Following" value={user.followingCount ?? 0} />
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display font-black text-xl uppercase tracking-tight text-foreground mb-4 flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" /> Earned Badges
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
              {badges.map((b: any) => <BadgeTile key={b.id} badge={b} />)}
            </div>
          </section>
        )}

        {/* Portfolio / posts grid */}
        {posts.length > 0 && (
          <section>
            <h2 className="font-display font-black text-xl uppercase tracking-tight text-foreground mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" /> Studio Work
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {posts.map((p: any) => <PostThumb key={p.id} post={p} />)}
            </div>
          </section>
        )}

        {/* Member since */}
        <div className="mt-10 pt-6 border-t border-border flex items-center gap-2 text-muted-foreground font-mono text-xs">
          <Calendar className="w-3.5 h-3.5" />
          Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

function SignOutButton() {
  const { signOut } = useClerk();
  return (
    <Button
      variant="outline"
      onClick={() => signOut({ redirectUrl: '/' })}
      className="rounded-none border-border text-foreground/80 hover:bg-muted font-mono text-xs uppercase h-9"
    >
      <LogOut className="w-3.5 h-3.5 mr-1.5" />
      Sign Out
    </Button>
  );
}

// ─── Page (own profile vs public) ─────────────────────────────────────────────

export default function Profile() {
  const params = useParams<{ id?: string }>();
  const userId = params?.id ? parseInt(params.id) : null;
  const isOwnProfile = !userId;

  // Own profile uses the existing hook
  const { data: currentUser, isLoading: loadingMe } = useGetCurrentUser({ query: { queryKey: ['getCurrentUser'], enabled: isOwnProfile } });
  const { data: badges = [], isLoading: loadingBadges } = useListBadges({ query: { queryKey: ['listBadges'], enabled: isOwnProfile } }) as any;

  // Public profile uses a direct fetch
  const { data: publicUser, isLoading: loadingPublic } = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => fetchPublicProfile(userId!),
    enabled: !!userId,
  });

  const profileUserId = isOwnProfile ? currentUser?.id : userId;
  const { data: posts = [] } = useQuery({
    queryKey: ['userPosts', profileUserId],
    queryFn: () => fetchUserPosts(profileUserId!),
    enabled: !!profileUserId,
  });

  const user = isOwnProfile ? currentUser : publicUser;
  const isLoading = isOwnProfile ? (loadingMe || loadingBadges) : loadingPublic;

  if (isLoading) return <div className="p-8 font-mono animate-pulse text-muted-foreground">Loading profile…</div>;
  if (!user) return <div className="p-8 font-mono text-muted-foreground">Creator not found.</div>;

  return <ProfileContent user={user} badges={isOwnProfile ? (badges as any[]) : (user.badges ?? [])} posts={posts as any[]} isOwnProfile={isOwnProfile} />;
}
