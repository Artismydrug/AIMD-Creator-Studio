import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { ArrowRight, Image as ImageIcon, Zap } from 'lucide-react';

import galleryImg from '@assets/generated_images/gallery-wall.jpg';

type GalleryPost = {
  id: number;
  username: string;
  imageUrl: string | null;
  mediaType?: string;
  caption: string;
  likes: number;
};

async function fetchGalleryPosts(): Promise<GalleryPost[]> {
  const r = await fetch('/api/studio-posts?limit=24');
  if (!r.ok) return [];
  const posts = (await r.json()) as GalleryPost[];
  return posts.filter((p) => p.imageUrl && p.mediaType !== 'video');
}

export default function Gallery() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['gallery', 'posts'],
    queryFn: fetchGalleryPosts,
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      <section className="relative min-h-[55vh] flex items-end border-b border-border overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={galleryImg} alt="AIMD gallery wall" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
        </div>
        <div className="container relative z-10 px-6 mx-auto pb-14 pt-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-background/50 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-5 backdrop-blur shadow-sm">
              <ImageIcon className="w-3.5 h-3.5" /> The AIMD Gallery
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-display uppercase leading-[0.9] tracking-tighter mb-6 text-foreground drop-shadow-sm">
              Work Worth <br/><span className="text-gradient-brand">Sharing.</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground font-medium max-w-2xl">
              A living collection of visual work made and shared by the AIMD creative community.
            </p>
          </div>
        </div>
      </section>

      {/* Community showcase — live posts */}
      <section className="py-16 px-6 border-b border-border bg-card">
          <div className="container mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-4xl font-black font-display uppercase tracking-tight">Fresh From the Studio</h2>
              <div className="h-[2px] bg-border flex-1 hidden md:block" />
            </div>
            <p className="text-muted-foreground mb-10 max-w-2xl">Real work posted by creators on the platform — updated daily.</p>

            {isLoading ? (
              <p className="font-mono text-sm text-muted-foreground animate-pulse py-10 text-center">Loading artwork…</p>
            ) : posts.length === 0 ? (
              <div className="py-14 text-center border border-dashed border-border">
                <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
                <p className="font-mono text-sm text-muted-foreground mb-4">No artwork has been shared publicly yet.</p>
                <Button className="rounded-none bg-primary text-primary-foreground uppercase font-mono text-xs" asChild>
                  <Link href="/sign-up">
                    Share Your Work
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {posts.slice(0, 12).map((p) => (
                  <div key={p.id} className="aspect-square border border-border overflow-hidden group relative bg-background">
                    <img src={p.imageUrl!} alt={p.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute bottom-0 inset-x-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-background/95 to-transparent">
                      <p className="font-mono text-xs font-bold truncate">{p.username}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{p.caption}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-14 px-6">
          <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <p className="font-display font-black uppercase tracking-tight text-xl">Want your work on this wall?</p>
              <p className="text-muted-foreground text-sm">Join the creator platform, post your grind, and get curated into the gallery.</p>
            </div>
            <Button className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono text-xs h-12 px-6" asChild>
              <Link href="/app">
                Join the Creator Platform <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
