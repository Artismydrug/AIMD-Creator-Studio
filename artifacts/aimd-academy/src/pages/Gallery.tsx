import { useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { ArrowRight, Image as ImageIcon, ShoppingBag, Zap, Loader2 } from 'lucide-react';
import { useListStoreProducts } from '@workspace/api-client-react';

import galleryImg from '@assets/generated_images/gallery-wall.jpg';

import { CartProvider, useCart } from '@/components/store/CartContext';
import { CartDrawer } from '@/components/store/CartDrawer';
import { ProductCard } from '@/components/store/ProductCard';

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

const CATEGORIES = [
  { id: 'all', label: 'All Products' },
  { id: 'apparel', label: 'Apparel & Merch' },
  { id: 'canvas', label: 'Canvas Prints' },
  { id: 'digital', label: 'Digital Art' },
];

function Storefront() {
  const { data: products, isLoading, isError, refetch } = useListStoreProducts();
  const { openCart, items, reconcileCatalog } = useCart();
  const [activeCategory, setActiveCategory] = useState('all');

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (activeCategory === 'all') return products;
    return products.filter((p) => p.category === activeCategory);
  }, [products, activeCategory]);

  const totalCartItems = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    if (products) reconcileCatalog(products);
  }, [products, reconcileCatalog]);

  return (
    <>
      <CartDrawer />

      {/* Hero */}
      <section className="relative min-h-[55vh] flex items-end border-b border-border overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={galleryImg} alt="AIMD gallery wall" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
        </div>
        <div className="container relative z-10 px-6 mx-auto pb-14 pt-36">
          <div className="flex justify-between items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-background/50 border border-primary/20 text-primary font-mono text-xs uppercase tracking-widest mb-5 backdrop-blur shadow-sm">
                <ImageIcon className="w-3.5 h-3.5" /> The Gallery Store
              </div>
              <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-display uppercase leading-[0.9] tracking-tighter mb-6 text-foreground drop-shadow-sm">
                Work Worth <br/><span className="text-gradient-brand">The Wall.</span>
              </h1>
              <p className="text-lg md:text-xl text-foreground font-medium max-w-2xl">
                Independent art directly fueling the community. Prints, digital assets, and limited-edition apparel straight from the studio.
              </p>
            </div>

            <div className="hidden md:block">
              <Button
                size="lg"
                className="h-14 px-6 rounded-none bg-card hover:bg-background text-foreground border border-border shadow-lg uppercase font-mono font-bold group"
                onClick={openCart}
              >
                <ShoppingBag className="w-5 h-5 mr-3 text-primary group-hover:scale-110 transition-transform" />
                View Cart {totalCartItems > 0 && `(${totalCartItems})`}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Storefront */}
      <section className="py-12 md:py-20 px-6 border-b border-border bg-background relative z-20">
        <div className="container mx-auto">
          {/* Mobile cart toggle */}
          <div className="md:hidden flex justify-between items-center mb-8 pb-6 border-b border-border">
            <h2 className="font-display font-black uppercase text-2xl">Shop</h2>
            <Button
              variant="outline"
              className="rounded-none font-mono text-xs uppercase"
              onClick={openCart}
            >
              <ShoppingBag className="w-4 h-4 mr-2" /> Cart ({totalCartItems})
            </Button>
          </div>

          <div className="flex flex-col lg:flex-row gap-12">
            {/* Sidebar Categories */}
            <div className="w-full lg:w-64 shrink-0">
              <div className="sticky top-24">
                <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground mb-4">Categories</h3>
                <div className="flex lg:flex-col gap-2 overflow-x-auto pb-4 lg:pb-0 hide-scrollbar">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`text-left px-4 py-3 font-mono text-sm uppercase transition-colors whitespace-nowrap border-l-2 lg:border-l-4 lg:border-b-0 border-b-4 ${
                        activeCategory === cat.id
                          ? 'border-primary bg-primary/5 text-primary font-bold'
                          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="mt-12 hidden lg:block p-6 bg-primary/5 border border-primary/20">
                  <h4 className="font-display font-black uppercase text-lg mb-2">Free Shipping</h4>
                  <p className="font-mono text-xs text-muted-foreground mb-4">On all physical orders over $75 within the US.</p>
                  <div className="w-10 h-1 bg-primary" />
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl md:text-4xl font-black font-display uppercase tracking-tight">
                  {CATEGORIES.find(c => c.id === activeCategory)?.label}
                </h2>
                <div className="h-[2px] bg-border flex-1 ml-6 hidden md:block" />
              </div>

              {isLoading ? (
                <div className="py-32 flex flex-col items-center justify-center text-primary">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="font-mono text-sm uppercase">Loading catalog...</p>
                </div>
              ) : isError ? (
                <div className="py-24 text-center border border-dashed border-destructive/40 bg-card">
                  <p className="font-mono text-sm text-destructive uppercase mb-4">The shop could not be loaded.</p>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none font-mono text-xs uppercase"
                    onClick={() => void refetch()}
                  >
                    Try Again
                  </Button>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-24 text-center border border-dashed border-border bg-card">
                  <p className="font-mono text-muted-foreground uppercase">No products found in this category.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Gallery() {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['gallery', 'posts'],
    queryFn: fetchGalleryPosts,
  });

  return (
    <CartProvider>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <MarketingNav />

        <Storefront />

        {/* Community showcase — live posts */}
        <section className="py-16 px-6 border-b border-border bg-card">
          <div className="container mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl md:text-4xl font-black font-display uppercase tracking-tight">Fresh From the Studio</h2>
              <div className="h-[2px] bg-border flex-1 hidden md:block" />
            </div>
            <p className="text-muted-foreground mb-10 max-w-2xl">Real work posted by creators on the platform — updated daily. Buying from the gallery supports this ecosystem directly.</p>

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
            <Button className="rounded-none bg-primary text-primary-foreground hover:bg-primary/90 uppercase font-mono text-xs h-12 px-6" asChild>
              <Link href="/app">
                Join the Creator Platform <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </section>

        <MarketingFooter />
      </div>
    </CartProvider>
  );
}
