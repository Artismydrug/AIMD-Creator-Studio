import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Flame, ArrowRight, Zap, Target, Users } from 'lucide-react';
import aimdHeroImg from '@assets/generated_images/aimd-hero.jpg';

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50 bg-background/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Flame className="w-8 h-8 text-primary" />
          <span className="font-display font-black text-2xl tracking-widest">AIMD</span>
        </div>
        <div className="flex gap-4">
          <Link href="/plans">
            <Button variant="ghost" className="rounded-none border-white/20 hover:bg-white/5 uppercase font-mono text-xs">
              Membership
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono text-xs">
              Enter Studio
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[85vh] flex items-center border-b border-white/10 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={aimdHeroImg} 
            alt="AIMD Studio" 
            className="w-full h-full object-cover opacity-30 grayscale mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background/20 to-background opacity-50" />
        </div>
        
        <div className="container relative z-10 px-6 mx-auto">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-sm uppercase mb-8">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Art Is My Drug — 501(c)(3) Non-Profit
            </div>
            <h1 className="text-6xl md:text-8xl font-black font-display uppercase leading-[0.9] tracking-tighter mb-6">
              Discipline <br />
              <span className="text-primary">Eats Talent</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mb-10 font-sans">
              The official pipeline transforming creators from daily artistic discipline to professional studio placement. Built for creators who grind.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link href="/dashboard">
                <Button size="lg" className="h-16 px-8 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 text-lg uppercase font-mono font-bold group">
                  Join the Pipeline
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link href="/sponsor">
                <Button size="lg" variant="outline" className="h-16 px-8 rounded-none border-white/20 hover:bg-white/5 text-lg uppercase font-mono font-bold">
                  Sponsor a Creator
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pipeline Phases */}
      <section className="py-24 px-6 border-b border-white/10 bg-card">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-16">
            <h2 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">The Pipeline</h2>
            <div className="h-[2px] bg-white/10 flex-1" />
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Discovery',
                desc: 'Build the habit. Track daily creative discipline, connect with local events, and log your progress in the Studio Log.',
                icon: Zap
              },
              {
                step: '02',
                title: 'Academy',
                desc: 'Level up. Enroll in expert-led workshops across tattooing, fine art, and spatial design. Complete skill tracks.',
                icon: Target
              },
              {
                step: '03',
                title: 'Studio',
                desc: 'Go pro. Earn your Studio Ready badge to unlock exclusive apprenticeships, guest spots, and residencies.',
                icon: Users
              }
            ].map((phase, i) => (
              <div key={i} className="group border border-white/10 p-8 hover:border-primary/50 transition-colors bg-background relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 text-7xl font-black font-display text-white/5 group-hover:text-primary/10 transition-colors">
                  {phase.step}
                </div>
                <phase.icon className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-2xl font-bold font-display uppercase mb-4">{phase.title}</h3>
                <p className="text-muted-foreground relative z-10">{phase.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 bg-background">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Flame className="w-6 h-6 text-primary" />
            <span className="font-display font-black text-xl tracking-widest uppercase">AIMD Academy</span>
          </div>
          <p className="text-muted-foreground text-sm font-mono">
            © {new Date().getFullYear()} Art Is My Drug. A 501(c)(3) Non-Profit Organization.
          </p>
        </div>
      </footer>
    </div>
  );
}
