import { Link } from 'wouter';
import { useListWorkshops } from '@workspace/api-client-react';
import { PlayCircle, RefreshCw, Clock, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

/** Real published workshop catalog with separate uploaded teaser clips. */
export function WorkshopCatalog({ basePath }: { basePath: '/learn' | '/workshops' }) {
  const { data, isLoading, isError, refetch, isFetching } = useListWorkshops({});

  if (isLoading) {
    return (
      <div className="grid sm:grid-cols-2 gap-6" data-testid="catalog-loading">
        {[0, 1].map((i) => <Skeleton key={i} className="h-72 rounded-none" />)}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="border border-dashed border-border p-12 text-center space-y-4" data-testid="catalog-error">
        <p className="font-mono text-sm text-muted-foreground">Workshops could not be loaded.</p>
        <Button variant="outline" className="rounded-none font-mono text-xs uppercase" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className="w-3.5 h-3.5 mr-2" /> Retry
        </Button>
      </div>
    );
  }
  if (!data || data.length === 0) {
    return (
      <div className="border border-dashed border-border p-12 text-center" data-testid="catalog-empty">
        <p className="font-display font-bold uppercase text-xl mb-2">No workshops published yet</p>
        <p className="font-mono text-sm text-muted-foreground">Published workshops appear here as instructors release them.</p>
      </div>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-6">
      {data.map((w) => (
        <article key={w.id} className="border border-border bg-card flex flex-col" data-testid={`card-workshop-${w.id}`}>
          {w.previewVideoUrl ? (
            <video src={w.previewVideoUrl} controls preload="metadata" playsInline className="w-full aspect-video bg-black object-contain" data-testid={`video-teaser-${w.id}`} />
          ) : (
            <div className="aspect-video bg-muted flex items-center justify-center font-mono text-xs uppercase text-muted-foreground">
              <PlayCircle className="w-5 h-5 mr-2" /> No teaser uploaded
            </div>
          )}
          <div className="p-5 flex flex-col gap-3 flex-1">
            <div className="flex flex-wrap gap-2 font-mono text-[10px] uppercase">
              <span className="border border-primary/30 bg-primary/10 text-primary px-2 py-0.5">{w.category}</span>
              {w.isPublished === false && <span className="border border-border px-2 py-0.5 text-muted-foreground">Draft</span>}
            </div>
            <h2 className="font-display font-black uppercase text-2xl tracking-tight">{w.title}</h2>
            <p className="text-sm text-muted-foreground line-clamp-3">{w.description}</p>
            <div className="mt-auto flex items-center justify-between pt-3 border-t border-border">
              <p className="font-mono text-xs text-muted-foreground flex items-center gap-3">
                <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{w.totalModules} modules</span>
                {!!w.durationMinutes && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{w.durationMinutes}m</span>}
              </p>
              <Button asChild size="sm" className="rounded-none font-mono text-xs uppercase">
                <Link href={`${basePath}/${w.id}`} data-testid={`link-workshop-${w.id}`}>Open</Link>
              </Button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
