import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { Building, Sparkles } from 'lucide-react';
import resortCampusImg from '@assets/generated_images/artist-resort-campus.jpg';
import resortContainersImg from '@assets/generated_images/artist-resort-containers.jpg';
import resortSuiteImg from '@assets/generated_images/artist-resort-suite.jpg';

export default function ArtistResort() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />
      <main>
        <section className="py-20 px-6 border-b border-border bg-card">
          <div className="container mx-auto">
            <div className="max-w-3xl mx-auto text-center mb-14">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted text-muted-foreground font-mono text-xs uppercase tracking-widest mb-6">
                <Building className="w-4 h-4" /> Future Vision
              </div>
              <h1 className="text-5xl md:text-7xl font-black font-display uppercase tracking-tight mb-5">
                The AIMD Artist <span className="text-gradient-brand">Resort.</span>
              </h1>
              <p className="text-xl md:text-2xl font-display uppercase tracking-tight text-foreground/80 mb-6">
                Containers create the infrastructure. Artists create the culture.
              </p>
              <p className="text-lg text-muted-foreground">
                A long-term vision for an off-grid desert artist campus built from repurposed shipping containers — a place where creators can create, stay, and gather.
              </p>
            </div>
            <div className="grid md:grid-cols-12 gap-4 mb-14">
              <div className="md:col-span-12 glass-card rounded-xl overflow-hidden p-2">
                <img src={resortCampusImg} alt="Aerial concept of the AIMD Artist Resort campus" className="w-full h-[38vh] md:h-[56vh] rounded-lg object-cover" />
              </div>
              <div className="md:col-span-8 glass-card rounded-xl overflow-hidden p-2">
                <img src={resortContainersImg} alt="Exterior container architecture" className="w-full h-64 md:h-96 rounded-lg object-cover" />
              </div>
              <div className="md:col-span-4 glass-card rounded-xl overflow-hidden p-2">
                <img src={resortSuiteImg} alt="Private container stay" className="w-full h-64 md:h-96 rounded-lg object-cover" />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-8 mb-12">
              {[
                ['Create', 'Dedicated creative studios optimized for the artistic process, fully equipped and free from distraction.'],
                ['Stay', 'Private, comfortable container suites that blend rugged off-grid living with modern sanctuary.'],
                ['Gather', 'Shared fire circles and community spaces to unplug, connect, and collaborate with peers.'],
              ].map(([title, body]) => (
                <div key={title} className="text-center px-4">
                  <h2 className="font-display font-black text-2xl uppercase tracking-tight mb-3">{title}</h2>
                  <p className="text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
            <div className="max-w-2xl mx-auto border border-primary/20 bg-primary/5 p-6 rounded-xl flex items-start gap-4">
              <Sparkles className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm md:text-base font-mono leading-relaxed text-foreground/80">
                <strong className="text-primary uppercase block mb-1">Concept Stage Only</strong>
                This resort is an informational future vision. It is not currently open, bookable, or accepting applications.
              </p>
            </div>
          </div>
        </section>
      </main>
      <MarketingFooter />
    </div>
  );
}