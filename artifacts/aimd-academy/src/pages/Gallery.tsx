import { useState } from 'react';
import { useListStoreProducts, StoreProductCategory } from '@workspace/api-client-react';
import { MarketingNav, MarketingFooter } from '@/components/MarketingNav';
import { ImageIcon, PackageX } from 'lucide-react';
import { ProductCard } from '@/components/store/ProductCard';

import galleryImg from '@assets/generated_images/gallery-wall.jpg';

type FilterOption = 'All Products' | 'Apparel & T-Shirts' | 'Canvas & Artwork' | 'Digital Flash/Merch';

const FILTER_OPTIONS: FilterOption[] = [
  'All Products',
  'Apparel & T-Shirts',
  'Canvas & Artwork',
  'Digital Flash/Merch'
];

const filterToCategory: Record<FilterOption, StoreProductCategory | null> = {
  'All Products': null,
  'Apparel & T-Shirts': 'apparel',
  'Canvas & Artwork': 'canvas',
  'Digital Flash/Merch': 'digital',
};

export default function Gallery() {
  const [activeFilter, setActiveFilter] = useState<FilterOption>('All Products');
  const {
    data: allProducts = [],
    isLoading,
    isError,
    refetch,
  } = useListStoreProducts();

  const categoryFilter = filterToCategory[activeFilter];

  const displayedProducts = categoryFilter
    ? allProducts.filter(p => p.category === categoryFilter)
    : allProducts;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#252019] flex flex-col">
      <MarketingNav />

      <section className="relative min-h-[55vh] flex items-end border-b border-[#252019]/15 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img src={galleryImg} alt="AIMD gallery wall" className="w-full h-full object-cover" data-testid="img-hero-bg" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#121a22] via-[#121a22]/80 to-transparent" />
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[2px]" />
        </div>
        <div className="container relative z-10 px-6 mx-auto pb-14 pt-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#121a22]/60 border border-primary/50 text-primary font-mono text-xs uppercase tracking-widest mb-5 backdrop-blur shadow-sm" data-testid="badge-gallery">
              <ImageIcon className="w-3.5 h-3.5" /> The AIMD Gallery
            </div>
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black font-display uppercase leading-[0.9] tracking-tighter mb-6 text-[#FAF8F5] drop-shadow-sm" data-testid="text-hero-title">
               The <span className="text-gradient-brand">Gallery.</span>
            </h1>
            <p className="text-lg md:text-xl text-[#FAF8F5] font-medium max-w-2xl" data-testid="text-hero-desc">
              Curated official merchandise, original canvases, and digital assets from the AIMD creative studio.
            </p>
          </div>
        </div>
      </section>

      {/* Storefront Filters and Grid */}
      <section className="py-16 px-6 bg-[#FAF8F5] flex-1">
        <div className="container mx-auto">
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-10" data-testid="container-filters">
            {FILTER_OPTIONS.map(option => (
              <button
                key={option}
                onClick={() => setActiveFilter(option)}
                aria-pressed={activeFilter === option}
                data-testid={`button-filter-${option.replace(/\s+/g, '-').toLowerCase()}`}
                className={`px-4 py-2 font-mono text-xs uppercase font-bold tracking-wider transition-colors motion-reduce:transition-none border ${
                  activeFilter === option
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-[#fffdf9] text-[#685f56] border-[#252019]/20 hover:border-primary/50 hover:text-[#252019]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {/* Loading / Empty / Grid */}
          {isLoading ? (
            <div className="py-20 text-center" data-testid="state-loading">
              <p className="font-mono text-sm text-[#685f56] animate-pulse">Loading collection...</p>
            </div>
          ) : isError ? (
            <div className="py-24 text-center border border-dashed border-[#252019]/25 bg-[#fffdf9] flex flex-col items-center justify-center animate-in fade-in duration-500 motion-reduce:animate-none" data-testid="state-catalog-error">
              <PackageX className="w-12 h-12 text-[#685f56] mb-4 opacity-50" />
              <h3 className="font-display text-xl uppercase tracking-tight mb-2">The Shop Is Taking a Moment</h3>
              <p className="font-mono text-sm text-[#685f56] max-w-md mb-6">
                We could not load the current AIMD collection. Please try again.
              </p>
              <button
                type="button"
                onClick={() => void refetch()}
                className="px-4 py-2 font-mono text-xs uppercase font-bold tracking-wider bg-primary text-primary-foreground border border-primary hover:bg-primary/90 transition-colors"
                data-testid="button-retry-catalog"
              >
                Reload Collection
              </button>
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-[#252019]/25 bg-[#fffdf9] flex flex-col items-center justify-center animate-in fade-in duration-500 motion-reduce:animate-none" data-testid="state-empty">
              <PackageX className="w-12 h-12 text-[#685f56] mb-4 opacity-50" />
              <h3 className="font-display text-xl uppercase tracking-tight mb-2">No Live Products In This Drop</h3>
              <p className="font-mono text-sm text-[#685f56] max-w-md">
                There are currently no live products available in the "{activeFilter}" category. Check back later for new drops.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-700 motion-reduce:animate-none" data-testid="grid-products">
              {displayedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
