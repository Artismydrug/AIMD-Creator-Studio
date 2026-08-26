import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'wouter';
import {
  Aperture,
  Zap,
  Image as ImageIcon,
  Star,
  PlayCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';

// ─── Slide definitions ────────────────────────────────────────────────────────

const SLIDES = [
  {
    badge: 'CREATOR STUDIO',
    icon: Aperture,
    iconBg: 'bg-[#FAF0EC]',
    iconColor: 'text-primary',
    accent: '#C85A32',
    title: 'Every creator belongs here.',
    body: 'A digital studio for the way you make. Find your lane, practice your craft, and keep moving.',
    tags: ['Painters', 'Musicians', 'Athletes', 'Tattoo artists'],
  },
  {
    badge: 'MAKE IT A HABIT',
    icon: Zap,
    iconBg: 'bg-amber-50',
    iconColor: 'text-secondary',
    accent: '#E09F3E',
    title: 'Show up. Make something.',
    body: 'Check in, build a streak, and turn small creative moves into real momentum.',
  },
  {
    badge: 'SHARE YOUR WORK',
    icon: ImageIcon,
    iconBg: 'bg-fuchsia-50',
    iconColor: 'text-fuchsia-500',
    accent: '#D946EF',
    title: 'Let the work speak.',
    body: 'Post your progress, find other creators, and build a portfolio that feels like you.',
  },
  {
    badge: 'CHALLENGES & HABITS',
    icon: Star,
    iconBg: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
    accent: '#EAB308',
    title: 'Practice with purpose.',
    body: 'Use habits for the daily work. Jump into weekly challenges when you want a creative push.',
  },
  {
    badge: 'LEARN YOUR WAY',
    icon: PlayCircle,
    iconBg: 'bg-[#FAF0EC]',
    iconColor: 'text-primary',
    accent: '#C85A32',
    title: 'Keep growing.',
    body: 'Explore creator workshops, focused drills, and new paths as they open.',
  },
] as const;

const STORAGE_KEY = 'aimd_onboarding_done';
const AUTO_ADVANCE_MS = 6000;
const TICK_MS = 40;

// ─── Main component ───────────────────────────────────────────────────────────

export function Onboarding() {
  const [, navigate] = useLocation();
  const [current, setCurrent] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [entering, setEntering] = useState(false);

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, '1');
    navigate('/dashboard');
  }, [navigate]);

  const goTo = useCallback((idx: number) => {
    if (idx === current) return;
    setExiting(true);
    setTimeout(() => {
      setCurrent(idx);
      setProgress(0);
      setExiting(false);
      setEntering(true);
      setTimeout(() => setEntering(false), 300);
    }, 200);
  }, [current]);

  const next = useCallback(() => {
    if (current < SLIDES.length - 1) goTo(current + 1);
    else complete();
  }, [current, goTo, complete]);

  const prev = useCallback(() => {
    if (current > 0) goTo(current - 1);
  }, [current, goTo]);

  // Auto-advance progress bar
  useEffect(() => {
    if (paused) return;
    const steps = AUTO_ADVANCE_MS / TICK_MS;
    let tick = 0;
    const timer = setInterval(() => {
      tick++;
      const pct = (tick / steps) * 100;
      setProgress(pct);
      if (tick >= steps) {
        clearInterval(timer);
        next();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [current, paused]); // intentionally exclude `next` to avoid stale closure issues

  const slide = SLIDES[current];
  const Icon = slide.icon;
  const isLast = current === SLIDES.length - 1;

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center px-4 py-10">
      {/* Skip */}
      <div className="w-full max-w-[420px] flex justify-end mb-3">
        <button
          onClick={complete}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted/60"
        >
          <X className="w-3.5 h-3.5" />
          Skip tour
        </button>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-[420px] bg-white border border-[#F2EFE9] rounded-[20px] shadow-[0_10px_40px_rgba(44,38,35,0.08)] overflow-hidden select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
      >
        {/* Segmented progress bars */}
        <div className="flex gap-1 px-4 pt-4">
          {SLIDES.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full bg-[#F2EFE9] overflow-hidden">
              <div
                className="h-full rounded-full transition-none"
                style={{
                  background: slide.accent,
                  width:
                    i < current ? '100%' :
                    i === current ? `${progress}%` :
                    '0%',
                  transition: i < current ? 'none' : undefined,
                }}
              />
            </div>
          ))}
        </div>

        {/* Slide content */}
        <div
          className={`px-8 pb-8 pt-6 transition-all duration-200 ${
            exiting ? 'opacity-0 translate-x-4' :
            entering ? 'opacity-0 -translate-x-4' :
            'opacity-100 translate-x-0'
          }`}
        >
          {/* Badge */}
          <div className="mb-6 flex justify-center">
            <span
              className="inline-block font-mono text-[10px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-full"
              style={{ background: `${slide.accent}18`, color: slide.accent }}
            >
              {slide.badge}
            </span>
          </div>

          {/* Icon */}
          <div className={`w-20 h-20 ${slide.iconBg} rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-sm`}>
            <Icon className={`w-9 h-9 ${slide.iconColor}`} strokeWidth={1.5} />
          </div>

          {/* Title */}
          <h2
            className="text-[1.6rem] font-black tracking-tight text-[#1A1A1A] mb-3 text-center whitespace-pre-line leading-tight"
            style={{ fontFamily: 'var(--font-display, inherit)' }}
          >
            {slide.title}
          </h2>

          {/* Body */}
          <p
            className={`text-sm text-[#666] leading-relaxed text-center max-w-xs mx-auto ${
              'tags' in slide ? 'mb-4' : 'mb-8'
            }`}
          >
            {slide.body}
          </p>

          {'tags' in slide && (
            <div className="flex flex-wrap justify-center gap-2 mb-6" aria-label="Creator communities">
              {slide.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border px-2.5 py-1 text-[10px] font-semibold"
                  style={{
                    borderColor: `${slide.accent}66`,
                    background: `${slide.accent}10`,
                    color: slide.accent,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Navigation row */}
          <div className="flex items-center justify-between gap-3">
            {/* Prev */}
            <button
              onClick={prev}
              disabled={current === 0}
              aria-label="Previous slide"
              className="p-2.5 rounded-xl border border-[#EAE6E0] text-[#999] hover:text-[#333] hover:bg-[#F7F4EF] transition-all disabled:opacity-0 disabled:pointer-events-none"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Dot indicators */}
            <div className="flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === current ? '20px' : '8px',
                    height: '8px',
                    background: i === current ? slide.accent : '#E0DBD5',
                  }}
                />
              ))}
            </div>

            {/* Next / Enter CTA */}
            {isLast ? (
              <button
                onClick={complete}
                className="flex-1 ml-1 py-2.5 px-5 text-sm font-bold text-white rounded-xl transition-all hover:opacity-90 active:scale-95"
                style={{ background: slide.accent }}
              >
                Enter Open Studio
              </button>
            ) : (
              <button
                onClick={next}
                aria-label="Next slide"
                className="p-2.5 rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: slide.accent }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Brand footer */}
      <p className="mt-6 text-[10px] font-mono tracking-widest uppercase text-[#BBB]">
        Art Is My Drug
      </p>
    </div>
  );
}

export default Onboarding;
