import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { ArrowRight, Image as ImageIcon, Star, Zap } from 'lucide-react';
import galleryImg from '@assets/generated_images/gallery-wall.jpg';
import fineArtImg from '@assets/generated_images/workshop-fine-art.jpg';
import spatialImg from '@assets/generated_images/workshop-spatial.jpg';
import flashImg from '@assets/generated_images/workshop-tattoo.jpg';

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
  // Gallery shows visual work only
  return posts.filter((p) => p.imageUrl && p.mediaType !== 'video');
}

const CURATED = [
  { img: fineArtImg, title: 'Fine Art & Colour Studies' },
  { img: flashImg, title: 'Flash & Tattoo Design' },
  { img: spatialImg, title: 'Murals & Spatial Work' },
];

export default function Gallery() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['gallery', 'posts'],
    queryFn: fetchGalleryPosts,
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <MarketingNav />

      {/* Hero */}
      <section className="relative min-h-[55vh] flex items-end border-b border-border overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={galleryImg} alt="AIMD gallery wall" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        </div>
        <div className="container relative z-10 px-6 mx-auto pb-14 pt-36">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-5 backdrop-blur">
            <ImageIcon className="w-3.5 h-3.5" /> The Gallery
          </div>
          <h1 className="text-4xl md:text-7xl font-black font-display uppercase leading-[0.95] tracking-tighter mb-4">
            Work Worth <span className="text-gradient-brand">The Wall.</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
            Curated artwork from the AIMD community — digital pieces, physical prints, and showcase work fresh off the grind.
          </p>
        </div>
      </section>

      {/* Curated collections */}
      <section className="py-16 px-6 border-b border-border">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-10">
            <h2 className="text-2xl md:text-4xl font-black font-display uppercase tracking-tight">Curated Collections</h2>
            <div className="h-[2px] bg-border flex-1 hidden md:block" />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {CURATED.map((c) => (
              <div key={c.title} className="border border-border bg-card overflow-hidden group">
                <div className="h-56 overflow-hidden">
                  <img src={c.img} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <p className="font-display font-black uppercase tracking-tight">{c.title}</p>
                  <Star className="w-4 h-4 text-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community showcase — live posts */}
      <section className="py-16 px-6 border-b border-border bg-card">
        <div className="container mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-2xl md:text-4xl font-black font-display uppercase tracking-tight">Fresh From the Studio Feed</h2>
            <div className="h-[2px] bg-border flex-1 hidden md:block" />
          </div>
          <p className="text-muted-foreground mb-10">Real work posted by creators on the platform — updated daily.</p>

          {isLoading ? (
            <p className="font-mono text-sm text-muted-foreground animate-pulse py-10 text-center">Loading artwork…</p>
          ) : posts.length === 0 ? (
            <div className="py-14 text-center border border-dashed border-border">
              <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="font-mono text-sm text-muted-foreground mb-4">The community showcase is warming up — creators are posting daily.</p>
              <Button className="rounded-none bg-primary text-primary-foreground uppercase font-mono text-xs" asChild>
<Link href="/sign-up">
                  Be the First to Post
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
          <Button className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono text-xs" asChild>
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
