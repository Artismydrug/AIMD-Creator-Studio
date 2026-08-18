import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { ArrowRight, Brush, Calendar, Mail, Shield, Sparkles, Users } from 'lucide-react';
import tattooImg from '@assets/generated_images/tattoo-studio.jpg';
import flashImg from '@assets/generated_images/workshop-tattoo.jpg';

const BOOKING_EMAIL = 'booking@artismydrug.com';
const BOOKING_MAILTO = `mailto:${BOOKING_EMAIL}?subject=Tattoo Booking Request&body=Name:%0AInstagram/portfolio (optional):%0AIdea/placement:%0AApprox size:%0APreferred dates:%0A`;

export default function Tattoo() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      {/* Hero */}
      <section className="relative min-h-[60vh] flex items-end border-b border-border overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={tattooImg} alt="AIMD tattoo studio" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
        <div className="container relative z-10 px-6 mx-auto pb-14 pt-40">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-5 backdrop-blur">
            <Brush className="w-3.5 h-3.5" /> The Studio
          </div>
          <h1 className="text-4xl md:text-7xl font-black font-display uppercase leading-[0.95] tracking-tighter mb-4">
            Ink With <span className="text-gradient-brand">Intention.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Custom work and flash from resident AIMD artists — in a studio built by creators, for creators.
          </p>
        </div>
      </section>

      {/* What we do */}
      <section className="py-16 px-6 border-b border-border">
        <div className="container mx-auto grid md:grid-cols-3 gap-6">
          {[
            { icon: Users, title: 'Resident Artists', text: 'A rotating roster of resident and guest artists across styles — fine line, traditional, black & grey, and more.' },
            { icon: Sparkles, title: 'Custom Flash', text: 'Original flash sheets drawn in-house. Walk-in friendly when the books are open — first come, first inked.' },
            { icon: Shield, title: 'Clean & Licensed', text: 'A professional, licensed setup with single-use needles and hospital-grade sterilization. Your skin is the canvas; we treat it that way.' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="border border-border bg-card p-6">
              <Icon className="w-6 h-6 text-primary mb-3" />
              <h3 className="font-display font-black uppercase tracking-tight text-xl mb-2">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Booking intake */}
      <section className="py-16 px-6 border-b border-border bg-card">
        <div className="container mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary mb-4">
              <Calendar className="w-4 h-4" /> Booking Intake
            </div>
            <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-tight mb-4">
              Book Your Session
            </h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              Tell us your idea, placement, size, and preferred dates. We'll match you
              with the right artist and confirm a time. Deposits lock in your session.
            </p>
            <ul className="space-y-3 mb-8">
              {[
                'Describe your idea — references welcome',
                'We pair you with the best-fit resident artist',
                'Confirm date, deposit, and aftercare plan',
              ].map((step, i) => (
                <li key={step} className="flex items-start gap-3">
                  <span className="w-6 h-6 border border-primary/40 text-primary font-mono text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm">{step}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-14 px-7 rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono font-bold group">
                <a href={BOOKING_MAILTO}>
                  <Mail className="w-4 h-4 mr-2" />
                  Request a Booking
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </Button>
            </div>
            <p className="font-mono text-xs text-muted-foreground mt-3">
              Or email us directly: {BOOKING_EMAIL}
            </p>
          </div>
          <div className="border border-border overflow-hidden">
            <img src={flashImg} alt="Tattoo flash artwork" className="w-full h-full object-cover" />
          </div>
        </div>
      </section>

      {/* Cross-sell */}
      <section className="py-14 px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <p className="font-display font-black uppercase tracking-tight text-xl">Are you an artist?</p>
            <p className="text-muted-foreground text-sm">Join the creator platform — build your streak, win challenges, and get seen by the studio.</p>
          </div>
          <Button variant="outline" className="rounded-none border-primary/40 text-primary hover:bg-primary/10 uppercase font-mono text-xs" asChild>
<Link href="/app">
              Join the Creator Platform <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
            </Link>
</Button>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
