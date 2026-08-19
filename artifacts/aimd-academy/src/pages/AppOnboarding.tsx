import { SignInButton, SignUpButton } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import {
  ArrowRight,
  Flame,
  Trophy,
  Sparkles,
  ImageIcon,
  Compass,
  GraduationCap,
  Crown,
  Check,
} from 'lucide-react';

import { CreatorAppExplainer } from '@/components/video/CreatorAppExplainer';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const FEATURES = [
  {
    icon: Flame,
    title: 'Daily Streaks & Collectible Badges',
    body: 'Check in every day you create. Streaks build discipline; collectible badges make the grind visible.',
    color: 'var(--vibrant-coral)',
    glow: 'glow-magenta',
  },
  {
    icon: Trophy,
    title: 'Weekly Creator Challenges',
    body: 'Themed sprints that push your craft. Compete with the community and climb the leaderboards.',
    color: 'var(--vibrant-magenta)',
    glow: 'glow-magenta',
  },
  {
    icon: Sparkles,
    title: 'Daily Reward Wheel Spins',
    body: 'Show up, spin, and win. Daily reward wheel spins turn consistency into perks and surprises.',
    color: 'var(--vibrant-gold)',
    glow: 'glow-gold',
  },
  {
    icon: ImageIcon,
    title: 'Portfolio Publishing',
    body: 'Publish your best work to your public portfolio and the AIMD gallery — seen by the community, curated to the store.',
    color: 'var(--vibrant-cyan)',
    glow: 'glow-cyan',
  },
];

const TIERS = [
  {
    icon: Compass,
    phase: 'Phase 01',
    title: 'The Discovering Artist',
    tagline: 'Open Exploration',
    focus: 'Open exploration for hobbyists & art enthusiasts discovering inspiring communities.',
    color: 'var(--vibrant-cyan)',
    glow: 'glow-cyan',
    points: [
      'Daily check-in streaks',
      'Collectible badges',
      'Gallery browsing',
      'Community access',
    ],
  },
  {
    icon: GraduationCap,
    phase: 'Phase 02',
    title: 'The Dedicated Artist',
    tagline: 'Workshops & Mastery',
    focus: 'Hands-on mastery for creators ready to learn an actual craft and medium.',
    color: 'var(--vibrant-magenta)',
    glow: 'glow-magenta',
    points: [
      'Structured workshops & masterclasses — Tattoo Apprenticeship Prep with Poncho The Artist, music production, painting & digital design',
      'Skill challenges & instructor feedback',
      'Weekly sprints & leaderboards',
      'Daily reward spins & public portfolio',
    ],
  },
  {
    icon: Crown,
    phase: 'Phase 03',
    title: 'The Professional Artist',
    tagline: 'Career Paths & Facilities',
    focus: 'Career acceleration for pro creators and adult artists ready to monetize and access physical facilities.',
    color: 'var(--vibrant-gold)',
    glow: 'glow-gold',
    points: [
      'Real-world career placements',
      'Opportunities in the AIMD Tattoo Bus / Container Studio',
      'Access to physical creation studio spaces',
      'Custom client booking intake',
      'Priority gallery listings',
    ],
  },
];

export default function AppOnboarding() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      {/* Ethos hero */}
      <section className="relative border-b border-border overflow-hidden">
        <div className="container px-6 mx-auto pt-24 pb-16 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-8">
            <Flame className="w-4 h-4" /> The Creator App
          </div>
          <h1 className="text-5xl md:text-8xl font-black font-display uppercase leading-[0.85] tracking-tighter mb-6 max-w-4xl">
            Discipline Eats <span className="text-gradient-brand">Talent.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-12">
            Talent gets you started. Consistency builds the legacy. Welcome to the Art Is My Drug Digital Studio—built for creators of all ages.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <SignUpButton mode="modal" forceRedirectUrl={`${basePath}/onboarding`} signInForceRedirectUrl={`${basePath}/dashboard`}>
              <Button size="lg" className="w-full sm:w-auto h-14 px-8 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono font-bold text-sm group">
                Join The Studio
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </SignUpButton>
            <SignInButton mode="modal" forceRedirectUrl={`${basePath}/dashboard`}>
              <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 rounded-none uppercase font-mono font-bold text-sm">
                Log In
              </Button>
            </SignInButton>
          </div>

          {/* Walkthrough tour video container */}
          <div className="w-full max-w-4xl relative z-10 shadow-2xl shadow-primary/20 rounded-xl">
            <CreatorAppExplainer />
          </div>
        </div>
      </section>

      {/* Feature highlights */}
      <section className="py-20 px-6 border-b border-border bg-card">
        <div className="container mx-auto">
          <div className="max-w-3xl mb-12">
            <p className="font-mono text-xs uppercase tracking-widest text-primary mb-3">Inside the Studio</p>
            <h2 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight leading-[0.9] mb-4">
              Built for the <span className="text-gradient-brand">daily grind.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              Passion powers performance. Every feature turns showing up into tangible growth.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon: Icon, title, body, color, glow }) => (
              <article key={title} className={`glass-card ${glow} rounded-xl p-6 group hover:-translate-y-1 transition-transform duration-300`}>
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

      {/* Subscription tiers */}
      <section className="py-20 px-6 border-b border-border">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center mb-14">
            <p className="font-mono text-xs uppercase tracking-widest text-primary mb-3">Choose Your Phase</p>
            <h2 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight mb-4">
              Three Phases. <span className="text-gradient-brand">One Journey.</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              From first check-in to full-time professional — unlock tangible growth through gamified milestones.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TIERS.map(({ icon: Icon, phase, title, tagline, focus, color, glow, points }, i) => (
              <article key={title} className={`glass-card ${glow} rounded-xl p-7 flex flex-col group hover:-translate-y-1 transition-transform duration-300`}>
                <div
                  className="relative w-14 h-14 border-2 bg-background rounded-lg flex items-center justify-center mb-6"
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
                <p className="text-sm text-muted-foreground leading-relaxed mb-5">{focus}</p>
                <ul className="space-y-2.5 flex-1">
                  {points.map((p) => (
                    <li key={p} className="flex items-start gap-2.5 text-sm leading-relaxed">
                      <Check className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color }} />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          {/* Primary CTA */}
          <div className="mt-14 flex flex-col items-center gap-3">
            <SignUpButton mode="modal" forceRedirectUrl={`${basePath}/onboarding`} signInForceRedirectUrl={`${basePath}/dashboard`}>
              <Button size="lg" className="h-16 px-10 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono font-bold text-base group">
                 Join The Studio
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </SignUpButton>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Free to start · Level up when you're ready
            </p>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
