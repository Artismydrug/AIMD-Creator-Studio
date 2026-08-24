import { useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import {
  ArrowRight,
  Compass,
  Trophy,
  Crown,
  Sparkles,
  HeartHandshake,
  Eye,
} from 'lucide-react';
import aimdHeroImg from '@assets/generated_images/aimd-hero.jpg';

export default function About() {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      {/* Community impact and roots */}
      <section className="relative min-h-[60vh] flex items-center border-b border-border overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={aimdHeroImg} alt="AIMD Studio" className="w-full h-full object-cover opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        </div>

        <div className="container relative z-10 px-6 mx-auto py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
            <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-8">
              <Sparkles className="w-4 h-4" /> Our Community Roots
            </div>
            <h1 className="text-5xl md:text-7xl font-black font-display uppercase leading-[0.9] tracking-tighter mb-6">
              Our Community Impact <span className="text-gradient-brand">&amp; Roots.</span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl">
              Art is more than expression—it&apos;s a catalyst for community growth and personal transformation. Art Is My Drug empowers local youth, rising talent, and adult creators alike.
            </p>
            </div>
            <div className="glass-card rounded-xl p-3 md:p-4">
              <div className="aspect-video overflow-hidden rounded-lg bg-black">
                <iframe
                  className="h-full w-full"
                  src="https://www.youtube.com/embed/fmVeAgPqNEk"
                  title="AIMD community workshop"
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
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
              Art is my drug’s mission is to build a community of artists &amp; creatives by providing space and opportunities for growth &amp; development. Our mission is to help artists no matter what phase of their journey &amp; to be a pillar of support as they continue to build.
            </p>
          </article>
          <article className="glass-card rounded-xl p-7 md:p-9">
            <Eye className="w-7 h-7 text-primary mb-5" />
            <p className="font-mono text-xs uppercase tracking-widest text-primary mb-2">Our Vision</p>
            <h2 className="text-2xl md:text-3xl font-black font-display uppercase tracking-tight mb-4">
              The definitive creator ecosystem.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              We visualize the artists being the roots of our foundation, as we build up through multiple locations &amp; various services. Art is My Drug will truly blossom through investing into the artists of tomorrow.
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
            <span className="block text-muted-foreground mt-1">A free starting point for building a creative practice and finding your people.</span>
          </p>

          <div className="relative grid md:grid-cols-3 gap-6">
            {/* connecting line (desktop) */}
            <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-[2px] bg-border" aria-hidden="true" />
            {[
              {
                icon: Compass,
                phase: 'Available today',
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
                phase: 'Practice & Share',
                title: 'The Dedicated Artist',
                tagline: 'Keep Building Your Craft',
                color: 'var(--vibrant-magenta)',
                glow: 'glow-magenta',
                points: [
                  'Join weekly creator challenges',
                  'Earn badges for thoughtful participation',
                  'Build your portfolio',
                ],
              },
              {
                icon: Crown,
                phase: 'Growing With AIMD',
                title: 'The Professional Artist',
                tagline: 'A Path We Are Building',
                color: 'var(--vibrant-gold)',
                glow: 'glow-gold',
                points: [
                  'Feature artwork in your creator portfolio',
                  'Follow new learning opportunities as they open',
                  'Stay connected as new pathways take shape',
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
