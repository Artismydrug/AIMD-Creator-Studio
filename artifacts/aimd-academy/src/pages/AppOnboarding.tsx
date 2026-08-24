import { SignInButton, SignUpButton } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import {
  ArrowRight,
  Check,
  Compass,
  Flame,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { CreatorAppExplainer } from '@/components/video/CreatorAppExplainer';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const ROADMAP = [
  {
    icon: Compass,
    phase: 'Available today',
    title: 'Discovering Artist',
    body: 'Build a practice, share your work, and connect with the creative community — free.',
    points: ['Daily check-in streaks', 'Collectible badges', 'Gallery browsing', 'Community access'],
    color: 'var(--vibrant-cyan)',
  },
  {
    icon: GraduationCap,
    phase: 'Planned pathway',
    title: 'Dedicated Artist',
    body: 'Hands-on workshops and instructor-led learning will be introduced when the curriculum is ready.',
    points: ['Multi-medium curriculum', 'Tattoo prep with Poncho The Artist', 'The Art of Basketball', 'Instructor feedback'],
    color: 'var(--vibrant-magenta)',
  },
  {
    icon: Sparkles,
    phase: 'Planned pathway',
    title: 'Professional Artist',
    body: 'Career coaching and partner opportunities will open when those real-world pathways are in place.',
    points: ['Coaching opportunities', 'Career-path resources', 'Professional services', 'Partner pipeline opportunities'],
    color: 'var(--vibrant-gold)',
  },
] as const;

export default function AppOnboarding() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      <main className="flex-1">
        <section className="relative flex min-h-[calc(100vh-4.5rem)] items-center overflow-hidden border-b border-border px-4 py-4 md:px-6 md:py-6">
          <div className="container mx-auto w-full">
            <div className="relative z-10 w-full rounded-xl shadow-2xl shadow-primary/20">
              <CreatorAppExplainer />
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-card px-6 py-16">
          <div className="container mx-auto max-w-5xl text-center">
            <p className="font-mono text-xs uppercase tracking-widest text-primary">Start creating today</p>
            <h2 className="mt-4 font-display text-4xl font-black uppercase tracking-tight md:text-6xl">
              Join the <span className="text-gradient-brand">Studio.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Your free account opens the door to a consistent creative practice and a community that values the work behind the work.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <SignUpButton mode="modal" forceRedirectUrl={`${basePath}/onboarding`} signInForceRedirectUrl={`${basePath}/dashboard`}>
                <Button size="lg" className="h-14 rounded-none bg-primary px-8 font-mono text-sm font-bold uppercase text-primary-foreground hover:bg-primary/90">
                  Join The Studio <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal" forceRedirectUrl={`${basePath}/dashboard`}>
                <Button size="lg" variant="outline" className="h-14 rounded-none px-8 font-mono text-sm font-bold uppercase">
                  Log In
                </Button>
              </SignInButton>
            </div>
          </div>
        </section>

        <section className="border-b border-border px-6 py-16">
          <div className="container mx-auto">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <p className="font-mono text-xs uppercase tracking-widest text-primary">The creative pathway</p>
              <h2 className="mt-3 font-display text-4xl font-black uppercase tracking-tight md:text-6xl">
                One practice. <span className="text-gradient-brand">Many directions.</span>
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Creator Studio starts free today. Workshops and professional pathways will be introduced only when the real learning and career support are ready.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {ROADMAP.map(({ icon: PhaseIcon, phase, title, body, points, color }) => (
                <article key={title} className="glass-card flex flex-col rounded-xl p-7">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg border-2 bg-background" style={{ borderColor: color }}>
                    <PhaseIcon className="h-6 w-6" style={{ color }} aria-hidden="true" />
                  </div>
                  <p className="font-mono text-[11px] uppercase tracking-widest" style={{ color }}>{phase}</p>
                  <h3 className="mt-2 font-display text-2xl font-black uppercase tracking-tight">{title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
                  <ul className="mt-6 space-y-2.5">
                    {points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-sm leading-relaxed">
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color }} aria-hidden="true" />
                        {point}
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}