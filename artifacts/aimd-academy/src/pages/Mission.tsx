import { useState } from 'react';
import {
  Briefcase,
  ChevronDown,
  GraduationCap,
  HeartHandshake,
  Mail,
  Play,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// ─── Pillar data ─────────────────────────────────────────────────────────────

const PILLARS = [
  {
    icon: Zap,
    title: 'Daily Discipline',
    tag: 'Phase 1',
    description:
      'Build an unbreakable creative practice through daily studio sessions, focus timers, and visual momentum heatmaps. The grind is the art.',
    bullets: [
      'Daily habit logging with streak tracking',
      'Pomodoro-style studio focus timers',
      'Visual heatmap momentum dashboard',
      'Accountability streaks & milestone alerts',
    ],
  },
  {
    icon: GraduationCap,
    title: 'Workshops & Mentorship',
    tag: 'Phase 2',
    description:
      'Structured video masterclasses taught by working professionals — with real assignment feedback, skill milestone badges, and a clear certification path.',
    bullets: [
      'Tattooing, fine art, mural & media tracks',
      'Instructor-reviewed assignment submissions',
      'Milestone certification badges',
      'Studio Ready apprentice reviews',
    ],
  },
  {
    icon: Briefcase,
    title: 'Career Placement',
    tag: 'Phase 3',
    description:
      'Certified creators enter the AIMD placement network — applying for open resident chairs, guest spots, and job board listings at verified partner studios.',
    bullets: [
      'Open resident chair & guest spot board',
      'AIMD verified partner studio network',
      'Direct application portal',
      'Featured placement for Studio Ready graduates',
    ],
  },
];

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQS = [
  {
    q: 'What does my membership fee actually fund?',
    a: 'Every dollar goes directly to AIMD operations: instructor compensation, equipment for youth creators, studio space costs, and the platform infrastructure. No investors, no profit motive.',
  },
  {
    q: 'How does "Sponsor a Creator" work?',
    a: 'You choose a tier — Studio Kit ($49), Workshop Tuition ($199), or Full-Ride ($499) — and optionally select a specific creator or let AIMD allocate to the highest-need applicant. Every sponsorship goes directly to supporting a creator.',
  },
  {
    q: 'What is the Studio Ready certification?',
    a: 'Studio Ready is AIMD\'s internal certification for creators who have completed the full Phase 1–3 pipeline: consistent daily habits, passing workshop assignments, and a reviewed portfolio. Studios in the AIMD network trust Studio Ready graduates for open chair applications.',
  },
  {
    q: 'How do I apply for an open resident chair or guest spot?',
    a: 'Once you have a Dedicated Artist or Professional Artist membership, the Studio Chairs & Opportunity Board is unlocked. You apply directly to partner studios through the platform — no cold emails, no middlemen.',
  },
  {
    q: 'Can I cancel my membership at any time?',
    a: 'Yes. Monthly memberships can be cancelled before the next billing cycle with no penalties. Your access continues through the end of the paid period. Annual plans are non-refundable after 30 days.',
  },
  {
    q: 'Is AIMD only for tattoo artists?',
    a: 'No. AIMD supports creators across tattooing, fine art, mural and spatial design, and media production. The pipeline and placement network reflect all of these disciplines.',
  },
];

// ─── Components ───────────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group"
      >
        <span className="text-sm md:text-base font-semibold text-white group-hover:text-primary transition-colors">
          {q}
        </span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180 text-primary' : ''
          }`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm text-muted-foreground leading-relaxed">{a}</p>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Mission() {
  return (
    <div className="min-h-screen bg-background text-white">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 pt-16 pb-12 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/30 text-primary font-mono text-[11px] uppercase tracking-widest mb-6">
          <HeartHandshake className="w-3.5 h-3.5" />
          Art Is My Drug
        </div>

        <h1 className="font-display font-black text-4xl md:text-6xl uppercase tracking-tight leading-[0.95] mb-6">
          Building the Future
          <br />
          <span className="text-primary">for Creators</span>
          <br />
          & Artists
        </h1>

        <p className="text-muted-foreground text-lg md:text-xl max-w-2xl leading-relaxed mb-12">
          AIMD isn't a platform. It's a pipeline — from daily discipline to professional studio
          placement — owned and operated by artists, for artists. No investors. No shortcuts.
        </p>

        {/* Video player */}
        <div className="relative w-full aspect-video bg-muted/40 border border-border overflow-hidden group">
          {/* Glowing top edge */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />

          {/* Thumbnail / dark background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/60 via-zinc-900 to-background" />

          {/* Play button */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <button
              className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center shadow-lg shadow-emerald-500/40 transition-all active:scale-95"
              aria-label="Play promo video"
            >
              <Play className="w-6 h-6 text-zinc-950 ml-0.5" fill="currentColor" />
            </button>
            <p className="font-mono text-xs text-muted-foreground uppercase tracking-widest">
              AIMD Studio Promo · 2026
            </p>
          </div>

          {/* Overlay label */}
          <div className="absolute top-4 left-4 font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
            Studio Focus · Workshops · Community Unity
          </div>
        </div>
      </section>

      {/* ── Three Pillars ────────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-16 max-w-5xl mx-auto">
        <div className="mb-10">
          <p className="font-mono text-[11px] text-primary uppercase tracking-widest mb-2">
            The Pipeline
          </p>
          <h2 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tight">
            Three Phases. One Mission.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <div
                key={i}
                className="relative flex flex-col p-6 bg-muted/40 border border-border overflow-hidden group transition-all duration-300 hover:border-primary/40"
                style={{
                  boxShadow: '0 0 0 0 transparent',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow =
                    '0 0 24px 0 rgba(16, 185, 129, 0.12), inset 0 0 24px 0 rgba(16, 185, 129, 0.04)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 0 0 0 transparent';
                }}
              >
                {/* Emerald top glow border */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* Phase tag */}
                <span className="font-mono text-[10px] text-primary uppercase tracking-widest mb-4">
                  {pillar.tag}
                </span>

                {/* Icon */}
                <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" />
                </div>

                <h3 className="font-display font-black text-xl uppercase tracking-tight mb-3">
                  {pillar.title}
                </h3>

                <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                  {pillar.description}
                </p>

                <ul className="mt-auto space-y-2">
                  {pillar.bullets.map((b, j) => (
                    <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <span className="mt-1.5 w-1 h-1 rounded-full bg-primary flex-shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── FAQ & Contact ─────────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-16 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* FAQ column */}
          <div className="md:col-span-2">
            <p className="font-mono text-[11px] text-primary uppercase tracking-widest mb-2">
              Common Questions
            </p>
            <h2 className="font-display font-black text-3xl md:text-4xl uppercase tracking-tight mb-8">
              FAQ
            </h2>

            <div className="divide-y divide-zinc-800 border-t border-border">
              {FAQS.map((faq, i) => (
                <FaqItem key={i} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>

          {/* Contact sidebar */}
          <div className="flex flex-col gap-6">
            <div className="p-6 bg-muted/40 border border-border">
              <div className="w-10 h-10 bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-display font-bold text-lg uppercase tracking-tight mb-2">
                Message the Team
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Questions about studio chair applications, sponsorships, or partnerships? The
                AIMD team responds within 24 hours.
              </p>
              <Button
                asChild
                className="w-full bg-primary hover:bg-primary/90 text-zinc-950 font-bold uppercase tracking-wider rounded-none"
              >
                <a href="mailto:info@artismydrug.org">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact AIMD
                </a>
              </Button>
            </div>

            {/* Non-profit card */}
            <div className="p-6 bg-muted/40 border border-primary/20">
              <p className="font-mono text-[10px] text-primary uppercase tracking-widest mb-3">
                Mission-Driven
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Art Is My Drug is a mission-driven organization. Every donation and sponsorship
                goes directly to supporting creators.
              </p>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-xs text-muted-foreground font-mono">
                  artismydrug.org
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="px-6 md:px-16 py-16 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <h2 className="font-display font-black text-2xl md:text-3xl uppercase tracking-tight mb-2">
              Ready to start the pipeline?
            </h2>
            <p className="text-muted-foreground text-sm">
              Join creators who are building their careers through discipline, not luck.
            </p>
          </div>
          <div className="flex gap-3 flex-shrink-0">
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-zinc-950 font-bold uppercase tracking-wider rounded-none px-6"
            >
              <a href="/aimd-academy/plans">Join the Pipeline →</a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-border text-foreground/80 hover:bg-muted hover:text-white rounded-none px-6 uppercase tracking-wider font-bold"
            >
              <a href="/aimd-academy/sponsor">Sponsor a Creator</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
