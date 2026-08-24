import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import {
  ArrowRight,
  Brush,
  Zap,
  Image as ImageIcon,
  Compass,
  Trophy,
  Crown,
} from 'lucide-react';
import aimdHeroImg from '@assets/generated_images/aimd-hero.jpg';
import tattooImg from '@assets/generated_images/tattoo-studio.jpg';
import galleryImg from '@assets/generated_images/gallery-wall.jpg';

// ─── Pillar card ──────────────────────────────────────────────────────────────

function PillarCard({
  image, icon: Icon, kicker, title, description, href, cta,
}: {
  image: string;
  icon: any;
  kicker: string;
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="glass-card rounded-xl flex flex-col group overflow-hidden hover:-translate-y-1 transition-transform duration-300">
      <div className="h-64 overflow-hidden relative">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-card/90 to-transparent" />
        <div className="absolute bottom-4 left-6 right-6">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-primary mb-2 drop-shadow-md bg-background/80 px-2 py-1 w-fit rounded backdrop-blur-sm">
            <Icon className="w-3.5 h-3.5" /> {kicker}
          </div>
          <h3 className="font-display font-black text-3xl uppercase tracking-tight text-foreground drop-shadow-lg">{title}</h3>
        </div>
      </div>
      <div className="p-6 flex flex-col flex-1">
        <p className="text-sm text-muted-foreground leading-relaxed mb-6 flex-1">{description}</p>
        <Button asChild variant="outline" className="w-full rounded-none border-primary/40 text-primary hover:bg-primary/10 uppercase font-mono text-xs group/btn">
          <Link href={href}>
            {cta}
            <ArrowRight className="ml-1.5 w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

// ─── Creator journey ───────────────────────────────────────────────────────────

function CreatorJourney() {
  const stages = [
    {
      icon: Compass,
      title: 'The Discovering Artist',
      action: 'Exploration & Community',
      description: 'For hobbyists and art enthusiasts discovering inspiring communities — daily check-in streaks, collectible badges, gallery browsing, and introductory community access.',
      color: 'var(--vibrant-cyan)',
      glow: 'glow-cyan',
    },
    {
      icon: Trophy,
      title: 'The Dedicated Artist',
      action: 'Workshops & Masterclasses',
      description: 'Learn a real craft from a working artist — a focused tattoo apprenticeship with Poncho The Artist is coming to Creator Studio.',
      color: 'var(--vibrant-magenta)',
      glow: 'glow-magenta',
    },
    {
      icon: Crown,
      title: 'The Professional Artist',
      action: 'Career Paths & Priority Placement',
      description: 'Pursue a commercial career — all Dedicated access, monthly coaching, priority Ecosystem Partner & Affiliate Pipeline opportunities, and professional services.',
      color: 'var(--vibrant-gold)',
      glow: 'glow-gold',
    },
  ];

  return (
    <section className="py-24 px-6 border-b border-border bg-card">
      <div className="container mx-auto">
        <div className="max-w-3xl mb-12">
          <p className="font-mono text-xs uppercase tracking-widest text-primary mb-3">Inside the Creator App</p>
          <h2 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight leading-[0.9] mb-5">
            Your creative path, <span className="text-gradient-brand">in motion.</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Passion powers performance. Creators unlock tangible growth through gamified milestones — wherever they are on the journey.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {stages.map(({ icon: Icon, title, action, description, color, glow }) => (
            <article key={title} className={`glass-card ${glow} rounded-xl p-7 group hover:-translate-y-1 transition-transform duration-300`}>
              <div
                className="w-12 h-12 rounded-lg border-2 flex items-center justify-center mb-8 bg-background"
                style={{ borderColor: color }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-widest mb-2" style={{ color }}>{action}</p>
              <h3 className="font-display font-black text-2xl uppercase tracking-tight mb-3">{title}</h3>
              <p className="text-muted-foreground leading-relaxed">{description}</p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-4 items-center">
          <Button asChild size="lg" className="h-14 px-8 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono font-bold group">
            <Link href="/app">
              Start in the Creator App
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          <Link href="/about" className="font-mono text-xs uppercase tracking-widest text-primary hover:text-primary/75 transition-colors">
            Explore the full journey
          </Link>
        </div>
      </div>
    </section>
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
            Fresh From <span className="text-gradient-brand">The Studio</span>
          </h2>
          <div className="h-[2px] bg-border flex-1 hidden md:block" />
        </div>
        <p className="text-muted-foreground text-lg mb-10">Real work from AIMD creators.</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {posts.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelected(p)}
              className="glass-card rounded-xl overflow-hidden text-left group hover:-translate-y-1 transition-transform duration-300 focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`View artwork by ${p.username}`}
            >
              <div className="aspect-square overflow-hidden relative">
                <img
                  src={p.imageUrl!}
                  alt={p.caption}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <p className="font-mono text-xs font-bold text-foreground truncate">{p.username}</p>
                </div>
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
      <section className="relative min-h-[48vh] flex items-center border-b border-border overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={aimdHeroImg} alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
        </div>

        <div className="container relative z-10 px-6 mx-auto py-12 text-center flex flex-col items-center">
           <div className="inline-flex items-center justify-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-5">
            <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            Studio · Gallery · Creator App
          </div>
           <h1 className="text-5xl md:text-8xl font-black font-display uppercase leading-[0.85] tracking-tighter mb-4 max-w-6xl">
            Art <br className="md:hidden" />Is My <span className="text-gradient-brand">Drug.</span>
          </h1>
           <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mb-6 mx-auto">
            To bridge physical artistry, digital creation, and community ownership—providing a vibrant platform where art is the ultimate form of expression, community, and personal transformation.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="h-14 px-8 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono font-bold group" asChild>
              <Link href="/tattoo">
                Book Tattoo Session
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 rounded-none border-foreground/20 hover:bg-muted uppercase font-mono font-bold" asChild>
              <Link href="/gallery">
                Explore Gallery
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 rounded-none border-primary/40 text-primary hover:bg-primary/10 uppercase font-mono font-bold" asChild>
              <Link href="/app">
                Join Creator Platform
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Three pillars */}
       <section className="py-12 px-6 border-b border-border">
        <div className="container mx-auto">
           <div className="grid md:grid-cols-3 gap-6">
            <PillarCard
              image={tattooImg}
              icon={Brush}
              kicker="Physical Art"
              title="The Studio"
              description="Real needles, real walls, real work. Custom projects and walk-in flash by resident AIMD artists."
              href="/tattoo"
              cta="Book a Session"
            />
            <PillarCard
              image={galleryImg}
              icon={ImageIcon}
              kicker="Digital & Prints"
              title="The Gallery"
              description="Experience art seamlessly beyond the studio — a curated digital gallery of community work, prints, and digital pieces."
              href="/gallery"
              cta="Explore Gallery"
            />
            <PillarCard
              image={aimdHeroImg}
              icon={Zap}
              kicker="The Ecosystem"
              title="Creator App"
              description="Where passion powers performance: build daily discipline, hit gamified milestones, and unlock tangible growth."
              href="/app"
              cta="Open Creator App"
            />
          </div>
        </div>
      </section>

      <CreatorJourney />

      {/* Community art showcase with lightbox */}
      <ArtShowcase />

      <MarketingFooter />
    </div>
  );
}
