import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { ArrowRight, Compass, Trophy, Crown, Sparkles, Building, Globe, HeartHandshake, Eye } from 'lucide-react';
import aimdHeroImg from '@assets/generated_images/aimd-hero.jpg';
import residencyImg from '@assets/generated_images/artist-residency-vision.jpg';

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
              AIMD (Art Is My Drug) is an artist-built ecosystem. We are creating a platform where art is the ultimate form of expression, community, and personal transformation.
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
              Give artists a path forward.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Connect physical artistry, digital creation, and community ownership so creators can practice, grow, and build sustainable careers.
            </p>
          </article>
          <article className="glass-card rounded-xl p-7 md:p-9">
            <Eye className="w-7 h-7 text-primary mb-5" />
            <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">Our Vision</p>
            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight mb-4">
              A creative ecosystem owned by artists.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              A connected world where expression creates opportunity, community builds confidence, and artists shape what comes next.
            </p>
          </article>
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

      {/* Future Vision - Residency */}
      <section className="py-20 px-6 border-b border-border bg-card">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted text-muted-foreground font-mono text-xs uppercase tracking-widest mb-6">
                <Building className="w-4 h-4" /> Future Vision
              </div>
              <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight mb-6">
                The Artist <span className="text-gradient-brand">Residency.</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Our long-term vision extends beyond digital spaces and our current physical studio. We are conceptualizing a dedicated artist residency — a sanctuary where creators can live, learn, and collaborate.
              </p>
              <p className="text-muted-foreground mb-8">
                Imagine an environment fully optimized for the creative process. A place to unplug from the noise and plug into an intensive, supportive community of peers.
              </p>
              
              <div className="border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <p className="text-sm font-mono leading-relaxed text-foreground/80">
                  <strong className="text-primary uppercase block mb-1">Concept Stage Only</strong>
                  This residency is a future vision for the AIMD ecosystem. It is not currently open, bookable, or accepting applications. Stay tuned as we build toward this reality.
                </p>
              </div>
            </div>
            
            <div className="order-1 md:order-2 glass-card rounded-xl overflow-hidden p-2">
              <img 
                src={residencyImg} 
                alt="Conceptual rendering of AIMD's future artist residency vision"
                className="w-full h-auto rounded-lg object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
