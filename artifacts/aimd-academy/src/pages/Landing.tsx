import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import {
  ArrowRight, Brush, Calendar, Compass, Crown, Flame,
  Image as ImageIcon, MapPin, Sparkles, Trophy, Zap,
} from 'lucide-react';
import aimdHeroImg from '@assets/generated_images/aimd-hero.jpg';
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
    <div className="border border-border bg-card flex flex-col group overflow-hidden">
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
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-8">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Studio · Gallery · Creator Platform
            </div>
            <h1 className="text-5xl md:text-8xl font-black font-display uppercase leading-[0.9] tracking-tighter mb-6">
              Art Is The <span className="text-primary">Addiction.</span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mb-10">
              Welcome to Art Is My Drug — a physical tattoo studio, digital gallery,
              and gamified ecosystem designed to empower creators.
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

      {/* Creator Journey — 3 growth phases */}
      <section className="py-20 px-6 border-b border-border">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight">The Creator Journey</h2>
            <div className="h-[2px] bg-border flex-1 hidden md:block" />
          </div>
          <p className="text-muted-foreground text-lg mb-12 max-w-2xl">
            Three growth phases take you from first check-in to full-time professional.
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
                points: [
                  'Feature artwork in the online gallery',
                  'Offer custom tattoo & art bookings',
                  'Unlock pro creator perks',
                ],
              },
            ].map(({ icon: Icon, phase, title, tagline, points }, i) => (
              <div key={phase} className="relative border border-border bg-card p-6 pt-8 group hover:border-primary/40 transition-colors">
                <div className="relative z-10 w-14 h-14 border-2 border-primary bg-background flex items-center justify-center mb-5">
                  <Icon className="w-6 h-6 text-primary" />
                  <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground font-mono text-[10px] font-bold w-6 h-6 flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <p className="font-mono text-[11px] uppercase tracking-widest text-primary mb-1">{phase}</p>
                <h3 className="font-display font-black text-2xl uppercase tracking-tight mb-1">{title}</h3>
                <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground mb-4">{tagline}</p>
                <ul className="space-y-2">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-sm">
                      <span className="w-1.5 h-1.5 bg-primary mt-1.5 flex-shrink-0" />
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
