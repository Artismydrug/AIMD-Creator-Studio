import { useState } from 'react';
import { SignInButton, SignUpButton } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Flame,
  GraduationCap,
  ImageIcon,
  Sparkles,
  Trophy,
} from 'lucide-react';

const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

const SLIDES = [
  {
    eyebrow: '01 / Build the practice',
    title: 'Make the work\nvisible.',
    body: 'Creator Studio gives your practice a home. Track the small sessions that add up, celebrate the days you show up, and keep your creative rhythm in view.',
    icon: Flame,
    color: 'var(--vibrant-coral)',
    details: [
      'A daily check-in built around the work you make',
      'Streaks and collectible badges that recognize consistency',
      'A personal dashboard for your creative momentum',
    ],
  },
  {
    eyebrow: '02 / Meet your people',
    title: 'Find the room\nfor your art.',
    body: 'Share your process with a community that understands making. Publish work, see what other creators are building, and make a portfolio that is yours.',
    icon: ImageIcon,
    color: 'var(--vibrant-cyan)',
    details: [
      'A creator profile and public portfolio',
      'A community feed for works in progress and finished pieces',
      'A gallery that celebrates original work and its makers',
    ],
  },
  {
    eyebrow: '03 / Stretch the craft',
    title: 'Turn a prompt\ninto progress.',
    body: 'Weekly challenges offer a focused reason to make something new. Bring your own point of view, submit your work, and see what the community creates alongside you.',
    icon: Trophy,
    color: 'var(--vibrant-magenta)',
    details: [
      'Creator prompts that invite experimentation',
      'A place to submit your work and follow the challenge',
      'Recognition for thoughtful, consistent participation',
    ],
  },
  {
    eyebrow: '04 / Start here',
    title: 'Your studio\nis waiting.',
    body: 'Join Art Is My Drug’s creative community today. Your free Creator Studio account is the starting point for making, sharing, and showing up for your craft.',
    icon: Sparkles,
    color: 'var(--vibrant-gold)',
    details: [
      'Free access to your creator profile and community',
      'A dashboard designed to support your daily practice',
      'A growing home for artists across disciplines',
    ],
  },
] as const;

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
  const [activeSlide, setActiveSlide] = useState(0);
  const slide = SLIDES[activeSlide];
  const Icon = slide.icon;
  const isFinalSlide = activeSlide === SLIDES.length - 1;

  const goToSlide = (index: number) => {
    setActiveSlide(Math.max(0, Math.min(index, SLIDES.length - 1)));
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      <main className="flex-1">
        <section className="border-b border-border px-4 py-8 md:px-6 md:py-12">
          <div
            className="container mx-auto max-w-6xl outline-none"
            aria-roledescription="carousel"
            aria-label="Creator Studio feature tour"
            tabIndex={0}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') {
                event.preventDefault();
                goToSlide(activeSlide + 1);
              }
              if (event.key === 'ArrowLeft') {
                event.preventDefault();
                goToSlide(activeSlide - 1);
              }
            }}
          >
            <div className="mb-5 flex items-center justify-between gap-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
              <span>Creator Studio by AIMD</span>
              <span aria-live="polite">Feature {activeSlide + 1} of {SLIDES.length}</span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-foreground/5">
              <div
                className="grid min-h-[540px] md:grid-cols-[1.1fr_0.9fr] motion-safe:transition-opacity motion-safe:duration-300 motion-reduce:transition-none"
                key={activeSlide}
              >
                <div className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-foreground p-7 text-background md:min-h-0 md:p-12">
                  <div
                    className="absolute -right-16 -top-20 h-64 w-64 rounded-full blur-3xl opacity-70"
                    style={{ backgroundColor: slide.color }}
                    aria-hidden="true"
                  />
                  <div className="relative">
                    <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-white/25 bg-white/10">
                      <Icon className="h-6 w-6" style={{ color: slide.color }} aria-hidden="true" />
                    </div>
                    <p className="mb-5 font-mono text-xs uppercase tracking-[0.18em] text-white/65">{slide.eyebrow}</p>
                    <h1 className="whitespace-pre-line font-display text-5xl font-black uppercase leading-[0.86] tracking-tight md:text-7xl">
                      {slide.title}
                    </h1>
                  </div>
                  <p className="relative mt-8 max-w-md text-base leading-relaxed text-white/75 md:text-lg">
                    Art Is My Drug is built to make the daily creative practice feel supported, not solitary.
                  </p>
                </div>

                <div className="flex flex-col justify-between p-7 md:p-12">
                  <div>
                    <p className="mb-5 font-mono text-xs uppercase tracking-widest" style={{ color: slide.color }}>Inside the studio</p>
                    <p className="max-w-lg text-xl leading-relaxed text-muted-foreground md:text-2xl">{slide.body}</p>
                    <ul className="mt-9 space-y-4">
                      {slide.details.map((detail) => (
                        <li key={detail} className="flex items-start gap-3 text-sm leading-relaxed md:text-base">
                          <Check className="mt-0.5 h-5 w-5 shrink-0" style={{ color: slide.color }} aria-hidden="true" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {isFinalSlide && (
                    <SignUpButton mode="modal" forceRedirectUrl={`${basePath}/onboarding`} signInForceRedirectUrl={`${basePath}/dashboard`}>
                      <Button size="lg" className="mt-9 h-14 w-full rounded-none bg-primary px-7 font-mono text-sm font-bold uppercase tracking-wide text-primary-foreground hover:bg-primary/90 sm:w-auto">
                        Join The Studio <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                      </Button>
                    </SignUpButton>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4 border-t border-border bg-background px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2" aria-label="Choose a feature">
                  {SLIDES.map((item, index) => (
                    <button
                      key={item.eyebrow}
                      type="button"
                      onClick={() => goToSlide(index)}
                      className="group h-10 px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                      aria-label={`Show feature ${index + 1}: ${item.title.replace('\n', ' ')}`}
                      aria-current={index === activeSlide ? 'step' : undefined}
                    >
                      <span
                        className="block h-1 w-9 rounded-full transition-colors motion-reduce:transition-none"
                        style={{ backgroundColor: index === activeSlide ? item.color : 'hsl(var(--border))' }}
                      />
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => goToSlide(activeSlide - 1)}
                    disabled={activeSlide === 0}
                    className="h-11 rounded-none border-border px-4 font-mono text-xs font-bold uppercase"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Previous
                  </Button>
                  <Button
                    type="button"
                    onClick={() => goToSlide(activeSlide + 1)}
                    disabled={isFinalSlide}
                    className="h-11 rounded-none bg-primary px-4 font-mono text-xs font-bold uppercase text-primary-foreground hover:bg-primary/90"
                  >
                    Next <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Use the arrow buttons or left and right arrow keys to explore the studio.
            </p>
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