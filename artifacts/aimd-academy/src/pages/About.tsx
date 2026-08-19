import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import {
  ArrowRight,
  Compass,
  Trophy,
  Crown,
  Sparkles,
  Building,
  Globe,
  HeartHandshake,
  Eye,
  Palette,
  Users,
  Flame,
  TrendingUp,
} from 'lucide-react';
import { BrandVideo } from '@/components/BrandVideo';
import aimdHeroImg from '@assets/generated_images/aimd-hero.jpg';
import resortCampusImg from '@assets/generated_images/artist-resort-campus.jpg';
import resortContainersImg from '@assets/generated_images/artist-resort-containers.jpg';
import resortSuiteImg from '@assets/generated_images/artist-resort-suite.jpg';

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-center border-b border-border overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={aimdHeroImg} alt="AIMD Studio" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        </div>

        <div className="container relative z-10 px-6 mx-auto py-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-8">
              <Globe className="w-4 h-4" /> Mission & Vision
            </div>
            <h1 className="text-5xl md:text-7xl font-black font-display uppercase leading-[0.9] tracking-tighter mb-6">
              To Bridge Physical Artistry & <span className="text-gradient-brand">Digital Creation.</span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mb-10">
              AIMD (Art Is My Drug) bridges physical artistry, digital creation, and community ownership — a vibrant platform where art is the ultimate form of expression, community, and personal transformation.
            </p>
          </div>
        </div>
      </section>

      {/* Mission and vision */}
      <section className="py-16 px-6 border-b border-border">
        <div className="container mx-auto grid md:grid-cols-2 gap-6">
          <article className="glass-card rounded-xl p-7 md:p-9">
            <HeartHandshake className="w-7 h-7 text-primary mb-5" />
            <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">Our Mission</p>
            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight mb-4">
              Art. Community. Ownership.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              To bridge physical artistry, digital creation, and community ownership — providing a vibrant platform where art is the ultimate form of expression, community, and personal transformation.
            </p>
          </article>
          <article className="glass-card rounded-xl p-7 md:p-9">
            <Eye className="w-7 h-7 text-primary mb-5" />
            <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">Our Vision</p>
            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight mb-4">
              The definitive creator ecosystem.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              To become the definitive ecosystem for creators and tattoo artists — where passion powers performance, creators unlock tangible growth through gamified milestones, and fans experience art seamlessly across physical studios and digital galleries.
            </p>
          </article>
        </div>
      </section>

      {/* Brand video */}
      <section className="py-20 px-6 border-b border-border bg-card">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-6">
              <Sparkles className="w-4 h-4" /> Watch Our Story
            </div>
            <h2 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight mb-4">
              Art Is <span className="text-gradient-brand">My Drug.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              See how AIMD bridges physical artistry and digital creation — from the studio chair to the digital gallery.
            </p>
          </div>
          <div className="max-w-4xl mx-auto">
            <BrandVideo />
          </div>
        </div>
      </section>

      {/* Brand values */}
      <section className="py-20 px-6 border-b border-border">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight">Brand Values</h2>
            <div className="h-[2px] bg-border flex-1 hidden md:block" />
          </div>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl">
            The principles behind everything we build — on the wall, on the screen, and in the community.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Palette,
                title: 'Expression First',
                body: 'Art is the ultimate form of expression. Every feature, wall, and gallery exists to amplify the work itself.',
                color: 'var(--vibrant-magenta)',
              },
              {
                icon: Users,
                title: 'Community Ownership',
                body: 'Creators shape the platform they build on. The community owns its culture, its showcase, and its future.',
                color: 'var(--vibrant-cyan)',
              },
              {
                icon: Flame,
                title: 'Passion Powers Performance',
                body: 'Daily discipline and creative drive turn into real momentum — streaks, challenges, and craft that compounds.',
                color: 'var(--vibrant-coral, var(--vibrant-magenta))',
              },
              {
                icon: TrendingUp,
                title: 'Tangible Growth',
                body: 'Gamified milestones unlock real opportunity: portfolios, gallery placement, bookings, and pro creator perks.',
                color: 'var(--vibrant-gold)',
              },
            ].map(({ icon: Icon, title, body, color }) => (
              <article key={title} className="glass-card rounded-xl p-6 group hover:-translate-y-1 transition-transform duration-300">
                <div
                  className="w-12 h-12 rounded-lg border-2 bg-background flex items-center justify-center mb-5"
                  style={{ borderColor: color }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h3 className="font-display font-black text-xl uppercase tracking-tight mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Creator Journey */}
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
              <Link href="/app">
                Start Your Journey
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Future Vision - Resort */}
      <section id="artist-resort" className="py-24 px-6 border-b border-border bg-card">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted text-muted-foreground font-mono text-xs uppercase tracking-widest mb-6">
              <Building className="w-4 h-4" /> Future Vision
            </div>
            <h2 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight mb-4">
              The AIMD Artist <span className="text-gradient-brand">Resort.</span>
            </h2>
            <p className="text-xl md:text-2xl font-display uppercase tracking-tight text-foreground/80 mb-6">
              Containers create the infrastructure. Artists create the culture.
            </p>
            <p className="text-lg text-muted-foreground">
              Our long-term vision extends beyond digital spaces and our current physical studio. We are conceptualizing an off-grid desert artist campus built from repurposed shipping containers — a sanctuary where creators can create, stay, and gather.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-4 mb-16">
            <div className="md:col-span-12 glass-card rounded-xl overflow-hidden p-2">
              <img
                src={resortCampusImg}
                alt="Aerial concept of the AIMD Artist Resort campus"
                className="w-full h-[40vh] md:h-[60vh] rounded-lg object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="md:col-span-8 glass-card rounded-xl overflow-hidden p-2">
              <img
                src={resortContainersImg}
                alt="Exterior container architecture"
                className="w-full h-64 md:h-96 rounded-lg object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="md:col-span-4 glass-card rounded-xl overflow-hidden p-2">
              <img
                src={resortSuiteImg}
                alt="Private container stay"
                className="w-full h-64 md:h-96 rounded-lg object-cover"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="text-center px-4">
              <h3 className="font-display font-black text-2xl uppercase tracking-tight mb-3">Create</h3>
              <p className="text-muted-foreground">Dedicated creative studios optimized for the artistic process, fully equipped and free from distraction.</p>
            </div>
            <div className="text-center px-4">
              <h3 className="font-display font-black text-2xl uppercase tracking-tight mb-3">Stay</h3>
              <p className="text-muted-foreground">Private, comfortable container suites that blend rugged off-grid living with modern sanctuary.</p>
            </div>
            <div className="text-center px-4">
              <h3 className="font-display font-black text-2xl uppercase tracking-tight mb-3">Gather</h3>
              <p className="text-muted-foreground">Shared fire circles and community spaces to unplug, connect, and collaborate with peers.</p>
            </div>
          </div>

          <div className="max-w-2xl mx-auto border border-primary/20 bg-primary/5 p-6 rounded-xl flex items-start gap-4">
            <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-sm md:text-base font-mono leading-relaxed text-foreground/80">
              <strong className="text-primary uppercase block mb-1">Concept Stage Only</strong>
              This resort is a future vision for the AIMD ecosystem. It is not currently open, bookable, or accepting applications. Stay tuned as we build toward this reality.
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
