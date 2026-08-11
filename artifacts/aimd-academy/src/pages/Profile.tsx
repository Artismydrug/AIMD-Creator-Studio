import { useParams, Link } from 'wouter';
import { useGetCurrentUser, useListBadges } from '@workspace/api-client-react';
import { useQuery } from '@tanstack/react-query';
import {
  Award, BookOpen, Briefcase, Calendar, ExternalLink,
  Flame, GraduationCap, MapPin, MessageSquare, Shield,
  Star, Users, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';


const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free:    { label: 'Studio Starter',    color: 'text-muted-foreground border-border' },
  academy: { label: 'Academy Pass',      color: 'text-primary border-emerald-500/50' },
  pro:     { label: 'Pro / Career',      color: 'text-violet-400 border-violet-500/50' },
};

const DISCIPLINE_COLORS: Record<string, string> = {
  'Tattooing':         'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Fine Art':          'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'Fine Art & Murals': 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  'Mural & Street Art':'bg-sky-500/10 text-sky-400 border-sky-500/20',
  'Graphic Design':    'bg-rose-500/10 text-rose-400 border-rose-500/20',
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
      <span className="font-display font-black text-2xl text-white">{value}</span>
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
        <div className="flex items-center gap-1 text-xs text-white font-mono">
          <Star className="w-3 h-3 text-primary" />
          <span>{post.likes ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Profile content ──────────────────────────────────────────────────────────

function ProfileContent({ user, badges, posts }: { user: any; badges: any[]; posts: any[] }) {
  const tier = TIER_LABELS[user.tier] ?? TIER_LABELS['free'];
  const hasStudioReady = user.studioReadyBadge;

  return (
    <div className="max-w-4xl mx-auto pb-16">
      {/* Hero banner */}
      <div className="h-32 bg-gradient-to-br from-muted/60 via-emerald-950/30 to-muted/60 border-b border-border" />

      {/* Avatar + header */}
      <div className="px-6 md:px-10">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-10 mb-8">
          <div className="relative">
            <Avatar className="w-20 h-20 border-4 border-zinc-950 rounded-full">
              <AvatarImage src={user.avatarUrl || ''} />
              <AvatarFallback className="bg-primary/15 text-primary font-black text-2xl rounded-full">
                {user.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {hasStudioReady && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-zinc-950" title="Studio Ready™">
                <Shield className="w-3 h-3 text-zinc-950" />
              </div>
            )}
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-display font-black text-3xl text-white">{user.username}</h1>
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
            {user.bookingOpen && (
              <Button asChild variant="outline" className="rounded-none border-primary/40 text-primary hover:bg-primary/10 font-mono text-xs uppercase h-9">
                <a href={`mailto:booking@artismydrug.com?subject=Booking Request — ${user.username}`}>
                  <Briefcase className="w-3.5 h-3.5 mr-1.5" />
                  Request Booking
                </a>
              </Button>
            )}
            <Button asChild variant="outline" className="rounded-none border-border text-foreground/80 hover:bg-muted font-mono text-xs uppercase h-9">
              <Link href="/messages">
                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                Message
              </Link>
            </Button>
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-xl">{user.bio}</p>
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
        </div>

        {/* Badges */}
        {badges.length > 0 && (
          <section className="mb-10">
            <h2 className="font-display font-black text-xl uppercase tracking-tight text-white mb-4 flex items-center gap-2">
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
            <h2 className="font-display font-black text-xl uppercase tracking-tight text-white mb-4 flex items-center gap-2">
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

// ─── Page (own profile vs public) ─────────────────────────────────────────────

export default function Profile() {
  const params = useParams<{ id?: string }>();
  const userId = params?.id ? parseInt(params.id) : null;
  const isOwnProfile = !userId;

  // Own profile uses the existing hook
  const { data: currentUser, isLoading: loadingMe } = useGetCurrentUser({ query: { enabled: isOwnProfile } });
  const { data: badges = [], isLoading: loadingBadges } = useListBadges({ query: { queryKey: ['listBadges'], enabled: isOwnProfile } }) as any;

  // Public profile uses a direct fetch
  const { data: publicUser, isLoading: loadingPublic } = useQuery({
    queryKey: ['publicProfile', userId],
    queryFn: () => fetchPublicProfile(userId!),
    enabled: !!userId,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ['userPosts', userId ?? 1],
    queryFn: () => fetchUserPosts(userId ?? 1),
  });

  const user = isOwnProfile ? currentUser : publicUser;
  const isLoading = isOwnProfile ? (loadingMe || loadingBadges) : loadingPublic;

  if (isLoading) return <div className="p-8 font-mono animate-pulse text-muted-foreground">Loading profile…</div>;
  if (!user) return <div className="p-8 font-mono text-muted-foreground">Creator not found.</div>;

  return <ProfileContent user={user} badges={isOwnProfile ? (badges as any[]) : (user.badges ?? [])} posts={posts as any[]} />;
}
