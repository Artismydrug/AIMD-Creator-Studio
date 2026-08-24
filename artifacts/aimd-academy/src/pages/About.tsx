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
} from 'lucide-react';
import aimdHeroImg from '@assets/generated_images/aimd-hero.jpg';

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

        <div className="container relative z-10 px-6 mx-auto py-16">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
            <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-8">
              <Globe className="w-4 h-4" /> Mission & Vision
            </div>
            <h1 className="text-5xl md:text-7xl font-black font-display uppercase leading-[0.9] tracking-tighter mb-6">
              To Bridge Physical Artistry & <span className="text-gradient-brand">Digital Creation.</span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl">
              AIMD (Art Is My Drug) bridges physical artistry, digital creation, and community ownership — a vibrant platform where art is the ultimate form of expression, community, and personal transformation.
            </p>
            </div>
            <div className="glass-card rounded-xl p-2">
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-black">
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src="https://www.youtube.com/embed/fmVeAgPqNEk"
                  title="AIMD Youth Art Workshop at The School of Los Angeles"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            </div>
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

      {/* Community impact */}
      <section className="py-20 px-6 border-b border-border bg-card">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-6">
              <Sparkles className="w-4 h-4" /> Watch Our Story
            </div>
            <h2 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight mb-4">
              Our Community Impact <span className="text-gradient-brand">& Roots.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Art is more than expression—it's a catalyst for community growth and personal transformation. Art Is My Drug empowers local youth, rising talent, and adult creators alike. Watch our Youth Art Workshop at The School of Los Angeles in action.
            </p>
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

      <MarketingFooter />
    </div>
  );
}
