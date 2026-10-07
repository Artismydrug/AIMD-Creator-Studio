import { WorkshopCatalog } from '@/components/workshop/WorkshopCatalog';

export default function Workshops() {
  return (
    <div className="p-6 md:p-10 space-y-8">
      <header className="pb-6 border-b border-border">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary mb-2">Workshops</p>
        <h1 className="text-4xl md:text-5xl font-black font-display uppercase tracking-tight">One craft. One apprenticeship.</h1>
      </header>
      <WorkshopCatalog basePath="/workshops" />
    </div>
  );
}
