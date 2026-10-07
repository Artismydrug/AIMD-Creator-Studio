import { MarketingNav } from '@/components/MarketingNav';
import { WorkshopCatalog } from '@/components/workshop/WorkshopCatalog';

export default function Learn() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingNav />
      <main className="container mx-auto px-6 py-12 space-y-10">
        <header className="border-b border-border pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary mb-2">AIMD Workshops</p>
          <h1 className="text-4xl md:text-6xl font-black font-display uppercase tracking-tight">Watch the teaser. Earn the lesson.</h1>
          <p className="font-mono text-sm text-muted-foreground mt-3">Teasers are free for everyone. Full lessons need membership or instructor enrollment.</p>
        </header>
        <WorkshopCatalog basePath="/learn" />
      </main>
    </div>
  );
}
