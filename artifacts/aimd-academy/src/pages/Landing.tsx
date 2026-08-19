import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import {
  ArrowRight, Brush, Calendar, Compass, Crown, Flame,
  Image as ImageIcon, MapPin, Sparkles, Trophy, Zap,
} from 'lucide-react';
import aimdHeroImg from '@assets/generated_images/aimd-hero.jpg';
import aimdLogo from '@assets/aimd-logo.jpg';
import tattooImg from '@assets/generated_images/tattoo-studio.jpg';
import galleryImg from '@assets/generated_images/gallery-wall.jpg';

// ─── Pillar card ──────────────────────────────────────────────────────────────

function PillarCard({
  image, icon: Icon, kicker, title, description, points, href, cta,
}: {
  image: string;
  icon: any;
  kicker: string;
  title: string;
  description: string;
  points: string[];
  href: string;
  cta: string;
}) {
  return (
    <div className="glass-card rounded-xl flex flex-col group overflow-hidden hover:-translate-y-1 transition-transform duration-300">
      <div className="h-44 overflow-hidden relative">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
      </div>
      <div className="p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-primary mb-2">
          <Icon className="w-4 h-4" /> {kicker}
        </div>
        <h3 className="font-display font-black text-2xl uppercase tracking-tight mb-3">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{description}</p>
        <ul className="space-y-2 mb-6">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm">
              <span className="w-1.5 h-1.5 bg-primary mt-1.5 flex-shrink-0" />
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-auto">
          <Button asChild variant="outline" className="rounded-none border-primary/40 text-primary hover:bg-primary/10 uppercase font-mono text-xs group/btn">
            <Link href={href}>
              {cta}
              <ArrowRight className="ml-1.5 w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Art showcase with lightbox ───────────────────────────────────────────────

type ShowcasePost = {
  id: number;
  username: string;
  userAvatarUrl: string | null;
  imageUrl: string | null;
  mediaType?: string;
  caption: string;
  tags?: string[];
};

async function fetchShowcasePosts(): Promise<ShowcasePost[]> {
  const r = await fetch('/api/studio-posts?limit=16');
  if (!r.ok) return [];
  const posts = (await r.json()) as ShowcasePost[];
  return posts.filter((p) => p.imageUrl && p.mediaType !== 'video').slice(0, 8);
}

function ArtShowcase() {
  const { data: posts = [] } = useQuery({ queryKey: ['landing', 'showcase'], queryFn: fetchShowcasePosts });
  const [selected, setSelected] = useState<ShowcasePost | null>(null);

  if (posts.length === 0) return null;

  return (
    <section className="py-20 px-6 border-b border-border bg-card">
      <div className="container mx-auto">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight">
            Fresh From <span className="text-gradient-brand">The Community</span>
          </h2>
          <div className="h-[2px] bg-border flex-1 hidden md:block" />
        </div>
        <p className="text-muted-foreground text-lg mb-10">Tap any piece to see it up close.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {posts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className="glass-card rounded-xl overflow-hidden text-left group hover:-translate-y-1 transition-transform duration-300 focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`View artwork by ${p.username}`}
            >
              <div className="aspect-square overflow-hidden">
                <img
                  src={p.imageUrl!}
                  alt={p.caption}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-3">
                <p className="font-mono text-xs font-bold truncate">{p.username}</p>
                <p className="text-[11px] text-muted-foreground truncate">{p.caption}</p>
              </div>
            </button>
          ))}
        </div>

        <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
          <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-xl">
            {selected && (
              <div className="grid md:grid-cols-[1.4fr_1fr]">
                <div className="bg-muted max-h-[70vh] flex items-center justify-center">
                  <img src={selected.imageUrl!} alt={selected.caption} className="w-full h-full object-contain max-h-[70vh]" />
                </div>
                <div className="p-6 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    {selected.userAvatarUrl ? (
                      <img src={selected.userAvatarUrl} alt="" className="w-10 h-10 rounded-full border border-border object-cover" />
                    ) : (
                      <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-mono text-sm font-bold">
                        {selected.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div>
                      <DialogTitle className="font-display font-black uppercase tracking-tight text-lg">
                        {selected.username}
                      </DialogTitle>
                      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">AIMD Creator</p>
                    </div>
                  </div>
                  <DialogDescription className="text-sm text-foreground/80 leading-relaxed mb-4">
                    {selected.caption}
                  </DialogDescription>
                  {selected.tags && selected.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-6">
                      {selected.tags.map((t) => (
                        <span key={t} className="px-2 py-0.5 bg-muted text-muted-foreground font-mono text-[10px] uppercase tracking-wide rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="mt-auto flex flex-col gap-2">
                    <Button asChild className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono text-xs">
                      <Link href="/tattoo" onClick={() => setSelected(null)}>Book a Session</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-none uppercase font-mono text-xs">
                      <Link href="/gallery" onClick={() => setSelected(null)}>Explore Full Gallery</Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center border-b border-border overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={aimdHeroImg} alt="" className="w-full h-full object-cover opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/30" />
        </div>

        <div className="container relative z-10 px-6 mx-auto py-20">
          <div className="max-w-4xl">
            <img src={aimdLogo} alt="AIMD — Art Is My Drug official logo" className="h-20 md:h-28 w-auto mb-8" />
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-8">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Studio · Gallery · Creator Platform
            </div>
            <h1 className="text-5xl md:text-8xl font-black font-display uppercase leading-[0.9] tracking-tighter mb-6">
              Art Is The <span className="text-gradient-brand">Addiction.</span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mb-10">
              To bridge physical artistry, digital creation, and community ownership —
              providing a vibrant platform where art is the ultimate form of expression,
              community, and personal transformation.
            </p>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" className="h-14 px-7 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono font-bold group" asChild>
<Link href="/tattoo">
                  Book Tattoo Session
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
</Button>
              <Button size="lg" variant="outline" className="h-14 px-7 rounded-none border-foreground/20 hover:bg-muted uppercase font-mono font-bold" asChild>
<Link href="/gallery">
                  Explore Gallery
                </Link>
</Button>
              <Button size="lg" variant="outline" className="h-14 px-7 rounded-none border-primary/40 text-primary hover:bg-primary/10 uppercase font-mono font-bold" asChild>
<Link href="/app">
                  Join Creator Platform
                </Link>
</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Three pillars */}
      <section className="py-20 px-6 border-b border-border">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-12">
            <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight">One Addiction, Three Doors</h2>
            <div className="h-[2px] bg-border flex-1 hidden md:block" />
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <PillarCard
              image={tattooImg}
              icon={Brush}
              kicker="Pillar 01 · Physical Art"
              title="The Studio"
              description="Real needles, real walls, real work. Our resident artists take custom projects and walk-in flash."
              points={['Resident artists & guest spots', 'Custom flash designs', 'Simple booking intake']}
              href="/tattoo"
              cta="Book a Session"
            />
            <PillarCard
              image={galleryImg}
              icon={ImageIcon}
              kicker="Pillar 02 · Digital & Prints"
              title="The Gallery"
              description="A curated showcase of work from the AIMD community — digital pieces and physical prints."
              points={['Curated community artwork', 'Prints & showcase pieces', 'Fresh work every week']}
              href="/gallery"
              cta="Explore the Gallery"
            />
            <PillarCard
              image={aimdHeroImg}
              icon={Zap}
              kicker="Pillar 03 · The Ecosystem"
              title="The Creator Platform"
              description="A gamified home for working artists: build daily discipline, compete, and get rewarded for the grind."
              points={['Weekly challenges & leaderboards', 'Event check-in badges', 'AIMD Points & real rewards']}
              href="/app"
              cta="Join the Platform"
            />
          </div>
        </div>
      </section>

      {/* Community art showcase with lightbox */}
      <ArtShowcase />

      {/* Creator Journey — 3 growth phases */}
      <section className="py-20 px-6 border-b border-border">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight">The Creator Journey</h2>
            <div className="h-[2px] bg-border flex-1 hidden md:block" />
          </div>
          <p className="text-lg mb-12 max-w-2xl">
            <span className="font-display font-black uppercase tracking-tight text-2xl md:text-3xl text-gradient-brand">Level Up Your Creative Journey</span>
            <span className="block text-muted-foreground mt-1">Three growth phases take you from first check-in to full-time professional.</span>
          </p>

          <div className="relative grid md:grid-cols-3 gap-6">
            {/* connecting line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-[2px] bg-border" aria-hidden="true" />
            {[
              {
                icon: Compass,
                phase: 'Phase 01',
                title: 'The Inspiring Artist',
                tagline: 'Discover & Connect',
                color: 'var(--vibrant-cyan)',
                glow: 'glow-cyan',
                points: [
                  'Explore artwork from the community',
                  'Track daily check-in streaks',
                  'Discover resident artists',
                ],
              },
              {
                icon: Trophy,
                phase: 'Phase 02',
                title: 'The Dedicated Artist',
                tagline: 'Level Up & Skill Building',
                color: 'var(--vibrant-magenta)',
                glow: 'glow-magenta',
                points: [
                  'Join weekly creator challenges',
                  'Unlock rare badges & rank up on leaderboards',
                  'Build your portfolio',
                ],
              },
              {
                icon: Crown,
                phase: 'Phase 03',
                title: 'The Professional Artist',
                tagline: 'Showcase & Monetize',
                color: 'var(--vibrant-gold)',
                glow: 'glow-gold',
                points: [
                  'Feature artwork in the online gallery',
                  'Offer custom tattoo & art bookings',
                  'Unlock pro creator perks',
                ],
              },
            ].map(({ icon: Icon, phase, title, tagline, color, glow, points }, i) => (
              <div key={phase} className={`relative glass-card ${glow} rounded-xl p-6 pt-8 group hover:-translate-y-1 transition-transform duration-300`}>
                <div
                  className="relative z-10 w-14 h-14 border-2 bg-background rounded-lg flex items-center justify-center mb-5"
                  style={{ borderColor: color }}
                >
                  <Icon className="w-6 h-6" style={{ color }} />
                  <span
                    className="absolute -top-2 -right-2 text-white font-mono text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: color }}
                  >
                    {i + 1}
                  </span>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-widest mb-1" style={{ color }}>{phase}</p>
                <h3 className="font-display font-black text-2xl uppercase tracking-tight mb-1">{title}</h3>
                <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground mb-4">{tagline}</p>
                <ul className="space-y-2">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 mt-1.5 flex-shrink-0" style={{ backgroundColor: color }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-10 flex justify-center">
            <Button asChild size="lg" className="h-14 px-8 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono font-bold group">
              <Link href="/sign-up">
                Start Your Journey
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Gamification banner */}
      <section className="py-20 px-6 border-b border-border bg-card">
        <div className="container mx-auto">
          <div className="border border-primary/30 bg-primary/5 p-8 md:p-12 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10">
              <Flame className="w-64 h-64 text-primary" />
            </div>
            <div className="relative z-10 max-w-3xl">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary mb-4">
                <Sparkles className="w-4 h-4" /> The Grind Pays
              </div>
              <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight mb-4">
                Streaks. Challenges. Rewards.
              </h2>
              <p className="text-muted-foreground text-lg mb-8 max-w-2xl">
                Post your work daily to build streaks, enter the weekly challenge to win
                AIMD Points, and cash points in for merch, event tickets, and workshop
                lessons. Discipline eats talent — and it gets rewarded here.
              </p>
              <div className="flex flex-wrap gap-6 mb-8">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Flame className="w-4 h-4 text-primary" /> Daily streaks
                </div>
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Trophy className="w-4 h-4 text-primary" /> Weekly challenges
                </div>
                <div className="flex items-center gap-2 font-mono text-sm">
                  <Zap className="w-4 h-4 text-primary" /> Points → real rewards
                </div>
              </div>
              <Button size="lg" className="h-14 px-8 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono font-bold group" asChild>
<Link href="/sign-up">
                  Get Started / Log In
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Visit strip */}
      <section className="py-14 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-primary" />
            <div>
              <p className="font-display font-black uppercase tracking-tight text-xl">Come see us in person</p>
              <p className="text-muted-foreground text-sm">Studio sessions, pop-ups, gallery nights, and community events.</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-none border-foreground/20 hover:bg-muted uppercase font-mono text-xs" asChild>
<Link href="/tattoo">
              <Calendar className="w-4 h-4 mr-2" /> Plan a Visit
            </Link>
</Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
