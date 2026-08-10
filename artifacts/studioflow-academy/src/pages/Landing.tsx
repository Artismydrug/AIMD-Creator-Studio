import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, PlayCircle, Star, Target, Zap } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@assets/generated_images/hero.jpg";

export default function Landing() {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground"
    >
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm leading-none tracking-tighter">S</span>
            </div>
            <span className="font-bold text-sm tracking-widest uppercase">StudioFlow</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
            <a href="#philosophy" className="hover:text-foreground transition-colors">Philosophy</a>
            <a href="#phases" className="hover:text-foreground transition-colors">The Path</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium hover:text-primary transition-colors">
              Log In
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wide uppercase text-xs rounded-none">
                Start Grinding
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-24 md:pt-48 md:pb-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/90 to-background z-10" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] opacity-20 bg-primary/20 blur-[120px] rounded-full" />
          <img 
            src={heroImg} 
            alt="Studio background" 
            className="w-full h-full object-cover opacity-30 mix-blend-luminosity"
          />
        </div>

        <div className="container mx-auto relative z-10">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="max-w-4xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono tracking-widest text-primary mb-6">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              Not for hobbyists
            </div>
            <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-[0.9] mb-8 text-transparent bg-clip-text bg-gradient-to-br from-white to-white/40">
              WHERE DISCIPLINE <br />
              BECOMES <span className="text-primary">MASTERY.</span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl font-light leading-relaxed mb-12">
              StudioFlow Academy is the premier platform for serious creators. 
              Track your daily grind, master elite workshops, and land a chair in world-class studios.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-14 px-8 bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold tracking-widest uppercase rounded-none w-full sm:w-auto group">
                  Enter The Studio
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="h-14 px-8 text-sm font-bold tracking-widest uppercase rounded-none w-full sm:w-auto border-white/10 hover:bg-white/5">
                View Curriculum
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section id="philosophy" className="py-24 px-6 bg-card/50 border-y border-white/5">
        <div className="container mx-auto max-w-5xl">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-5xl font-bold tracking-tighter mb-6">THE HOBBYIST <br/><span className="text-muted-foreground">VS</span> THE PRO</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Most platforms treat creativity like a fun weekend activity. We treat it like a martial art. 
                In the real world, inspiration is a myth. Consistency is the only metric that matters.
              </p>
              <ul className="space-y-4 font-mono text-sm tracking-wide">
                <li className="flex items-center gap-3 text-red-400/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  Waits for inspiration
                </li>
                <li className="flex items-center gap-3 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  Shows up every day
                </li>
                <li className="flex items-center gap-3 text-red-400/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  Focuses on tools
                </li>
                <li className="flex items-center gap-3 text-primary">
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  Focuses on reps
                </li>
              </ul>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="aspect-square bg-background border border-white/10 p-8 flex items-center justify-center relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="text-center relative z-10">
                <div className="text-8xl font-black text-primary mb-2 opacity-80">10k</div>
                <div className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Hours Required</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3 Phases Section */}
      <section id="phases" className="py-32 px-6 relative">
        <div className="container mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-6">THE PATH TO MASTERY</h2>
            <p className="text-xl text-muted-foreground font-light">A proven, three-phase framework to take you from scattered amateur to career-ready professional.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Phase 1 */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-card border border-white/5 p-8 relative group hover:border-primary/50 transition-colors"
            >
              <div className="absolute top-0 right-0 p-4 font-mono text-4xl font-black text-white/5 group-hover:text-white/10 transition-colors">01</div>
              <Target className="w-10 h-10 text-muted-foreground mb-6 group-hover:text-primary transition-colors" />
              <h3 className="text-2xl font-bold tracking-tight mb-3">DISCIPLINE</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Before you learn technique, you must build the habit. Use our intense tracker to lock in your daily reps.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Daily Habit Tracker</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Heatmap Analytics</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Focus Timers</li>
              </ul>
            </motion.div>

            {/* Phase 2 */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-card border border-white/5 p-8 relative group hover:border-primary/50 transition-colors mt-0 md:mt-8"
            >
              <div className="absolute top-0 right-0 p-4 font-mono text-4xl font-black text-white/5 group-hover:text-white/10 transition-colors">02</div>
              <PlayCircle className="w-10 h-10 text-muted-foreground mb-6 group-hover:text-primary transition-colors" />
              <h3 className="text-2xl font-bold tracking-tight mb-3">SKILLS</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                Learn from industry veterans. No fluff, just raw technique and structured modules to level up your craft.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Premium Workshops</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Skill Tracks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Milestone Badges</li>
              </ul>
            </motion.div>

            {/* Phase 3 */}
            <motion.div 
              whileHover={{ y: -10 }}
              className="bg-card border border-white/5 p-8 relative group hover:border-primary/50 transition-colors mt-0 md:mt-16"
            >
              <div className="absolute top-0 right-0 p-4 font-mono text-4xl font-black text-white/5 group-hover:text-white/10 transition-colors">03</div>
              <Zap className="w-10 h-10 text-muted-foreground mb-6 group-hover:text-primary transition-colors" />
              <h3 className="text-2xl font-bold tracking-tight mb-3">CAREER</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                When you're ready, we connect you with elite studios looking for disciplined talent. Stop cold emailing.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground font-mono">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Studio Job Board</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Verified Applications</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Creator Portfolio</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="border-y border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="flex w-full">
          <div className="flex animate-[marquee_20s_linear_infinite] whitespace-nowrap py-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center mx-8 gap-8 font-mono text-xl font-bold tracking-widest opacity-50 uppercase">
                <span>1.2M HOURS LOGGED</span>
                <Star className="w-4 h-4 text-primary" />
                <span>500+ PLACEMENTS</span>
                <Star className="w-4 h-4 text-primary" />
                <span>ELITE CURRICULUM</span>
                <Star className="w-4 h-4 text-primary" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-4">CHOOSE YOUR GRIND</h2>
            <p className="text-muted-foreground font-light">No contracts. Cancel anytime. Put in the work.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="border border-white/10 bg-background p-8 flex flex-col">
              <div className="uppercase tracking-widest text-xs font-bold text-muted-foreground mb-4">Phase 1</div>
              <div className="mb-6">
                <span className="text-4xl font-black">Free</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8 min-h-[40px]">
                Build your daily discipline with our core tracker.
              </p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
                  Unlimited habit tracking
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
                  Focus timers
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-muted-foreground shrink-0" />
                  Public studio log posting
                </li>
              </ul>
              <Link href="/dashboard" className="w-full">
                <Button className="w-full rounded-none h-12 bg-white/5 hover:bg-white/10 text-foreground font-bold tracking-widest uppercase text-xs">
                  Start Tracking
                </Button>
              </Link>
            </div>

            {/* Workshop Pass */}
            <div className="border-2 border-primary bg-card p-8 flex flex-col relative transform md:-translate-y-4">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 text-[10px] font-black tracking-widest uppercase">
                Most Popular
              </div>
              <div className="uppercase tracking-widest text-xs font-bold text-primary mb-4">Phase 2</div>
              <div className="mb-6">
                <span className="text-4xl font-black">$39</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8 min-h-[40px]">
                Access the full library of professional workshops.
              </p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  Everything in Free
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  Access to all Workshop Tier courses
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  Skill Track progression
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                  Earn milestone badges
                </li>
              </ul>
              <Link href="/dashboard" className="w-full">
                <Button className="w-full rounded-none h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-widest uppercase text-xs shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  Get Pass
                </Button>
              </Link>
            </div>

            {/* Pro Creator */}
            <div className="border border-white/10 bg-background p-8 flex flex-col">
              <div className="uppercase tracking-widest text-xs font-bold text-amber-500 mb-4">Phase 3</div>
              <div className="mb-6">
                <span className="text-4xl font-black">$99</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground mb-8 min-h-[40px]">
                Career placement and elite masterclasses.
              </p>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                  Everything in Workshop Pass
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                  Access to Pro-only masterclasses
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                  Studio Job Board access
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-amber-500 shrink-0" />
                  Direct application submissions
                </li>
              </ul>
              <Link href="/dashboard" className="w-full">
                <Button className="w-full rounded-none h-12 bg-white/5 hover:bg-white/10 text-foreground font-bold tracking-widest uppercase text-xs">
                  Go Pro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 relative border-t border-white/5">
        <div className="absolute inset-0 bg-primary/5" />
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 uppercase">Stop Playing.<br/>Start Building.</h2>
          <Link href="/dashboard">
            <Button size="lg" className="h-16 px-12 bg-foreground text-background hover:bg-foreground/90 text-sm font-black tracking-widest uppercase rounded-none">
              Enter The Studio Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5 text-center text-xs font-mono text-muted-foreground">
        <p>© {new Date().getFullYear()} StudioFlow Academy. No shortcuts.</p>
      </footer>
    </motion.div>
  );
}
