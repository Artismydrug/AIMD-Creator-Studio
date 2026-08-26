import { useState } from 'react';
import { StoreProduct } from '@workspace/api-client-react';
import { formatPrice } from './StoreUtils';
import { Button } from '@/components/ui/button';
import { ExternalLink, Eye, X } from 'lucide-react';
import { Dialog, DialogContent, DialogClose, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const CATEGORY_LABELS = {
  apparel: 'Apparel & T-Shirts',
  canvas: 'Canvas & Artwork',
  digital: 'Digital Flash/Merch',
} as const;

export function QuickView({ product, open, onOpenChange }: { product: StoreProduct, open: boolean, onOpenChange: (open: boolean) => void }) {
  const isOutOfStock = product.inventoryLabel === 'Out of Stock';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-[#fffdf9] text-[#252019] border-[#252019]/20 rounded-none shadow-2xl" data-testid={`dialog-quickview-${product.id}`}>
        <DialogTitle className="sr-only">{product.name}</DialogTitle>
        <DialogDescription className="sr-only">{product.description}</DialogDescription>
        <DialogClose className="absolute right-4 top-4 z-50 rounded-none bg-[#fffdf9]/80 backdrop-blur p-2 hover:bg-[#FAF8F5] transition-colors border border-[#252019]/20" data-testid={`button-close-quickview-${product.id}`}>
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
        <div className="flex flex-col md:flex-row">
          <div className="w-full md:w-1/2 aspect-square md:aspect-auto bg-[#f2ede3] border-b md:border-b-0 md:border-r border-[#252019]/15 overflow-hidden relative">
            <img 
              src={product.imageUrl}
              alt={product.name} 
              className="w-full h-full object-cover" 
              data-testid={`img-quickview-${product.id}`}
            />
            {product.featured && (
              <div className="absolute top-4 left-4 bg-primary text-primary-foreground text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 shadow" data-testid={`badge-quickview-featured-${product.id}`}>
                Featured
              </div>
            )}
          </div>
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col max-h-[80vh] overflow-y-auto">
            <div className="mb-6">
              <p className="font-mono text-xs uppercase text-primary mb-2 tracking-widest" data-testid={`text-quickview-category-${product.id}`}>{CATEGORY_LABELS[product.category]}</p>
              <h2 className="font-display font-black uppercase text-2xl md:text-3xl mb-2" data-testid={`text-quickview-name-${product.id}`}>{product.name}</h2>
              <p className="font-mono text-xl font-bold text-[#252019] mb-4" data-testid={`text-quickview-price-${product.id}`}>{formatPrice(product.unitAmount)}</p>
              <div className="w-12 h-1 bg-primary mb-4" />
              <p className="text-[#685f56] text-sm leading-relaxed whitespace-pre-wrap" data-testid={`text-quickview-desc-${product.id}`}>{product.description}</p>
            </div>
            
            <div className="mt-auto space-y-5 pt-4">
              <div className="flex flex-col gap-3 border-t border-[#252019]/15 pt-4">
                <div className="flex items-center gap-2" data-testid={`container-quickview-inventory-${product.id}`}>
                  <span className={`inline-block w-2 h-2 rounded-full ${isOutOfStock ? 'bg-destructive' : 'bg-green-500'}`} />
                  <span className="font-mono text-xs uppercase text-[#685f56]">{product.inventoryLabel}</span>
                </div>
                {product.apparelNote && (
                  <p className="font-mono text-[10px] text-[#685f56] border-l-2 border-primary/50 pl-2 py-0.5" data-testid={`text-quickview-apparel-note-${product.id}`}>
                    {product.apparelNote}
                  </p>
                )}
              </div>
              <Button
                size="lg"
                asChild
                className="w-full rounded-none uppercase font-mono font-bold tracking-widest h-12 bg-primary hover:bg-primary/90 glow-coral text-primary-foreground"
                data-testid={`link-quickview-buy-${product.id}`}
              >
                <a href={product.productUrl} target="_blank" rel="noreferrer">
                  {isOutOfStock ? "View Store" : "Buy Now"} <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ProductCard({ product }: { product: StoreProduct }) {
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const isOutOfStock = product.inventoryLabel === 'Out of Stock';

  return (
    <>
      <div className="group flex flex-col border border-[#252019]/15 bg-[#fffdf9] text-[#252019] overflow-hidden hover:border-primary/50 transition-colors shadow-sm hover:shadow-md" data-testid={`card-product-${product.id}`}>
        <div className="relative aspect-square overflow-hidden bg-[#f2ede3]">
          <img 
              src={product.imageUrl}
            alt={product.name} 
              className="w-full h-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-105 motion-reduce:group-hover:scale-100"
            loading="lazy"
            data-testid={`img-product-card-${product.id}`}
          />
          <div className="absolute inset-0 bg-[#252019]/0 group-hover:bg-[#252019]/10 transition-colors duration-300 pointer-events-none" />
          
          {product.featured && (
            <div className="absolute top-3 left-3 bg-primary text-primary-foreground text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 shadow" data-testid={`badge-product-featured-${product.id}`}>
              Featured
            </div>
          )}
          
          <button
            type="button"
            onClick={() => setQuickViewOpen(true)}
            className="absolute inset-0 z-10 cursor-zoom-in"
            aria-label={`Quick view ${product.name}`}
            data-testid={`button-product-image-quick-view-${product.id}`}
          >
            <span className="sr-only">Quick view {product.name}</span>
          </button>
          <div className="absolute inset-x-0 bottom-0 z-20 p-4 translate-y-0 opacity-100 md:translate-y-full md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-300 motion-reduce:transition-none flex gap-2">
            <Button 
              size="sm" 
              variant="secondary"
              className="flex-1 rounded-none font-mono text-[10px] uppercase font-bold bg-[#fffdf9]/95 hover:bg-[#FAF8F5] text-[#252019] backdrop-blur border border-[#252019]/20 shadow-sm"
              onClick={() => setQuickViewOpen(true)}
              data-testid={`button-quick-view-${product.id}`}
            >
              <Eye className="w-3.5 h-3.5 mr-1.5" /> Quick View
            </Button>
            <Button 
              size="sm" 
              asChild
              className="flex-1 rounded-none font-mono text-[10px] uppercase font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow"
              data-testid={`link-buy-now-${product.id}`}
            >
              <a href={product.productUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Buy
              </a>
            </Button>
          </div>
        </div>
        
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-1 gap-2">
            <h3 className="font-display font-black uppercase text-sm md:text-base leading-tight line-clamp-2">
              <button
                type="button"
                onClick={() => setQuickViewOpen(true)}
                className="text-left hover:text-primary transition-colors"
                data-testid={`button-product-name-quick-view-${product.id}`}
              >
                {product.name}
              </button>
            </h3>
            <span className="font-mono text-sm font-bold shrink-0" data-testid={`text-product-price-${product.id}`}>{formatPrice(product.unitAmount)}</span>
          </div>
          <p className="font-mono text-[10px] uppercase text-[#685f56] mt-1 mb-3" data-testid={`text-product-category-${product.id}`}>{CATEGORY_LABELS[product.category]}</p>
          <div className="mt-auto flex items-center justify-between">
            <span className={`font-mono text-[10px] uppercase ${isOutOfStock ? 'text-destructive' : 'text-green-600'}`} data-testid={`text-product-inventory-${product.id}`}>
              {product.inventoryLabel}
            </span>
          </div>
        </div>
      </div>
      
      <QuickView product={product} open={quickViewOpen} onOpenChange={setQuickViewOpen} />
    </>
  );
}
